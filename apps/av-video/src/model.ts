import { z } from "zod";

export const STORE = "sbd.avVideo.v1";
export const SCHEMA = "system-by-dave.av-video.v1";
export const LEGACY = { "Signal Flow": "signal-flow.v1", "Video Patch": "sbd.videoPatch.v1" } as const;
const text = z.string();
const routeSchema = z.object({
  id: text, route: text, source: text, destination: text, system: text, type: text,
  format: text, connector: text, processor: text, input: text, converter: text,
  backup: text, status: text, notes: text, origin: text,
}).strict();
const documentSchema = z.object({
  schema: z.literal(SCHEMA), id: text, title: text, meta: z.record(text),
  routes: z.array(routeSchema), modules: z.object({ patch: z.boolean(), checks: z.boolean(), backups: z.boolean() }).strict(),
  imports: z.array(z.object({ id: text, name: text, raw: text }).strict()),
}).strict().superRefine((doc, ctx) => {
  if (new Set(doc.routes.map(r => r.id)).size !== doc.routes.length) ctx.addIssue({ code: "custom", message: "Duplicate route IDs" });
});
export type Route = z.infer<typeof routeSchema>;
export type VideoDocument = z.infer<typeof documentSchema>;
export type Module = keyof VideoDocument["modules"];
export type Preview = { name: string; raw: string; fingerprint: string; routes: Route[]; meta: Record<string, string>; restore?: VideoDocument; browserKey?: string };
export const uid = () => crypto.randomUUID();
export function newRoute(): Route {
  return { id: uid(), route: "", source: "", destination: "", system: "video", type: "camera", format: "", connector: "", processor: "", input: "", converter: "", backup: "", status: "planned", notes: "", origin: "" };
}
export function emptyDocument(): VideoDocument {
  return { schema: SCHEMA, id: uid(), title: "Untitled video plan", meta: {}, routes: [], modules: { patch: true, checks: true, backups: true }, imports: [] };
}
export function parseDocument(raw: string): VideoDocument { return documentSchema.parse(JSON.parse(raw)); }
export function loadDocument(storage: Pick<Storage, "getItem">): { doc: VideoDocument; baseline: string | null; error: string } {
  let baseline: string | null = null;
  try {
    baseline = storage.getItem(STORE);
    return { doc: baseline === null ? emptyDocument() : parseDocument(baseline), baseline, error: "" };
  } catch {
    return { doc: emptyDocument(), baseline, error: "Saved data could not be read. Saving is blocked to protect it. Export any new work, then reload after resolving the saved data." };
  }
}
export function saveDocument(storage: Pick<Storage, "getItem" | "setItem">, doc: VideoDocument, baseline: string | null): string {
  if (storage.getItem(STORE) !== baseline) throw new Error("This plan changed in another tab. Export your edits, then reload before saving.");
  const next = JSON.stringify(documentSchema.parse(doc));
  storage.setItem(STORE, next);
  if (storage.getItem(STORE) !== next) throw new Error("Save could not be verified. Export your edits before leaving.");
  return next;
}
export function routeGaps(route: Route, modules: VideoDocument["modules"]): string[] {
  const gaps = [!route.source.trim() && "Source missing", !route.destination.trim() && "Destination missing", !route.format.trim() && "Format missing", !route.connector.trim() && "Connector missing", route.status === "issue" && "Reported issue"];
  if (modules.patch && !route.input.trim()) gaps.push("Input missing");
  return gaps.filter((gap): gap is string => Boolean(gap));
}
export function routeChain(route: Route, patch = true): { label: string; value: string }[] {
  return [ { label: "Source", value: route.source || "Source needed" },
    ...(patch && route.converter ? [{ label: "Converter", value: route.converter }] : []),
    ...(patch && route.input ? [{ label: "Input", value: route.input }] : []),
    ...(route.processor ? [{ label: "Processor", value: route.processor }] : []),
    { label: "Destination", value: route.destination || "Destination needed" } ];
}
export async function previewImport(raw: string, name: string, browserKey?: string): Promise<Preview> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const value = z.record(z.unknown()).parse(JSON.parse(raw));
  if (value.schema === SCHEMA) {
    const restore = parseDocument(raw);
    return { name, raw, fingerprint, routes: restore.routes, meta: restore.meta, restore, browserKey };
  }
  const signal = value.schema === "system-by-dave.signal-flow.v1" || (value.schema === undefined && Array.isArray(value.routes) && !Array.isArray(value.items));
  const patch = value.schema === "system-by-dave.video-patch.v1" || (value.schema === undefined && Array.isArray(value.items) && !Array.isArray(value.routes));
  if (!signal && !patch) throw new Error("Choose an AV Video backup, Signal Flow export, or Video Patch export.");
  const fields = signal ? ["route", "system", "source", "format", "connector", "processor", "destination", "status", "backup", "notes"] : ["source", "type", "format", "connector", "input", "converter", "destination", "route", "backup", "status", "notes"];
  const rows = z.array(z.record(z.unknown())).parse(signal ? value.routes : value.items);
  if (rows.some(row => !fields.some(field => typeof row[field] === "string"))) throw new Error("The file contains unrecognized rows; nothing was imported.");
  const routes = rows.map((row, index) => {
    const result = newRoute();
    fields.forEach(field => {
      const v = row[field];
      if (v !== undefined && typeof v !== "string") throw new Error(`Row ${index + 1}: ${field} is not text. Nothing was imported.`);
      (result as Record<string, string>)[field] = v ?? "";
    });
    result.id = `${fingerprint}:${index}`;
    result.origin = fingerprint;
    return result;
  });
  const meta = value.meta === undefined ? {} : z.record(text).parse(value.meta);
  return { name: `${signal ? "Signal Flow" : "Video Patch"} · ${name}`, raw, fingerprint, routes, meta, browserKey };
}
export function applyImport(doc: VideoDocument, preview: Preview): VideoDocument {
  if (preview.restore) return preview.restore;
  if (doc.imports.some(entry => entry.id === preview.fingerprint)) throw new Error("This exact source is already imported. Existing edits are unchanged.");
  return { ...doc, title: doc.routes.length ? doc.title : preview.meta.showName || doc.title,
    meta: doc.routes.length ? doc.meta : { ...doc.meta, ...preview.meta },
    routes: [...doc.routes, ...preview.routes], imports: [...doc.imports, { id: preview.fingerprint, name: preview.name, raw: preview.raw }] };
}
export function sampleDocument(): VideoDocument {
  const doc = emptyDocument();
  return { ...doc, title: "General session · Video", meta: { venue: "Main ballroom", videoLead: "" }, routes: [
    { ...newRoute(), route: "CAM 1 → IMAG", source: "Camera 1", format: "1080p59.94", connector: "3G SDI", input: "Switcher input 1", processor: "Production switcher", destination: "IMAG screens", backup: "Camera 2 wide", status: "tested", notes: "Confirm shading at rehearsal." },
    { ...newRoute(), route: "SLIDES → Screen", source: "Slides laptop", type: "slides", format: "1080p59.94", connector: "HDMI", converter: "HDMI to SDI", input: "Switcher input 3", processor: "Production switcher", destination: "Center screen", backup: "Backup laptop · input 4", status: "issue", notes: "Lock output resolution before doors." },
    { ...newRoute(), route: "PGM → Record", source: "Program out", type: "record", format: "1080p59.94", connector: "3G SDI", input: "Recorder SDI 1", destination: "Program recorder", status: "planned" },
  ] };
}
