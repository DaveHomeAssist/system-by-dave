import { type Evidence, readProvenance, VENUE_STATUS_OPTIONS, SETTLED_VENUE_STATUSES, isEvidenceStatus } from "./evidence";
import { IssueList, readEnum, readNumber, readObject, readString } from "./validate";

export interface BowlValue<T> extends Evidence { value: T }
export interface BowlPoint { row: BowlValue<number>; elevation: BowlValue<number> }
export interface BowlSector {
  id: string;
  label: string;
  level: BowlValue<number>;
  fromDeg: BowlValue<number>;
  toDeg: BowlValue<number>;
  rowCount: BowlValue<number>;
  rowRun: BowlValue<number>;
  aisleGap: BowlValue<number>;
  seatPitch: BowlValue<number>;
  elevations: BowlPoint[];
}
export interface BowlRecord {
  version: 1;
  focusUpstage: BowlValue<number>;
  frontOffset: BowlValue<number>;
  sectors: BowlSector[];
  band: { rowIndex: BowlValue<number>; width: BowlValue<number>; elevationStep: BowlValue<number>; railingHeight: BowlValue<number> };
}
const demo = (value: number, note = "Unmeasured starting geometry; verify on site."): BowlValue<number> => ({ value, status: "demo", note, provenance: { method: "assumption", sourceIds: [] } });
export function defaultBowl(): BowlRecord {
  const sectors: BowlSector[] = [];
  // P096 establishes topology only. Angles are deliberately provisional, not scaled measurements.
  for (const [level, boundaries] of [[1, [-54, -25, -14, 14, 25, 54]], [2, [-58, -35, -20, 20, 35, 58]]] as const) {
    const rows = level === 1 ? 28 : 22;
    for (let i = 0; i < 5; i++) sectors.push({
      id: `${level}0${i}`, label: `${level}0${i}`, level: demo(level),
      fromDeg: demo(boundaries[i], "Unequal spans informed by P096; angle unmeasured."),
      toDeg: demo(boundaries[i + 1], "Unequal spans informed by P096; angle unmeasured."),
      rowCount: demo(rows), rowRun: demo(0.9), aisleGap: demo(1.6), seatPitch: demo(0.52),
      elevations: [{ row: demo(0), elevation: demo(0) }, { row: demo(rows), elevation: demo(rows * (level === 1 ? 0.15 : 0.42)) }],
    });
  }
  return { version: 1, focusUpstage: demo(8), frontOffset: demo(1), sectors,
    band: { rowIndex: demo(28), width: demo(2.4), elevationStep: demo(0.9), railingHeight: demo(1.05) } };
}
function numberRecord(issues: IssueList, value: unknown, path: string, min: number, max: number, integer = false): BowlValue<number> {
  const r = readObject(issues, value, path);
  const fallback = demo(min);
  if (!r) return fallback;
  const n = readNumber(issues, r.value, `${path}.value`, { min, max });
  if (n !== null && integer && !Number.isInteger(n)) issues.add(`${path}.value`, "Expected a whole number.");
  const status = readEnum(issues, r.status, `${path}.status`, VENUE_STATUS_OPTIONS);
  const note = readString(issues, r.note, `${path}.note`);
  const provenance = readProvenance(issues, r.provenance, `${path}.provenance`);
  return { value: n ?? min, status: status ?? "demo", note: note ?? "", ...(provenance ? { provenance } : {}) };
}
export function parseBowl(value: unknown, issues: IssueList, path = "venue.bowl"): BowlRecord {
  if (value === undefined) return defaultBowl();
  const r = readObject(issues, value, path);
  if (!r) return defaultBowl();
  if (r.version !== 1) issues.add(`${path}.version`, "Expected bowl version 1.");
  const b = readObject(issues, r.band, `${path}.band`) ?? {};
  const result: BowlRecord = { version: 1,
    focusUpstage: numberRecord(issues, r.focusUpstage, `${path}.focusUpstage`, 1, 30),
    frontOffset: numberRecord(issues, r.frontOffset, `${path}.frontOffset`, 0, 10), sectors: [],
    band: { rowIndex: numberRecord(issues, b.rowIndex, `${path}.band.rowIndex`, 1, 80, true), width: numberRecord(issues, b.width, `${path}.band.width`, 0.5, 8), elevationStep: numberRecord(issues, b.elevationStep, `${path}.band.elevationStep`, 0, 3), railingHeight: numberRecord(issues, b.railingHeight, `${path}.band.railingHeight`, 0, 2) } };
  if (!Array.isArray(r.sectors) || r.sectors.length < 2 || r.sectors.length > 16) {
    issues.add(`${path}.sectors`, "Expected 2–16 sectors."); return result;
  }
  r.sectors.forEach((raw, i) => {
    const p = `${path}.sectors[${i}]`; const s = readObject(issues, raw, p); if (!s) return;
    const id = readString(issues, s.id, `${p}.id`, { maxLength: 40, allowEmpty: false }) ?? "";
    const label = readString(issues, s.label, `${p}.label`, { maxLength: 60, allowEmpty: false }) ?? "";
    const sector: BowlSector = { id, label, level: numberRecord(issues, s.level, `${p}.level`, 1, 2, true),
      fromDeg: numberRecord(issues, s.fromDeg, `${p}.fromDeg`, -85, 85), toDeg: numberRecord(issues, s.toDeg, `${p}.toDeg`, -85, 85),
      rowCount: numberRecord(issues, s.rowCount, `${p}.rowCount`, 2, 80, true), rowRun: numberRecord(issues, s.rowRun, `${p}.rowRun`, 0.6, 1.5),
      aisleGap: numberRecord(issues, s.aisleGap, `${p}.aisleGap`, 0.2, 6), seatPitch: numberRecord(issues, s.seatPitch, `${p}.seatPitch`, 0.4, 1), elevations: [] };
    if (sector.toDeg.value - sector.fromDeg.value <= sector.aisleGap.value) issues.add(`${p}.toDeg.value`, "Sector must be wider than its aisle gap.");
    if (!Array.isArray(s.elevations) || s.elevations.length < 2 || s.elevations.length > 12) issues.add(`${p}.elevations`, "Expected 2–12 elevation control points.");
    else s.elevations.forEach((rawPoint, j) => {
      const q = `${p}.elevations[${j}]`; const point = readObject(issues, rawPoint, q) ?? {};
      sector.elevations.push({ row: numberRecord(issues, point.row, `${q}.row`, 0, sector.rowCount.value, true), elevation: numberRecord(issues, point.elevation, `${q}.elevation`, 0, 30) });
    });
    const pts = sector.elevations;
    if (pts[0]?.row.value !== 0 || pts[0]?.elevation.value !== 0 || pts.at(-1)?.row.value !== sector.rowCount.value) issues.add(`${p}.elevations`, "Control points must start at row 0 / elevation 0 and end at row count.");
    pts.forEach((point, j) => { if (j && (point.row.value <= pts[j - 1].row.value || point.elevation.value < pts[j - 1].elevation.value)) issues.add(`${p}.elevations[${j}]`, "Rows must increase and elevations cannot fall."); });
    result.sectors.push(sector);
  });
  const ids = new Set<string>();
  result.sectors.forEach((s, i) => {
    if (ids.has(s.id)) issues.add(`${path}.sectors[${i}].id`, "Sector IDs must be unique."); ids.add(s.id);
    for (const other of result.sectors.slice(0, i)) if (s.level.value === other.level.value && s.fromDeg.value < other.toDeg.value && other.fromDeg.value < s.toDeg.value) issues.add(`${path}.sectors[${i}].fromDeg.value`, "Sectors on the same level cannot overlap.");
  });
  for (const level of [1, 2]) if (!result.sectors.some(s => s.level.value === level)) issues.add(`${path}.sectors`, `Level ${level} needs at least one sector.`);
  const lowerRows = Math.max(...result.sectors.filter(s => s.level.value === 1).map(s => s.rowCount.value));
  if (result.band.rowIndex.value > lowerRows) issues.add(`${path}.band.rowIndex.value`, "Band must begin within or at the end of the lower level.");
  return result;
}
export function elevationAt(s: BowlSector, row: number): number {
  for (let i = 1; i < s.elevations.length; i++) {
    const a = s.elevations[i - 1], b = s.elevations[i];
    if (row <= b.row.value) return a.elevation.value + (b.elevation.value - a.elevation.value) * (row - a.row.value) / (b.row.value - a.row.value);
  }
  return s.elevations.at(-1)!.elevation.value;
}
export interface BowlRow { sectorId: string; row: number; inner: number; outer: number; y: number; nextY: number; fromDeg: number; toDeg: number; seatPitch: number }
/** Shared metre-space solver: the inspector and every tread/seat use these exact coordinates. */
export function solveBowl(b: BowlRecord, pitDepth: number, deckHeight: number) {
  const lower = b.sectors.filter(s => s.level.value === 1);
  const lowerRun = Math.max(...lower.map(s => s.rowCount.value * s.rowRun.value));
  const lowerRise = Math.max(...lower.map(s => elevationAt(s, s.rowCount.value)));
  const firstRadius = b.focusUpstage.value + pitDepth + b.frontOffset.value;
  const floor = -deckHeight + 0.25;
  const rows: BowlRow[] = [];
  const segments: Array<{ sectorId: string; fromRow: number; toRow: number; run: number; rise: number; grade: number; angle: number; frontY: number; backY: number }> = [];
  for (const s of b.sectors) {
    const upper = s.level.value === 2;
    const start = firstRadius + (upper ? lowerRun : 0);
    const base = floor + (upper ? lowerRise : 0);
    for (let row = 0; row < s.rowCount.value; row++) {
      const bandPassed = upper || row >= b.band.rowIndex.value;
      const inner = start + row * s.rowRun.value + (bandPassed ? b.band.width.value : 0);
      const y = base + elevationAt(s, row) + (bandPassed ? b.band.elevationStep.value : 0);
      rows.push({ sectorId: s.id, row, inner, outer: inner + s.rowRun.value, y, nextY: base + elevationAt(s, row + 1) + (bandPassed ? b.band.elevationStep.value : 0), fromDeg: s.fromDeg.value + s.aisleGap.value / 2, toDeg: s.toDeg.value - s.aisleGap.value / 2, seatPitch: s.seatPitch.value });
    }
    const cuts = s.elevations.map(p => p.row.value);
    if (!upper && b.band.rowIndex.value < s.rowCount.value && !cuts.includes(b.band.rowIndex.value)) cuts.push(b.band.rowIndex.value);
    cuts.sort((a, z) => a - z);
    for (let j = 1; j < cuts.length; j++) {
      const fromRow = cuts[j - 1], toRow = cuts[j];
      const run = (toRow - fromRow) * s.rowRun.value, rise = elevationAt(s, toRow) - elevationAt(s, fromRow);
      const step = upper || fromRow >= b.band.rowIndex.value ? b.band.elevationStep.value : 0;
      segments.push({ sectorId: s.id, fromRow, toRow, run, rise, grade: 100 * rise / run, angle: Math.atan2(rise, run) * 180 / Math.PI, frontY: base + elevationAt(s, fromRow) + step, backY: base + elevationAt(s, toRow) + step });
    }
  }
  const bandRadius = firstRadius + Math.max(...lower.map(s => Math.min(b.band.rowIndex.value, s.rowCount.value) * s.rowRun.value));
  const bandY = floor + Math.max(...lower.map(s => elevationAt(s, Math.min(b.band.rowIndex.value, s.rowCount.value))));
  return { rows, segments, firstRadius, floor, bandRadius, bandY, extent: Math.max(...rows.map(r => r.outer)) + b.focusUpstage.value };
}

export function bowlIsSettled(bowl: BowlRecord): boolean {
  const visit = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return true;
    if ("status" in value && "value" in value) return isEvidenceStatus(value.status) && SETTLED_VENUE_STATUSES.has(value.status);
    return Object.values(value).every(visit);
  };
  return visit(bowl);
}
