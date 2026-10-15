import { describe, expect, it } from "vitest";
import { connectionProblem, flowSchema, poweredTemplate, traceFlow } from "./flow";
import { apply, blank, load, preview, save, STORE } from "./model";

describe("audio signal flow", () => {
  it("keeps every template identity and route unconfirmed and sub quantity unknown", () => {
    const flow = poweredTemplate();
    expect(flow.devices.every(d => !d.confirmed)).toBe(true);
    expect(flow.connections.every(w => !w.confirmed && !connectionProblem(flow, w))).toBe(true);
    expect(flow.devices.find(d => d.id === "subs")?.quantity).toBe("");
    expect(flow.connections.filter(w => w.target.startsWith("top-")).every(w => w.level === "line")).toBe(true);
  });
  it("prevents incompatible known levels without inventing unknown levels", () => {
    const flow = poweredTemplate(), wire = flow.connections[0];
    for (const target of ["top-l", "amp", "crossover", "mixer"]) expect(connectionProblem(flow, { ...wire, source: "amp", target, level: "speaker" })).not.toBe("");
    expect(connectionProblem(flow, { ...wire, source: "crossover", target: "subs", level: "line" })).toContain("power amplifier");
    expect(connectionProblem(flow, { ...wire, source: "crossover", target: "subs", level: "unknown" })).toBe("");
  });
  it("traces one speaker upstream without highlighting its sibling branches", () => {
    const flow = poweredTemplate(), trace = traceFlow(flow, "top-l");
    expect([...trace.devices].sort()).toEqual(["crossover", "mixer", "top-l"]);
    expect(trace.connections.has("sub-feed")).toBe(false);
    expect(trace.connections.has("top-r-feed")).toBe(false);
    expect(traceFlow(flow, "").connections.size).toBe(6);
  });
  it("terminates tracing on a cycle and rejects duplicate or dangling identifiers", () => {
    const flow = poweredTemplate();
    flow.connections.push({ ...flow.connections[0], id: "return", source: "crossover", target: "mixer" });
    expect(traceFlow(flow, "mixer").devices.size).toBe(6);
    expect(flowSchema.safeParse({ ...flow, devices: [...flow.devices, flow.devices[0]] }).success).toBe(false);
    expect(flowSchema.safeParse({ ...flow, connections: [{ ...flow.connections[0], target: "missing" }] }).success).toBe(false);
  });
  it("roundtrips flow, notes, unknowns and original rows via save, reload and export restore", async () => {
    let raw: string | null = null;
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
    const doc = { ...blank(), signalFlow: poweredTemplate(), channels: [{ id: "existing", origin: "legacy", legacy: { untouched: true }, source: "existing source" }] };
    doc.signalFlow.devices[0].notes = "Unknown output connector; do not assume XLR";
    save(storage, doc, null);
    expect(load(storage).doc).toEqual(doc);
    expect(apply(blank(), await preview(raw!, "backup.json"))).toEqual(doc);
    expect(() => save(storage, doc, null)).toThrow("another tab");
  });
  it("leaves old Audio v1 plans unchanged and blocks invalid flow recovery saves", () => {
    const old = blank(), raw = JSON.stringify(old);
    expect(load({ getItem: () => raw }).doc).toEqual(old);
    const broken = JSON.stringify({ ...old, signalFlow: { version: 99 } });
    const result = load({ getItem: key => key === STORE ? broken : null });
    expect(result.error).toContain("blocked"); expect(result.raw).toBe(broken);
  });
});
