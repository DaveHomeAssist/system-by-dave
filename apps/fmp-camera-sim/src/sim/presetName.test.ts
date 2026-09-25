import { describe, expect, it } from "vitest";
import { defaultCameraProfile, lensForHfov } from "../domain/camera";
import { defaultVenueProfile, deriveVenueGeometry, type VenueGeometry } from "../domain/venue";
import { aimAt, stageToWorld } from "./framing";
import { suggestPresetName } from "./presetName";
import { type PtzPose } from "./ptz";

const profile = defaultCameraProfile();
const geometry: VenueGeometry = (() => {
  const result = deriveVenueGeometry(defaultVenueProfile());
  if (!result.ok) throw new Error("bad geometry");
  return result.geometry;
})();

function aimedAt(markId: string, lens: number): PtzPose {
  const mark = geometry.marks.find((m) => m.id === markId);
  if (!mark) throw new Error(`no mark ${markId}`);
  return { ...aimAt(geometry, stageToWorld({ ...mark.point, height: 1.5 })), lens };
}

describe("suggested preset names", () => {
  it("calls a shot that holds the whole downstage edge Wide", () => {
    const pose = { ...aimAt(geometry, stageToWorld({ right: 0, upstage: geometry.stageDepth * 0.3, height: 1 })), lens: 0 };
    expect(suggestPresetName(geometry, profile, pose)).toBe("Wide");
  });

  it("names a full-tele shot Tight after the mark it is centred on", () => {
    for (const id of ["DSL", "CS", "USR"]) expect(suggestPresetName(geometry, profile, aimedAt(id, 1))).toBe(`Tight · ${id}`);
  });

  it("calls a frame about half the stage wide a Mid shot", () => {
    const mark = geometry.marks.find((m) => m.id === "DSC");
    if (!mark) throw new Error("no DSC");
    const aim = aimAt(geometry, stageToWorld({ ...mark.point, height: 1.5 }));
    // Half the stage width at the distance to DSC.
    const camera = geometry.camera;
    const distance = Math.hypot(camera.right - mark.point.right, camera.upstage - mark.point.upstage, camera.height - 1.5);
    const hfov = (2 * Math.atan(geometry.stageWidth / 4 / distance) * 180) / Math.PI;
    expect(suggestPresetName(geometry, profile, { ...aim, lens: lensForHfov(profile, hfov) })).toBe("Mid · DSC");
  });

  it("says Off stage, with the pan, when no stage mark is in frame", () => {
    const pose = aimedAt("CS", 1);
    expect(suggestPresetName(geometry, profile, { ...pose, pan: pose.pan + 90 })).toMatch(/^Off stage · pan [+−]\d+°$/);
  });
});
