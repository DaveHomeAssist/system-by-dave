import { z } from "zod";
import type { Route } from "./model";

export const shotFields = ["number", "cue", "camera", "type", "subject", "framing", "movement", "preset", "status", "notes"] as const;
export const playbackFields = ["cue", "file", "type", "duration", "aspect", "audio", "destination", "status", "backup", "notes"] as const;
const text = z.string();
const common = { id: text, origin: text, routeId: text, status: text, notes: text };
export const shotSchema = z.object({ ...common, number: text, cue: text, camera: text, type: text, subject: text, framing: text, movement: text, preset: text }).strict();
export const playbackSchema = z.object({ ...common, cue: text, file: text, type: text, duration: text, aspect: text, audio: text, destination: text, backup: text }).strict();
export type CameraShot = z.infer<typeof shotSchema>;
export type PlaybackCue = z.infer<typeof playbackSchema>;
export type SequenceRecord = { id: string; origin: string; routeId: string; status: string; notes: string };
export function newShot(): CameraShot {
  return { id: crypto.randomUUID(), origin: "", routeId: "", number: "", cue: "", camera: "", type: "", subject: "", framing: "", movement: "", preset: "", status: "hold", notes: "" };
}
export function newPlayback(): PlaybackCue {
  return { id: crypto.randomUUID(), origin: "", routeId: "", cue: "", file: "", type: "", duration: "", aspect: "", audio: "", destination: "", backup: "", status: "pending", notes: "" };
}
export const shotName = (row: CameraShot) => [row.number, row.subject].filter(Boolean).join(" · ") || "Untitled shot";
export const playbackName = (row: PlaybackCue) => [row.cue, row.file].filter(Boolean).join(" · ") || "Untitled cue";
function linkGaps(row: SequenceRecord, routes: Route[]): string[] {
  return row.routeId && !routes.some(route => route.id === row.routeId) ? ["Linked route was removed"] : [];
}
export function shotGaps(row: CameraShot, routes: Route[]): string[] {
  return [...(!row.camera.trim() ? ["Camera missing"] : []), ...(!row.subject.trim() ? ["Subject missing"] : []), ...(row.status === "problem" ? ["Reported problem"] : []), ...linkGaps(row, routes)];
}
export function playbackGaps(row: PlaybackCue, routes: Route[]): string[] {
  return [...(!row.file.trim() ? ["File missing"] : []), ...(!row.destination.trim() ? ["Destination missing"] : []), ...(row.status === "issue" ? ["Reported issue"] : []), ...linkGaps(row, routes)];
}
export function moveSequence<T extends SequenceRecord>(rows: T[], id: string, direction: -1 | 1): T[] {
  const from = rows.findIndex(row => row.id === id), to = from + direction;
  if (from < 0 || to < 0 || to >= rows.length) return rows;
  const result = [...rows]; result.splice(to, 0, result.splice(from, 1)[0]); return result;
}
export function sequenceCsv<T extends SequenceRecord>(rows: T[], fields: readonly (keyof T & string)[]): string {
  const keys = ["routeId", ...fields] as (keyof T & string)[];
  const cell = (value: unknown) => { const raw = String(value); return `"${(/^[=+@\-\t\r]/.test(raw) ? "'" : "") + raw.replaceAll('"', '""')}"`; };
  return [keys.join(","), ...rows.map(row => keys.map(key => cell(row[key])).join(","))].join("\r\n");
}
