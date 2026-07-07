import { useEffect, useMemo, useState } from "react";
import { DataGrid } from "./DataGrid";
import { downloadText, exportWorkbook, importWorkbook, loadActiveWorkbook, saveWorkbook } from "./store";
import { readRegistry } from "./registry";
import type { AvWorkbook, RegistryTool } from "./types";
import { createCrewRow, createRoomRow, crewColumns, roomColumns } from "./worksheetSchemas";
import "./styles.css";

function statusLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toolHref(tool: RegistryTool): string {
  if (/^https?:/i.test(tool.href)) return tool.href;
  return `../${tool.href}`;
}

function workbookCounts(workbook: AvWorkbook) {
  return {
    rooms: workbook.rooms.length,
    crew: workbook.operators.length,
    gear: workbook.gearManifest.length,
    sources: workbook.signalSources.length,
    patch: workbook.patchRecords.length,
    tasks: workbook.tasks.length
  };
}

export default function App() {
  const [workbook, setWorkbook] = useState<AvWorkbook | null>(null);
  const [message, setMessage] = useState("Loading workbook...");
  const [activeTab, setActiveTab] = useState<"overview" | "crew" | "rooms">("overview");
  const registry = useMemo(readRegistry, []);
  const counts = workbook ? workbookCounts(workbook) : null;
  const engineTools = registry.tools.filter((tool) => ["Audio", "Power", "Network", "Video", "Comms", "Logistics", "Rooms", "Labor", "Closeout"].includes(tool.dept));

  useEffect(() => {
    let cancelled = false;
    loadActiveWorkbook()
      .then((loaded) => {
        if (cancelled) return;
        setWorkbook(loaded);
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
          <button type="button" onClick={handleExport}>Export JSON</button>
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
          ["rooms", "Room Check"]
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
              {engineTools.slice(0, 12).map((tool) => (
                <a href={toolHref(tool)} key={tool.id}>
                  <span>{tool.dept}</span>
                  <strong>{tool.name}</strong>
                </a>
              ))}
            </div>
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
    </main>
  );
}
