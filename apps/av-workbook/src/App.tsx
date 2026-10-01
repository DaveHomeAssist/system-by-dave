import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DataGrid } from "./DataGrid";
import { EngineDashboard } from "./EngineDashboard";
import {
  WorkbookChangedElsewhereError, WorkbookUncheckedError, downloadText, exportWorkbook, importWorkbook, loadActiveWorkbook, fallbackHolds, fallbackSlotFor, readActiveWorkbook, saveEditedWorkbook,
  startBlankWorkbook, storedWorkbookText, type FallbackSlot, type WorkbookReadOnly
} from "./store";
import { mergeLegacyAudioIntoWorkbook, readLegacyAudioBundle } from "./legacyAudioImport";
import { launchContextChanges, readLaunchContext, withLaunchContext } from "./launchContext";
import { readRegistry } from "./registry";
import type { AvWorkbook, RegistryTool } from "./types";
import { validateWorkbookIssues } from "./validators";
import { createCrewRow, createRoomRow, crewColumns, roomColumns } from "./worksheetSchemas";
import { createBlankWorkbook, createSampleWorkbook } from "./sampleWorkbook";
import "./styles.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

function statusLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toolHref(tool: RegistryTool): string {
  if (/^https?:/i.test(tool.href)) return tool.href;
  return `../${tool.href}`;
}

const workflowToolGroups = [
  { label: "Audio Path", ids: ["input-list", "audio-patch", "line-check", "speaker-plan", "rf-coordination"] },
  { label: "Rooms + Labor", ids: ["room-check", "breakout-room-matrix", "crew-call", "crew-time-log"] },
  { label: "Infrastructure", ids: ["power-plan", "network-plan", "cable-plan", "video-patch"] },
  { label: "Handoff", ids: ["show-task-board", "show-handoff", "show-report", "client-signoff"] }
];

function groupedWorkflowTools(tools: RegistryTool[]) {
  const byId = new Map(tools.map((tool) => [tool.id, tool]));
  return workflowToolGroups
    .map((group) => ({
      label: group.label,
      tools: group.ids.map((id) => byId.get(id)).filter((tool): tool is RegistryTool => Boolean(tool))
    }))
    .filter((group) => group.tools.length);
}

function workbookCounts(workbook: AvWorkbook) {
  return {
    rooms: workbook.rooms.length,
    crew: workbook.operators.length,
    gear: workbook.gearManifest.length,
    sources: workbook.signalSources.length,
    patch: workbook.patchRecords.length,
    "line checks": workbook.lineChecks.length,
    tasks: workbook.tasks.length
  };
}

interface PendingImport {
  kind: "json" | "legacy";
  proposed: AvWorkbook;
  description: string;
  details: string[];
  baseWorkbookId: string;
  baseSavedAt: string;
}

/** Downloads a fallback slot's exact stored text before it is deliberately replaced. */
function backupFallbackSlot(slot: FallbackSlot, workbookId: string): void {
  downloadText(`${workbookId}-fallback-backup.json`, slot.text);
}

function backupWorkbook(workbook: AvWorkbook): void {
  const safeName = workbook.show.showName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "show";
  downloadText(`${safeName}-${workbook.workbookId}-backup.json`, exportWorkbook(workbook));
}

function storedText(value: unknown, key: string): string {
  const field = value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
  return typeof field === "string" ? field : "";
}

/** Readable facts about a stored record the app cannot open, without trusting its shape. */
function readOnlyFacts(readOnly: WorkbookReadOnly): { label: string; value: string }[] {
  let record: unknown = readOnly.raw;
  if (typeof record === "string") {
    try {
      record = JSON.parse(record);
    } catch {
      record = null;
    }
  }
  const show = record && typeof record === "object" ? (record as Record<string, unknown>).show : undefined;
  return [
    { label: "Show", value: storedText(show, "showName") },
    { label: "Workbook ID", value: storedText(record, "workbookId") || readOnly.activeId },
    { label: "Last saved", value: storedText(record, "savedAt") },
    { label: "Format", value: storedText(record, "schema") },
    { label: "Kept in", value: readOnly.source === "fallback" ? "This browser's fallback copy" : "This browser's workbook storage" }
  ].filter((fact) => fact.value);
}

function downloadStoredWorkbook(readOnly: WorkbookReadOnly): void {
  const facts = readOnlyFacts(readOnly);
  const id = (facts.find((fact) => fact.label === "Workbook ID")?.value || "workbook").replace(/[^a-z0-9-]+/gi, "-");
  downloadText(`${id}-read-only.json`, storedWorkbookText(readOnly.raw));
}

export default function App() {
  const shellRef = useRef<HTMLElement>(null);
  const [workbook, setWorkbook] = useState<AvWorkbook | null>(null);
  const [message, setMessage] = useState("Loading workbook...");
  const [activeTab, setActiveTab] = useState<"overview" | "crew" | "rooms" | "engines">("overview");
  const [contextDismissed, setContextDismissed] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [readOnly, setReadOnly] = useState<WorkbookReadOnly | null>(null);
  const [blankBusy, setBlankBusy] = useState(false);
  const readOnlyRef = useRef(false);
  readOnlyRef.current = readOnly !== null;
  const launchContext = useMemo(() => readLaunchContext(typeof window === "undefined" ? "" : window.location.search), []);
  const contextChanges = workbook && !contextDismissed ? launchContextChanges(workbook, launchContext) : [];
  const registry = useMemo(readRegistry, []);
  const counts = workbook ? workbookCounts(workbook) : null;
  const workflowGroups = useMemo(() => groupedWorkflowTools(registry.tools), [registry.tools]);
  const issues = useMemo(() => (workbook ? validateWorkbookIssues(workbook) : []), [workbook]);
  const redIssues = issues.filter((issue) => issue.severity === "red").length;
  const yellowIssues = issues.filter((issue) => issue.severity === "yellow").length;

  useGSAP(() => {
    if (!workbook) return;
    const motion = gsap.matchMedia();

    motion.add("(prefers-reduced-motion: no-preference)", () => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      gsap.to(".show-progress span", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: 0.35 }
      });
      timeline
        .from(".workbook-header", { autoAlpha: 0, y: -14, duration: 0.42 })
        .from(".hero-signal-line", { scaleX: 0, transformOrigin: "left center", duration: 0.72, ease: "expo.out" }, "-=0.12")
        .from(".hero-signal-node", { autoAlpha: 0, scale: 0, duration: 0.26, ease: "back.out(1.7)" }, "-=0.2")
        .from([".hero-kicker", ".hero-title", ".hero-summary"], { autoAlpha: 0, y: 22, duration: 0.54, stagger: 0.08 }, "-=0.52")
        .from(".hero-status > *", { autoAlpha: 0, x: 16, duration: 0.42, stagger: 0.065 }, "-=0.48")
        .from(".profile-grid", { autoAlpha: 0, y: 18, duration: 0.46 }, "-=0.3")
        .from(".metric-card", { autoAlpha: 0, y: 14, duration: 0.38, stagger: 0.045 }, "-=0.32")
        .from(".tabs button", { autoAlpha: 0, y: 8, duration: 0.3, stagger: 0.05 }, "-=0.28");
      return () => timeline.kill();
    });

    motion.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set([".workbook-header", ".hero-signal-line", ".hero-signal-node", ".hero-kicker", ".hero-title", ".hero-summary", ".hero-status > *", ".profile-grid", ".metric-card", ".tabs button"], { clearProps: "all" });
      gsap.set(".show-progress span", { scaleX: 1 });
    });

    return () => motion.revert();
  }, { scope: shellRef, dependencies: [Boolean(workbook)], revertOnUpdate: true });

  useGSAP(() => {
    if (!workbook) return;
    const motion = gsap.matchMedia();
    motion.add("(prefers-reduced-motion: no-preference)", () => {
      const activeView = shellRef.current?.querySelector(".view-stage > section");
      if (!activeView) return;
      const timeline = gsap.timeline();
      timeline.from(activeView, { autoAlpha: 0, y: 16, duration: 0.38, ease: "power2.out" });
      const cards = activeView.querySelectorAll(".panel, .engine-card");
      if (cards.length) {
        timeline.from(cards, { autoAlpha: 0, y: 24, duration: 0.48, stagger: 0.07, ease: "power3.out" }, "-=0.2");
      }
      ScrollTrigger.refresh();
      return () => timeline.kill();
    });
    return () => motion.revert();
  }, { scope: shellRef, dependencies: [activeTab, workbook?.workbookId], revertOnUpdate: true });

  useEffect(() => {
    let cancelled = false;
    loadActiveWorkbook()
      .then((loaded) => {
        if (cancelled) return;
        if (loaded.status === "read-only") {
          setReadOnly(loaded);
          setMessage("Workbook opened read-only. Nothing was saved.");
          return;
        }
        setWorkbook(loaded.workbook);
        setMessage("Workbook loaded from local storage.");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : "Workbook could not load.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Every save goes through here, so a read-only workbook is never written from any path.
  // newRecord: only for an id minted for this save (a JSON import copy or a new blank), which cannot already exist.
  // replaceFallbackIfUnchanged: the exact fallback text of the workbook this save deliberately replaces.
  async function persist(next: AvWorkbook, options: { newRecord?: boolean; replaceFallbackIfUnchanged?: string } = {}): Promise<AvWorkbook | null> {
    if (readOnlyRef.current) {
      setMessage("This workbook is open read-only. Nothing was saved.");
      return null;
    }
    try {
      return await saveEditedWorkbook(next, undefined, { newRecord: options.newRecord === true, replaceFallbackIfUnchanged: options.replaceFallbackIfUnchanged });
    } catch (error: unknown) {
      if (error instanceof WorkbookUncheckedError) {
        setMessage(error.message);
        return null;
      }
      if (!(error instanceof WorkbookChangedElsewhereError)) throw error;
      // A newer version rewrote this workbook after this tab loaded it: stop rather than strip its fields.
      setReadOnly(error.readOnly);
      setMessage("This workbook was changed by a newer version in another tab or window. Nothing was saved.");
      return null;
    }
  }

  async function updateShow<K extends keyof AvWorkbook["show"]>(key: K, value: AvWorkbook["show"][K]) {
    if (!workbook) return;
    const next = await persist({ ...workbook, show: { ...workbook.show, [key]: value } });
    if (!next) return;
    setWorkbook(next);
    setMessage("Show profile saved.");
  }

  async function updateWorkbook(nextWorkbook: AvWorkbook, savedMessage: string) {
    const saved = await persist(nextWorkbook);
    if (!saved) return;
    setWorkbook(saved);
    setMessage(savedMessage);
  }

  async function startBlankFromReadOnly() {
    if (!readOnly || blankBusy) return;
    // A workbook kept only in the fallback slot can be replaced if storage fails again, so it is backed up first.
    const fallbackText = readOnly.source === "fallback" && typeof readOnly.raw === "string" ? readOnly.raw : undefined;
    if (fallbackText !== undefined && !window.confirm("This browser holds this workbook only in its fallback copy, which a new workbook can replace if storage fails again. A backup downloads first. Start a new blank workbook?")) return;
    setBlankBusy(true);
    try {
      if (fallbackText !== undefined) downloadStoredWorkbook(readOnly);
      // The slot is replaced only while it still holds the copy the operator saw and backed up.
      const blank = await startBlankWorkbook(undefined, { replaceFallbackIfUnchanged: fallbackText });
      // Retention is claimed only for a copy this page actually read: an unreadable record was never seen.
      const kept = fallbackText !== undefined ? fallbackHolds(fallbackText) : readOnly.raw !== undefined;
      setReadOnly(null);
      setWorkbook(blank);
      setActiveTab("overview");
      setMessage(kept
        ? "New blank workbook started. The previous workbook is still saved in this browser."
        : fallbackText !== undefined
          ? "New blank workbook started. Storage failed again, so it took the previous workbook's fallback copy; the backup that downloaded holds that workbook."
          : "New blank workbook started. This browser could not read the previous workbook, so this page cannot confirm it is still saved.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "A new workbook could not be saved.");
    } finally {
      setBlankBusy(false);
    }
  }

  function handleExport() {
    if (!workbook) return;
    downloadText(`${workbook.show.showName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.av-workbook.json`, exportWorkbook(workbook));
    setMessage("Workbook JSON exported.");
  }

  async function applyLaunchContext() {
    if (!workbook || !contextChanges.length) return;
    try {
      const latest = await readActiveWorkbook();
      if (latest.status !== "ok" || latest.workbook.workbookId !== workbook.workbookId || latest.workbook.savedAt !== workbook.savedAt) {
        setMessage("Workbook changed in another tab. Reload and review the link again.");
        return;
      }
      const saved = await persist(withLaunchContext(latest.workbook, contextChanges));
      if (!saved) return;
      setWorkbook(saved);
      setContextDismissed(true);
      setMessage("Suite link details applied to this workbook.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Suite link details could not be saved.");
    }
  }

  async function handleImport(file: File | null) {
    if (!file || !workbook) return;
    try {
      const parsed = importWorkbook(await file.text());
      setPendingImport({
        kind: "json", proposed: parsed, description: `Import ${file.name} as a separate workbook copy.`,
        baseWorkbookId: workbook.workbookId, baseSavedAt: workbook.savedAt,
        details: [`Show: ${parsed.show.showName}`, `Venue: ${parsed.show.venue || "—"}`, `Date: ${parsed.show.targetDate}`,
          ...Object.entries(workbookCounts(parsed)).map(([label, count]) => `${label}: ${count}`)]
      });
      setMessage("JSON validated. Review the import before saving.");
    } catch (error: unknown) {
      setPendingImport(null);
      setMessage(error instanceof Error ? `Import rejected: ${error.message}` : "Import rejected: invalid workbook JSON.");
    }
  }

  async function handleLegacyAudioImport() {
    if (!workbook) return;
    let storage: Storage;
    try {
      storage = window.localStorage;
    } catch {
      setMessage("Legacy audio import needs browser storage access.");
      return;
    }
    try {
      const bundle = readLegacyAudioBundle(storage);
      const result = mergeLegacyAudioIntoWorkbook(workbook, bundle);
      if (!result.summary.importedKeys.length) {
        setMessage("No Input List, Audio Patch, or Line Check data found in this browser.");
        return;
      }
      const existingLegacy = [workbook.signalSources, workbook.patchRecords, workbook.lineChecks]
        .map((rows) => rows.filter((row) => row.id.startsWith("legacy-")).length);
      setPendingImport({
        kind: "legacy", proposed: result.workbook, description: "Merge legacy audio into the active workbook.",
        baseWorkbookId: workbook.workbookId, baseSavedAt: workbook.savedAt,
        details: [
          `Sources: ${result.summary.signalSources}; patches: ${result.summary.patchRecords}; line checks: ${result.summary.lineChecks}`,
          `Existing legacy rows replaced: ${existingLegacy.join(" / ")} (sources / patches / line checks)`,
          `Read: ${result.summary.importedKeys.join(", ")}`,
          `Missing or empty: ${result.summary.skippedKeys.join(", ") || "none"}`,
          `Unmapped structured fields: ${result.summary.unmappedFields.join(", ") || "none detected"}. Keep legacy pages and their exports for these details.`,
          ...(workbook.show.showName !== result.workbook.show.showName ? [`Show: ${workbook.show.showName} → ${result.workbook.show.showName}`] : []),
          ...(workbook.show.venue !== result.workbook.show.venue ? [`Venue: ${workbook.show.venue || "—"} → ${result.workbook.show.venue || "—"}`] : []),
          ...(workbook.show.targetDate !== result.workbook.show.targetDate ? [`Date: ${workbook.show.targetDate} → ${result.workbook.show.targetDate}`] : [])
        ]
      });
      setMessage("Legacy audio mapped. Review the changes before saving.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Legacy audio import failed.");
    }
  }

  async function applyPendingImport() {
    if (!workbook || !pendingImport || importBusy) return;
    setImportBusy(true);
    try {
      const latest = await readActiveWorkbook();
      if (latest.status !== "ok" || latest.workbook.workbookId !== pendingImport.baseWorkbookId || latest.workbook.savedAt !== pendingImport.baseSavedAt) {
        setPendingImport(null);
        setMessage("Workbook changed since this preview. Review the import again before saving.");
        return;
      }
      backupWorkbook(latest.workbook);
      const next = pendingImport.kind === "json"
        ? { ...pendingImport.proposed, workbookId: `wb-import-${crypto.randomUUID()}` }
        : pendingImport.proposed;
      const slot = await fallbackSlotFor(latest.workbook.workbookId);
      if (slot && slot.onlyCopy) backupFallbackSlot(slot, latest.workbook.workbookId);
      const saved = await persist(next, { newRecord: pendingImport.kind === "json", replaceFallbackIfUnchanged: slot?.text });
      if (!saved) return;
      setWorkbook(saved);
      setPendingImport(null);
      setActiveTab(pendingImport.kind === "legacy" ? "engines" : "overview");
      setMessage(`${pendingImport.kind === "json" ? "Workbook copy imported" : "Legacy audio merged"}. Previous workbook backup downloaded.`);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Import could not be saved.");
    } finally {
      setImportBusy(false);
    }
  }

  // The sample keeps a fixed id that may already be stored, so only a new blank counts as a new record.
  async function replaceWorkbook(next: AvWorkbook, label: string, newRecord: boolean) {
    if (!window.confirm(`Replace the current workbook with ${label}? Export first if you need a backup.`)) return;
    // The fallback slot may hold the current workbook. Keep a download of its exact text when it is the only
    // copy, and let the save replace the slot only while it still holds that text.
    const slot = workbook ? await fallbackSlotFor(workbook.workbookId) : null;
    if (slot && slot.onlyCopy && workbook) backupFallbackSlot(slot, workbook.workbookId);
    const saved = await persist(next, { newRecord, replaceFallbackIfUnchanged: slot?.text });
    if (!saved) return;
    setWorkbook(saved);
    setActiveTab("overview");
    setMessage(`${label[0].toUpperCase()}${label.slice(1)} loaded.`);
  }

  if (readOnly) {
    const facts = readOnlyFacts(readOnly);
    return (
      <main className="shell" ref={shellRef}>
        <header className="workbook-header">
          <div className="brand-lockup">
            <a className="brand" href="../av-suite.html" aria-label="Back to AV Suite">
              <span>S</span>
              <strong>System_by_Dave</strong>
            </a>
            <small>Show operations spine</small>
          </div>
          <nav aria-label="Workbook actions">
            <a className="console-action" href="../av-suite.html">Suite Console</a>
          </nav>
        </header>
        <section className="review-panel read-only-panel" role="alert" aria-labelledby="read-only-title" data-workbook-read-only={readOnly.reason.code}>
          <div>
            <p className="kicker">Read-only workbook</p>
            <h1 id="read-only-title">This workbook was left untouched</h1>
            <p>{readOnly.reason.code === "unreadable-storage"
              ? "This browser could not read its saved workbook, so this version opened it read-only. Nothing has been saved, and the active workbook was not changed."
              : "It was saved by a newer or incompatible version of AV Workbook, so this version opened it read-only. Nothing has been saved, and it is still the active workbook in this browser."}</p>
            <p>{readOnly.reason.summary}{readOnly.reason.code === "newer-schema" ? " Reload this page to fetch the latest version." : ""}</p>
          </div>
          {facts.length ? (
            <ul aria-label="Saved workbook details">{facts.map((fact) => <li key={fact.label}><strong>{fact.label}</strong><span>{fact.value}</span></li>)}</ul>
          ) : null}
          <div className="review-actions">
            <button type="button" disabled={readOnly.raw === undefined} onClick={() => downloadStoredWorkbook(readOnly)}>Download this workbook</button>
            <button type="button" disabled={blankBusy} onClick={() => void startBlankFromReadOnly()}>{blankBusy ? "Starting…" : "Start a new blank workbook"}</button>
          </div>
          <p className="read-only-note">{readOnly.source === "fallback"
            ? "Starting a new workbook makes it the active one. This workbook is kept only in the fallback copy, so a backup downloads first; if storage fails again, the new workbook takes that copy's place."
            : readOnly.raw === undefined
              ? "Starting a new workbook makes it the active one. This browser could not read the saved workbook, so this page cannot confirm it is still there."
              : "Starting a new workbook makes it the active one. The saved workbook stays in this browser; it is not deleted."}</p>
          <small role="status" aria-live="polite">{message}</small>
        </section>
      </main>
    );
  }

  if (!workbook) {
    return (
      <main className="shell" ref={shellRef}>
        <section className="loading-panel" aria-live="polite">
          <span aria-hidden="true">S/01</span>
          <p>Booting show spine</p>
          <strong>{message}</strong>
        </section>
      </main>
    );
  }

  return (
    <main className="shell" ref={shellRef}>
      <div className="show-progress" aria-hidden="true"><span /></div>
      <header className="workbook-header">
        <div className="brand-lockup">
          <a className="brand" href="../av-suite.html" aria-label="Back to AV Suite">
            <span>S</span>
            <strong>System_by_Dave</strong>
          </a>
          <small>Show operations spine</small>
        </div>
        <nav aria-label="Workbook actions">
          <a className="console-action" href="../av-suite.html">Suite Console</a>
          <button type="button" onClick={() => void replaceWorkbook(createBlankWorkbook(), "a blank workbook", true)}>New Blank</button>
          <button type="button" onClick={() => void replaceWorkbook(createSampleWorkbook(), "the sample workbook", false)}>Load Sample</button>
          <button type="button" onClick={handleExport}>Export JSON</button>
          <button type="button" onClick={() => void handleLegacyAudioImport()}>Import Legacy Audio</button>
          <label className="file-button primary primary-action">
            Import JSON
            <input type="file" accept="application/json" onChange={(event) => { void handleImport(event.target.files?.[0] ?? null); event.target.value = ""; }} />
          </label>
        </nav>
      </header>

      {contextChanges.length ? (
        <section className="review-panel" aria-labelledby="launch-context-title">
          <div><p className="kicker">Suite link offer</p><h2 id="launch-context-title">Apply show details from this link?</h2>
            <p>Opening a link does not change saved show data. Review each difference first.</p></div>
          <ul>{contextChanges.map((change) => <li key={change.field}><strong>{change.label}</strong><span>{change.current || "—"} → {change.incoming}</span></li>)}</ul>
          <div className="review-actions"><button type="button" onClick={() => void applyLaunchContext()}>Apply to current workbook</button>
            <button type="button" onClick={() => setContextDismissed(true)}>Dismiss</button></div>
        </section>
      ) : null}

      {pendingImport ? (
        <section className="review-panel" aria-labelledby="import-review-title">
          <div><p className="kicker">Import review</p><h2 id="import-review-title">{pendingImport.description}</h2>
            <p>The current workbook will be downloaded as a JSON backup before saving. A JSON import gets a new workbook ID, so existing records remain available.</p></div>
          <ul>{pendingImport.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
          <div className="review-actions"><button type="button" disabled={importBusy} onClick={() => void applyPendingImport()}>{importBusy ? "Saving…" : "Download backup and apply"}</button>
            <button type="button" disabled={importBusy} onClick={() => setPendingImport(null)}>Cancel import</button></div>
        </section>
      ) : null}

      <section className="hero-panel" aria-labelledby="workbook-title">
        <div className="hero-copy">
          <p className="kicker hero-kicker"><span className="status-beacon" aria-hidden="true" />Show file · local first</p>
          <h1 className="hero-title" id="workbook-title">{workbook.show.showName}</h1>
          <p className="summary hero-summary">One show file owns rooms, crew, gear, signal sources, patching, validation, and handoff state. This is the shared source of truth for the room and the people running it.</p>
        </div>
        <aside className="hero-status" aria-label="Workbook status">
          <p>Show status</p>
          <span>{statusLabel(workbook.show.globalStatus)}</span>
          <div className="status-totals">
            <strong className={redIssues ? "has-red" : ""}><b>{redIssues}</b> red</strong>
            <strong className={yellowIssues ? "has-yellow" : ""}><b>{yellowIssues}</b> yellow</strong>
          </div>
          <div className="status-meta">
            <small>{registry.version}</small>
            <small role="status" aria-live="polite">{message}</small>
          </div>
        </aside>
        <div className="hero-index" aria-hidden="true">01</div>
        <div className="hero-signal" aria-hidden="true">
          <span className="hero-signal-line" />
          <span className="hero-signal-node" />
        </div>
      </section>

      <section className="profile-grid" aria-label="Show profile">
        <div className="section-heading">
          <span>02</span>
          <strong>Show profile</strong>
          <small>Autosave active</small>
        </div>
        <label>
          Show
          <input value={workbook.show.showName} onChange={(event) => void updateShow("showName", event.target.value)} />
        </label>
        <label>
          Venue
          <input value={workbook.show.venue} onChange={(event) => void updateShow("venue", event.target.value)} />
        </label>
        <label>
          Date
          <input type="date" value={workbook.show.targetDate} onChange={(event) => void updateShow("targetDate", event.target.value)} />
        </label>
        <label>
          Timecode
          <select value={workbook.show.masterTimecodeFormat} onChange={(event) => void updateShow("masterTimecodeFormat", event.target.value as AvWorkbook["show"]["masterTimecodeFormat"])}>
            <option value="24">24</option>
            <option value="25">25</option>
            <option value="29.97_NDF">29.97 NDF</option>
            <option value="29.97_DF">29.97 DF</option>
            <option value="30">30</option>
          </select>
        </label>
      </section>

      <section className="metric-grid" aria-label="Workbook totals">
        <div className="section-heading metric-heading">
          <span>03</span>
          <strong>Workbook signal map</strong>
          <small>{Object.values(counts ?? {}).reduce((total, value) => total + value, 0)} linked records</small>
        </div>
        {counts && Object.entries(counts).map(([label, value], index) => (
          <article className="metric-card" key={label} data-index={String(index + 1).padStart(2, "0")}>
            <span>{label}</span>
            <strong>{value}</strong>
            <i aria-hidden="true" />
          </article>
        ))}
      </section>

      <div className="tabs" role="tablist" aria-label="Workbook views">
        <span className="tabs-label" aria-hidden="true">04 / Views</span>
        {[
          ["overview", "Overview"],
          ["crew", "Crew Call"],
          ["rooms", "Room Check"],
          ["engines", "Engines"]
        ].map(([id, label], index) => (
          <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id as typeof activeTab)}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="view-stage">
        {activeTab === "overview" ? (
          <section className="surface-grid">
            <article className="panel" data-panel-index="A">
              <div className="panel-head">
                <p className="kicker">Shared data</p>
                <h2>Enter once model</h2>
              </div>
              <ul className="data-list">
                <li><strong>Rooms</strong><span>{workbook.rooms.map((room) => room.name).join(" · ") || "No rooms entered yet"}</span></li>
                <li><strong>Crew</strong><span>{workbook.operators.map((operator) => `${operator.role}: ${operator.name}`).join(" · ") || "No crew entered yet"}</span></li>
                <li><strong>Gear</strong><span>{workbook.gearManifest.map((item) => item.caseId).join(" · ") || "No gear entered yet"}</span></li>
                <li><strong>Signals</strong><span>{workbook.signalSources.map((source) => source.label).join(" · ") || "No signal sources entered yet"}</span></li>
              </ul>
            </article>

            <article className="panel" data-panel-index="B">
              <div className="panel-head">
                <p className="kicker">Migration map</p>
                <h2>Current tools stay linked</h2>
              </div>
              <div className="tool-list">
                {workflowGroups.map((group) => (
                  <div className="tool-group" key={group.label}>
                    <span>{group.label}</span>
                    {group.tools.map((tool) => (
                      <a href={toolHref(tool)} key={tool.id}>
                        <span>{tool.dept}</span>
                        <strong>{tool.name}</strong>
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            </article>

            <article className="panel legacy-import-panel" data-panel-index="C">
              <div className="panel-head">
                <div>
                  <p className="kicker">Legacy audio</p>
                  <h2>Input List → Audio Patch → Line Check</h2>
                </div>
                <button type="button" onClick={() => void handleLegacyAudioImport()}>Import</button>
              </div>
              <ul className="data-list">
                <li><strong>Reads</strong><span>input-list.v1 · audio-patch.v1 · line-check.v1</span></li>
                <li><strong>Writes</strong><span>Signal sources · patch records · line checks</span></li>
              </ul>
            </article>
          </section>
        ) : null}

        {activeTab === "crew" ? (
          <DataGrid
            title="Crew Call"
            description="Workbook-backed crew directory. Edits save immediately and can feed time log, handoff, and closeout."
            rows={workbook.operators}
            columns={crewColumns}
            createRow={createCrewRow}
            onRowsChange={(operators) => void updateWorkbook({ ...workbook, operators }, "Crew grid saved.")}
          />
        ) : null}

        {activeTab === "rooms" ? (
          <DataGrid
            title="Room Check"
            description="Workbook-backed room readiness list. Room names are shared by power, network, logistics, and show report records."
            rows={workbook.rooms}
            columns={roomColumns}
            createRow={createRoomRow}
            onRowsChange={(rooms) => void updateWorkbook({ ...workbook, rooms }, "Room grid saved.")}
          />
        ) : null}

        {activeTab === "engines" ? (
          <EngineDashboard workbook={workbook} issues={issues} />
        ) : null}
      </div>
    </main>
  );
}
