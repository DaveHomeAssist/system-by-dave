import { useEffect, useMemo, useState } from "react";
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
  const [workbook, setWorkbook] = useState<AvWorkbook | null>(null);
  const [message, setMessage] = useState("Loading workbook...");
  const [activeTab, setActiveTab] = useState<"overview" | "crew" | "rooms" | "engines">("overview");
  const registry = useMemo(readRegistry, []);
  const counts = workbook ? workbookCounts(workbook) : null;
  const workflowGroups = useMemo(() => groupedWorkflowTools(registry.tools), [registry.tools]);
  const issues = useMemo(() => (workbook ? validateWorkbookIssues(workbook) : []), [workbook]);

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
      <main className="shell">
        <section className="loading-panel" aria-live="polite">{message}</section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="workbook-header">
        <a className="brand" href="../av-suite.html" aria-label="Back to AV Suite">
          <span>S</span>
          <strong>System_by_Dave</strong>
        </a>
        <nav aria-label="Workbook actions">
          <a href="../av-suite.html">Suite Console</a>
          <button type="button" onClick={() => void replaceWorkbook(createBlankWorkbook(), "a blank workbook")}>New Blank</button>
          <button type="button" onClick={() => void replaceWorkbook(createSampleWorkbook(), "the sample workbook")}>Load Sample</button>
          <button type="button" onClick={handleExport}>Export JSON</button>
          <button type="button" onClick={() => void handleLegacyAudioImport()}>Import Legacy Audio</button>
          <label className="file-button">
            Import JSON
            <input type="file" accept="application/json" onChange={(event) => void handleImport(event.target.files?.[0] ?? null)} />
          </label>
        </nav>
      </header>

      <section className="hero-panel">
        <div>
          <p className="kicker">AV Workbook · local first</p>
          <h1>{workbook.show.showName}</h1>
          <p className="summary">One show file owns rooms, crew, gear, signal sources, patching, validation, and handoff state. Legacy tools remain available while the workbook becomes the shared source of truth.</p>
        </div>
        <div className="hero-status">
          <span>{statusLabel(workbook.show.globalStatus)}</span>
          <strong>{issues.filter((issue) => issue.severity === "red").length} red · {issues.filter((issue) => issue.severity === "yellow").length} yellow</strong>
          <strong>{registry.version}</strong>
          <small>{message}</small>
        </div>
      </section>

      <section className="profile-grid" aria-label="Show profile">
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
        {counts && Object.entries(counts).map(([label, value]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <div className="tabs" role="tablist" aria-label="Workbook views">
        {[
          ["overview", "Overview"],
          ["crew", "Crew Call"],
          ["rooms", "Room Check"],
          ["engines", "Engines"]
        ].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id as typeof activeTab)}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <section className="surface-grid">
          <article className="panel">
            <div className="panel-head">
              <p className="kicker">Shared data</p>
              <h2>Enter once model</h2>
            </div>
            <ul className="data-list">
              <li><strong>Rooms</strong><span>{workbook.rooms.map((room) => room.name).join(" · ")}</span></li>
              <li><strong>Crew</strong><span>{workbook.operators.map((operator) => `${operator.role}: ${operator.name}`).join(" · ")}</span></li>
              <li><strong>Gear</strong><span>{workbook.gearManifest.map((item) => item.caseId).join(" · ")}</span></li>
              <li><strong>Signals</strong><span>{workbook.signalSources.map((source) => source.label).join(" · ")}</span></li>
            </ul>
          </article>

          <article className="panel">
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

          <article className="panel legacy-import-panel">
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
    </main>
  );
}
