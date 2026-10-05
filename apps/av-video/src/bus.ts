import { Route, VideoDocument } from "./model";

/* Switcher bus: live operator state derived from the plan's routes.
   A switcher is a route's processor, or a device that feeds routes as their
   source. Its inputs are the processor inputs routes name; its outputs are
   processor outputs and source outputs. Program, preview and AUX selections
   are live state: they never edit the plan and nothing is inferred from a
   device name. Outputs named Program/PGM follow program; every other output
   is "not set" until the operator assigns it. */

export type BusInput = { port: string; source: string; routes: string[] };
export type BusOutput = { port: string; destinations: string[]; program: boolean };
export type Switcher = { name: string; inputs: BusInput[]; outputs: BusOutput[] };
export type BusState = { pgm: string; pvw: string; assign: Record<string, string> };
export const PROGRAM = "PGM";
const isProgram = (port: string) => /\b(program|pgm)\b/i.test(port);

export function switchers(doc: VideoDocument): Switcher[] {
  const names = new Set(doc.routes.map(r => r.processor.trim()).filter(Boolean));
  return [...names].sort().map(name => {
    const inputs = new Map<string, BusInput>();
    const outputs = new Map<string, BusOutput>();
    for (const r of doc.routes) {
      if (r.processor.trim() === name && r.input.trim()) {
        const i = inputs.get(r.input) || { port: r.input, source: r.source, routes: [] };
        i.routes.push(r.id); if (!i.source) i.source = r.source; inputs.set(r.input, i);
      }
      const port = r.processor.trim() === name ? r.processorOutput.trim() : r.source.trim() === name ? r.output.trim() : "";
      if (port) {
        const o = outputs.get(port) || { port, destinations: [], program: isProgram(port) };
        if (r.destination && !o.destinations.includes(r.destination)) o.destinations.push(r.destination);
        outputs.set(port, o);
      }
    }
    return { name, inputs: [...inputs.values()], outputs: [...outputs.values()] };
  }).filter(s => s.inputs.length > 0);
}

export function initialBus(s: Switcher): BusState {
  return { pgm: s.inputs[0]?.port || "", pvw: s.inputs[1]?.port || s.inputs[0]?.port || "", assign: {} };
}
/* Cut: preview goes to program and program to preview. */
export function cut(state: BusState): BusState { return { ...state, pgm: state.pvw, pvw: state.pgm }; }

/* What an output is carrying: an input port, program, or nothing assigned. */
export function feedOf(s: Switcher, state: BusState, port: string): { input: string; via: "program" | "assigned" | "unset" } {
  const out = s.outputs.find(o => o.port === port);
  if (out?.program) return { input: state.pgm, via: "program" };
  const a = state.assign[port];
  if (a === PROGRAM) return { input: state.pgm, via: "program" };
  if (a) return { input: a, via: "assigned" };
  return { input: "", via: "unset" };
}
export function sourceAt(s: Switcher, port: string) { return s.inputs.find(i => i.port === port)?.source || ""; }

export type Tile = { key: string; name: string; showing: string; tag: string; state: "program" | "preview" | "live" | "unset" | "direct" | "unrouted"; route?: string };
/* Multiview: program, preview, then every destination with what it shows. */
export function multiview(doc: VideoDocument, list: Switcher[], bus: Record<string, BusState>): Tile[] {
  const tiles: Tile[] = [];
  const main = list[0];
  if (main) {
    const st = bus[main.name] || initialBus(main);
    tiles.push({ key: "pgm", name: `Program · ${main.name}`, showing: sourceAt(main, st.pgm) || "Nothing selected", tag: "PGM", state: "program" });
    tiles.push({ key: "pvw", name: `Preview · ${main.name}`, showing: sourceAt(main, st.pvw) || "Nothing selected", tag: "PVW", state: "preview" });
  }
  const destinations = [...new Set(doc.routes.map(r => r.destination.trim()).filter(Boolean))];
  for (const d of destinations) {
    if (list.some(s => s.name === d)) continue;
    const r = doc.routes.find(x => x.destination.trim() === d && fed(x, list)) || doc.routes.find(x => x.destination.trim() === d)!;
    const s = list.find(x => x.name === r.processor.trim()) || list.find(x => x.name === r.source.trim());
    if (!s) { tiles.push({ key: `d:${d}`, name: d, showing: r.source || "Source needed", tag: "", state: r.source ? "direct" : "unrouted", route: r.id }); continue; }
    const port = r.processor.trim() === s.name ? r.processorOutput.trim() : r.output.trim();
    const st = bus[s.name] || initialBus(s);
    if (!port) { tiles.push({ key: `d:${d}`, name: d, showing: "Switcher output not set in Patch", tag: "", state: "unset", route: r.id }); continue; }
    const f = feedOf(s, st, port);
    tiles.push({ key: `d:${d}`, name: d, showing: f.via === "unset" ? `${port} · not assigned` : sourceAt(s, f.input) || f.input, tag: f.via === "program" ? "PGM" : f.via === "assigned" ? port : "", state: f.via === "program" ? "live" : f.via === "assigned" ? "direct" : "unset", route: r.id });
  }
  return tiles;
}
const fed = (r: Route, list: Switcher[]) => list.some(s => s.name === r.processor.trim() || s.name === r.source.trim());
