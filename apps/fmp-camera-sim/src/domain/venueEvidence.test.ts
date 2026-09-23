import { editedEvidence } from "./evidence";
import { describe, expect, it } from "vitest";
import { SimulatorStore } from "../app/store";
import { defaultProject, parseProjectText, serializeProject } from "./project";
import { applyFmpStageProfile, defaultVenueProfile, parseVenueProfile, unsettledVenueItems } from "./venue";

// Old records had one evidence claim covering both the mount and its pan-zero heading.
for (const version of [1, 2]) {
  it(`preserves v${version} settings and copies the old mount claim to heading evidence`, () => {
    const raw = JSON.parse(JSON.stringify(defaultVenueProfile()));
    raw.version = version;
    raw.mount.orientation = "upright";
    raw.mount.panZeroBearingDeg = 29;
    raw.mount.status = "estimated";
    raw.mount.note = "Old operator note";
    delete raw.mount.headingEvidence;
    delete raw.mount.provenance;
    if (version === 1) delete raw.reference.geometryRevision;
    const parsed = parseVenueProfile(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("migration failed");
    expect(parsed.venue.dimensions).toEqual(raw.dimensions);
    expect(parsed.venue.mount).toEqual({ ...raw.mount, headingEvidence: { status: "estimated", note: "Old operator note" } });
    expect(parsed.venue.mount.provenance).toBeUndefined();
  });
}

describe("per-property evidence", () => {
  it("withdraws a previous measurement claim when its value is edited", () => {
    const evidence = { status: "measured" as const, note: "Original measurement", provenance: { method: "field-measurement" as const, sourceIds: ["survey"] } };
    expect(editedEvidence(evidence)).toEqual({ status: "demo", note: "Original measurement", provenance: { method: "operator", sourceIds: [] } });
    expect(evidence.status).toBe("measured");
  });
  it("does not let a photo-confirmed orientation settle an unknown heading", () => {
    const venue = defaultVenueProfile();
    Object.values(venue.dimensions).forEach((d) => { d.status = "measured"; });
    venue.distanceBasis.status = "confirmed";
    expect(unsettledVenueItems(venue)).toEqual(["Pan-zero heading", "Bowl geometry"]);
    venue.mount.headingEvidence.status = "measured";
    expect(unsettledVenueItems(venue)).toEqual(["Bowl geometry"]);
  });

  it("round-trips independent methods, source IDs and notes without upgrading confidence", () => {
    const p = defaultProject();
    p.venue.dimensions.cameraHeight.provenance = { method: "photo", sourceIds: ["P100", "site-visit-1"] };
    const parsed = parseProjectText(serializeProject(p));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("invalid project");
    expect(parsed.project).toEqual(p);
    expect(parsed.project.venue.dimensions.cameraHeight.status).toBe("demo");
  });

  it("preserves heading evidence through the explicit photo profile upgrade", () => {
    const venue = defaultVenueProfile();
    venue.mount.panZeroBearingDeg = 18;
    venue.mount.headingEvidence = { status: "measured", note: "Home at target A", provenance: { method: "field-measurement", sourceIds: ["survey-01"] } };
    const next = applyFmpStageProfile(venue, "working-depth");
    expect(next.mount.headingEvidence).toEqual(venue.mount.headingEvidence);
    expect(next.mount.panZeroBearingDeg).toBe(18);
    expect(next.mount.provenance).toEqual({ method: "photo", sourceIds: ["P100"] });
  });

  it.each([
    { method: "guessed-by-software", sourceIds: [] },
    { method: "photo", sourceIds: "P100" },
    { method: "photo", sourceIds: [42] },
    { method: "photo", sourceIds: Array(17).fill("P100") },
    { method: "photo", sourceIds: ["x".repeat(161)] },
  ])("rejects malformed provenance without replacing the live project: %j", (provenance) => {
    const store = new SimulatorStore(null);
    const before = structuredClone(store.getState().project);
    const file = JSON.parse(serializeProject(before));
    file.venue.dimensions.cameraHeight.provenance = provenance;
    expect(store.importText(JSON.stringify(file), 0).ok).toBe(false);
    expect(store.getState().project).toEqual(before);
  });

  it("requires heading evidence for v3 rather than guessing", () => {
    const raw = JSON.parse(JSON.stringify(defaultVenueProfile()));
    delete raw.mount.headingEvidence;
    const result = parseVenueProfile(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.some((i) => i.path === "venue.mount.headingEvidence")).toBe(true);
  });
});
