import Dexie, { type Table } from "dexie";
import { avWorkbookSchema } from "./workbookSchema";
import { createBlankWorkbook } from "./sampleWorkbook";
import type { AvWorkbook } from "./types";

export const WORKBOOK_SCHEMA: AvWorkbook["schema"] = "system-by-dave.av-workbook.v1";
export const ACTIVE_KEY = "system-by-dave.av-workbook.active.v1";
export const FALLBACK_KEY = "system-by-dave.av-workbook.fallback.v1";

class WorkbookDb extends Dexie {
  workbooks!: Table<AvWorkbook, string>;

  constructor() {
    super("system-by-dave-av-workbook");
    this.version(1).stores({
      workbooks: "workbookId, savedAt, show.showName, show.targetDate"
    });
  }
}

let db: WorkbookDb | null = null;

function workbookTable(): Table<AvWorkbook, string> {
  db ??= new WorkbookDb();
  return db.workbooks;
}

/** Where workbooks are kept. The browser uses Dexie and localStorage; tests pass in-memory stand-ins. */
export interface WorkbookTable {
  get(workbookId: string): Promise<unknown>;
  put(workbook: AvWorkbook): Promise<unknown>;
}

export interface WorkbookKeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface WorkbookBackend {
  table: WorkbookTable;
  storage: WorkbookKeyValueStore | null;
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const probe = "__sbd_av_workbook_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function browserBackend(): WorkbookBackend {
  return { table: workbookTable(), storage: safeLocalStorage() };
}

export function validateWorkbook(value: unknown): AvWorkbook {
  return avWorkbookSchema.parse(value) as AvWorkbook;
}

/** Paths present in the source that the validated copy no longer has, i.e. fields this version would discard. */
export function findUnsupportedFields(source: unknown, parsed: unknown): string[] {
  const unsupported: string[] = [];
  function walk(input: unknown, output: unknown, location: string): void {
    if (Array.isArray(input) && Array.isArray(output)) {
      input.forEach((item, index) => walk(item, output[index], `${location}[${index}]`));
    } else if (input && typeof input === "object" && output && typeof output === "object") {
      for (const [key, value] of Object.entries(input)) {
        const next = location ? `${location}.${key}` : key;
        if (!(key in output)) unsupported.push(next);
        else walk(value, (output as Record<string, unknown>)[key], next);
      }
    }
  }
  walk(source, parsed, "");
  return unsupported;
}

export type WorkbookReadOnlyCode = "newer-schema" | "other-schema" | "unsupported-fields" | "invalid" | "unreadable-storage";

export interface WorkbookReadOnlyReason {
  code: WorkbookReadOnlyCode;
  /** One operator-facing sentence. */
  summary: string;
  schema?: string;
  fields?: string[];
}

export type WorkbookAssessment =
  | { status: "ok"; workbook: AvWorkbook }
  | { status: "read-only"; reason: WorkbookReadOnlyReason; raw: unknown };

function isNewerSchema(schema: string): boolean {
  const match = /^system-by-dave\.av-workbook\.v(\d+)$/.exec(schema);
  return Boolean(match && Number(match[1]) > 1);
}

function fieldList(fields: string[]): string {
  return `${fields.slice(0, 8).join(", ")}${fields.length > 8 ? "…" : ""}`;
}

/**
 * Decides whether a stored workbook (an IndexedDB record, or the fallback JSON text) can be
 * edited by this version. Anything it cannot fully represent is returned read-only with the
 * raw stored value, so the caller can offer it for download without ever saving over it.
 */
export function assessStoredWorkbook(stored: unknown): WorkbookAssessment {
  const readOnly = (reason: WorkbookReadOnlyReason): WorkbookAssessment => ({ status: "read-only", reason, raw: stored });
  let value: unknown = stored;
  if (typeof stored === "string") {
    try {
      value = JSON.parse(stored);
    } catch {
      return readOnly({ code: "invalid", summary: "The saved copy is not readable JSON." });
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return readOnly({ code: "invalid", summary: "The saved copy is not a workbook record." });
  }
  const schema = (value as Record<string, unknown>).schema;
  if (typeof schema === "string" && schema !== WORKBOOK_SCHEMA) {
    return isNewerSchema(schema)
      ? readOnly({ code: "newer-schema", schema, summary: `Its format, ${schema}, is newer than this version can read.` })
      : readOnly({ code: "other-schema", schema, summary: `Its format, ${schema}, is not one this version recognises.` });
  }
  const parsed = avWorkbookSchema.safeParse(value);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.map(String).join(".") || "(record)"))];
    return readOnly({ code: "invalid", fields, summary: `It does not match the workbook format this version reads: ${fieldList(fields)}.` });
  }
  const unsupported = findUnsupportedFields(value, parsed.data);
  if (unsupported.length) {
    return readOnly({ code: "unsupported-fields", fields: unsupported, summary: `It holds fields this version would discard: ${fieldList(unsupported)}.` });
  }
  return { status: "ok", workbook: parsed.data as AvWorkbook };
}

export type WorkbookSource = "indexeddb" | "fallback";

export interface WorkbookReadOnly {
  status: "read-only";
  activeId: string;
  source: WorkbookSource;
  reason: WorkbookReadOnlyReason;
  /** Exactly what was stored: the IndexedDB record, or the fallback JSON text. Undefined when storage could not be read. */
  raw: unknown;
}

export interface WorkbookLoaded {
  status: "ok";
  workbook: AvWorkbook;
  source: WorkbookSource | "new";
}

export type WorkbookLoadResult = WorkbookLoaded | WorkbookReadOnly;
export type ActiveWorkbookRead = WorkbookLoadResult | { status: "missing" };

function storedWorkbookId(text: string): string | null {
  try {
    const value: unknown = JSON.parse(text);
    const id = value && typeof value === "object" ? (value as Record<string, unknown>).workbookId : null;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}

function located(assessment: WorkbookAssessment, activeId: string, source: WorkbookSource): WorkbookLoadResult {
  return assessment.status === "ok"
    ? { status: "ok", workbook: assessment.workbook, source }
    : { status: "read-only", activeId, source, reason: assessment.reason, raw: assessment.raw };
}

/** Reads the active workbook without writing anything. "missing" means there is no active workbook to protect. */
export async function readActiveWorkbook(backend: WorkbookBackend = browserBackend()): Promise<ActiveWorkbookRead> {
  const storage = backend.storage;
  const activeId = storage?.getItem(ACTIVE_KEY) ?? null;
  if (!activeId) return { status: "missing" };
  let record: unknown;
  try {
    record = await backend.table.get(activeId);
  } catch {
    const fallback = storage?.getItem(FALLBACK_KEY) ?? null;
    if (fallback === null) {
      return {
        status: "read-only", activeId, source: "indexeddb", raw: undefined,
        reason: { code: "unreadable-storage", summary: "Its storage could not be opened and there is no fallback copy. Reloading the page may help." }
      };
    }
    return located(assessStoredWorkbook(fallback), activeId, "fallback");
  }
  if (record === undefined || record === null) {
    const fallback = storage?.getItem(FALLBACK_KEY) ?? null;
    if (fallback !== null && storedWorkbookId(fallback) === activeId) return located(assessStoredWorkbook(fallback), activeId, "fallback");
    return { status: "missing" };
  }
  return located(assessStoredWorkbook(record), activeId, "indexeddb");
}

/**
 * Opens the active workbook. Only when there is no active workbook (first run, or an active id
 * that points to nothing) does it create and save a blank one. A workbook this version cannot
 * fully represent comes back read-only: nothing is saved and the active id is left alone.
 */
export async function loadActiveWorkbook(backend: WorkbookBackend = browserBackend()): Promise<WorkbookLoadResult> {
  const read = await readActiveWorkbook(backend);
  if (read.status !== "missing") return read;
  const saved = await saveWorkbook(createBlankWorkbook(), backend);
  return { status: "ok", workbook: saved, source: "new" };
}

/** The explicit "Start a new blank workbook" action. The previous record stays where it is. */
export async function startBlankWorkbook(backend: WorkbookBackend = browserBackend()): Promise<AvWorkbook> {
  return saveWorkbook(createBlankWorkbook(), backend);
}

export async function saveWorkbook(workbook: AvWorkbook, backend: WorkbookBackend = browserBackend()): Promise<AvWorkbook> {
  const next = validateWorkbook({ ...workbook, savedAt: new Date().toISOString() });
  const storage = backend.storage;
  try {
    await backend.table.put(next);
    storage?.setItem(ACTIVE_KEY, next.workbookId);
  } catch {
    storage?.setItem(FALLBACK_KEY, JSON.stringify(next));
    storage?.setItem(ACTIVE_KEY, next.workbookId);
  }
  return next;
}

/** A save refused because the stored copy could not be read, so it could not be checked before writing over it. */
export class WorkbookUncheckedError extends Error {
  constructor() {
    super("This browser could not read the saved workbook to check it, so the change was not saved. Try again; reload if it keeps happening.");
    this.name = "WorkbookUncheckedError";
  }
}

/** A save refused because another tab or window running a newer or incompatible version rewrote the stored workbook. */
export class WorkbookChangedElsewhereError extends Error {
  readonly readOnly: WorkbookReadOnly;

  constructor(readOnly: WorkbookReadOnly) {
    super(readOnly.reason.summary);
    this.name = "WorkbookChangedElsewhereError";
    this.readOnly = readOnly;
  }
}

/**
 * Saves an edit to the open workbook, unless its stored copy is no longer one this version can
 * fully represent. A tab left open on an older release then stops instead of stripping fields
 * that a newer release wrote after this tab loaded.
 */
export async function saveEditedWorkbook(workbook: AvWorkbook, backend: WorkbookBackend = browserBackend()): Promise<AvWorkbook> {
  let stored: unknown;
  let source: WorkbookSource = "indexeddb";
  let readFailed = false;
  try {
    stored = await backend.table.get(workbook.workbookId);
  } catch {
    stored = undefined;
    readFailed = true;
  }
  if (stored === undefined || stored === null) {
    const fallback = backend.storage?.getItem(FALLBACK_KEY) ?? null;
    if (fallback !== null && storedWorkbookId(fallback) === workbook.workbookId) {
      stored = fallback;
      source = "fallback";
    } else if (readFailed) {
      // Fail closed: an unread IndexedDB record might be one this version cannot represent.
      throw new WorkbookUncheckedError();
    }
  }
  if (stored !== undefined && stored !== null) {
    const assessment = assessStoredWorkbook(stored);
    if (assessment.status === "read-only") {
      throw new WorkbookChangedElsewhereError({ status: "read-only", activeId: workbook.workbookId, source, reason: assessment.reason, raw: assessment.raw });
    }
  }
  return saveWorkbook(workbook, backend);
}

export function exportWorkbook(workbook: AvWorkbook): string {
  return JSON.stringify(validateWorkbook(workbook), null, 2);
}

/** The stored value exactly as kept: fallback JSON text as-is, an IndexedDB record as formatted JSON. */
export function storedWorkbookText(raw: unknown): string {
  return typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
}

export function importWorkbook(text: string): AvWorkbook {
  const source: unknown = JSON.parse(text);
  const validated = validateWorkbook(source);
  const unsupported = findUnsupportedFields(source, validated);
  if (unsupported.length) throw new Error(`Unsupported workbook fields: ${unsupported.slice(0, 8).join(", ")}${unsupported.length > 8 ? "…" : ""}. Export from a compatible version before importing.`);
  return validated;
}

export function downloadText(filename: string, text: string, type = "application/json;charset=utf-8"): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
