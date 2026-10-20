import { z } from "zod";
import type { Panel } from "./layout";

export const DRAFT_INDEX = "sbd.consoleDrafts.v1";
export const DRAFT_CHANGE_EVENT = "sbd:console-draft-change";
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type Draft<T> = { v: 1; console: string; at: string; baseline: string | null; doc: T };
export type DraftChangeDetail = { consoleId: string };
export type DraftChangeNotifier = (detail: DraftChangeDetail) => void;
const draftShape = z.object({ v: z.literal(1), console: z.string(), at: z.string(), baseline: z.string().nullable(), doc: z.unknown() }).strict();
const panelShape = z.object({ id: z.string(), type: z.string(), x: z.number().int(), y: z.number().int(), w: z.number().int(), h: z.number().int() }).strict();
const layoutShape = z.object({ v: z.literal(1), viewId: z.string(), locked: z.boolean(), live: z.record(z.array(panelShape)) }).strict();
export type LayoutState = { viewId: string; locked: boolean; live: Record<string, Panel[]> };
export type DraftResult = { ok: boolean; error?: string; indexError?: string; indexChecked?: boolean };
export type DraftSnapshot<T> = { raw: string | null; draft: Draft<T> | null; error?: string };
export type DraftLock = (action: () => DraftResult) => Promise<DraftResult>;

export const dispatchDraftChange: DraftChangeNotifier = detail => {
  if (typeof window === "undefined" || typeof CustomEvent !== "function") return;
  window.dispatchEvent(new CustomEvent<DraftChangeDetail>(DRAFT_CHANGE_EVENT, { detail }));
};

function readJson(storage: Store, key: string): unknown { try { const raw = storage.getItem(key); return raw === null ? null : JSON.parse(raw); } catch { return null; } }
function writeJson(storage: Store, key: string, value: unknown): boolean { try { const raw = JSON.stringify(value); storage.setItem(key, raw); return storage.getItem(key) === raw; } catch { return false; } }

export function draftSnapshot<T>(storage: Store, key: string, console: string, validate: (doc: unknown) => T): DraftSnapshot<T> {
  let raw: string | null = null;
  try {
    raw = storage.getItem(key);
    if (raw === null) return { raw, draft: null };
    const parsed = draftShape.parse(JSON.parse(raw));
    if (parsed.console !== console) throw new Error("foreign draft");
    return { raw, draft: { ...parsed, doc: validate(parsed.doc) } };
  } catch { return { raw, draft: null, error: "Draft recovery unavailable. Stored data was preserved. Export edits before leaving." }; }
}
export function readDraft<T>(storage: Store, key: string, console: string, validate: (doc: unknown) => T): Draft<T> | null {
  return draftSnapshot(storage, key, console, validate).draft;
}
function updateIndex(storage: Store, console: string, entry: { at: string; label: string } | null): boolean {
  try {
    const raw = storage.getItem(DRAFT_INDEX);
    const current: unknown = raw === null ? {} : JSON.parse(raw);
    if (!current || typeof current !== "object" || Array.isArray(current)) return false;
    const index = { ...current } as Record<string, unknown>;
    if (entry) index[console] = entry; else delete index[console];
    return writeJson(storage, DRAFT_INDEX, index);
  } catch { return false; }
}
const indexFailure = "Draft index could not be updated. Draft indicators may be outdated; recovery uses the draft itself.";
export function writeDraft<T>(storage: Store, key: string, console: string, doc: T, baseline: string | null, label: string): DraftResult {
  const at = new Date().toISOString();
  if (!writeJson(storage, key, { v: 1, console, at, baseline, doc })) return { ok: false, error: "Draft could not be saved. Keep this tab open and Export edits before leaving." };
  return { ok: true, indexChecked: true, indexError: updateIndex(storage, console, { at, label }) ? undefined : indexFailure };
}
export function clearDraft(storage: Store, key: string, console: string): DraftResult {
  try {
    storage.removeItem(key);
    if (storage.getItem(key) !== null) throw new Error("removal not verified");
  } catch { return { ok: false, error: "Draft removal could not be verified. The recovery offer and indicator were retained; review after reloading." }; }
  return { ok: true, indexChecked: true, indexError: updateIndex(storage, console, null) ? undefined : indexFailure };
}
export function draftIndex(storage: Store): Record<string, { at: string; label: string }> {
  const current = readJson(storage, DRAFT_INDEX);
  return current && typeof current === "object" && !Array.isArray(current) ? current as Record<string, { at: string; label: string }> : {};
}

/* Compare and mutate under one origin-wide Web Lock. The saved-plan guard is
   separate. Never acquire ownership by observing another tab's storage event.
   A changed snapshot stops this session until explicit reload/recovery. */
export function createDraftSession<T>(storage: Store, key: string, console: string, snapshot: DraftSnapshot<T>, lock?: DraftLock, notifyDraftChange: DraftChangeNotifier = dispatchDraftChange) {
  let expected = snapshot.raw;
  let owned = false;
  let blocked = snapshot.error;
  let generation = 0;
  const conflict = "Draft changed in another tab. Automatic draft recovery is stopped. Export this tab's edits, then reload to review the stored draft.";
  const run = async (action: "write" | "clear" | "discard" | "restore", doc?: T, baseline?: string | null, label?: string): Promise<DraftResult> => {
    const request = ++generation;
    if (blocked) return { ok: false, error: blocked };
    if (action === "clear" && !owned) return { ok: true };
    if (!lock) return { ok: false, error: "Draft recovery unavailable: this browser cannot coordinate tabs safely. Save explicitly or Export edits before leaving." };
    try {
      return await lock(() => {
        if (request !== generation) return { ok: false }; // superseded before lock acquisition
        if (blocked) return { ok: false, error: blocked };
        if (storage.getItem(key) !== expected) { blocked = conflict; return { ok: false, error: blocked }; }
        if (action === "restore") { owned = true; return { ok: true }; }
        const result = action === "write" ? writeDraft(storage, key, console, doc!, baseline ?? null, label || "") : clearDraft(storage, key, console);
        try { notifyDraftChange({ consoleId: console }); } catch { /* advisory invalidation must not change draft persistence */ }
        if (result.ok) { expected = storage.getItem(key); owned = action === "write"; }
        return result;
      });
    } catch { return { ok: false, error: "Draft recovery unavailable. Keep this tab open and Export edits before leaving." }; }
  };
  return {
    sync: (doc: T, baseline: string | null, dirty: boolean, label: string) => run(dirty ? "write" : "clear", doc, baseline, label),
    restore: () => run("restore"),
    discard: () => run("discard")
  };
}
export function readLayout(storage: Store, key: string): LayoutState | null {
  const parsed = layoutShape.safeParse(readJson(storage, key));
  return parsed.success ? { viewId: parsed.data.viewId, locked: parsed.data.locked, live: parsed.data.live } : null;
}
export function writeLayout(storage: Store, key: string, state: LayoutState): boolean { return writeJson(storage, key, { v: 1, ...state }); }
