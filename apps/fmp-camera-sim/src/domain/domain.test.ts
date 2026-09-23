import { describe, expect, it } from "vitest";
import {
  defaultCameraProfile,
  lensForHfov,
  lensState,
  panSpeedForLevel,
  parseCameraProfile,
  presetSpeedForLevel,
  zoomRateForLevel,
} from "./camera";
import { defaultProject, parseProject, parseProjectText, serializeProject } from "./project";
import { ftToM, mToFt } from "./units";
import { defaultVenueProfile, deriveVenueGeometry, parseVenueProfile, unsettledVenueItems, type VenueProfile } from "./venue";

const geometryOf = (venue: VenueProfile) => {
  const result = deriveVenueGeometry(venue);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.geometry;
};

describe("camera profile", () => {
  it("hits both published field-of-view endpoints exactly", () => {
    const profile = defaultCameraProfile();
    expect(lensState(profile, 0).hfovDeg).toBeCloseTo(70.2, 10);
    expect(lensState(profile, 1).hfovDeg).toBeCloseTo(4.1, 10);
    expect(lensState(profile, 0).focalMm).toBeCloseTo(4.4, 10);
    expect(lensState(profile, 1).focalMm).toBeCloseTo(88.4, 10);
    const mid = lensState(profile, 0.5);
    expect(mid.hfovDeg).toBeLessThan(70.2);
    expect(mid.hfovDeg).toBeGreaterThan(4.1);
    // 16:9 monitor: vertical tangent is 9/16 of the horizontal.
    const tanH = Math.tan((mid.hfovDeg * Math.PI) / 360);
    const tanV = Math.tan((mid.vfovDeg * Math.PI) / 360);
    expect(tanV / tanH).toBeCloseTo(9 / 16, 12);
  });

  it("inverts the lens mapping", () => {
    const profile = defaultCameraProfile();
    for (const lens of [0, 0.2, 0.55, 1]) {
      expect(lensForHfov(profile, lensState(profile, lens).hfovDeg)).toBeCloseTo(lens, 9);
    }
  });

  it("models Tele Convert as a 2x crop across the range", () => {
    const profile = defaultCameraProfile();
    profile.behaviour.teleConvert = true;
    const tele = lensState(profile, 1);
    expect(tele.zoomRatio).toBeCloseTo((88.4 / 4.4) * 2, 9);
    expect(Math.tan((tele.hfovDeg * Math.PI) / 360)).toBeCloseTo(Math.tan((4.1 * Math.PI) / 360) / 2, 12);
  });

  it("orders the training speed levels from level 1 to the published maximum", () => {
    const profile = defaultCameraProfile();
    for (let level = 1; level < 8; level += 1) {
      expect(panSpeedForLevel(profile, level + 1)).toBeGreaterThan(panSpeedForLevel(profile, level));
      expect(presetSpeedForLevel(profile, level + 1)).toBeGreaterThan(presetSpeedForLevel(profile, level));
      expect(zoomRateForLevel(profile, level + 1)).toBeGreaterThan(zoomRateForLevel(profile, level));
    }
    expect(panSpeedForLevel(profile, 1)).toBeCloseTo(profile.behaviour.panLevel1DegS, 12);
    expect(1 / zoomRateForLevel(profile, 8)).toBeCloseTo(profile.behaviour.zoomFastTravelS, 12);
  });

  it("rejects an import that rewrites published figures or leaves ranges", () => {
    const tampered = defaultCameraProfile() as unknown as Record<string, Record<string, unknown>>;
    tampered.published.panMaxSpeedDegS = 300;
    tampered.behaviour.stopS = 9;
    const result = parseCameraProfile(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.issues.map((issue) => issue.path);
      expect(paths).toContain("camera.published.panMaxSpeedDegS");
      expect(paths).toContain("camera.behaviour.stopS");
    }
  });
});

describe("venue geometry", () => {
  it("places the default camera 110 ft from the downstage edge on the centreline", () => {
    const g = geometryOf(defaultVenueProfile());
    expect(g.camera.upstage).toBeCloseTo(-ftToM(110), 9);
    expect(g.camera.right).toBe(0);
    expect(g.camera.height).toBeCloseTo(ftToM(35), 9);
    expect(g.horizontalDistance).toBeCloseTo(ftToM(110), 9);
    expect(mToFt(g.stageWidth)).toBeCloseTo(113, 9);
    expect(mToFt(g.stageDepth)).toBeCloseTo(61, 9);
  });

  it("derives horizontal separation from a line-of-sight distance", () => {
    const venue = defaultVenueProfile();
    venue.distanceBasis.value = "line-of-sight";
    const g = geometryOf(venue);
    const expected = Math.sqrt(ftToM(110) ** 2 - ftToM(35) ** 2);
    expect(g.horizontalDistance).toBeCloseTo(expected, 9);
    expect(g.lineOfSight).toBeCloseTo(ftToM(110), 9);
    expect(-g.camera.upstage).toBeCloseTo(expected, 9);
  });

  it("keeps the plan distance when the camera is offset sideways", () => {
    const venue = defaultVenueProfile();
    venue.dimensions.cameraLateral.value = ftToM(20);
    const g = geometryOf(venue);
    expect(Math.hypot(g.camera.right, g.camera.upstage)).toBeCloseTo(ftToM(110), 9);
    expect(g.camera.right).toBeCloseTo(ftToM(20), 9);
  });

  it("names the offending field for impossible geometry", () => {
    const venue = defaultVenueProfile();
    venue.distanceBasis.value = "line-of-sight";
    venue.dimensions.cameraToDse.value = ftToM(30);
    const result = deriveVenueGeometry(venue);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0].path).toBe("venue.dimensions.cameraToDse.value");

    const sideways = defaultVenueProfile();
    sideways.dimensions.cameraLateral.value = ftToM(110);
    const lateral = deriveVenueGeometry(sideways);
    expect(lateral.ok).toBe(false);
    if (!lateral.ok) expect(lateral.issues[0].path).toBe("venue.dimensions.cameraLateral.value");
  });

  it("rejects out-of-range dimensions with the field path", () => {
    const venue = defaultVenueProfile() as unknown as { dimensions: Record<string, { value: unknown }> };
    venue.dimensions.stageWidth.value = ftToM(900);
    venue.dimensions.stageDepth.value = "deep";
    const result = parseVenueProfile(venue);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.issues.map((issue) => issue.path);
      expect(paths).toContain("venue.dimensions.stageWidth.value");
      expect(paths).toContain("venue.dimensions.stageDepth.value");
    }
  });

  it("keeps the venue approximate until every critical item is settled", () => {
    const venue = defaultVenueProfile();
    expect(unsettledVenueItems(venue)).toEqual([
      "Camera to downstage edge",
      "Camera height above stage",
      "Camera lateral offset",
      "Stage width",
      "Stage depth",
      "Distance basis",
      "Mount orientation",
    ]);
    for (const key of ["cameraToDse", "cameraHeight", "cameraLateral", "stageWidth", "stageDepth"] as const) {
      venue.dimensions[key].status = "measured";
    }
    venue.distanceBasis.status = "confirmed";
    venue.mount.status = "confirmed";
    expect(unsettledVenueItems(venue)).toEqual([]);
  });

  it("lays out nine stage marks in performer-facing directions", () => {
    const g = geometryOf(defaultVenueProfile());
    expect(g.marks.map((m) => m.id)).toEqual(["DSR", "DSC", "DSL", "CSR", "CS", "CSL", "USR", "USC", "USL"]);
    const dsr = g.marks.find((m) => m.id === "DSR")!;
    expect(dsr.point.right).toBeGreaterThan(0);
    expect(dsr.point.upstage).toBeGreaterThan(0);
    expect(g.marks.find((m) => m.id === "USL")!.point.right).toBeLessThan(0);
  });
});

describe("project files", () => {
  it("round-trips settings, provenance and presets", () => {
    const project = defaultProject();
    project.venue.dimensions.cameraHeight = { value: ftToM(38.5), status: "measured", note: "Laser, 22 Sept" };
    project.venue.distanceBasis = { value: "line-of-sight", status: "confirmed", note: "Video office" };
    project.camera.behaviour.curveExponent = 2.2;
    project.session.presets = [
      { slot: 1, name: "Safe wide", cameraId: project.camera.id, pan: -1.25, tilt: -12.5, lens: 0.21, savedAt: "2026-09-23T07:00:00.000Z" },
      { slot: 4, name: "Lead", cameraId: project.camera.id, pan: 0.5, tilt: -9.75, lens: 0.83, savedAt: "2026-09-23T07:01:00.000Z" },
    ];
    project.session.exerciseResults = [
      { id: "r1", exercise: "wide", completedAt: "2026-09-23T07:02:00.000Z", passed: true, summary: "held", metrics: { elapsedS: 12.5 } },
    ];
    const text = serializeProject(project, "2026-09-23T07:05:00.000Z");
    const parsed = parseProjectText(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.project).toEqual(project);
  });

  it("rejects malformed input without guessing", () => {
    expect(parseProjectText("{nope").ok).toBe(false);
    const wrong = parseProject({ schema: "something-else", version: 1 });
    expect(wrong.ok).toBe(false);
    const future = parseProject({ schema: "fmp-camera-simulator.project", version: 2 });
    expect(future.ok).toBe(false);
    if (!future.ok) expect(future.issues[0].message).toMatch(/Unsupported project version 2/);
  });

  it("identifies malformed presets and foreign camera identities", () => {
    const project = defaultProject();
    const file = JSON.parse(serializeProject(project));
    file.session.presets = [
      { slot: 1, name: "A", cameraId: "someone-else", pan: 0, tilt: 0, lens: 0, savedAt: "2026-09-23T07:00:00.000Z" },
    ];
    const foreign = parseProject(file);
    expect(foreign.ok).toBe(false);
    if (!foreign.ok) expect(foreign.issues.map((i) => i.path)).toContain("session.presets[0].cameraId");

    file.session.presets = [
      { slot: 2, name: "A", cameraId: project.camera.id, pan: 0, tilt: 0, lens: 0, savedAt: "2026-09-23T07:00:00.000Z" },
      { slot: 2, name: "B", cameraId: project.camera.id, pan: 400, tilt: 0, lens: 0, savedAt: "yesterday" },
    ];
    const broken = parseProject(file);
    expect(broken.ok).toBe(false);
    if (!broken.ok) {
      const paths = broken.issues.map((i) => i.path);
      expect(paths).toContain("session.presets[1].pan");
      expect(paths).toContain("session.presets[1].savedAt");
    }
  });
});
