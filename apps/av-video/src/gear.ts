import { z } from "zod";
import type { DeviceKind } from "./model";

/* Gear choices for the Signal Flow "Add device" dialog. A choice fills in the
   device's name and role; the plan still stores only that name and role, so
   the document schema is unchanged and the name stays the operator's to edit.

   Two sources, in this order:
   1. Everyday device types, the same idea as the format and connector presets.
   2. The Gear Reference library (data/gear/index.json), read when the dialog
      first opens. It is the site's one gear list and is part of the offline
      suite, so this dialog never keeps a copy of it. */

export type GearChoice = { id: string; label: string; group: string; kind: DeviceKind; numbered?: boolean };

const type = (group: string, kind: DeviceKind, label: string, numbered = false): GearChoice =>
  ({ id: `type:${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, label, group, kind, numbered });

export const DEVICE_TYPES: GearChoice[] = [
  type("Sources", "source", "Camera", true),
  type("Sources", "source", "PTZ camera", true),
  type("Sources", "source", "Laptop", true),
  type("Sources", "source", "Playback computer"),
  type("Sources", "source", "Media server"),
  type("Sources", "source", "Graphics computer"),
  type("Converters", "converter", "SDI to HDMI converter"),
  type("Converters", "converter", "HDMI to SDI converter"),
  type("Converters", "converter", "Scaler"),
  type("Converters", "converter", "Fiber converter"),
  type("Routing and processing", "processor", "Switcher"),
  type("Routing and processing", "processor", "Router"),
  type("Routing and processing", "processor", "Distribution amplifier"),
  type("Routing and processing", "processor", "Multiviewer"),
  type("Routing and processing", "processor", "Image processor"),
  type("Routing and processing", "processor", "LED processor"),
  type("Destinations", "destination", "Projector", true),
  type("Destinations", "destination", "LED wall"),
  type("Destinations", "destination", "Display", true),
  type("Destinations", "destination", "Confidence monitor"),
  type("Destinations", "destination", "Recorder"),
  type("Destinations", "destination", "Streaming encoder"),
];

/* Gear Reference subcategories that carry no video, so their gear is not
   offered. A subcategory must appear here or in LIBRARY_ROLES; gear.test.ts
   fails on one that is in neither, so new library gear is never dropped silently. */
export const LIBRARY_OMITTED = ["lenses", "camera control", "ptz controllers"];

/* Gear Reference subcategories that sit in the picture path, and the role each
   takes on the diagram. */
const LIBRARY_ROLES: Record<string, DeviceKind> = {
  "cameras": "source", "ptz cameras": "source", "media servers": "source", "playback": "source",
  "fiber": "converter", "converters": "converter", "scalers": "converter", "extenders": "converter",
  "switchers": "processor", "routers": "processor", "processors": "processor", "led processors": "processor", "multiviewers": "processor",
  "projectors": "destination", "displays": "destination", "monitors": "destination", "led walls": "destination", "recorders": "destination", "encoders": "destination",
};

const indexSchema = z.object({ entries: z.array(z.object({ id: z.string().min(1), displayName: z.string().min(1), subcategory: z.string().optional() }).passthrough()) }).passthrough();

/* Library entries that have a signal role, in the library's own order. An
   unreadable index offers nothing; the device types still work. */
export function libraryChoices(index: unknown): GearChoice[] {
  const parsed = indexSchema.safeParse(index);
  if (!parsed.success) return [];
  return parsed.data.entries.flatMap(entry => {
    const kind = LIBRARY_ROLES[(entry.subcategory || "").trim().toLowerCase()];
    return kind ? [{ id: `gear:${entry.id}`, label: entry.displayName, group: `Gear Reference · ${entry.subcategory}`, kind }] : [];
  });
}

export const GEAR_INDEX_PATH = "../data/gear/index.json";

export async function loadGearLibrary(fetchImpl: typeof fetch = fetch, base: string = document.baseURI): Promise<GearChoice[]> {
  const response = await fetchImpl(new URL(GEAR_INDEX_PATH, base));
  if (!response.ok) throw new Error(`Gear Reference is not available (HTTP ${response.status}).`);
  return libraryChoices(await response.json());
}

/* Choices in display order with their group headings. */
export function groupChoices(choices: GearChoice[]): [string, GearChoice[]][] {
  const groups = new Map<string, GearChoice[]>();
  for (const choice of choices) groups.set(choice.group, [...(groups.get(choice.group) || []), choice]);
  return [...groups.entries()];
}

/* A unique device name for a choice. Kinds that usually come in several
   ("Camera") count from 1; a model keeps its own name and counts from 2. */
export function suggestName(choice: Pick<GearChoice, "label" | "numbered">, taken: string[]): string {
  const used = new Set(taken.map(name => name.trim().toLowerCase()));
  const free = (name: string) => !used.has(name.toLowerCase());
  if (!choice.numbered && free(choice.label)) return choice.label;
  for (let n = choice.numbered ? 1 : 2; ; n++) if (free(`${choice.label} ${n}`)) return `${choice.label} ${n}`;
}
