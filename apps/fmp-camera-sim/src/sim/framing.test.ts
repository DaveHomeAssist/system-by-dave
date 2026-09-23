import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { defaultCameraProfile, lensForHfov } from "../domain/camera";
import { ftToM } from "../domain/units";
import { defaultVenueProfile, deriveVenueGeometry, type VenueGeometry, type VenueProfile } from "../domain/venue";
import { evaluateWide } from "../exercises/wide";
import { defaultExerciseSettings } from "../domain/session";
import { applyFrameToCamera } from "../render/cameraRig";
import { aimAt, cameraFrame, project, stageToWorld } from "./framing";

const geometryOf = (venue: VenueProfile): VenueGeometry => {
  const result = deriveVenueGeometry(venue);
  if (!result.ok) throw new Error("bad geometry");
  return result.geometry;
};

describe("camera framing", () => {
  const profile = defaultCameraProfile();
  const geometry = geometryOf(defaultVenueProfile());

  it("centres the point it is aimed at", () => {
    const target = stageToWorld({ right: 3, upstage: 12, height: 1.5 });
    const aim = aimAt(geometry, target);
    const p = project(cameraFrame(geometry, { ...aim, lens: 0.4 }, profile), target);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(0, 9);
    expect(p.inFront).toBe(true);
  });

  it("shows stage right on the left of the picture", () => {
    const aim = aimAt(geometry, stageToWorld({ right: 0, upstage: 10, height: 0 }));
    const frame = cameraFrame(geometry, { ...aim, lens: 0 }, profile);
    expect(project(frame, stageToWorld({ right: 5, upstage: 10, height: 0 })).x).toBeLessThan(0);
    expect(project(frame, stageToWorld({ right: -5, upstage: 10, height: 0 })).x).toBeGreaterThan(0);
    expect(project(frame, stageToWorld({ right: 0, upstage: 10, height: 3 })).y).toBeGreaterThan(0);
  });

  it("matches the Three.js camera that draws the monitor", () => {
    const camera = new PerspectiveCamera();
    const points = [
      { right: 0, upstage: 0, height: 0 },
      { right: 9, upstage: 3, height: 0 },
      { right: -7, upstage: 18, height: 2 },
      { right: 2, upstage: 40, height: 6 },
    ];
    for (const pose of [
      { pan: 0, tilt: -12, lens: 0 },
      { pan: 7.5, tilt: -9, lens: 0.35 },
      { pan: -11, tilt: -15.5, lens: 0.8 },
    ]) {
      const frame = cameraFrame({ ...geometry, panZeroBearingDeg: 4 }, pose, profile);
      applyFrameToCamera(camera, frame);
      for (const point of points) {
        const world = stageToWorld(point);
        const ours = project(frame, world);
        if (!ours.inFront) continue;
        const theirs = new Vector3(world.x, world.y, world.z).project(camera);
        expect(ours.x).toBeCloseTo(theirs.x, 9);
        expect(ours.y).toBeCloseTo(theirs.y, 9);
      }
    }
  });

  it("changes framing in the expected direction when venue dimensions change", () => {
    const settings = defaultExerciseSettings().wide;
    const fillAt = (venue: VenueProfile) => {
      const g = geometryOf(venue);
      const aim = aimAt(g, stageToWorld({ right: 0, upstage: g.stageDepth * 0.3, height: 1 }));
      return evaluateWide(cameraFrame(g, { ...aim, lens: lensForHfov(profile, 40) }, profile), g, settings).stageFillPct;
    };
    const base = defaultVenueProfile();
    const farther = defaultVenueProfile();
    farther.dimensions.cameraToDse.value = ftToM(120);
    const wider = defaultVenueProfile();
    wider.dimensions.stageWidth.value = ftToM(80);
    expect(fillAt(farther)).toBeLessThan(fillAt(base));
    expect(fillAt(wider)).toBeGreaterThan(fillAt(base));

    // A higher camera looks down more steeply at the downstage edge.
    const high = defaultVenueProfile();
    high.dimensions.cameraHeight.value = ftToM(50);
    const origin = stageToWorld({ right: 0, upstage: 0, height: 0 });
    expect(aimAt(geometryOf(high), origin).tilt).toBeLessThan(aimAt(geometryOf(base), origin).tilt);

    // Reading the same number as line of sight brings the camera closer, so the stage fills more.
    const lineOfSight = defaultVenueProfile();
    lineOfSight.distanceBasis.value = "line-of-sight";
    expect(fillAt(lineOfSight)).toBeGreaterThan(fillAt(base));

    // A camera offset toward stage right (house left) must pan right to find centre stage.
    const offset = defaultVenueProfile();
    offset.dimensions.cameraLateral.value = ftToM(25);
    expect(aimAt(geometryOf(offset), stageToWorld({ right: 0, upstage: 5, height: 0 })).pan).toBeGreaterThan(0);
    offset.dimensions.cameraLateral.value = ftToM(-25);
    expect(aimAt(geometryOf(offset), stageToWorld({ right: 0, upstage: 5, height: 0 })).pan).toBeLessThan(0);
  });
});
