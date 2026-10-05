import { z } from "zod";
import type { Panel } from "./layout";

/* Console drafts (docs/av-console.md, decision 2). A console's unsaved record
   edits live under its own draft key, never in its saved document; Save stays
   explicit. Unstored layout is device-local interface state. A shared index
   tells the suite rail which consoles hold drafts. Storage failures are
   reported to the caller and never throw. */

export const DRAFT_INDEX = "sbd.consoleDrafts.v1";
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type Draft<T> = { v: 1; console: string; at: string; baseline: string | null; doc: T };
const draftShape = z.object({ v: z.literal(1), console: z.string(), at: z.string(), baseline: z.string().nullable(), doc: z.unknown() }).strict();
const panelShape = z.object({ id: z.string(), type: z.string(), x: z.number().int(), y: z.number().int(), w: z.number().int(), h: z.number().int() }).strict();
const layoutShape = z.object({ v: z.literal(1), viewId: z.string(), locked: z.boolean(), live: z.record(z.array(panelShape)) }).strict();
export type LayoutState = { viewId: string; locked: boolean; live: Record<string, Panel[]> };

function readJson(storage: Store, key: string): unknown { try { const raw = storage.getItem(key); return raw === null ? null : JSON.parse(raw); } catch { return null; } }
function writeJson(storage: Store, key: string, value: unknown): boolean { try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }

/* Returns the draft only when it belongs to this console and its document
   passes the console's own validator. */
export function readDraft<T>(storage: Store, key: string, console: string, validate: (doc: unknown) => T): Draft<T> | null {
  const parsed = draftShape.safeParse(readJson(storage, key));
  if (!parsed.success || parsed.data.console !== console) return null;
  try { return { ...parsed.data, doc: validate(parsed.data.doc) }; } catch { return null; }
}
export function writeDraft<T>(storage: Store, key: string, console: string, doc: T, baseline: string | null, label: string): boolean {
  const ok = writeJson(storage, key, { v: 1, console, at: new Date().toISOString(), baseline, doc });
  if (ok) updateIndex(storage, console, { at: new Date().toISOString(), label });
  return ok;
}
export function clearDraft(storage: Store, key: string, console: string) {
  try { storage.removeItem(key); } catch { /* nothing to clear */ }
  updateIndex(storage, console, null);
}
function updateIndex(storage: Store, console: string, entry: { at: string; label: string } | null) {
  const current = readJson(storage, DRAFT_INDEX);
  const index: Record<string, { at: string; label: string }> = current && typeof current === "object" && !Array.isArray(current) ? { ...(current as Record<string, { at: string; label: string }>) } : {};
  if (entry) index[console] = entry; else delete index[console];
  writeJson(storage, DRAFT_INDEX, index);
}
export function draftIndex(storage: Store): Record<string, { at: string; label: string }> {
  const current = readJson(storage, DRAFT_INDEX);
  return current && typeof current === "object" && !Array.isArray(current) ? current as Record<string, { at: string; label: string }> : {};
}

export function readLayout(storage: Store, key: string): LayoutState | null {
  const parsed = layoutShape.safeParse(readJson(storage, key));
  return parsed.success ? { viewId: parsed.data.viewId, locked: parsed.data.locked, live: parsed.data.live } : null;
}
export function writeLayout(storage: Store, key: string, state: LayoutState): boolean { return writeJson(storage, key, { v: 1, ...state }); }
