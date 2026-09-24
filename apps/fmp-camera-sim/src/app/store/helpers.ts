import { type Preset } from "../../domain/session";

/** Exercises sample the simulation 30 times a second of simulation time. */
export const SAMPLE_TICKS = 8;
export const SAVE_DEBOUNCE_MS = 400;
export const OVERWRITE_WINDOW_S = 3;
export const PROGRESS_EMIT_INTERVAL_S = 0.2;

/** A result id. randomUUID needs a secure context, which an offline copy opened from disk may lack. */
export function newId(): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  return `r-${Date.now().toString(36)}-${random}`;
}

export function describePreset(preset: Preset): string {
  return preset.name ? `preset ${preset.slot} (${preset.name})` : `preset ${preset.slot}`;
}
