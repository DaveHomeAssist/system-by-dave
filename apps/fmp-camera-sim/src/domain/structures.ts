import { type Evidence, readProvenance, VENUE_STATUS_OPTIONS, SETTLED_VENUE_STATUSES } from "./evidence";
import { IssueList, readBoolean, readEnum, readNumber, readObject, readString } from "./validate";

export interface SceneValue<T> extends Evidence { value: T }
export type ScenePoint = { right: number; height: number; upstage: number };
export type FixtureKind = "fan" | "railing" | "display-support" | "pa" | "drape" | "truss" | "backline" | "led" | "foh";
export interface SceneFixture {
  id: string;
  kind: FixtureKind;
  enabled: SceneValue<boolean>;
  position: SceneValue<ScenePoint>;
  size: SceneValue<ScenePoint>;
  yaw: SceneValue<number>;
  display?: { pixelWidth: SceneValue<number>; pixelHeight: SceneValue<number>; pitchMm: SceneValue<number> };
}
export interface StructuresRecord {
  version: 1;
  shell: Record<"halfWidth" | "frontUpstage" | "rearDownstage" | "rearCurve" | "eaveHeight" | "ridgeHeight" | "rearFloor" | "bayCount" | "openingHeight" | "catwalkSpan", SceneValue<number>>;
  fixtures: SceneFixture[];
}
export interface ShowPackage { version: 1; name: string; fixtures: SceneFixture[] }
export const sceneDemo = <T>(value: T, note = "Unmeasured procedural assumption. Photos establish presence and relationships only."): SceneValue<T> => ({ value, status: "demo", note, provenance: { method: "assumption", sourceIds: [] } });
const fixture = (id: string, kind: FixtureKind, right: number, height: number, upstage: number, width: number, tall: number, depth: number): SceneFixture => ({ id, kind, enabled: sceneDemo(true), position: sceneDemo({ right, height, upstage }), size: sceneDemo({ right: width, height: tall, upstage: depth }), yaw: sceneDemo(0) });
const operatorConfirmed = (value: number, note: string): SceneValue<number> => ({ value, status: "confirmed", note, provenance: { method: "operator", sourceIds: ["operator-display-spec-20260923"] } });
function led(id: string, x: number, y: number, upstage: number, pitch: number, yaw = 0): SceneFixture {
  const f = fixture(id, "led", x, y, upstage, 7.2, 4.05, 0.25);
  f.yaw.value = yaw;
  f.size.note = "Demo physical size. The 1600 × 900 pixel space is not verified as native LED resolution and does not establish wall dimensions.";
  f.display = {
    pixelWidth: operatorConfirmed(1600, "Operator supplied pixel space; processor canvas versus native wall resolution unresolved."),
    pixelHeight: operatorConfirmed(900, "Operator supplied pixel space; does not determine physical height."),
    pitchMm: operatorConfirmed(pitch, "Operator correction: 10 mm side walls, 8 mm delay walls."),
  };
  return f;
}
export function defaultStructures(): StructuresRecord {
  return { version: 1, shell: {
    halfWidth: sceneDemo(55), frontUpstage: sceneDemo(24), rearDownstage: sceneDemo(57), rearCurve: sceneDemo(12),
    eaveHeight: sceneDemo(17), ridgeHeight: sceneDemo(24), rearFloor: sceneDemo(13.066), bayCount: sceneDemo(12), openingHeight: sceneDemo(13), catwalkSpan: sceneDemo(30),
  }, fixtures: [
    fixture("fan-left", "fan", -13, 16, -12, 5, 0.4, 5), fixture("fan-right", "fan", 13, 16, -12, 5, 0.4, 5),
    fixture("fan-rear", "fan", 0, 18, -30, 5, 0.4, 5),
    fixture("rail-left", "railing", -26, 7, -25, 8, 1.05, 0.08), fixture("rail-right", "railing", 26, 7, -25, 8, 1.05, 0.08),
    led("Stage Right LED", 23, 8, 0, 10), led("Stage Left LED", -23, 8, 0, 10),
    led("D3 lawn delay", 40, 17, -47, 8, -30), led("D1 lawn delay", 15, 19, -57, 8, -12),
    led("D2 lawn delay", -15, 19, -57, 8, 12), led("D4 lawn delay", -40, 17, -47, 8, 30),
    { ...fixture("Front of House", "foh", 0, 0.15, -36.5, 7, 1.1, 6), position: sceneDemo({right: 0, height: 0.15, upstage: -36.5}, "Mix position at the front of section 202 in the seating plan. Horizontal position and footprint unmeasured. Height is clearance above the highest local bowl tread.") },
    fixture("display-support-left", "display-support", -23, 5, 0, 0.3, 10, 0.3), fixture("display-support-right", "display-support", 23, 5, 0, 0.3, 10, 0.3),
  ] };
}
export function defaultShowPackage(): ShowPackage {
  return { version: 1, name: "Demo concert", fixtures: [
    fixture("pa-left", "pa", -14, 8, -1, 1.2, 5, 0.9), fixture("pa-right", "pa", 14, 8, -1, 1.2, 5, 0.9),
    fixture("leg-left", "drape", -18, 5.75, 1.2, 1.2, 11.5, 0.12), fixture("leg-right", "drape", 18, 5.75, 1.2, 1.2, 11.5, 0.12),
    fixture("show-truss", "truss", 0, 11, 2, 30, 0.7, 0.7),
    fixture("Touring video wall", "led", 0, 6.74, 18.34, 14, 7.875, 0.2),
    fixture("demo-backline", "backline", 0, 0, 0, 1, 1, 1),
  ] };
}
const ranges = { halfWidth: [35, 100], frontUpstage: [10, 60], rearDownstage: [35, 120], rearCurve: [0, 25], eaveHeight: [14, 50], ridgeHeight: [14, 60], rearFloor: [0, 30], bayCount: [4, 24], openingHeight: [6, 30], catwalkSpan: [5, 90] } as const;
function evidence(issues: IssueList, r: Record<string, unknown>, path: string): Evidence {
  const status = readEnum(issues, r.status, `${path}.status`, VENUE_STATUS_OPTIONS) ?? "demo";
  const note = readString(issues, r.note, `${path}.note`) ?? "";
  const provenance = readProvenance(issues, r.provenance, `${path}.provenance`);
  return { status, note, ...(provenance ? { provenance } : {}) };
}
function number(issues: IssueList, raw: unknown, path: string, min: number, max: number): SceneValue<number> {
  const r = readObject(issues, raw, path) ?? {};
  return { value: readNumber(issues, r.value, `${path}.value`, { min, max }) ?? min, ...evidence(issues, r, path) };
}
function point(issues: IssueList, raw: unknown, path: string, size: boolean): SceneValue<ScenePoint> {
  const r = readObject(issues, raw, path) ?? {}, v = readObject(issues, r.value, `${path}.value`) ?? {};
  const value = { right: 0, height: 0, upstage: 0 };
  for (const key of ["right", "height", "upstage"] as const) value[key] = readNumber(issues, v[key], `${path}.value.${key}`, { min: size ? 0.01 : -150, max: 150 }) ?? 0;
  return { value, ...evidence(issues, r, path) };
}
function display(issues: IssueList, raw: unknown, path: string): NonNullable<SceneFixture["display"]> {
  const r = readObject(issues, raw, path) ?? {};
  const result = { pixelWidth: number(issues, r.pixelWidth, `${path}.pixelWidth`, 1, 16384), pixelHeight: number(issues, r.pixelHeight, `${path}.pixelHeight`, 1, 16384), pitchMm: number(issues, r.pitchMm, `${path}.pitchMm`, 0.1, 100) };
  for (const key of ["pixelWidth", "pixelHeight"] as const) if (!Number.isInteger(result[key].value)) issues.add(`${path}.${key}.value`, "Expected a whole pixel count.");
  return result;
}
/** Footprint test shared by seat clearance and physical FOH construction. Coordinates are stage based. */
export function fixtureContains(f: SceneFixture, right: number, upstage: number, clearance = 0): boolean {
  const angle = f.yaw.value * Math.PI / 180, dx = -right + f.position.value.right, dz = -upstage + f.position.value.upstage;
  const x = Math.cos(angle) * dx - Math.sin(angle) * dz, z = Math.sin(angle) * dx + Math.cos(angle) * dz;
  return Math.abs(x) <= f.size.value.right / 2 + clearance && Math.abs(z) <= f.size.value.upstage / 2 + clearance;
}
function fixtures(issues: IssueList, raw: unknown, path: string, allowed: readonly FixtureKind[]): SceneFixture[] {
  if (!Array.isArray(raw) || raw.length > 40) { issues.add(path, "Expected up to 40 fixtures."); return []; }
  const ids = new Set<string>();
  return raw.map((entry, i) => {
    const p = `${path}[${i}]`, r = readObject(issues, entry, p) ?? {};
    const id = readString(issues, r.id, `${p}.id`, { maxLength: 60, allowEmpty: false }) ?? "";
    if (ids.has(id)) issues.add(`${p}.id`, "Fixture IDs must be unique."); ids.add(id);
    const enabled = readObject(issues, r.enabled, `${p}.enabled`) ?? {};
    return { id, kind: readEnum(issues, r.kind, `${p}.kind`, allowed) ?? allowed[0],
      enabled: { value: readBoolean(issues, enabled.value, `${p}.enabled.value`) ?? false, ...evidence(issues, enabled, `${p}.enabled`) },
      position: point(issues, r.position, `${p}.position`, false), size: point(issues, r.size, `${p}.size`, true),
      yaw: r.yaw === undefined ? sceneDemo(0) : number(issues, r.yaw, `${p}.yaw`, -180, 180),
      ...(r.display === undefined ? {} : { display: display(issues, r.display, `${p}.display`) }) };
  });
}
export function parseStructures(raw: unknown, issues: IssueList, path = "venue.structures"): StructuresRecord {
  if (raw === undefined) return defaultStructures();
  const r = readObject(issues, raw, path) ?? {}, s = readObject(issues, r.shell, `${path}.shell`) ?? {};
  if (r.version !== 1) issues.add(`${path}.version`, "Expected structures version 1.");
  const shell = {} as StructuresRecord["shell"];
  for (const key of Object.keys(ranges) as Array<keyof typeof ranges>) shell[key] = number(issues, s[key], `${path}.shell.${key}`, ranges[key][0], ranges[key][1]);
  if (!Number.isInteger(shell.bayCount.value)) issues.add(`${path}.shell.bayCount.value`, "Expected a whole number.");
  if (shell.ridgeHeight.value < shell.eaveHeight.value) issues.add(`${path}.shell.ridgeHeight.value`, "Ridge cannot be below the eave.");
  if (shell.rearFloor.value >= shell.eaveHeight.value - 1) issues.add(`${path}.shell.rearFloor.value`, "Rear bays need at least 1 m of clearance.");
  return { version: 1, shell, fixtures: fixtures(issues, r.fixtures, `${path}.fixtures`, ["fan", "railing", "display-support", "led", "foh"]) };
}
export function parseShowPackage(raw: unknown, issues: IssueList, path = "session.showPackage"): ShowPackage {
  if (raw === undefined) return defaultShowPackage();
  const r = readObject(issues, raw, path) ?? {};
  if (r.version !== 1) issues.add(`${path}.version`, "Expected show package version 1.");
  return { version: 1, name: readString(issues, r.name, `${path}.name`, { maxLength: 80, allowEmpty: false }) ?? "", fixtures: fixtures(issues, r.fixtures, `${path}.fixtures`, ["pa", "drape", "truss", "backline", "led"]) };
}
export function structuresAreSettled(s: StructuresRecord): boolean {
  return Object.values(s.shell).every(v => SETTLED_VENUE_STATUSES.has(v.status)) && s.fixtures.every(f => [f.enabled, f.position, f.size, f.yaw].every(v => SETTLED_VENUE_STATUSES.has(v.status)));
}
