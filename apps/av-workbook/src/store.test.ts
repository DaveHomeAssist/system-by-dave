import { describe, expect, it, vi } from "vitest";
import { createBlankWorkbook } from "./sampleWorkbook";
import {
  ACTIVE_KEY, FALLBACK_KEY, WorkbookChangedElsewhereError, assessStoredWorkbook, importWorkbook, loadActiveWorkbook, saveEditedWorkbook,
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

function storedWorkbook(id = "wb-stored"): AvWorkbook {
  return { ...createBlankWorkbook(), workbookId: id, savedAt: "2026-10-01T08:00:00.000Z" };
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

  it("saves a new workbook id that has no stored copy yet", async () => {
    const memory = memoryBackend({ storage: { [ACTIVE_KEY]: "wb-old" } });
    const saved = await saveEditedWorkbook(storedWorkbook("wb-import-1"), memory.backend);
    expect(memory.values.get(ACTIVE_KEY)).toBe(saved.workbookId);
  });
});
