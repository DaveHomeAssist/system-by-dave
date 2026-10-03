import { z } from "zod";
import type { Route, VideoDocument } from "./model";

export const displayFields = ["display", "type", "input", "processor", "resolution", "aspect", "refresh", "route", "backup", "status", "notes"] as const;
export const projectionFields = ["screen", "surface", "size", "aspect", "projector", "lens", "throwDistance", "position", "input", "route", "blend", "backup", "status", "notes"] as const;
const text = z.string();
export const displaySchema = z.object({
  id: text, kind: z.enum(["display", "projection"]), routeId: text, origin: text,
  display: text, type: text, input: text, processor: text, resolution: text, aspect: text, refresh: text,
  route: text, backup: text, status: text, notes: text, screen: text, surface: text, size: text,
  projector: text, lens: text, throwDistance: text, position: text, blend: text,
}).strict();
export type Display = z.infer<typeof displaySchema>;
export function newDisplay(kind: Display["kind"]): Display {
  return { id: crypto.randomUUID(), kind, routeId: "", origin: "", display: "", type: "", input: "", processor: "", resolution: "", aspect: "", refresh: "", route: "", backup: "", status: "planned", notes: "", screen: "", surface: "", size: "", projector: "", lens: "", throwDistance: "", position: "", blend: "" };
}
export const displayName = (item: Display) => (item.kind === "projection" ? item.screen : item.display) || "Untitled destination";
export function suggestedRoutes(item: Display, routes: Route[]): Route[] {
  const name = displayName(item).trim().toLowerCase();
  return routes.filter(r => (item.route.trim() && r.route.trim().toLowerCase() === item.route.trim().toLowerCase()) || (name !== "untitled destination" && r.destination.trim().toLowerCase() === name));
}
export function displayGaps(item: Display, routes: Route[]): string[] {
  const fields = item.kind === "projection"
    ? [[item.screen, "Screen"], [item.size, "Screen size"], [item.projector, "Projector"], [item.lens, "Lens"], [item.throwDistance, "Throw distance"], [item.position, "Position"]]
    : [[item.display, "Display"], [item.resolution, "Resolution"], [item.aspect, "Aspect"], [item.refresh, "Refresh rate"]];
  const gaps = fields.filter(([value]) => !value.trim()).map(([, label]) => `${label} missing`);
  if (!item.input.trim()) gaps.push("Input missing");
  if (!item.routeId) gaps.push("Route not linked");
  else if (!routes.some(r => r.id === item.routeId)) gaps.push("Linked route was removed");
  if (item.status === "issue") gaps.push("Reported issue");
  return gaps;
}
export function displayIssues(doc: VideoDocument): Display[] {
  return doc.modules.displays ? doc.displays.filter(item => displayGaps(item, doc.routes).length) : [];
}
export function displaysCsv(items: Display[]): string {
  const fields = ["kind", "routeId", ...new Set([...displayFields, ...projectionFields])];
  const cell = (value: string) => `"${(/^[=+@\-\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`;
  return [fields.join(","), ...items.map(item => fields.map(field => cell(item[field as keyof Display])).join(","))].join("\r\n");
}
