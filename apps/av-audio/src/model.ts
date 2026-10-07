import { z } from "zod";
import { workspaceSchema } from "../../shared/av-console/layout";
export const STORE = "sbd.avAudio.v1";
export const SCHEMA = "system-by-dave.av-audio.v1";
export const LEGACY = [
  { name: "Input List", key: "input-list.v1", collection: "rows" },
  { name: "Audio Patch", key: "audio-patch.v1", collection: "items" },
  { name: "Line Check", key: "line-check.v1", collection: "items" },
  { name: "Speaker Plan", key: "sbd.speakerPlan.v1", collection: "items" },
] as const;
const fields = ["channel","source","type","location","console","stagebox","input","phantom","gain","destination","monitor","status","inputStatus","patchStatus","lineCheckStatus","tech","talkback","problem","notes"] as const;
const speakerFields = ["zone","speaker","type","processor","output","amp","cable","trim","delay","coverage","status","backup","notes"] as const;
const row = z.object({ id: z.string(), origin: z.string(), legacy: z.record(z.unknown()) }).and(z.record(z.unknown()));
const docSchema = z.object({ schema: z.literal(SCHEMA), title: z.string(), channels: z.array(row), speakers: z.array(row), imports: z.array(z.object({ id: z.string(), name: z.string(), raw: z.string(), count: z.number() })), workspace: workspaceSchema.optional() });
export type AudioDoc = z.infer<typeof docSchema>;
export const blank = (): AudioDoc => ({ schema: SCHEMA, title: "Untitled audio plan", channels: [], speakers: [], imports: [] });
export function load(storage: Pick<Storage,"getItem">) { const raw = storage.getItem(STORE); try { return { raw, doc: raw ? docSchema.parse(JSON.parse(raw)) : blank(), error: "" }; } catch { return { raw, doc: blank(), error: "Saved plan is unreadable. Saving is blocked; download the original bytes before recovery." }; } }
export function save(storage: Pick<Storage,"getItem"|"setItem">, doc: AudioDoc, baseline: string | null) { if (storage.getItem(STORE) !== baseline) throw new Error("Plan changed in another tab. Export this copy and reload."); const raw = JSON.stringify(docSchema.parse(doc)); storage.setItem(STORE, raw); if (storage.getItem(STORE) !== raw) throw new Error("Save readback failed. Export this copy."); return raw; }
export function newRow(speaker = false): AudioDoc["channels"][number] { const obj: AudioDoc["channels"][number] = { id: crypto.randomUUID(), origin: "", legacy: {} }; for (const key of speaker ? speakerFields : fields) obj[key] = ""; return obj; }
export function fieldsFor(speaker = false) { return speaker ? speakerFields : fields; }
export async function preview(raw: string, name: string, source?: typeof LEGACY[number]) {
  const parsed = JSON.parse(raw);
  if (parsed?.schema === SCHEMA) return { name, raw, id: await fingerprint(raw), restore: docSchema.parse(parsed), channels: [], speakers: [] };
  if (!source) throw new Error("Choose the source tool for this JSON file.");
  const input = parsed?.[source.collection];
  if (!Array.isArray(input)) throw new Error(`Expected a ${source.name} ${source.collection} collection. Nothing imported.`);
  if (input.length > 2000 || input.some(x => !x || typeof x !== "object" || Array.isArray(x))) throw new Error("Invalid or oversized source rows. Nothing imported.");
  const id = await fingerprint(JSON.stringify({ key: source.key, rows: input.map(canonical).sort((a: string,b: string) => a.localeCompare(b)) }));
  const speaker = source.name === "Speaker Plan";
  const rows = input.map((item: Record<string, unknown>, i: number) => {
    const result = newRow(speaker); result.id = `${source.key}:${String(item.id ?? `${canonical(item)}:${i}`)}`; result.origin = id; result.legacy = item;
    for (const field of fieldsFor(speaker)) result[field] = typeof item[field] === "string" ? item[field] : item[field] == null ? "" : String(item[field]);
    if (source.name === "Input List") { result.channel = String(item.ch ?? i + 1); result.input = String(item.patch ?? ""); result.location = String(item.stand ?? ""); result.tech = String(item.owner ?? ""); result.inputStatus = result.status; }
    if (source.name === "Audio Patch") result.patchStatus = result.status;
    if (source.name === "Line Check") result.lineCheckStatus = result.status;
    return result;
  });
  return { name, raw, id, restore: null, channels: speaker ? [] : rows, speakers: speaker ? rows : [] };
}
function canonical(value: unknown): string { if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`; if (value && typeof value === "object") return `{${Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`; return JSON.stringify(value); }
async function fingerprint(raw: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)); return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,"0")).join(""); }
export function apply(doc: AudioDoc, result: Awaited<ReturnType<typeof preview>>) {
  if (result.restore) return result.restore;
  if (doc.imports.some(x => x.id === result.id)) throw new Error("This exact source has already been imported.");
  const channels = [...doc.channels];
  for (const incoming of result.channels) {
    const match = channels.findIndex(current => String(current.channel).trim() && String(current.channel).trim() === String(incoming.channel).trim() && (!current.source || !incoming.source || String(current.source).trim().toLowerCase() === String(incoming.source).trim().toLowerCase()));
    if (match < 0) { channels.push(incoming); continue; }
    const current = channels[match];
    const merged: AudioDoc["channels"][number] = { ...current, legacy: { sources: [...(Array.isArray(current.legacy.sources) ? current.legacy.sources : [current.legacy]), incoming.legacy] } };
    for (const field of fields) if (!String(merged[field] ?? "").trim() && String(incoming[field] ?? "").trim()) merged[field] = incoming[field];
    if (String(incoming.lineCheckStatus || "").trim()) { merged.lineCheckStatus = incoming.lineCheckStatus; merged.status = incoming.lineCheckStatus; }
    channels[match] = merged;
  }
  const speakers = [...doc.speakers];
  for (const incoming of result.speakers) if (!speakers.some(row => row.id === incoming.id)) speakers.push(incoming);
  return { ...doc, channels, speakers, imports: [...doc.imports, { id: result.id, name: result.name, raw: result.raw, count: result.channels.length + result.speakers.length }] };
}
