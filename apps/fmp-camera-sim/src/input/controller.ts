import { type SimulatorStore } from "../app/store";
import { type DriveInput } from "../sim/ptz";

// The input adapter turns every control surface into one commanded deflection. Each source owns
// its own value; on each axis the strongest source wins. Releasing a source, losing focus or a
// cancelled touch removes that source, which stops the motion it was commanding.

export type InputSource = "keyboard" | "joystick" | "zoomRocker" | "zoomButton";

export const nowSeconds = (): number => performance.now() / 1000;

/** Event timestamps share performance.now()'s origin; fall back to now for synthetic events. */
export function eventSeconds(event?: { timeStamp?: number }): number {
  const stamp = event?.timeStamp;
  const now = performance.now();
  // Guard against browsers or tests that report a stamp from another clock.
  return (typeof stamp === "number" && stamp > 0 && stamp <= now + 1 ? stamp : now) / 1000;
}

export class InputController {
  private sources = new Map<InputSource, Partial<DriveInput>>();

  constructor(private readonly store: SimulatorStore) {}

  set(source: InputSource, value: Partial<DriveInput>, wallSeconds: number): void {
    this.sources.set(source, value);
    this.apply(wallSeconds);
  }

  release(source: InputSource, wallSeconds: number): void {
    if (!this.sources.delete(source)) return;
    this.apply(wallSeconds);
  }

  releaseAll(wallSeconds: number): void {
    if (this.sources.size === 0) return;
    this.sources.clear();
    this.apply(wallSeconds);
  }

  isActive(source?: InputSource): boolean {
    return source ? this.sources.has(source) : this.sources.size > 0;
  }

  combined(): DriveInput {
    const out: DriveInput = { pan: 0, tilt: 0, zoom: 0 };
    for (const value of this.sources.values()) {
      for (const axis of ["pan", "tilt", "zoom"] as const) {
        const v = value[axis] ?? 0;
        if (Math.abs(v) > Math.abs(out[axis])) out[axis] = v;
      }
    }
    return out;
  }

  private apply(wallSeconds: number): void {
    this.store.setDrive(this.combined(), wallSeconds);
  }
}
