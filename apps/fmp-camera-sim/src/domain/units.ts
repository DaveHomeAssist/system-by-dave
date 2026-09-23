// All geometry is metres and degrees internally. The interface defaults to feet.

export const M_PER_FT = 0.3048;
export const DEG = Math.PI / 180;

export type LengthUnit = "ft" | "m";

export const ftToM = (ft: number): number => ft * M_PER_FT;
export const mToFt = (m: number): number => m / M_PER_FT;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function toDisplayLength(metres: number, unit: LengthUnit): number {
  return unit === "ft" ? mToFt(metres) : metres;
}

export function fromDisplayLength(value: number, unit: LengthUnit): number {
  return unit === "ft" ? ftToM(value) : value;
}

export function formatLength(metres: number, unit: LengthUnit, digits = 1): string {
  const value = toDisplayLength(metres, unit);
  return `${value.toFixed(digits)} ${unit}`;
}

export function formatSigned(value: number, digits = 1): string {
  const rounded = Number(value.toFixed(digits));
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${sign}${Math.abs(rounded).toFixed(digits)}`;
}

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
