import { describe, expect, it } from "vitest";
import index from "../../../data/gear/index.json";
import { DEVICE_TYPES, GEAR_INDEX_PATH, groupChoices, LIBRARY_OMITTED, libraryChoices, loadGearLibrary, suggestName } from "./gear";
import { emptyDocument } from "./model";
import { addDevice } from "./graph";

describe("gear choices for Add device", () => {
  it("offers the Gear Reference entries that sit in the picture path, with their roles", () => {
    const choices = libraryChoices(index);
    const role = (label: string) => choices.find(choice => choice.label === label)?.kind;
    expect(role("BirdDog P240")).toBe("source");
    expect(role("Blackmagic URSA Broadcast G2")).toBe("source");
    expect(role("Blackmagic Camera Fiber Converter")).toBe("converter");
    expect(role("Blackmagic ATEM Television Studio HD8 ISO")).toBe("processor");
    expect(role("Epson PowerLite X39")).toBe("destination");
    expect(choices.every(choice => choice.id.startsWith("gear:") && choice.group.startsWith("Gear Reference · "))).toBe(true);
  });

  it("leaves out library gear that carries no video", () => {
    const labels = libraryChoices(index).map(choice => choice.label);
    const omitted = index.entries.filter(item => LIBRARY_OMITTED.includes(item.subcategory.toLowerCase()));
    expect(omitted.map(entry => entry.subcategory).sort()).toEqual(["Camera control", "Lenses", "PTZ controllers"]);
    for (const entry of omitted) expect(labels).not.toContain(entry.displayName);
  });

  it("gives every library entry either a role or a deliberate omission", () => {
    const offered = new Set(libraryChoices(index).map(choice => choice.id));
    const unmapped = index.entries.filter(entry => !offered.has(`gear:${entry.id}`) && !LIBRARY_OMITTED.includes(entry.subcategory.toLowerCase()));
    expect(unmapped.map(entry => `${entry.displayName} (${entry.subcategory})`)).toEqual([]);
  });

  it("offers nothing from an unreadable index", () => {
    expect(libraryChoices(null)).toEqual([]);
    expect(libraryChoices({ entries: [{ id: "", displayName: "" }] })).toEqual([]);
    expect(libraryChoices({ entries: [{ id: "x", displayName: "Mystery box", subcategory: "Unknown" }] })).toEqual([]);
  });

  it("reads the library from the site's one gear index", async () => {
    const seen: string[] = [];
    const fetchImpl = (async (url: URL) => { seen.push(String(url)); return new Response(JSON.stringify(index), { status: 200 }); }) as unknown as typeof fetch;
    const choices = await loadGearLibrary(fetchImpl, "https://avbydave.com/av/");
    expect(seen).toEqual(["https://avbydave.com/data/gear/index.json"]);
    expect(GEAR_INDEX_PATH).toBe("../data/gear/index.json");
    expect(choices.length).toBeGreaterThan(0);
    const missing = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    await expect(loadGearLibrary(missing, "https://avbydave.com/av/")).rejects.toThrow(/not available/);
  });

  it("keeps device type ids unique and every type in a known role", () => {
    expect(new Set(DEVICE_TYPES.map(choice => choice.id)).size).toBe(DEVICE_TYPES.length);
    expect(groupChoices(DEVICE_TYPES).map(([group]) => group)).toEqual(["Sources", "Converters", "Routing and processing", "Destinations"]);
    expect(DEVICE_TYPES.every(choice => ["source", "converter", "processor", "destination"].includes(choice.kind))).toBe(true);
  });

  it("suggests names the diagram accepts as new devices", () => {
    const camera = DEVICE_TYPES.find(choice => choice.label === "Camera")!;
    const switcher = DEVICE_TYPES.find(choice => choice.label === "Switcher")!;
    expect(suggestName(camera, [])).toBe("Camera 1");
    expect(suggestName(camera, ["Camera 1", "camera 2"])).toBe("Camera 3");
    expect(suggestName(switcher, [])).toBe("Switcher");
    expect(suggestName(switcher, ["Switcher"])).toBe("Switcher 2");
    expect(suggestName({ label: "BirdDog P240" }, ["BirdDog P240", "BirdDog P240 2"])).toBe("BirdDog P240 3");
    let doc = emptyDocument();
    for (let i = 0; i < 3; i++) doc = addDevice(doc, suggestName(camera, doc.graphDevices.map(device => device.label)), camera.kind);
    expect(doc.graphDevices.map(device => device.label)).toEqual(["Camera 1", "Camera 2", "Camera 3"]);
  });
});
