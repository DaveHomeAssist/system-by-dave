import { useEffect, useMemo, useRef, useState } from "react";
import { Background, BackgroundVariant, Controls, ControlButton, Handle, MarkerType, MiniMap, Node, NodeProps, Position, ReactFlow, ReactFlowInstance, useNodesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DeviceKind, VideoDocument } from "./model";
import { addDevice, buildGraph, connectDevices, Device, diagramSvg, renameDevice, Wire } from "./graph";

type DeviceData = { device: Device; incoming: Wire[]; outgoing: Wire[]; active: boolean; dim: boolean };
type DeviceNodeType = Node<DeviceData, "device">;
const names: Record<DeviceKind, string> = { source: "Source", converter: "Converter", processor: "Routing / processing", destination: "Destination" };
function DeviceNode({ data }: NodeProps<DeviceNodeType>) {
  const { device, incoming, outgoing, active, dim } = data;
  const rows = Math.max(incoming.length, outgoing.length, 1);
  return <div className={`diagram-device kind-${device.kind} ${active ? "is-traced" : ""} ${dim ? "is-dimmed" : ""}`} style={{ height: 76 + rows * 26 }}>
    <div className="device-title"><span className="device-icon" aria-hidden="true">{device.kind === "source" ? "↗" : device.kind === "destination" ? "▣" : device.kind === "converter" ? "⇄" : "⤨"}</span><div><small>{names[device.kind]}</small><strong title={device.label}>{device.label}</strong></div>{device.issue && <span className="device-issue" title="A connected route has an issue" aria-label="Reported issue">!</span>}</div>
    <div className="device-port-labels"><div>{incoming.map((w, i) => <div key={w.id} title={w.targetPort || w.label}><Handle type="target" id={`i:${w.id}`} position={Position.Left} style={{ top: 63 + i * 26 }} /><span>{w.targetPort.replace(/^(Switcher|Recorder|Encoder) /i, "") || "Input"}</span></div>)}</div><div>{outgoing.map((w, i) => <div key={w.id}><span>{w.sourcePort || "Output"}</span><Handle type="source" id={`o:${w.id}`} position={Position.Right} style={{ top: 63 + i * 26 }} /></div>)}</div></div>
    <div className="device-new-ports">{device.kind !== "source" ? <span><Handle type="target" id="new-in" position={Position.Left} style={{ top: "auto", bottom: 11 }} />+ in</span> : <span />}{device.kind !== "destination" && <span>out +<Handle type="source" id="new-out" position={Position.Right} style={{ top: "auto", bottom: 11 }} /></span>}</div>
  </div>;
}
const nodeTypes = { device: DeviceNode };
type Props = { doc: VideoDocument; selected: string; onChange: (doc: VideoDocument) => void; onSelect: (id: string) => void; onEdit: () => void; onAddRoute: () => void; onSample: () => void; onImport: () => void; notify: (message: string, error?: boolean) => void };
export function FlowCanvas({ doc, selected, onChange, onSelect, onEdit, onAddRoute, onSample, onImport, notify }: Props) {
  const graph = useMemo(() => buildGraph(doc), [doc]);
  const [trace, setTrace] = useState(false);
  const [overview, setOverview] = useState(false);
  const [picked, setPicked] = useState("");
  const [connectTarget, setConnectTarget] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState<DeviceNodeType>([]);
  const flow = useRef<ReactFlowInstance<DeviceNodeType> | null>(null);
  const previousCount = useRef(0);
  const arrangePending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<Device | null>(null);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<DeviceKind>("source");
  const [deviceError, setDeviceError] = useState("");
  const device = graph.devices.find(d => d.id === picked);
  const selectedRoute = doc.routes.find(r => r.id === selected);
  const active = new Set(graph.devices.filter(d => d.routes.includes(selected)).map(d => d.id));
  useEffect(() => {
    setNodes(previous => graph.devices.map(d => ({ ...previous.find(p => p.id === d.id), id: d.id, type: "device", position: previous.find(p => p.id === d.id)?.dragging ? previous.find(p => p.id === d.id)!.position : d.position,
      selected: d.id === picked, ariaLabel: `${names[d.kind]}: ${d.label}`, data: { device: d, incoming: graph.wires.filter(w => w.target === d.id), outgoing: graph.wires.filter(w => w.source === d.id), active: trace && active.has(d.id), dim: trace && !active.has(d.id) } })));
  }, [graph, trace, selected, picked, setNodes]);
  useEffect(() => {
    if (!graph.devices.length) previousCount.current = 0;
    if ((previousCount.current === 0 || arrangePending.current) && nodes.length && nodes.length === graph.devices.length && nodes.every(n => n.measured?.width && n.measured?.height)) {
      previousCount.current = nodes.length; arrangePending.current = false; fit();
    }
  }, [nodes, graph.devices.length]);
  const edges = graph.wires.map(w => ({ id: w.id, source: w.source, target: w.target, sourceHandle: `o:${w.id}`, targetHandle: `i:${w.id}`, type: "smoothstep", label: w.label,
    ariaLabel: `Connection ${graph.devices.find(d => d.id === w.source)?.label} to ${graph.devices.find(d => d.id === w.target)?.label}`,
    interactionWidth: 28, markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    className: `diagram-wire ${w.issue ? "wire-issue" : ""} ${trace && w.routes.includes(selected) ? "wire-traced" : ""} ${trace && !w.routes.includes(selected) ? "wire-dimmed" : ""}`,
    style: { strokeWidth: trace && w.routes.includes(selected) ? 3 : 1.8 }, labelBgPadding: [7, 5] as [number, number], labelBgBorderRadius: 4,
  }));
  function fit() { if (window.innerWidth <= 680) { const first = flow.current?.getNodes()[0]; if (first) { void flow.current?.setCenter(first.position.x + 120, first.position.y + 60, { zoom: .85, duration: 0 }); return; } } void flow.current?.fitView({ padding: .15, duration: 0, maxZoom: 1, minZoom: .2 }); }
  function openDevice(old: Device | null = null) { if (old?.id.startsWith("empty:")) { onSelect(old.routes[0]); onEdit(); setPicked(""); return; } setEditing(old); setLabel(old?.label || ""); setKind(old?.kind || "source"); setDeviceError(""); dialog.current?.showModal(); }
  function commitDevice() {
    try {
      const next = editing ? renameDevice(doc, editing.label, label) : addDevice(doc, label, kind);
      onChange(next); dialog.current?.close(); setPicked("");
      notify(editing ? "Shared device renamed in every connected route." : "Device added. Drag between its output and another device's input to connect them.");
      if (!editing) { const added = buildGraph(next).devices.find(d => d.label === label.trim()); if (added) void flow.current?.setCenter(added.position.x + 120, added.position.y + 60, { zoom: Math.min(flow.current?.getZoom() || 1, 1), duration: 0 }); }
    } catch (error) { setDeviceError(error instanceof Error ? error.message : "Could not update this device."); }
  }
  function connect(sourceId: string, targetId: string, sourceHandle?: string | null, targetHandle?: string | null) {
    const source = graph.devices.find(d => d.id === sourceId), target = graph.devices.find(d => d.id === targetId);
    if (!source || !target) return;
    try { const result = connectDevices(doc, source, target); result.route.output = graph.wires.find(w => `o:${w.id}` === sourceHandle)?.sourcePort || ""; result.route.input = graph.wires.find(w => `i:${w.id}` === targetHandle)?.targetPort || ""; onChange(result.doc); onSelect(result.route.id); setTrace(true); setPicked(""); onEdit(); notify("Connection added. Assign its format, connector and ports in Route details."); }
    catch (error) { notify(error instanceof Error ? error.message : "Connection could not be added.", true); }
  }
  function exportDiagram() {
    const url = URL.createObjectURL(new Blob([diagramSvg(doc)], { type: "image/svg+xml" }));
    const a = document.createElement("a"); a.href = url; a.download = "signal-flow.svg"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="flow-workspace" aria-label="Interactive signal flow">
    <div className="flow-toolbar"><div className="flow-heading"><h2>Signal flow</h2><span>{graph.devices.length} devices <i>·</i> {graph.wires.length} connections</span></div><div className="flow-actions"><button type="button" className="primary" onClick={() => openDevice()}>Add device</button><button type="button" onClick={onAddRoute}>Add route</button><button type="button" onClick={() => { arrangePending.current = true; onChange({ ...doc, graphPositions: {} }); }}>Arrange</button><button type="button" onClick={exportDiagram} disabled={!graph.devices.length}>Export diagram</button></div></div>
    <div className="flow-route-bar"><label>Route<select aria-label="Select route to trace" value={selectedRoute?.id || ""} onChange={e => { onSelect(e.target.value); setTrace(true); setPicked(""); }}><option value="">All routes</option>{doc.routes.map(r => <option value={r.id} key={r.id}>{r.route || r.source || "Untitled route"}</option>)}</select></label><button type="button" aria-pressed={trace} disabled={!selectedRoute} onClick={() => setTrace(!trace)}>Trace path</button><button type="button" onClick={onEdit} disabled={!selectedRoute}>Edit route</button><span className="flow-route-format">{selectedRoute ? [selectedRoute.format, selectedRoute.connector, selectedRoute.status].filter(Boolean).join(" · ") : "Connect devices to build your signal paths"}</span></div>
    <div className="flow-canvas">
      <ReactFlow<DeviceNodeType> nodes={nodes} edges={edges} nodeTypes={nodeTypes} onInit={instance => { flow.current = instance; }} fitView={window.innerWidth > 680} fitViewOptions={{ padding: .15, maxZoom: 1 }} minZoom={.15} maxZoom={2} deleteKeyCode={null} nodesConnectable edgesReconnectable={false} onNodesChange={changes => {
        onNodesChange(changes);
        const moved = changes.filter(c => c.type === "position" && !c.dragging && c.position);
        if (moved.length) { const positions = Object.fromEntries(nodes.map(n => [n.id, n.position])); moved.forEach(c => { if (c.type === "position" && c.position) positions[c.id] = c.position; }); onChange({ ...doc, graphPositions: positions }); }
      }} onNodeClick={(_, n) => { setPicked(n.id); setConnectTarget(""); }} onNodeDoubleClick={(_, n) => openDevice(n.data.device)} onPaneClick={() => setPicked("")} onEdgeClick={(_, e) => { const wire = graph.wires.find(w => w.id === e.id); if (wire) { onSelect(wire.routes[0]); setTrace(true); setPicked(""); } }} onConnect={c => connect(c.source, c.target, c.sourceHandle, c.targetHandle)} isValidConnection={c => c.source !== c.target} aria-label="Signal flow diagram">
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--av-line-strong)" />
        <Controls showInteractive={false} fitViewOptions={{ padding: .15, maxZoom: 1 }}><ControlButton title="Toggle overview" aria-label="Toggle overview" aria-pressed={overview} onClick={() => setOverview(!overview)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2" /><path d="m8 3 1 18m7-18-1 18" /></svg></ControlButton></Controls>
        {overview && <MiniMap<DeviceNodeType> pannable zoomable nodeColor={n => n.data.device.kind === "processor" ? "#9e432b" : "#a99584"} maskColor="var(--av-overlay)" />}
      </ReactFlow>
      {!graph.devices.length && <div className="flow-empty"><span aria-hidden="true" className="flow-empty-symbol">↗ → ▣</span><h3>Design the signal path</h3><p>Add sources, processors and destinations. Connect their ports, then trace the path from camera to screen.</p><button type="button" className="primary" onClick={() => openDevice()}>Add your first device</button><button type="button" onClick={onSample}>Try a sample plan</button><button type="button" onClick={onImport}>Import existing sheets</button></div>}
      {device && <div className="device-selection"><div><small>Selected device</small><strong>{device.label}</strong><span>{device.routes.length} connected routes</span></div><button type="button" onClick={() => openDevice(device)}>Rename device</button>{device.kind !== "destination" && <form onSubmit={e => { e.preventDefault(); if (connectTarget) connect(device.id, connectTarget); }}><label>Connect to<select aria-label="Connect to device" value={connectTarget} onChange={e => setConnectTarget(e.target.value)}><option value="">Choose destination</option>{graph.devices.filter(d => d.id !== device.id && d.kind !== "source").map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></label><button type="submit" disabled={!connectTarget}>Connect</button></form>}{device.routes.length === 0 && <button type="button" className="danger" onClick={() => { const positions = { ...doc.graphPositions }; delete positions[device.id]; onChange({ ...doc, graphDevices: doc.graphDevices.filter(d => d.label !== device.label), graphPositions: positions }); setPicked(""); notify("Unused device removed."); }}>Remove unused device</button>}<button type="button" className="device-close" aria-label="Close device details" onClick={() => setPicked("")}>×</button></div>}
      {graph.devices.length > 0 && <div className="diagram-hint">Drag devices to arrange · drag between ports to connect · select a cable to trace</div>}
    </div>
    <dialog ref={dialog} aria-labelledby="device-dialog-title"><form onSubmit={e => { e.preventDefault(); commitDevice(); }}><h2 id="device-dialog-title">{editing ? "Rename shared device" : "Add device"}</h2><p>{editing ? `Updates the device name in ${editing.routes.length} connected routes. Original imports stay intact.` : "Give each physical device a unique name. Matching names share one device on the diagram."}</p><label>Device name<input autoFocus value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Camera 2 or Production switcher" /></label>{!editing && <label>Device role<select value={kind} onChange={e => setKind(e.target.value as DeviceKind)}>{Object.entries(names).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>}{deviceError && <p role="alert">{deviceError}</p>}<div className="row-actions"><button type="button" onClick={() => dialog.current?.close()}>Cancel</button><button type="submit" className="primary">{editing ? "Rename device" : "Add to diagram"}</button></div></form></dialog>
  </section>;
}
