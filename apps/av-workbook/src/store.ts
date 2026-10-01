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

function storedSavedAt(stored: unknown): string {
  let value: unknown = stored;
  if (typeof stored === "string") {
    try {
      value = JSON.parse(stored);
    } catch {
      return "";
    }
  }
  const savedAt = value && typeof value === "object" ? (value as Record<string, unknown>).savedAt : null;
  return typeof savedAt === "string" ? savedAt : "";
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
    // A fallback that holds a different workbook is not this one; never open it in its place.
    if (fallback === null || storedWorkbookId(fallback) !== activeId) {
      return {
        status: "read-only", activeId, source: "indexeddb", raw: undefined,
        reason: { code: "unreadable-storage", summary: "Its storage could not be opened and there is no fallback copy of it. Reloading the page may help." }
      };
    }
    return located(assessStoredWorkbook(fallback), activeId, "fallback");
  }
  if (record === undefined || record === null) {
    const fallback = storage?.getItem(FALLBACK_KEY) ?? null;
    if (fallback !== null && storedWorkbookId(fallback) === activeId) return located(assessStoredWorkbook(fallback), activeId, "fallback");
    return { status: "missing" };
  }
  // The IndexedDB record is checked first: one this version cannot represent stays read-only even
  // if a compatible fallback copy is newer, so an edit cannot later overwrite it.
  const assessed = located(assessStoredWorkbook(record), activeId, "indexeddb");
  if (assessed.status === "read-only") return assessed;
  // A fallback copy of the same workbook saved later (while IndexedDB could not be read) holds newer edits.
  const fallback = storage?.getItem(FALLBACK_KEY) ?? null;
  if (fallback !== null && storedWorkbookId(fallback) === activeId && storedSavedAt(fallback) > storedSavedAt(record)) {
    return located(assessStoredWorkbook(fallback), activeId, "fallback");
  }
  return assessed;
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
export async function startBlankWorkbook(
  backend: WorkbookBackend = browserBackend(),
  options: { replaceFallbackIfUnchanged?: string } = {}
): Promise<AvWorkbook> {
  return saveWorkbook(createBlankWorkbook(), backend, options);
}

/**
 * The fallback is one slot. It is written only when it is empty or already holds this workbook,
 * because a different workbook there may have no other copy. A deliberate replacement may take it
 * only while it still holds exactly the text the operator saw and backed up.
 */
interface FallbackConsent {
  /** The exact fallback text this tab backed up before deliberately replacing that workbook. The slot is
   * replaced only while it still holds exactly this text, so a newer copy written meanwhile is kept. */
  replaceFallbackIfUnchanged?: string;
}

function writeFallback(next: AvWorkbook, storage: WorkbookKeyValueStore | null, consent: FallbackConsent = {}): void {
  if (!storage) throw new WorkbookUncheckedError();
  const existing = storage.getItem(FALLBACK_KEY);
  if (existing !== null && !(consent.replaceFallbackIfUnchanged !== undefined && existing === consent.replaceFallbackIfUnchanged)) {
    const existingId = storedWorkbookId(existing);
    if (existingId !== next.workbookId) {
      throw new WorkbookUncheckedError("This browser's workbook storage is unavailable, and its one fallback slot holds a different workbook, which may be that workbook's only copy. Nothing was saved. Export or reload, then try again.");
    }
    if (existingId === next.workbookId && assessStoredWorkbook(existing).status === "read-only") {
      throw new WorkbookUncheckedError("This browser's workbook storage is unavailable, and its fallback copy of this workbook was saved by a version this one cannot read. Nothing was saved. Reload to fetch the latest version.");
    }
  }
  storage.setItem(FALLBACK_KEY, JSON.stringify(next));
  storage.setItem(ACTIVE_KEY, next.workbookId);
}

export async function saveWorkbook(
  workbook: AvWorkbook,
  backend: WorkbookBackend = browserBackend(),
  options: FallbackConsent = {}
): Promise<AvWorkbook> {
  const next = validateWorkbook({ ...workbook, savedAt: new Date().toISOString() });
  const storage = backend.storage;
  try {
    await backend.table.put(next);
  } catch {
    writeFallback(next, storage, options);
    return next;
  }
  storage?.setItem(ACTIVE_KEY, next.workbookId);
  return next;
}

/** A save refused because the stored copy could not be read, so it could not be checked before writing over it. */
export class WorkbookUncheckedError extends Error {
  constructor(message = "This browser could not read the saved workbook to check it and has no fallback storage, so the change was not saved. Reload and try again.") {
    super(message);
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
 * Saves an edit to the open workbook, unless a stored copy of it is no longer one this version can
 * fully represent. A tab left open on an older release then stops instead of stripping fields
 * that a newer release wrote after this tab loaded. It never writes to IndexedDB without first
 * reading the record it would replace: when that read fails, the edit goes to the fallback copy
 * only. A new record (an id this tab did not load, such as an imported copy) has nothing stored
 * to protect and is saved normally.
 */
export async function saveEditedWorkbook(
  workbook: AvWorkbook,
  backend: WorkbookBackend = browserBackend(),
  options: { newRecord?: boolean; replaceFallbackIfUnchanged?: string } = {}
): Promise<AvWorkbook> {
  const consent: FallbackConsent = { replaceFallbackIfUnchanged: options.replaceFallbackIfUnchanged };
  if (options.newRecord) return saveWorkbook(workbook, backend, consent);
  let record: unknown;
  let readFailed = false;
  try {
    record = await backend.table.get(workbook.workbookId);
  } catch {
    readFailed = true;
  }
  const fallback = backend.storage?.getItem(FALLBACK_KEY) ?? null;
  const copies: [unknown, WorkbookSource][] = [[record, "indexeddb"]];
  if (fallback !== null && storedWorkbookId(fallback) === workbook.workbookId) copies.push([fallback, "fallback"]);
  for (const [copy, source] of copies) {
    if (copy === undefined || copy === null) continue;
    const assessment = assessStoredWorkbook(copy);
    if (assessment.status === "read-only") {
      throw new WorkbookChangedElsewhereError({ status: "read-only", activeId: workbook.workbookId, source, reason: assessment.reason, raw: assessment.raw });
    }
  }
  if (readFailed) {
    // Fail closed for IndexedDB: the record could not be read, so it is never overwritten.
    const next = validateWorkbook({ ...workbook, savedAt: new Date().toISOString() });
    writeFallback(next, backend.storage, consent);
    return next;
  }
  return saveWorkbook(workbook, backend, consent);
}

export interface FallbackSlot {
  /** The slot's exact stored text. */
  text: string;
  /** True when this copy is not also in IndexedDB (unreadable, missing, or older there), so replacing it loses it. */
  onlyCopy: boolean;
}

/** The fallback slot when it holds this workbook: its exact text, and whether it is the only current copy. */
export async function fallbackSlotFor(workbookId: string, backend: WorkbookBackend = browserBackend()): Promise<FallbackSlot | null> {
  const text = backend.storage?.getItem(FALLBACK_KEY) ?? null;
  if (text === null || storedWorkbookId(text) !== workbookId) return null;
  try {
    const record = await backend.table.get(workbookId);
    return { text, onlyCopy: record === undefined || record === null || storedSavedAt(text) > storedSavedAt(record) };
  } catch {
    return { text, onlyCopy: true };
  }
}

/** Whether the fallback slot still holds exactly this text, e.g. a copy a save was allowed to replace. */
export function fallbackHolds(text: string, backend: WorkbookBackend = browserBackend()): boolean {
  return backend.storage?.getItem(FALLBACK_KEY) === text;
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
