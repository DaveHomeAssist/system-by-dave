import { describe, expect, it, vi } from "vitest";
import { createBlankWorkbook } from "./sampleWorkbook";
import {
  ACTIVE_KEY, FALLBACK_KEY, WorkbookChangedElsewhereError, WorkbookUncheckedError, assessStoredWorkbook, importWorkbook, loadActiveWorkbook, fallbackHolds, fallbackSlotFor, saveEditedWorkbook, saveWorkbook,
  startBlankWorkbook, type WorkbookBackend
} from "./store";
import type { AvWorkbook } from "./types";

describe("workbook JSON import", () => {
  it("rejects fields the current schema would silently discard", () => {
    const workbook = createBlankWorkbook();
    expect(() => importWorkbook(JSON.stringify({ ...workbook, show: { ...workbook.show, clientContact: "Keep me" } })))
      .toThrow(/Unsupported workbook fields: show.clientContact/);
  });

  it("accepts the current exported shape", () => {
    const workbook = createBlankWorkbook();
    expect(importWorkbook(JSON.stringify(workbook))).toEqual(workbook);
  });
});

// One blank built once: createBlankWorkbook stamps showId from Date.now(), and content comparisons
// between two fixtures must not depend on whether a millisecond passed between the calls.
const BLANK = createBlankWorkbook();

function storedWorkbook(id = "wb-stored"): AvWorkbook {
  return { ...structuredClone(BLANK), workbookId: id, savedAt: "2026-10-01T08:00:00.000Z" };
}

describe("assessStoredWorkbook", () => {
  it("opens a record saved with a newer schema read-only and keeps the raw value", () => {
    const record = { ...storedWorkbook(), schema: "system-by-dave.av-workbook.v2", videoEndpoints: [{ id: "ep-1" }] };
    const result = assessStoredWorkbook(record);
    expect(result.status).toBe("read-only");
    if (result.status !== "read-only") return;
    expect(result.reason.code).toBe("newer-schema");
    expect(result.reason.schema).toBe("system-by-dave.av-workbook.v2");
    expect(result.raw).toBe(record);
  });

  it("treats another tool's schema string as an unrecognised format", () => {
    const result = assessStoredWorkbook({ ...storedWorkbook(), schema: "system-by-dave.cue-sheet.v2" });
    expect(result.status === "read-only" && result.reason.code).toBe("other-schema");
  });

  it("opens a record with an unknown top-level key read-only instead of dropping it", () => {
    const result = assessStoredWorkbook({ ...storedWorkbook(), videoEndpoints: [] });
    expect(result.status).toBe("read-only");
    if (result.status !== "read-only") return;
    expect(result.reason.code).toBe("unsupported-fields");
    expect(result.reason.fields).toEqual(["videoEndpoints"]);
  });

  it("finds unknown nested keys with the same walk as JSON import", () => {
    const workbook = storedWorkbook();
    const result = assessStoredWorkbook({ ...workbook, show: { ...workbook.show, clientContact: "Keep me" } });
    expect(result.status === "read-only" && result.reason.fields).toEqual(["show.clientContact"]);
  });

  it("opens an invalid record read-only with the failing paths", () => {
    const { show: _show, ...withoutShow } = storedWorkbook();
    const result = assessStoredWorkbook(withoutShow);
    expect(result.status).toBe("read-only");
    if (result.status !== "read-only") return;
    expect(result.reason.code).toBe("invalid");
    expect(result.reason.fields).toContain("show");
  });

  it("returns a valid record unchanged", () => {
    const record = storedWorkbook();
    expect(assessStoredWorkbook(record)).toEqual({ status: "ok", workbook: record });
  });

  it("reads the fallback JSON text and keeps that exact text when it cannot open it", () => {
    const record = storedWorkbook("wb-fallback");
    expect(assessStoredWorkbook(JSON.stringify(record))).toEqual({ status: "ok", workbook: record });
    const newer = JSON.stringify({ ...record, schema: "system-by-dave.av-workbook.v3" });
    const result = assessStoredWorkbook(newer);
    expect(result.status === "read-only" && result.reason.code).toBe("newer-schema");
    expect(result.status === "read-only" && result.raw).toBe(newer);
    const broken = assessStoredWorkbook("{not json");
    expect(broken.status === "read-only" && broken.reason.code).toBe("invalid");
    expect(broken.status === "read-only" && broken.raw).toBe("{not json");
  });
});

function memoryBackend(options: { records?: Record<string, unknown>; storage?: Record<string, string>; failReads?: boolean; failWrites?: boolean } = {}) {
  const records = new Map(Object.entries(options.records ?? {}));
  const values = new Map(Object.entries(options.storage ?? {}));
  const table = {
    get: vi.fn(async (id: string) => {
      if (options.failReads) throw new Error("IndexedDB unavailable");
      return records.get(id);
    }),
    put: vi.fn(async (workbook: AvWorkbook) => {
      if (options.failWrites) throw new Error("IndexedDB unavailable");
      records.set(workbook.workbookId, workbook);
      return workbook.workbookId;
    })
  };
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); })
  };
  const backend: WorkbookBackend = { table, storage };
  return { backend, table, storage, records, values };
}

describe("loadActiveWorkbook", () => {
  const unreadable: [string, unknown][] = [
    ["a newer schema", { ...storedWorkbook("wb-active"), schema: "system-by-dave.av-workbook.v2" }],
    ["an unknown top-level key", { ...storedWorkbook("wb-active"), videoEndpoints: [] }],
    ["an invalid record", { schema: "system-by-dave.av-workbook.v1", workbookId: "wb-active" }]
  ];

  it.each(unreadable)("opens %s read-only without writing or moving the active id", async (_label, record) => {
    const memory = memoryBackend({ records: { "wb-active": record }, storage: { [ACTIVE_KEY]: "wb-active" } });
    const result = await loadActiveWorkbook(memory.backend);
    expect(result.status).toBe("read-only");
    expect(result.status === "read-only" && result.source).toBe("indexeddb");
    expect(result.status === "read-only" && result.raw).toBe(record);
    expect(memory.table.put).not.toHaveBeenCalled();
    expect(memory.storage.setItem).not.toHaveBeenCalled();
    expect(memory.values.get(ACTIVE_KEY)).toBe("wb-active");
    expect(memory.records.get("wb-active")).toBe(record);
  });

  it("opens a newer fallback copy read-only when IndexedDB cannot be read, without writing", async () => {
    const fallback = JSON.stringify({ ...storedWorkbook("wb-active"), schema: "system-by-dave.av-workbook.v2" });
    const memory = memoryBackend({ failReads: true, failWrites: true, storage: { [ACTIVE_KEY]: "wb-active", [FALLBACK_KEY]: fallback } });
    const result = await loadActiveWorkbook(memory.backend);
    expect(result.status === "read-only" && result.source).toBe("fallback");
    expect(result.status === "read-only" && result.raw).toBe(fallback);
    expect(memory.table.put).not.toHaveBeenCalled();
    expect(memory.storage.setItem).not.toHaveBeenCalled();
    expect(memory.values.get(FALLBACK_KEY)).toBe(fallback);
  });

  it("never opens a fallback that holds a different workbook when IndexedDB cannot be read", async () => {
    const other = JSON.stringify(storedWorkbook("wb-other"));
    const memory = memoryBackend({ failReads: true, storage: { [ACTIVE_KEY]: "wb-active", [FALLBACK_KEY]: other } });
    const result = await loadActiveWorkbook(memory.backend);
    expect(result.status === "read-only" && result.reason.code).toBe("unreadable-storage");
    expect(memory.table.put).not.toHaveBeenCalled();
    expect(memory.values.get(ACTIVE_KEY)).toBe("wb-active");
  });

  it("does not replace the active workbook when IndexedDB fails and there is no fallback copy", async () => {
    const memory = memoryBackend({ failReads: true, storage: { [ACTIVE_KEY]: "wb-active" } });
    const result = await loadActiveWorkbook(memory.backend);
    expect(result.status === "read-only" && result.reason.code).toBe("unreadable-storage");
    expect(memory.table.put).not.toHaveBeenCalled();
    expect(memory.storage.setItem).not.toHaveBeenCalled();
  });

  it("loads a valid record without saving it", async () => {
    const record = storedWorkbook("wb-active");
    const memory = memoryBackend({ records: { "wb-active": record }, storage: { [ACTIVE_KEY]: "wb-active" } });
    expect(await loadActiveWorkbook(memory.backend)).toEqual({ status: "ok", workbook: record, source: "indexeddb" });
    expect(memory.table.put).not.toHaveBeenCalled();
    expect(memory.storage.setItem).not.toHaveBeenCalled();
  });

  it("loads the fallback copy of the active workbook when IndexedDB has no record for it", async () => {
    const record = storedWorkbook("wb-active");
    const memory = memoryBackend({ storage: { [ACTIVE_KEY]: "wb-active", [FALLBACK_KEY]: JSON.stringify(record) } });
    expect(await loadActiveWorkbook(memory.backend)).toEqual({ status: "ok", workbook: record, source: "fallback" });
    expect(memory.table.put).not.toHaveBeenCalled();
    expect(memory.storage.setItem).not.toHaveBeenCalled();
  });

  it("loads the fallback copy when it holds newer edits of the same workbook than IndexedDB", async () => {
    const older = storedWorkbook("wb-active");
    const newer = { ...older, savedAt: "2026-10-01T09:00:00.000Z", show: { ...older.show, venue: "Hall B" } };
    const memory = memoryBackend({ records: { "wb-active": older }, storage: { [ACTIVE_KEY]: "wb-active", [FALLBACK_KEY]: JSON.stringify(newer) } });
    const result = await loadActiveWorkbook(memory.backend);
    expect(result.status === "ok" && result.source).toBe("fallback");
    expect(result.status === "ok" && result.workbook.show.venue).toBe("Hall B");
  });

  it("keeps an incompatible IndexedDB record read-only even when a compatible fallback copy is newer", async () => {
    const newer = { ...storedWorkbook("wb-active"), schema: "system-by-dave.av-workbook.v2" };
    const fallback = JSON.stringify({ ...storedWorkbook("wb-active"), savedAt: "2026-10-02T09:00:00.000Z" });
    const memory = memoryBackend({ records: { "wb-active": newer }, storage: { [ACTIVE_KEY]: "wb-active", [FALLBACK_KEY]: fallback } });
    const result = await loadActiveWorkbook(memory.backend);
    expect(result.status).toBe("read-only");
    expect(result.status === "read-only" && result.source).toBe("indexeddb");
    expect(memory.table.put).not.toHaveBeenCalled();
  });

  it("creates and saves a blank workbook on first run, without sample data", async () => {
    const memory = memoryBackend();
    const result = await loadActiveWorkbook(memory.backend);
    expect(result.status === "ok" && result.source).toBe("new");
    if (result.status !== "ok") return;
    expect(result.workbook.rooms).toEqual([]);
    expect(result.workbook.operators).toEqual([]);
    expect(memory.table.put).toHaveBeenCalledTimes(1);
    expect(memory.values.get(ACTIVE_KEY)).toBe(result.workbook.workbookId);
    expect(memory.records.get(result.workbook.workbookId)).toEqual(result.workbook);
  });

  it("creates a blank workbook when the active id points to nothing", async () => {
    const memory = memoryBackend({ storage: { [ACTIVE_KEY]: "wb-gone" } });
    const result = await loadActiveWorkbook(memory.backend);
    expect(result.status === "ok" && result.source).toBe("new");
    expect(memory.values.get(ACTIVE_KEY)).not.toBe("wb-gone");
  });

  it("starts a new blank workbook only on request and leaves the unreadable record in place", async () => {
    const record = { ...storedWorkbook("wb-active"), schema: "system-by-dave.av-workbook.v2" };
    const memory = memoryBackend({ records: { "wb-active": record }, storage: { [ACTIVE_KEY]: "wb-active" } });
    expect((await loadActiveWorkbook(memory.backend)).status).toBe("read-only");
    const blank = await startBlankWorkbook(memory.backend);
    expect(blank.workbookId).not.toBe("wb-active");
    expect(memory.values.get(ACTIVE_KEY)).toBe(blank.workbookId);
    expect(memory.records.get("wb-active")).toBe(record);
  });
});

describe("saveEditedWorkbook", () => {
  it("saves an edit when the stored copy is still one this version reads", async () => {
    const record = storedWorkbook("wb-active");
    const memory = memoryBackend({ records: { "wb-active": record }, storage: { [ACTIVE_KEY]: "wb-active" } });
    const saved = await saveEditedWorkbook({ ...record, show: { ...record.show, venue: "Hall B" } }, memory.backend);
    expect(saved.show.venue).toBe("Hall B");
    expect(memory.table.put).toHaveBeenCalledTimes(1);
  });

  it("refuses to save over a copy a newer version wrote after this tab loaded", async () => {
    const loaded = storedWorkbook("wb-active");
    const newer = { ...loaded, schema: "system-by-dave.av-workbook.v2", videoEndpoints: [{ id: "ep-1" }] };
    const memory = memoryBackend({ records: { "wb-active": newer }, storage: { [ACTIVE_KEY]: "wb-active" } });
    const attempt = saveEditedWorkbook({ ...loaded, show: { ...loaded.show, venue: "Hall B" } }, memory.backend);
    await expect(attempt).rejects.toBeInstanceOf(WorkbookChangedElsewhereError);
    await attempt.catch((error: WorkbookChangedElsewhereError) => {
      expect(error.readOnly.reason.code).toBe("newer-schema");
      expect(error.readOnly.raw).toBe(newer);
    });
    expect(memory.table.put).not.toHaveBeenCalled();
    expect(memory.storage.setItem).not.toHaveBeenCalled();
    expect(memory.records.get("wb-active")).toBe(newer);
  });

  it("checks the fallback copy of the same workbook when IndexedDB cannot be read", async () => {
    const loaded = storedWorkbook("wb-active");
    const fallback = JSON.stringify({ ...loaded, videoEndpoints: [] });
    const memory = memoryBackend({ failReads: true, failWrites: true, storage: { [ACTIVE_KEY]: "wb-active", [FALLBACK_KEY]: fallback } });
    await expect(saveEditedWorkbook(loaded, memory.backend)).rejects.toBeInstanceOf(WorkbookChangedElsewhereError);
    expect(memory.values.get(FALLBACK_KEY)).toBe(fallback);
  });

  it("never writes IndexedDB after a failed read; the edit goes to the fallback copy only", async () => {
    const loaded = storedWorkbook("wb-active");
    const memory = memoryBackend({ failReads: true, storage: { [ACTIVE_KEY]: "wb-active", [FALLBACK_KEY]: JSON.stringify(loaded) } });
    const saved = await saveEditedWorkbook({ ...loaded, show: { ...loaded.show, venue: "Hall B" } }, memory.backend);
    expect(memory.table.put).not.toHaveBeenCalled();
    expect(JSON.parse(memory.values.get(FALLBACK_KEY) as string).show.venue).toBe("Hall B");
    expect(saved.show.venue).toBe("Hall B");
  });

  it("keeps the edit in the fallback copy even when no fallback existed, without touching IndexedDB", async () => {
    const memory = memoryBackend({ failReads: true, storage: { [ACTIVE_KEY]: "wb-active" } });
    await saveEditedWorkbook(storedWorkbook("wb-active"), memory.backend);
    expect(memory.table.put).not.toHaveBeenCalled();
    expect(memory.values.get(FALLBACK_KEY)).toContain("wb-active");
  });

  it("refuses a fallback-only save when the fallback slot holds a different workbook", async () => {
    const other = JSON.stringify(storedWorkbook("wb-only-copy"));
    const memory = memoryBackend({ failReads: true, storage: { [ACTIVE_KEY]: "wb-active", [FALLBACK_KEY]: other } });
    await expect(saveEditedWorkbook(storedWorkbook("wb-active"), memory.backend)).rejects.toBeInstanceOf(WorkbookUncheckedError);
    expect(memory.values.get(FALLBACK_KEY)).toBe(other);
    expect(memory.table.put).not.toHaveBeenCalled();
  });

  it("does not let a failed IndexedDB write replace another workbook's fallback copy", async () => {
    const other = JSON.stringify(storedWorkbook("wb-only-copy"));
    const memory = memoryBackend({ failWrites: true, storage: { [FALLBACK_KEY]: other } });
    await expect(saveWorkbook(storedWorkbook("wb-new"), memory.backend)).rejects.toBeInstanceOf(WorkbookUncheckedError);
    expect(memory.values.get(FALLBACK_KEY)).toBe(other);
  });

  it("does not let a failed IndexedDB write replace an incompatible fallback copy of the same workbook", async () => {
    const newer = JSON.stringify({ ...storedWorkbook("wb-demo-corporate-keynote"), schema: "system-by-dave.av-workbook.v2" });
    const memory = memoryBackend({ failWrites: true, storage: { [FALLBACK_KEY]: newer } });
    await expect(saveWorkbook(storedWorkbook("wb-demo-corporate-keynote"), memory.backend)).rejects.toBeInstanceOf(WorkbookUncheckedError);
    expect(memory.values.get(FALLBACK_KEY)).toBe(newer);
  });

  it("checks a fixed-id sample against its stored copy unless the caller proves the id is new", async () => {
    const newer = { ...storedWorkbook("wb-demo-corporate-keynote"), schema: "system-by-dave.av-workbook.v2" };
    const memory = memoryBackend({ records: { "wb-demo-corporate-keynote": newer } });
    await expect(saveEditedWorkbook(storedWorkbook("wb-demo-corporate-keynote"), memory.backend)).rejects.toBeInstanceOf(WorkbookChangedElsewhereError);
    expect(memory.records.get("wb-demo-corporate-keynote")).toBe(newer);
  });

  it("lets a new record replace the current workbook's fallback while it still holds the backed-up text", async () => {
    const current = JSON.stringify(storedWorkbook("wb-current"));
    const memory = memoryBackend({ failReads: true, failWrites: true, storage: { [ACTIVE_KEY]: "wb-current", [FALLBACK_KEY]: current } });
    const saved = await saveEditedWorkbook(storedWorkbook("wb-import-3"), memory.backend, { newRecord: true, replaceFallbackIfUnchanged: current });
    expect(memory.values.get(FALLBACK_KEY)).toContain(saved.workbookId);
    expect(memory.values.get(ACTIVE_KEY)).toBe(saved.workbookId);
  });

  it("keeps a fallback another tab rewrote after the backup was taken", async () => {
    const backedUp = JSON.stringify(storedWorkbook("wb-current"));
    const rewritten = JSON.stringify({ ...storedWorkbook("wb-current"), savedAt: "2026-10-02T10:00:00.000Z" });
    const memory = memoryBackend({ failReads: true, failWrites: true, storage: { [ACTIVE_KEY]: "wb-current", [FALLBACK_KEY]: rewritten } });
    await expect(saveEditedWorkbook(storedWorkbook("wb-import-5"), memory.backend, { newRecord: true, replaceFallbackIfUnchanged: backedUp })).rejects.toBeInstanceOf(WorkbookUncheckedError);
    expect(memory.values.get(FALLBACK_KEY)).toBe(rewritten);
  });

  it("still refuses when the fallback slot holds a third workbook", async () => {
    const third = JSON.stringify(storedWorkbook("wb-third"));
    const memory = memoryBackend({ failReads: true, failWrites: true, storage: { [ACTIVE_KEY]: "wb-current", [FALLBACK_KEY]: third } });
    await expect(saveEditedWorkbook(storedWorkbook("wb-import-4"), memory.backend, { newRecord: true })).rejects.toBeInstanceOf(WorkbookUncheckedError);
    expect(memory.values.get(FALLBACK_KEY)).toBe(third);
  });

  it("describes the fallback slot for a workbook, including whether it is the only current copy", async () => {
    const current = JSON.stringify(storedWorkbook("wb-current"));
    const newer = JSON.stringify({ ...storedWorkbook("wb-current"), savedAt: "2026-10-02T10:00:00.000Z" });
    expect(await fallbackSlotFor("wb-current", memoryBackend({ failReads: true, storage: { [FALLBACK_KEY]: current } }).backend)).toEqual({ text: current, onlyCopy: true });
    expect(await fallbackSlotFor("wb-current", memoryBackend({ records: { "wb-current": storedWorkbook("wb-current") }, storage: { [FALLBACK_KEY]: current } }).backend)).toEqual({ text: current, onlyCopy: false });
    expect(await fallbackSlotFor("wb-current", memoryBackend({ records: { "wb-current": storedWorkbook("wb-current") }, storage: { [FALLBACK_KEY]: newer } }).backend)).toEqual({ text: newer, onlyCopy: true });
    expect(await fallbackSlotFor("wb-current", memoryBackend().backend)).toBeNull();
  });

  it("treats a fallback that differs from IndexedDB as the only copy even when its savedAt does not advance", async () => {
    const record = storedWorkbook("wb-current");
    const sameTime = JSON.stringify({ ...record, show: { ...record.show, showName: "Edited during the outage" } });
    const clockBack = JSON.stringify({ ...record, savedAt: "2026-09-30T10:00:00.000Z", show: { ...record.show, venue: "Edited after the clock moved back" } });
    const reordered = JSON.stringify(Object.fromEntries(Object.entries(record).reverse()));
    expect(await fallbackSlotFor("wb-current", memoryBackend({ records: { "wb-current": record }, storage: { [FALLBACK_KEY]: sameTime } }).backend)).toEqual({ text: sameTime, onlyCopy: true });
    expect(await fallbackSlotFor("wb-current", memoryBackend({ records: { "wb-current": record }, storage: { [FALLBACK_KEY]: clockBack } }).backend)).toEqual({ text: clockBack, onlyCopy: true });
    expect(await fallbackSlotFor("wb-current", memoryBackend({ records: { "wb-current": record }, storage: { [FALLBACK_KEY]: reordered } }).backend)).toEqual({ text: reordered, onlyCopy: false });
  });

  it("lets a confirmed new blank workbook replace only the fallback copy the operator saw", async () => {
    const seen = JSON.stringify({ ...storedWorkbook("wb-only-copy"), schema: "system-by-dave.av-workbook.v2" });
    const memory = memoryBackend({ failWrites: true, storage: { [FALLBACK_KEY]: seen } });
    const blank = await startBlankWorkbook(memory.backend, { replaceFallbackIfUnchanged: seen });
    expect(memory.values.get(FALLBACK_KEY)).toContain(blank.workbookId);
    expect(memory.values.get(ACTIVE_KEY)).toBe(blank.workbookId);
    expect(fallbackHolds(seen, memory.backend)).toBe(false);
  });

  it("leaves the fallback copy in place when the new blank workbook saves to IndexedDB", async () => {
    const seen = JSON.stringify({ ...storedWorkbook("wb-only-copy"), schema: "system-by-dave.av-workbook.v2" });
    const memory = memoryBackend({ storage: { [FALLBACK_KEY]: seen } });
    await startBlankWorkbook(memory.backend, { replaceFallbackIfUnchanged: seen });
    expect(fallbackHolds(seen, memory.backend)).toBe(true);
  });

  it("keeps a fallback copy another tab rewrote after the read-only notice was shown", async () => {
    const seen = JSON.stringify({ ...storedWorkbook("wb-only-copy"), schema: "system-by-dave.av-workbook.v2" });
    const rewritten = JSON.stringify({ ...storedWorkbook("wb-only-copy"), schema: "system-by-dave.av-workbook.v2", savedAt: "2026-10-02T11:00:00.000Z" });
    const memory = memoryBackend({ failWrites: true, storage: { [FALLBACK_KEY]: rewritten } });
    await expect(startBlankWorkbook(memory.backend, { replaceFallbackIfUnchanged: seen })).rejects.toBeInstanceOf(WorkbookUncheckedError);
    expect(memory.values.get(FALLBACK_KEY)).toBe(rewritten);
  });

  it("refuses when IndexedDB cannot be read and there is no fallback storage at all", async () => {
    const memory = memoryBackend({ failReads: true });
    const backend = { table: memory.table, storage: null };
    await expect(saveEditedWorkbook(storedWorkbook("wb-active"), backend)).rejects.toBeInstanceOf(WorkbookUncheckedError);
    expect(memory.table.put).not.toHaveBeenCalled();
  });

  it("saves a new record (an imported copy) even while IndexedDB reads fail", async () => {
    const memory = memoryBackend({ failReads: true, failWrites: true, storage: { [ACTIVE_KEY]: "wb-active" } });
    const saved = await saveEditedWorkbook(storedWorkbook("wb-import-2"), memory.backend, { newRecord: true });
    expect(memory.values.get(ACTIVE_KEY)).toBe(saved.workbookId);
  });

  it("refuses when the fallback copy of this workbook was written by a newer version", async () => {
    const loaded = storedWorkbook("wb-active");
    const fallback = JSON.stringify({ ...loaded, schema: "system-by-dave.av-workbook.v2" });
    const memory = memoryBackend({ records: { "wb-active": loaded }, storage: { [ACTIVE_KEY]: "wb-active", [FALLBACK_KEY]: fallback } });
    await expect(saveEditedWorkbook(loaded, memory.backend)).rejects.toBeInstanceOf(WorkbookChangedElsewhereError);
    expect(memory.table.put).not.toHaveBeenCalled();
  });

  it("saves a new workbook id that has no stored copy yet", async () => {
    const memory = memoryBackend({ storage: { [ACTIVE_KEY]: "wb-old" } });
    const saved = await saveEditedWorkbook(storedWorkbook("wb-import-1"), memory.backend);
    expect(memory.values.get(ACTIVE_KEY)).toBe(saved.workbookId);
  });
});
