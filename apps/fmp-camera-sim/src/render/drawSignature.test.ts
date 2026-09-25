import { describe, expect, it } from "vitest";
import { SimulatorStore } from "../app/store";
import { sceneSignature, signatureChanged } from "./drawSignature";

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function makeStore() {
  const store = new SimulatorStore(new MemoryStorage());
  let now = 0;
  store.advanceTo(0);
  const run = (seconds: number) => {
    const end = now + seconds;
    while (now < end) {
      now = Math.min(end, now + 0.02);
      store.advanceTo(now);
    }
  };
  return { store, run, now: () => now };
}

describe("render on demand", () => {
  it("skips a still camera and draws once it moves", () => {
    const { store, run, now } = makeStore();
    const still = sceneSignature(store.getTelemetry(), 0, 0);
    run(2);
    expect(signatureChanged(still, sceneSignature(store.getTelemetry(), 0, 0))).toBe(false);
    store.setDrive({ pan: 1, tilt: 0, zoom: 0 }, now());
    run(0.2);
    expect(signatureChanged(still, sceneSignature(store.getTelemetry(), 0, 0))).toBe(true);
  });

  it("draws for a zoom, an invalidation or a quality step", () => {
    const { store, run, now } = makeStore();
    const base = sceneSignature(store.getTelemetry(), 0, 0);
    expect(signatureChanged(base, sceneSignature(store.getTelemetry(), 1, 0))).toBe(true);
    expect(signatureChanged(base, sceneSignature(store.getTelemetry(), 0, 2))).toBe(true);
    store.setDrive({ pan: 0, tilt: 0, zoom: 1 }, now());
    run(0.3);
    expect(signatureChanged(base, sceneSignature(store.getTelemetry(), 0, 0))).toBe(true);
  });

  it("ignores the walked distance of a performer standing still", () => {
    const { store } = makeStore();
    const t = store.getTelemetry();
    const a = sceneSignature({ ...t, performer: { ...t.performer, moving: false, stride: 1 } }, 0, 0);
    const b = sceneSignature({ ...t, performer: { ...t.performer, moving: false, stride: 7 } }, 0, 0);
    const walking = sceneSignature({ ...t, performer: { ...t.performer, moving: true, stride: 7 } }, 0, 0);
    expect(signatureChanged(a, b)).toBe(false);
    expect(signatureChanged(b, walking)).toBe(true);
  });

  it("always draws the first frame", () => {
    const { store } = makeStore();
    expect(signatureChanged(null, sceneSignature(store.getTelemetry(), 0, 0))).toBe(true);
  });
});
