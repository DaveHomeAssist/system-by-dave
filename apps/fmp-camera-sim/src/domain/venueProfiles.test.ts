import { describe, expect, it } from "vitest";
import { defaultProject, parseProjectText, serializeProject } from "./project";
import { applyFmpStageProfile, defaultVenueProfile, parseVenueProfile } from "./venue";
import { ftToM } from "./units";

describe("venue profile compatibility", () => {
  it("migrates a v1 project without changing dimensions, orientation, heading or presets", () => {
    const project = defaultProject();
    project.venue.dimensions.stageWidth.value = ftToM(61);
    project.venue.dimensions.stageDepth.value = ftToM(75);
    project.venue.mount.orientation = "upright";
    project.venue.reference.geometryRevision = "legacy-v1";
    project.venue.mount.panZeroBearingDeg = 17;
    project.session.presets = [{ slot: 1, name: "Legacy", cameraId: project.camera.id, pan: 20, tilt: 65, lens: 0.5, savedAt: "2026-09-23T07:00:00.000Z" }];
    const file = JSON.parse(serializeProject(project));
    file.venue.version = 1;
    delete file.venue.reference.geometryRevision;
    const parsed = parseProjectText(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("migration failed");
    expect(parsed.project).toEqual(project);
    expect(parseProjectText(serializeProject(parsed.project))).toEqual(parsed);
  });

  it("updates only the explicitly proposed fields and leaves the input untouched", () => {
    const original = defaultVenueProfile();
    original.mount.orientation = "upright";
    original.mount.panZeroBearingDeg = 23;
    original.dimensions.cameraHeight = { value: ftToM(42), status: "measured", note: "Laser measurement" };
    const before = structuredClone(original);
    const next = applyFmpStageProfile(original, "working-depth");
    expect(original).toEqual(before);
    expect(next.dimensions.stageWidth.value).toBe(ftToM(113));
    expect(next.dimensions.stageDepth.value).toBe(ftToM(75));
    expect(next.dimensions.cameraHeight).toEqual(original.dimensions.cameraHeight);
    expect(next.mount.panZeroBearingDeg).toBe(23);
    expect(next.mount.orientation).toBe("inverted");
    expect(parseVenueProfile(next).ok).toBe(true);
  });

  it("rejects future versions and invalid legacy geometry", () => {
    const raw = JSON.parse(JSON.stringify(defaultVenueProfile()));
    raw.version = 99;
    expect(parseVenueProfile(raw).ok).toBe(false);
    raw.version = 1;
    raw.dimensions.stageWidth.value = -1;
    expect(parseVenueProfile(raw).ok).toBe(false);
  });
});
