import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DataGrid } from "./DataGrid";
import { EngineDashboard } from "./EngineDashboard";
import { downloadText, exportWorkbook, importWorkbook, loadActiveWorkbook, saveWorkbook } from "./store";
import { mergeLegacyAudioIntoWorkbook, readLegacyAudioBundle } from "./legacyAudioImport";
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

function cleanParam(params: URLSearchParams, key: string, limit: number): string {
  return String(params.get(key) || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function applyUrlContext(workbook: AvWorkbook): AvWorkbook {
  if (typeof window === "undefined") return workbook;
  const params = new URLSearchParams(window.location.search);
  const showName = cleanParam(params, "sbdShow", 120);
  const venue = cleanParam(params, "sbdVenue", 120);
  const targetDate = cleanParam(params, "sbdDate", 20);
  if (!showName && !venue && !targetDate) return workbook;
  const show = { ...workbook.show };
  let changed = false;
  if (showName && show.showName !== showName) {
    show.showName = showName;
    changed = true;
  }
  if (venue && show.venue !== venue) {
    show.venue = venue;
    changed = true;
  }
  if (targetDate && show.targetDate !== targetDate) {
    show.targetDate = targetDate;
    changed = true;
  }
  return changed ? { ...workbook, show } : workbook;
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

export default function App() {
  const shellRef = useRef<HTMLElement>(null);
  const [workbook, setWorkbook] = useState<AvWorkbook | null>(null);
  const [message, setMessage] = useState("Loading workbook...");
  const [activeTab, setActiveTab] = useState<"overview" | "crew" | "rooms" | "engines">("overview");
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
      .then(async (loaded) => {
        if (cancelled) return;
        const withContext = applyUrlContext(loaded);
        const saved = withContext === loaded ? loaded : await saveWorkbook(withContext);
        if (cancelled) return;
        setWorkbook(saved);
        setMessage(withContext === loaded ? "Workbook loaded from local storage." : "Workbook loaded with suite context.");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : "Workbook could not load.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateShow<K extends keyof AvWorkbook["show"]>(key: K, value: AvWorkbook["show"][K]) {
    if (!workbook) return;
    const next = await saveWorkbook({ ...workbook, show: { ...workbook.show, [key]: value } });
    setWorkbook(next);
    setMessage("Show profile saved.");
  }

  async function updateWorkbook(nextWorkbook: AvWorkbook, savedMessage: string) {
    const saved = await saveWorkbook(nextWorkbook);
    setWorkbook(saved);
    setMessage(savedMessage);
  }

  function handleExport() {
    if (!workbook) return;
    downloadText(`${workbook.show.showName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.av-workbook.json`, exportWorkbook(workbook));
    setMessage("Workbook JSON exported.");
  }

  async function handleImport(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const parsed = importWorkbook(text);
    const saved = await saveWorkbook(parsed);
    setWorkbook(saved);
    setMessage("Workbook JSON imported.");
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
      const saved = await saveWorkbook(result.workbook);
      setWorkbook(saved);
      setActiveTab("engines");
      setMessage(`Legacy audio imported: ${result.summary.signalSources} sources, ${result.summary.patchRecords} patches, ${result.summary.lineChecks} line checks.`);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Legacy audio import failed.");
    }
  }

  async function replaceWorkbook(next: AvWorkbook, label: string) {
    if (!window.confirm(`Replace the current workbook with ${label}? Export first if you need a backup.`)) return;
    const saved = await saveWorkbook(next);
    setWorkbook(saved);
    setActiveTab("overview");
    setMessage(`${label[0].toUpperCase()}${label.slice(1)} loaded.`);
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
          <button type="button" onClick={() => void replaceWorkbook(createBlankWorkbook(), "a blank workbook")}>New Blank</button>
          <button type="button" onClick={() => void replaceWorkbook(createSampleWorkbook(), "the sample workbook")}>Load Sample</button>
          <button type="button" onClick={handleExport}>Export JSON</button>
          <button type="button" onClick={() => void handleLegacyAudioImport()}>Import Legacy Audio</button>
          <label className="file-button primary primary-action">
            Import JSON
            <input type="file" accept="application/json" onChange={(event) => void handleImport(event.target.files?.[0] ?? null)} />
          </label>
        </nav>
      </header>

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
