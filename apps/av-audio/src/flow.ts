import { z } from "zod";

export const KINDS = { mixer: "Mixer / source", crossover: "Crossover / DSP", amp: "Power amplifier", powered: "Powered speaker", passive: "Passive speaker", unknown: "Unconfirmed device" } as const;
export const LEVELS = { line: "Line level", speaker: "Speaker level", unknown: "Level unconfirmed" } as const;
const deviceSchema = z.object({ id: z.string().min(1), name: z.string(), kind: z.enum(["mixer", "crossover", "amp", "powered", "passive", "unknown"]), confirmed: z.boolean(), notes: z.string(), quantity: z.string() });
const wireSchema = z.object({ id: z.string().min(1), source: z.string(), target: z.string(), level: z.enum(["line", "speaker", "unknown"]), label: z.string(), sourcePort: z.string(), targetPort: z.string(), confirmed: z.boolean(), notes: z.string() });
export const flowSchema = z.object({ version: z.literal(1), devices: z.array(deviceSchema).max(100), connections: z.array(wireSchema).max(300) }).superRefine((flow, ctx) => {
  const ids = flow.devices.map(d => d.id), wires = flow.connections.map(w => w.id);
  if (new Set(ids).size !== ids.length || new Set(wires).size !== wires.length) ctx.addIssue({ code: "custom", message: "Duplicate flow identifiers" });
  if (flow.connections.some(w => !ids.includes(w.source) || !ids.includes(w.target) || w.source === w.target)) ctx.addIssue({ code: "custom", message: "Flow connection has missing or identical endpoints" });
});
export type AudioFlow = z.infer<typeof flowSchema>;
export type Device = AudioFlow["devices"][number];
export type Connection = AudioFlow["connections"][number];
export const emptyFlow = (): AudioFlow => ({ version: 1, devices: [], connections: [] });
export const newDevice = (): Device => ({ id: crypto.randomUUID(), name: "Unnamed device", kind: "unknown", confirmed: false, notes: "", quantity: "" });
export const newConnection = (): Connection => ({ id: crypto.randomUUID(), source: "", target: "", level: "unknown", label: "", sourcePort: "", targetPort: "", confirmed: false, notes: "" });

// Validate declared signal domains, never guess a level or a pinout from a label.
export function connectionProblem(flow: AudioFlow, wire: Connection): string {
  const source = flow.devices.find(d => d.id === wire.source), target = flow.devices.find(d => d.id === wire.target);
  if (!source || !target) return "Choose both endpoint devices.";
  if (source.id === target.id) return "Choose two different devices.";
  if (source.kind === "passive") return "Passive speaker outputs are not modelled; connect parallel speakers from the amp and label the link.";
  if (target.kind === "mixer" && wire.level === "speaker") return "A mixer line input cannot receive speaker level.";
  if (wire.level === "speaker" && ["powered", "amp", "crossover"].includes(target.kind)) return "Speaker level cannot feed this device's line input.";
  if (wire.level === "line" && target.kind === "passive") return "A passive speaker requires a power amplifier and speaker level.";
  if (wire.level === "line" && source.kind === "amp") return "Power amplifier outputs are speaker level in this model.";
  if (wire.level === "speaker" && ["mixer", "crossover", "powered"].includes(source.kind)) return "This device's external output is line level in this model.";
  return "";
}
export function traceFlow(flow: AudioFlow, selected: string) {
  const devices = new Set<string>(selected ? [selected] : flow.devices.map(d => d.id));
  const connections = new Set<string>();
  if (!selected) { flow.connections.forEach(w => connections.add(w.id)); return { devices, connections }; }
  // Walk each direction separately, so tracing one top never highlights its sibling.
  for (const forward of [true, false]) {
    const visited = new Set<string>([selected]), queue = [selected];
    while (queue.length) {
      const id = queue.shift()!;
      for (const wire of flow.connections.filter(w => (forward ? w.source : w.target) === id)) {
        const next = forward ? wire.target : wire.source;
        connections.add(wire.id); devices.add(next);
        if (!visited.has(next)) { visited.add(next); queue.push(next); }
      }
    }
  }
  return { devices, connections };
}
export function poweredTemplate(): AudioFlow {
  const devices: Device[] = [
    { id: "mixer", name: "DJ mixer / controller", kind: "mixer", confirmed: false, quantity: "", notes: "Model and output connectors unconfirmed." },
    { id: "crossover", name: "Crossover / distribution", kind: "crossover", confirmed: false, quantity: "", notes: "Function placeholder: hardware, routing, frequency and slopes unconfirmed. Not proof of a separate unit." },
    { id: "top-l", name: "Powered top L", kind: "powered", confirmed: false, quantity: "1", notes: "Built-in amplifier. Model and input connector unconfirmed. Separate mains power required." },
    { id: "top-r", name: "Powered top R", kind: "powered", confirmed: false, quantity: "1", notes: "Built-in amplifier. Model and input connector unconfirmed. Separate mains power required." },
    { id: "amp", name: "Sub power amplifier", kind: "amp", confirmed: false, quantity: "", notes: "Model, channel assignment and operating mode unconfirmed." },
    { id: "subs", name: "Passive subwoofer group", kind: "passive", confirmed: false, quantity: "", notes: "Quantity, impedance/load, wiring and pinout unconfirmed." },
  ];
  const connections: Connection[] = [
    ["master-l", "mixer", "crossover", "Master L", "line"], ["master-r", "mixer", "crossover", "Master R", "line"],
    ["top-l-feed", "crossover", "top-l", "Top L", "line"], ["top-r-feed", "crossover", "top-r", "Top R", "line"],
    ["sub-feed", "crossover", "amp", "Sub feed", "line"], ["sub-power", "amp", "subs", "Sub power", "speaker"],
  ].map(([id, source, target, label, level]) => ({ id, source, target, label, level: level as Connection["level"], sourcePort: "", targetPort: "", confirmed: false, notes: "Proposed route; verify actual connections." }));
  return { version: 1, devices, connections };
}
