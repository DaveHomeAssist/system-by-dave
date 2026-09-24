import { describe, expect, it } from "vitest";
import { defaultProject, serializeProject } from "../domain/project";
import {
  loadProject,
  MAX_UNREADABLE_COPIES,
  saveProject,
  setAsideSavedSession,
  STORAGE_KEY,
  UNREADABLE_KEY,
  unreadableCopies,
} from "./persist";

class MemoryStorage implements Storage {
  protected map = new Map<string, string>();
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

/** Storage with room for the session but none for an extra copy of it. */
class FullStorage extends MemoryStorage {
  setItem(key: string, value: string): void {
    if (key.startsWith(UNREADABLE_KEY)) throw new DOMException("Quota exceeded", "QuotaExceededError");
    super.setItem(key, value);
  }
}

describe("saved session restore", () => {
  it("restores a saved session with the time it was saved", () => {
    const storage = new MemoryStorage();
    const saved = new Date("2026-09-22T18:30:00.000Z");
    expect(saveProject(storage, defaultProject(), saved).state).toBe("ok");
    const loaded = loadProject(storage);
    expect(loaded.notice).toBeNull();
    expect(loaded.status).toEqual({ state: "ok", savedAt: saved.toISOString() });
  });

  it("sets an unreadable session aside once and starts fresh", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{ not json");
    const first = loadProject(storage);
    const [copy] = unreadableCopies(storage);
    expect(first.notice).toContain(copy);
    expect(storage.getItem(copy)).toBe("{ not json");
    // The broken session is gone, so the next visit neither warns again nor keeps another copy.
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    const second = loadProject(storage);
    expect(second.notice).toBeNull();
    expect(unreadableCopies(storage)).toEqual([copy]);
  });

  it(`keeps at most ${MAX_UNREADABLE_COPIES} unreadable copies, dropping the oldest`, () => {
    const storage = new MemoryStorage();
    for (const time of [1000, 2000, 3000]) storage.setItem(`${UNREADABLE_KEY}.${time}`, `old ${time}`);
    storage.setItem(STORAGE_KEY, "[]");
    loadProject(storage);
    const copies = unreadableCopies(storage);
    expect(copies).toHaveLength(MAX_UNREADABLE_COPIES);
    expect(copies).not.toContain(`${UNREADABLE_KEY}.1000`);
    expect(storage.getItem(copies[0])).toBe("[]");
    expect(copies.slice(1)).toEqual([`${UNREADABLE_KEY}.3000`, `${UNREADABLE_KEY}.2000`]);
  });

  it("leaves an unreadable session in place when there is no room to keep a copy", () => {
    const storage = new FullStorage();
    storage.setItem(STORAGE_KEY, "{ not json");
    const loaded = loadProject(storage);
    expect(loaded.notice).toMatch(/too full to keep a copy/);
    expect(storage.getItem(STORAGE_KEY)).toBe("{ not json");
  });

  it("sets a readable session aside on request, and does nothing when none is saved", () => {
    const storage = new MemoryStorage();
    expect(setAsideSavedSession(storage)).toBeNull();
    const text = serializeProject(defaultProject());
    storage.setItem(STORAGE_KEY, text);
    const copy = setAsideSavedSession(storage);
    expect(copy).not.toBeNull();
    expect(storage.getItem(copy as string)).toBe(text);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(setAsideSavedSession(new FullStorage())).toBeNull();
  });
});
