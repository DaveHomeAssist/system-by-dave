import { orthogonalPath } from "./routing";
import { DeviceKind, newRoute, Route, uid, VideoDocument } from "./model";

export type Device = { id: string; label: string; kind: DeviceKind; position: { x: number; y: number }; routes: string[]; inputs: number; outputs: number; issue: boolean };
export type Wire = { id: string; source: string; target: string; routes: string[]; label: string; connector: string; format: string; sourcePort: string; targetPort: string; issue: boolean };
export const deviceId = (label: string) => `device:${encodeURIComponent(label)}`;
export const deviceHeight = (d: Device) => 76 + Math.max(d.inputs, d.outputs, 1) * 26;
const fields = ["source", "converter", "processor", "destination"] as const;
export function buildGraph(doc: VideoDocument): { devices: Device[]; wires: Wire[] } {
  const nodes = new Map<string, Device>();
  const roles = new Map<string, Set<DeviceKind>>();
  const wires = new Map<string, Wire>();
  function node(label: string, kind: DeviceKind, route?: Route, field?: string) {
    const id = label.trim() ? deviceId(label) : `empty:${route?.id}:${field}`;
    if (!nodes.has(id)) nodes.set(id, { id, label: label || `${kind === "source" ? "Source" : "Destination"} needed`, kind, position: { x: 0, y: 0 }, routes: [], inputs: 0, outputs: 0, issue: false });
    const n = nodes.get(id)!;
    const set = roles.get(id) || new Set<DeviceKind>(); set.add(kind); roles.set(id, set);
    if (route && !n.routes.includes(route.id)) n.routes.push(route.id);
    // A reported route issue does not identify a failed device.
    return id;
  }
  doc.graphDevices.forEach(d => node(d.label, d.kind));
  for (const route of doc.routes) {
    const hops = [node(route.source, "source", route, "source")];
    if (doc.modules.patch && route.converter) hops.push(node(route.converter, "converter", route));
    if (route.processor) hops.push(node(route.processor, "processor", route));
    hops.push(node(route.destination, "destination", route, "destination"));
    for (let i = 0; i < hops.length - 1; i++) {
      const source = hops[i], target = hops[i + 1];
      if (source === target) continue;
      const atConverter = doc.modules.patch && route.converter && source === deviceId(route.converter);
      const atProcessor = route.processor && source === deviceId(route.processor);
      const sourcePort = !doc.modules.patch ? "" : atConverter ? route.converterOutput : atProcessor ? route.processorOutput : route.output;
      const targetPort = !doc.modules.patch ? "" : route.processor && target === deviceId(route.processor) ? route.input : i === hops.length - 2 ? (route.processor ? route.destinationInput : route.input) : "";
      // Never infer a converter or processor output from the upstream cable.
      const connector = atConverter ? route.converterConnector : atProcessor ? route.processorConnector : route.connector;
      const format = atConverter ? route.converterFormat : atProcessor ? route.processorFormat : route.format;
      const id = `wire:${encodeURIComponent(JSON.stringify([source, target, sourcePort, targetPort]))}`;
      const label = [connector || "Connector unknown", format || "Format unknown"].join(" · ");
      if (!wires.has(id)) wires.set(id, { id, source, target, routes: [], label, connector, format, sourcePort, targetPort, issue: false });
      else if (wires.get(id)!.label !== label) { wires.get(id)!.label = "Conflicting route signal details"; wires.get(id)!.connector = ""; wires.get(id)!.format = ""; }
      const wire = wires.get(id)!; wire.routes.push(route.id); wire.issue ||= route.status === "issue";
    }
  }
  const columns: Record<DeviceKind, number> = { source: 0, converter: 1, processor: 2, destination: 3 };
  const groups: Device[][] = [[], [], [], []];
  for (const device of nodes.values()) {
    const set = roles.get(device.id)!;
    if (set.has("processor") || (set.has("source") && set.has("destination"))) device.kind = "processor";
    else if (set.has("converter")) device.kind = "converter";
    else if (set.has("destination")) device.kind = "destination";
    device.inputs = [...wires.values()].filter(w => w.target === device.id).length;
    device.outputs = [...wires.values()].filter(w => w.source === device.id).length;
    groups[columns[device.kind]].push(device);
  }
  const heights = groups.map(group => group.reduce((sum, d) => sum + deviceHeight(d) + 34, -34));
  const highest = Math.max(...heights, 102);
  const occupied = [...nodes.values()].filter(d => doc.graphPositions[d.id]).map(d => ({ position: doc.graphPositions[d.id], height: deviceHeight(d) }));
  groups.forEach((group, column) => {
    let y = 40 + (highest - heights[column]) / 2;
    group.forEach(device => {
      device.position = doc.graphPositions[device.id] || { x: column * 330 + 40, y };
      if (!doc.graphPositions[device.id]) {
        let collision;
        do {
          collision = occupied.find(o => device.position.x < o.position.x + 264 && device.position.x + 264 > o.position.x && device.position.y < o.position.y + o.height + 24 && device.position.y + deviceHeight(device) + 24 > o.position.y);
          if (collision) device.position.y = collision.position.y + collision.height + 34;
        } while (collision);
        occupied.push({ position: device.position, height: deviceHeight(device) });
      }
      y += deviceHeight(device) + 34;
    });
  });
  return { devices: [...nodes.values()], wires: [...wires.values()] };
}
export function addDevice(doc: VideoDocument, label: string, kind: DeviceKind): VideoDocument {
  label = label.trim();
  if (!label) throw new Error("Give the device a name.");
  if (buildGraph(doc).devices.some(d => d.label === label)) throw new Error("That device is already on the diagram. Use a unique name for a second unit.");
  return { ...doc, graphDevices: [...doc.graphDevices, { id: uid(), label, kind }] };
}
export function renameDevice(doc: VideoDocument, old: string, label: string): VideoDocument {
  label = label.trim(); if (!label) throw new Error("Give the device a name.");
  if (label === old) return doc;
  if (buildGraph(doc).devices.some(d => d.label === label)) throw new Error("That name belongs to another device. Choose a unique name.");
  const positions = { ...doc.graphPositions };
  if (positions[deviceId(old)]) { positions[deviceId(label)] = positions[deviceId(old)]; delete positions[deviceId(old)]; }
  return { ...doc, graphPositions: positions,
    graphDevices: doc.graphDevices.map(d => d.label === old ? { ...d, label } : d),
    routes: doc.routes.map(r => {
      const next = { ...r }; fields.forEach(field => { if (next[field] === old) next[field] = label; }); return next;
    }) };
}
export function connectDevices(doc: VideoDocument, source: Device, target: Device): { doc: VideoDocument; route: Route } {
  if (source.id === target.id) throw new Error("Choose a different destination.");
  if (source.kind === "destination" || target.kind === "source") throw new Error("Connect a device output to an input.");
  if (source.id.startsWith("empty:") || target.id.startsWith("empty:")) throw new Error("Name both devices before connecting them.");
  const route = { ...newRoute(), type: "", route: `${source.label} → ${target.label}`, source: source.label, destination: target.label };
  return { doc: { ...doc, routes: [...doc.routes, route] }, route };
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
export function diagramSvg(doc: VideoDocument): string {
  const { devices, wires } = buildGraph(doc);
  const xMin = Math.min(0, ...devices.map(n => n.position.x)) - 40;
  const yMin = Math.min(0, ...devices.map(n => n.position.y)) - 90;
  const width = Math.max(700, ...devices.map(n => n.position.x + 270)) - xMin;
  const height = Math.max(300, ...devices.map(n => n.position.y + deviceHeight(n) + 40)) - yMin;
  const lines = wires.map(w => {
    const a = devices.find(d => d.id === w.source)!, b = devices.find(d => d.id === w.target)!;
    const x1 = a.position.x + 240, y1 = a.position.y + 63 + wires.filter(edge => edge.source === a.id).indexOf(w) * 26;
    const x2 = b.position.x - 8, y2 = b.position.y + 63 + wires.filter(edge => edge.target === b.id).indexOf(w) * 26;
    const routed = orthogonalPath({ x: x1, y: y1 }, { x: x2, y: y2 }, devices.map(d => ({ x: d.position.x, y: d.position.y, width: 240, height: deviceHeight(d) })));
    return `<g><title>${escape(w.label)}</title><path d="${routed.path}" fill="none" stroke="${w.issue ? "#9a392d" : "#526574"}" stroke-width="2" ${routed.blocked ? "" : 'marker-end="url(#arrow)"'}/>${routed.blocked ? `<text x="${x1 + 24}" y="${y1 - 9}" font-size="10">Arrange overlapping devices</text>` : ""}${routed.label && routed.label.width > w.connector.length * 7 + 16 ? `<text x="${routed.label.x}" y="${routed.label.y - 9}" text-anchor="middle" font-size="10">${escape(w.connector || "?")}</text>` : ""}</g>`;
  }).join("");
  const boxes = devices.map(n => {
    const ports = (side: "input" | "output") => wires.filter(w => side === "input" ? w.target === n.id : w.source === n.id).map((w, i) => {
      const label = (side === "input" ? w.targetPort : w.sourcePort) || side;
      return `<g><title>${escape(label)}</title><circle cx="${side === "input" ? 0 : 240}" cy="${63 + i * 26}" r="3" fill="#526574"/><text x="${side === "input" ? 12 : 228}" y="${67 + i * 26}" text-anchor="${side === "input" ? "start" : "end"}" font-size="10">${escape(label.length > 17 ? `${label.slice(0, 16)}…` : label)}</text></g>`;
    }).join("");
    return `<g transform="translate(${n.position.x} ${n.position.y})"><title>${escape(n.label)}</title><rect width="240" height="${deviceHeight(n)}" rx="8" fill="#fffcf7" stroke="#a99584"/><text x="12" y="20" font-size="10" fill="#62594f">${escape(n.kind.toUpperCase())}</text><text x="12" y="41" font-size="14" font-weight="600">${escape(n.label.length > 27 ? `${n.label.slice(0, 26)}…` : n.label)}</text>${ports("input")}${ports("output")}<text x="12" y="${deviceHeight(n) - 9}" font-size="10" fill="#62594f">${n.inputs} in · ${n.outputs} out</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${xMin} ${yMin} ${width} ${height}"><title>${escape(doc.title)}</title><rect x="${xMin}" y="${yMin}" width="${width}" height="${height}" fill="#eee8df"/><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#526574"/></marker></defs><g font-family="Arial,sans-serif" fill="#211d1a"><text x="${xMin + 35}" y="${yMin + 40}" font-size="23" font-weight="600">${escape(doc.title)}</text><text x="${xMin + 35}" y="${yMin + 62}" font-size="11">AV Video · ${doc.routes.length} planned routes</text>${lines}${boxes}</g></svg>`;
}
