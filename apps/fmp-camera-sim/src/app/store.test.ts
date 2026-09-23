import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultProject, parseProjectText, serializeProject } from "../domain/project";
import { STORAGE_KEY } from "../storage/persist";
import { SimulatorStore } from "./store";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
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

/** A store with its clock driven in small steps from a local wall time. */
function makeStore(storage = new MemoryStorage()) {
  const store = new SimulatorStore(storage);
  let now = 0;
  store.advanceTo(0);
  const run = (seconds: number) => {
    const end = now + seconds;
    while (now < end) {
      now = Math.min(end, now + 0.02);
      store.advanceTo(now);
    }
  };
  return { store, storage, run, now: () => now };
}

describe("store profile resets", () => {
  it("keeps custom camera and venue identities so presets and saves stay valid", () => {
    const { store, storage, run, now } = makeStore();
    const project = defaultProject();
    project.camera.id = "fmp-cam4-p240-cal2027";
    project.venue.id = "fmp-alt";
    project.session.cameraId = project.camera.id;
    project.session.venueId = project.venue.id;
    project.session.presets = [
      { slot: 1, name: "Wide", cameraId: project.camera.id, pan: 4, tilt: -12, lens: 0.2, savedAt: "2026-09-23T07:00:00.000Z" },
    ];
    expect(store.importText(serializeProject(project), now()).ok).toBe(true);

    expect(store.resetCamera().ok).toBe(true);
    expect(store.resetVenue().ok).toBe(true);
    const state = store.getState();
    expect(state.project.camera.id).toBe("fmp-cam4-p240-cal2027");
    expect(state.project.venue.id).toBe("fmp-alt");

    store.recallPreset(1, now());
    expect(store.getState().announcement?.text).toMatch(/^Recalling preset 1/);
    run(10);
    expect(store.getTelemetry().snapshot.pose).toMatchObject({ pan: 4, tilt: -12 });

    store.flushSave();
    const saved = storage.getItem(STORAGE_KEY);
    expect(saved).not.toBeNull();
    expect(parseProjectText(saved as string).ok).toBe(true);
    expect(parseProjectText(store.exportText()).ok).toBe(true);
  });
});

describe("store replace prompt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("disarms a prompt-armed Store when the three-second window closes", () => {
    const { store, now } = makeStore();
    store.storePreset(1, now());
    expect(store.getState().project.session.presets).toHaveLength(1);
    store.storePreset(1, now());
    expect(store.getState().storeArmed).toBe(true);
    vi.advanceTimersByTime(3100);
    expect(store.getState().storeArmed).toBe(false);
    // Number keys recall again rather than silently arming a replace.
    store.recallPreset(1, now());
    expect(store.getState().announcement?.text).toMatch(/^Recalling preset 1/);
  });

  it("keeps Store armed when the operator armed it", () => {
    const { store, now } = makeStore();
    store.storePreset(2, now());
    store.armStore(true);
    store.storePreset(2, now());
    vi.advanceTimersByTime(5000);
    expect(store.getState().storeArmed).toBe(true);
  });
});

describe("store other-tab saves", () => {
  it("pauses autosave on another tab's save and lets the operator choose a copy", () => {
    const { store, storage, now } = makeStore();
    store.storePreset(3, now());
    store.flushSave();

    // Another tab writes a session with a different preset.
    const other = defaultProject();
    other.session.presets = [{ slot: 7, name: "Other tab", cameraId: other.camera.id, pan: 1, tilt: -9, lens: 0.5, savedAt: "2026-09-23T08:00:00.000Z" }];
    const otherText = serializeProject(other);
    storage.setItem(STORAGE_KEY, otherText);
    store.noteExternalSave();
    expect(store.getState().storageConflict).toBe(true);

    // This tab keeps working but does not overwrite the other copy.
    store.storePreset(4, now());
    store.flushSave();
    expect(storage.getItem(STORAGE_KEY)).toBe(otherText);

    expect(store.useSavedCopy(now()).ok).toBe(true);
    const presets = store.getState().project.session.presets;
    expect(presets.map((p) => p.slot)).toEqual([7]);
    expect(store.getState().storageConflict).toBe(false);
  });

  it("can keep this tab's copy instead", () => {
    const { store, storage, now } = makeStore();
    store.storePreset(5, now());
    storage.setItem(STORAGE_KEY, serializeProject(defaultProject()));
    store.noteExternalSave();
    store.keepThisCopy();
    const saved = parseProjectText(storage.getItem(STORAGE_KEY) as string);
    expect(saved.ok && saved.project.session.presets.map((p) => p.slot)).toEqual([5]);
  });
});

describe("store exercise guards", () => {
  it("refuses venue and performer edits while the follow exercise runs", () => {
    const { store, now } = makeStore();
    store.startExercise("follow", now());
    const venue = structuredClone(store.getState().project.venue);
    venue.dimensions.stageWidth.value += 2;
    const venueResult = store.updateVenue(venue);
    expect(venueResult.ok).toBe(false);
    expect(store.updatePerformer({ walkSpeed: 2 }).ok).toBe(false);
    store.resetExercise();
    expect(store.updateVenue(venue).ok).toBe(true);
  });
});
