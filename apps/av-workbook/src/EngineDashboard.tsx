import type { AvWorkbook, WorkbookIssue } from "./types";

interface EngineDashboardProps {
  workbook: AvWorkbook;
  issues: WorkbookIssue[];
}

const categoryLabels: Record<WorkbookIssue["category"], string> = {
  audio: "Audio",
  rf: "RF",
  power: "Power",
  video: "Video",
  logistics: "Logistics",
  rooms: "Rooms",
  closeout: "Closeout"
};

function issueCount(issues: WorkbookIssue[], severity: WorkbookIssue["severity"]) {
  return issues.filter((issue) => issue.severity === severity).length;
}

function issuesFor(issues: WorkbookIssue[], category: WorkbookIssue["category"]) {
  return issues.filter((issue) => issue.category === category);
}

function loadPercent(estimated: number, breaker: number) {
  if (breaker <= 0) return 100;
  return Math.min(125, Math.round((estimated / breaker) * 100));
}

export function EngineDashboard({ workbook, issues }: EngineDashboardProps) {
  const categories = Array.from(new Set(issues.map((issue) => issue.category)));
  const zoneWeights = workbook.gearManifest.reduce<Record<string, number>>((acc, item) => {
    const zone = item.truckZone || "Unassigned";
    acc[zone] = (acc[zone] ?? 0) + (item.weightLbs ?? 0);
    return acc;
  }, {});

  return (
    <section className="engine-shell" aria-label="Workbook engine validation">
      <div className="engine-head">
        <div>
          <p className="kicker">Computed engines</p>
          <h2>Validation and operator views</h2>
          <p>These warnings are calculated from workbook data. They are the first pass at replacing manual worksheet judgment with reusable engines.</p>
        </div>
        <div className="issue-totals">
          <span className="red">{issueCount(issues, "red")} Red</span>
          <span className="yellow">{issueCount(issues, "yellow")} Yellow</span>
        </div>
      </div>

      <div className="engine-grid">
        <article className="engine-card">
          <h3>Audio Patch Matrix</h3>
          <div className="route-stack">
            {workbook.patchRecords.map((record) => {
              const source = workbook.signalSources.find((item) => item.id === record.signalSourceId);
              const line = workbook.lineChecks.find((item) => item.patchRecordId === record.id);
              return (
                <div className="route-card" key={record.id}>
                  <span>{record.console} · {record.channel}</span>
                  <strong>{source?.label ?? "Unknown source"}</strong>
                  <small>{record.stagebox || "No stagebox"} → {record.target || "No target"} · {line?.result ?? "unchecked"}</small>
                </div>
              );
            })}
          </div>
          <IssueList issues={issuesFor(issues, "audio")} />
        </article>

        <article className="engine-card">
          <h3>Power Balance</h3>
          <div className="meter-stack">
            {workbook.powerCircuits.map((circuit) => {
              const percent = loadPercent(circuit.estimatedAmps, circuit.breakerAmps);
              return (
                <div className="meter" key={circuit.id}>
                  <div><strong>{circuit.label}</strong><span>{percent}% · {circuit.source}</span></div>
                  <div className="meter-track"><span style={{ width: `${Math.min(percent, 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
          <IssueList issues={issuesFor(issues, "power")} />
        </article>

        <article className="engine-card">
          <h3>RF Frequency Lane</h3>
          <div className="rf-lane">
            {workbook.rfChannels.map((channel) => (
              <div className="rf-marker" key={channel.id}>
                <span>{channel.frequencyMhz.toFixed(3)} MHz</span>
                <strong>{channel.label}</strong>
                <small>{channel.scanned ? "Scanned" : "Unscanned"} · {channel.backupFrequencyMhz ? "Backup set" : "No backup"}</small>
              </div>
            ))}
          </div>
          <IssueList issues={issuesFor(issues, "rf")} />
        </article>

        <article className="engine-card">
          <h3>Video Signal Router</h3>
          <div className="route-stack">
            {workbook.videoRoutes.map((route) => (
              <div className="route-card" key={route.id}>
                <span>{route.resolution} · {route.frameRate}</span>
                <strong>{route.source}</strong>
                <small>{route.processor} → {route.destination}</small>
              </div>
            ))}
          </div>
          <IssueList issues={issuesFor(issues, "video")} />
        </article>

        <article className="engine-card">
          <h3>Truck Pack Allocator</h3>
          <div className="zone-grid">
            {Object.entries(zoneWeights).map(([zone, weight]) => (
              <div className="zone-card" key={zone}>
                <span>Zone {zone}</span>
                <strong>{weight} lb</strong>
              </div>
            ))}
          </div>
          <IssueList issues={issuesFor(issues, "logistics")} />
        </article>

        <article className="engine-card">
          <h3>Issue Index</h3>
          <div className="category-pills">
            {categories.length ? categories.map((category) => (
              <span key={category}>{categoryLabels[category]} · {issuesFor(issues, category).length}</span>
            )) : <span>All clear</span>}
          </div>
          <IssueList issues={issues.slice(0, 12)} />
        </article>
      </div>
    </section>
  );
}

function IssueList({ issues }: { issues: WorkbookIssue[] }) {
  if (!issues.length) return <p className="clear-state">No computed issues.</p>;
  return (
    <ul className="issue-list">
      {issues.map((issue) => (
        <li key={issue.id} className={issue.severity}>
          <strong>{issue.severity.toUpperCase()}</strong>
          <span>{issue.message}</span>
        </li>
      ))}
    </ul>
  );
}
