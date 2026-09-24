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

  it("ignores another tab's save when it holds this same session", () => {
    const { store, storage } = makeStore();
    const same = serializeProject(defaultProject(), "2026-09-24T01:00:00.000Z");
    storage.setItem(STORAGE_KEY, same);
    store.noteExternalSave(same);
    expect(store.getState().storageConflict).toBe(false);
  });

  it("saves this tab's session again when another tab removes the saved copy", () => {
    vi.useFakeTimers();
    try {
      const { store, storage, now } = makeStore();
      store.storePreset(6, now());
      store.noteExternalSave(serializeProject(defaultProject()));
      expect(store.getState().storageConflict).toBe(true);
      storage.removeItem(STORAGE_KEY);
      store.noteExternalSave(null);
      expect(store.getState().storageConflict).toBe(false);
      vi.advanceTimersByTime(1000);
      const saved = parseProjectText(storage.getItem(STORAGE_KEY) as string);
      expect(saved.ok && saved.project.session.presets.map((p) => p.slot)).toEqual([6]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps this tab's session when the other copy is gone before it is loaded", () => {
    const { store, storage, now } = makeStore();
    store.storePreset(2, now());
    const other = defaultProject();
    other.session.presets = [{ slot: 8, name: "", cameraId: other.camera.id, pan: 3, tilt: -4, lens: 0.1, savedAt: "2026-09-23T08:00:00.000Z" }];
    storage.setItem(STORAGE_KEY, serializeProject(other));
    store.noteExternalSave(storage.getItem(STORAGE_KEY));
    expect(store.getState().storageConflict).toBe(true);
    storage.removeItem(STORAGE_KEY);
    expect(store.useSavedCopy(now()).ok).toBe(false);
    expect(store.getState().project.session.presets.map((p) => p.slot)).toEqual([2]);
    expect(store.getState().storageConflict).toBe(false);
    const saved = parseProjectText(storage.getItem(STORAGE_KEY) as string);
    expect(saved.ok && saved.project.session.presets.map((p) => p.slot)).toEqual([2]);
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


describe("show package isolation", () => {
  it("swaps touring equipment without changing venue records, geometry, presets or camera pose", () => {
    const { store } = makeStore();
    const before = store.getState();
    const venue = JSON.stringify(before.project.venue), geometry = JSON.stringify(before.geometry);
    const presets = JSON.stringify(before.project.session.presets), pose = store.getTelemetry().snapshot.pose;
    expect(store.updateShowPackage({version:1,name:"Empty stage",fixtures:[]}).ok).toBe(true);
    const after = store.getState();
    expect(JSON.stringify(after.project.venue)).toBe(venue);
    expect(JSON.stringify(after.geometry)).toBe(geometry);
    expect(JSON.stringify(after.project.session.presets)).toBe(presets);
    expect(store.getTelemetry().snapshot.pose).toEqual(pose);
    expect(after.project.session.showPackage.fixtures).toEqual([]);
  });
});

describe("preset names and clearing", () => {
  it("names a stored preset, caps the name at 40 characters and clears the slot", () => {
    const { store, now } = makeStore();
    store.storePreset(4, now());
    store.renamePreset(4, "Safe wide");
    expect(store.getState().project.session.presets[0]).toMatchObject({ slot: 4, name: "Safe wide" });
    store.renamePreset(4, "x".repeat(60));
    expect(store.getState().project.session.presets[0].name).toHaveLength(40);
    store.deletePreset(4);
    expect(store.getState().project.session.presets).toEqual([]);
    expect(store.getState().announcement?.text).toBe("Preset 4 deleted.");
  });
});

describe("operator guidance", () => {
  it("says once that Home is not the FMP safe-wide shot", () => {
    const { store, run, now } = makeStore();
    const panAwayThenHome = () => {
      store.setDrive({ pan: 1, tilt: 0, zoom: 0 }, now());
      run(1);
      store.setDrive({ pan: 0, tilt: 0, zoom: 0 }, now());
      run(2);
      expect(store.getTelemetry().snapshot.pose.pan).not.toBe(0);
      store.home(now());
      run(20);
      return store.getState().announcement?.text;
    };
    expect(panAwayThenHome()).toMatch(/^Home reached\. Home is not the FMP safe-wide shot/);
    expect(panAwayThenHome()).toBe("Home reached.");
  });

  it("names the first problem when an import is rejected", () => {
    const { store, now } = makeStore();
    expect(store.importText("{", now()).ok).toBe(false);
    expect(store.getState().announcement?.text).toBe("Import rejected (project: The file is not valid JSON.). The open session was kept.");
  });
});
