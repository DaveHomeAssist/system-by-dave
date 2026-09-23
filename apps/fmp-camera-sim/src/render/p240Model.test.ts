import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { defaultCameraProfile } from "../domain/camera";
import { defaultVenueProfile, deriveVenueGeometry, type MountOrientation } from "../domain/venue";
import { cameraFrame } from "../sim/framing";
import { applyFrameToCamera } from "./cameraRig";
import { buildP240, lensDirection } from "./p240Model";

const profile = defaultCameraProfile();
const derived = deriveVenueGeometry(defaultVenueProfile());
if (!derived.ok) throw new Error("bad geometry");
const geometry = derived.geometry;

describe("P240 model", () => {
  for (const orientation of ["upright", "inverted"] as MountOrientation[]) {
    it(`points its lens where the monitor camera looks (${orientation})`, () => {
      const model = buildP240();
      const camera = new PerspectiveCamera();
      for (const pose of [
        { pan: 0, tilt: -15, lens: 0 },
        { pan: 32, tilt: -8, lens: 0.5 },
        { pan: -120, tilt: 20, lens: 1 },
      ]) {
        const frame = cameraFrame({ ...geometry, mountOrientation: orientation, panZeroBearingDeg: 6 }, pose, profile);
        model.setPose(frame.headingDeg, frame.tiltDeg, orientation);
        applyFrameToCamera(camera, frame);
        const [x, y, z] = lensDirection(model.tilt);
        const forward = camera.getWorldDirection(new Vector3());
        expect(x).toBeCloseTo(frame.forward.x, 9);
        expect(y).toBeCloseTo(frame.forward.y, 9);
        expect(z).toBeCloseTo(frame.forward.z, 9);
        expect(forward.x).toBeCloseTo(frame.forward.x, 9);
        expect(forward.y).toBeCloseTo(frame.forward.y, 9);
        expect(forward.z).toBeCloseTo(frame.forward.z, 9);
      }
    });
  }
});
