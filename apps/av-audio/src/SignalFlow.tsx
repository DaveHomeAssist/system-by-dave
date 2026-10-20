import { useEffect, useId, useRef, useState } from "react";
import { connectionProblem, deviceConnectionProblem, emptyFlow, KINDS, LEVELS, newConnection, newDevice, poweredTemplate, traceFlow, type AudioFlow, type Connection, type Device } from "./flow";
import "./flow.css";

type Props = { value?: AudioFlow; onChange: (flow: AudioFlow) => void };
export function SignalFlow({ value, onChange }: Props) {
  const flow = value || emptyFlow();
  const [selected, setSelected] = useState("");
  const [mode, setMode] = useState<"diagram" | "routes" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setCompact(entries[0].contentRect.width < 680));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const display = mode || (compact ? "routes" : "diagram");
  const [device, setDevice] = useState<Device | null>(null);
  const [wire, setWire] = useState<Connection | null>(null);
  const [error, setError] = useState("");
  const [starter, setStarter] = useState(false);
  const marker = useId().replace(/:/g, "");
  const trace = traceFlow(flow, selected);
  const selectedDevice = flow.devices.find(d => d.id === selected);
  const positions = new Map<string, { x: number; y: number }>();
  const stages = [["mixer"], ["crossover", "unknown"], ["amp"], ["powered", "passive"]];
  stages.forEach((kinds, stage) => flow.devices.filter(d => kinds.includes(d.kind)).forEach((d, i) => positions.set(d.id, { x: 24 + stage * 340, y: 40 + i * 138 + (stage === 0 || stage === 1 ? 98 : stage === 2 ? 276 : 0) })));
  const height = Math.max(460, ...Array.from(positions.values(), p => p.y + 140));
  const name = (id: string) => flow.devices.find(d => d.id === id)?.name || "Unknown device";
  const issues = flow.connections.filter(w => connectionProblem(flow, w));
  function saveDevice() {
    if (!device?.name.trim()) { setError("Enter a device name."); return; }
    if (flow.devices.length >= 100 && !flow.devices.some(d => d.id === device.id)) { setError("This flow supports up to 100 devices."); return; }
    const attachedProblem = deviceConnectionProblem(flow, device);
    if (attachedProblem) { setError(attachedProblem); return; }
    onChange({ ...flow, devices: flow.devices.some(d => d.id === device.id) ? flow.devices.map(d => d.id === device.id ? device : d) : [...flow.devices, device] });
    setSelected(device.id); setDevice(null); setError("");
  }
  function saveWire() {
    if (!wire) return;
    const problem = connectionProblem(flow, wire);
    if (problem) { setError(problem); return; }
    if (flow.connections.length >= 300 && !flow.connections.some(w => w.id === wire.id)) { setError("This flow supports up to 300 connections."); return; }
    onChange({ ...flow, connections: flow.connections.some(w => w.id === wire.id) ? flow.connections.map(w => w.id === wire.id ? wire : w) : [...flow.connections, wire] });
    setWire(null); setError("");
  }
  return <div className="audio-flow" ref={root}>
    <div className="audio-flow-toolbar">
      <label>Trace device<select aria-label="Trace device" value={selectedDevice ? selected : ""} onChange={e => setSelected(e.target.value)}><option value="">Whole system</option>{flow.devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      <button aria-pressed={display === "diagram"} onClick={() => setMode("diagram")}>Diagram</button><button aria-pressed={display === "routes"} onClick={() => setMode("routes")}>Connections</button>
      <button onClick={() => { setDevice(newDevice()); setWire(null); setError(""); }}>Add device</button><button disabled={flow.devices.length < 2} onClick={() => { setWire(newConnection()); setDevice(null); setError(""); }}>Add connection</button>
    </div>
    <div className="audio-flow-legend"><span className="level-line">━ Line level</span><span className="level-speaker">━ Speaker level</span><span className="level-unknown">━ Level unconfirmed</span><span>┄ Unconfirmed route</span></div>
    <p className="audio-flow-note">Logical audio routing · Mains power not shown · Devices and connections are independent of channel and speaker tables. Save plan to keep changes.</p>
    {issues.length > 0 && <p role="alert" className="audio-flow-error">{issues.length} connection(s) have a signal mismatch. Open Connections to review. This drawing is not a wiring approval.</p>}
    {!flow.devices.length && <div className="audio-flow-empty"><h3>Trace the whole audio system</h3><p>Add devices and connect their outputs to inputs, or review a starting layout.</p><button onClick={() => setStarter(true)}>Powered tops + passive subs template</button></div>}
    {starter && <section className="audio-flow-editor" aria-label="Template preview"><h3>Review starting layout</h3><p>Mixer L/R → crossover/distribution → powered tops at line level. Sub feed → power amplifier → passive subs at speaker level.</p><p>Every device and route starts unconfirmed. Models, crossover settings, sub quantity and amp mode stay unknown. No existing table records are changed.</p><button onClick={() => { onChange(poweredTemplate()); setStarter(false); }}>Use unconfirmed template</button><button onClick={() => setStarter(false)}>Cancel template</button></section>}
    {flow.devices.length > 0 && display === "diagram" && <div className="audio-flow-canvas" role="region" aria-label="Audio signal diagram. Scroll to explore; use Trace device or Connections for full labels." tabIndex={0}>
      <svg viewBox={`0 0 1320 ${height}`} width="1320" height={height} role="group" aria-label="Audio signal flow: blue line level, orange speaker level, grey unknown. Dashed routes are unconfirmed.">
        <defs>{Object.keys(LEVELS).map(level => <marker key={level} id={`${marker}-${level}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" className={`arrow-${level}`}/></marker>)}</defs>
        {["SOURCE", "PROCESSING / DISTRIBUTION", "POWER AMPLIFICATION", "LOUDSPEAKERS"].map((label, i) => <text className="audio-flow-stage" key={label} x={24 + i * 340} y="25">{label}</text>)}
        {flow.connections.map(w => {
          const a = positions.get(w.source), b = positions.get(w.target); if (!a || !b) return null;
          const outgoing = flow.connections.filter(c => c.source === w.source), incoming = flow.connections.filter(c => c.target === w.target);
          const sy = a.y + 45 + outgoing.indexOf(w) * Math.min(18, 65 / outgoing.length), ty = b.y + 45 + incoming.indexOf(w) * Math.min(18, 65 / incoming.length);
          const sx = a.x + 260, tx = b.x, mid = (sx + tx) / 2;
          return <g key={w.id} className={`${trace.connections.has(w.id) ? "" : "audio-flow-dim"} wire-${w.level}`}><title>{name(w.source)} → {name(w.target)}: {w.label || "Unnamed connection"}, {LEVELS[w.level]}, {w.confirmed ? "confirmed" : "unconfirmed"}</title><path d={`M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${ty}, ${tx - 6} ${ty}`} fill="none" strokeWidth="3" strokeDasharray={w.confirmed ? undefined : "7 5"} markerEnd={`url(#${marker}-${w.level})`}/><text x={tx - 10} y={ty - 9} textAnchor="end">{w.level === "unknown" ? "LEVEL ?" : w.level.toUpperCase()}</text></g>;
        })}
        {flow.devices.map(d => { const p = positions.get(d.id)!; return <g key={d.id} role="button" tabIndex={0} aria-label={`Trace ${d.name}`} aria-pressed={selected === d.id} onClick={() => setSelected(selected === d.id ? "" : d.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(selected === d.id ? "" : d.id); } }} transform={`translate(${p.x},${p.y})`} className={`audio-flow-node ${trace.devices.has(d.id) ? "" : "audio-flow-dim"} ${selected === d.id ? "is-selected" : ""}`}>
          <title>{d.name} — {KINDS[d.kind]} — {d.confirmed ? "Confirmed" : "Unconfirmed"} — Quantity: {d.quantity || "unconfirmed"}. {d.notes}</title><rect width="260" height="126" rx="8"/><text x="14" y="24" className="node-kind">{KINDS[d.kind]}</text><text x="14" y="50" className="node-name">{d.name.length > 28 ? `${d.name.slice(0, 27)}…` : d.name}</text><text x="14" y="74">{d.confirmed ? "Confirmed device" : "UNCONFIRMED device"}</text><text x="14" y="96">{d.kind === "powered" ? "LINE IN · built-in amp" : d.kind === "amp" ? "LINE IN → SPEAKER OUT" : d.kind === "passive" ? "SPEAKER IN" : "Ports: see Connections"}</text><text x="14" y="115">Qty: {d.quantity || "unconfirmed"}</text>
        </g>; })}
      </svg>
    </div>}
    {display === "routes" && <div className="audio-flow-routes">{flow.connections.filter(w => trace.connections.has(w.id)).map(w => <article key={w.id} className={`route-${w.level}`}><h3>{name(w.source)} <span aria-label="to">→</span> {name(w.target)}</h3><strong>{LEVELS[w.level]} · {w.confirmed ? "Confirmed route" : "UNCONFIRMED route"}</strong><p>{w.label || "Connection name unconfirmed"}</p><p>Output: {w.sourcePort || "unconfirmed"} → Input: {w.targetPort || "unconfirmed"}</p>{w.notes && <p>{w.notes}</p>}{connectionProblem(flow, w) && <p className="audio-flow-error">{connectionProblem(flow, w)}</p>}<button onClick={() => { setWire({ ...w }); setDevice(null); setError(""); }}>Edit {w.label || "connection"}</button></article>)}{!flow.connections.length && <p>No connections recorded.</p>}</div>}
    {selectedDevice && <section className="audio-flow-detail"><h3>{selectedDevice.name}</h3><p>{KINDS[selectedDevice.kind]} · {selectedDevice.confirmed ? "Confirmed device" : "UNCONFIRMED device"} · Quantity: {selectedDevice.quantity || "unconfirmed"}</p><p>{selectedDevice.notes || "No additional details recorded."}</p><button onClick={() => { setDevice({ ...selectedDevice }); setWire(null); setError(""); }}>Edit selected device</button><button onClick={() => setMode("routes")}>Show traced connections</button></section>}
    {device && <form className="audio-flow-editor" aria-label="Device editor" onSubmit={e => { e.preventDefault(); saveDevice(); }}><h3>Device details</h3><label>Name<input autoFocus value={device.name} onChange={e => setDevice({ ...device, name: e.target.value })}/></label><label>Device role<select aria-label="Device role" value={device.kind} onChange={e => setDevice({ ...device, kind: e.target.value as Device["kind"] })}>{Object.entries(KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Quantity (blank = unconfirmed)<input value={device.quantity} onChange={e => setDevice({ ...device, quantity: e.target.value })}/></label><label>Evidence / unknowns<textarea value={device.notes} onChange={e => setDevice({ ...device, notes: e.target.value })}/></label><label><input type="checkbox" checked={device.confirmed} onChange={e => setDevice({ ...device, confirmed: e.target.checked })}/>Device identity confirmed</label><button type="submit">Apply device</button><button type="button" onClick={() => setDevice(null)}>Cancel edit</button>{flow.devices.some(d => d.id === device.id) && <button type="button" onClick={() => { if (window.confirm("Delete this device and its attached connections from the unsaved plan?")) { onChange({ ...flow, devices: flow.devices.filter(d => d.id !== device.id), connections: flow.connections.filter(w => w.source !== device.id && w.target !== device.id) }); setDevice(null); setSelected(""); } }}>Delete device</button>}</form>}
    {wire && <form className="audio-flow-editor" aria-label="Connection editor" onSubmit={e => { e.preventDefault(); saveWire(); }}><h3>Connection details</h3>{(["source", "target"] as const).map(key => <label key={key}>{key === "source" ? "From device" : "To device"}<select aria-label={key === "source" ? "From device" : "To device"} value={wire[key]} onChange={e => setWire({ ...wire, [key]: e.target.value })}><option value="">Choose device</option>{flow.devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>)}<label>Signal level<select aria-label="Signal level" value={wire.level} onChange={e => setWire({ ...wire, level: e.target.value as Connection["level"] })}>{Object.entries(LEVELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{(["label", "sourcePort", "targetPort", "notes"] as const).map(key => <label key={key}>{{ label: "Connection name", sourcePort: "Output connector / pins", targetPort: "Input connector / pins", notes: "Evidence / unknowns" }[key]}<input value={wire[key]} onChange={e => setWire({ ...wire, [key]: e.target.value })}/></label>)}<label><input type="checkbox" checked={wire.confirmed} onChange={e => setWire({ ...wire, confirmed: e.target.checked })}/>Route physically confirmed</label><button type="submit">Apply connection</button><button type="button" onClick={() => setWire(null)}>Cancel edit</button>{flow.connections.some(w => w.id === wire.id) && <button type="button" onClick={() => { if (window.confirm("Delete this connection from the unsaved plan?")) { onChange({ ...flow, connections: flow.connections.filter(w => w.id !== wire.id) }); setWire(null); } }}>Delete connection</button>}</form>}
    {error && <p role="alert" className="audio-flow-error">{error}</p>}
  </div>;
}
