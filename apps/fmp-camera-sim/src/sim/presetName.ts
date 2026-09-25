import { type CameraProfile } from "../domain/camera";
import { formatSigned } from "../domain/units";
import { type VenueGeometry } from "../domain/venue";
import { cameraFrame, project, stageToWorld } from "./framing";
import { type PtzPose } from "./ptz";

/** Where a shot of a standing performer is aimed: about chest height above the deck. */
const AIM_HEIGHT_M = 1.5;
/** A frame at least this share of the stage width, but short of the whole edge, is a mid shot. */
const MID_SHARE = 0.3;

const inFrame = (p: { inFront: boolean; x: number; y: number }) => p.inFront && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1;

/**
 * A short name for a stored shot, read from the venue model rather than typed: "Wide" when the whole
 * downstage edge is in frame; otherwise "Mid" or "Tight" by how much of the stage width the frame
 * takes in, with the stage mark nearest the middle of the frame ("Tight · DSL"). A shot with no mark
 * in frame is "Off stage" with its pan. The stage dimensions are the venue profile's, so the name is
 * as provisional as they are. Shown for unnamed presets and offered when renaming; never stored by itself.
 */
export function suggestPresetName(geometry: VenueGeometry, profile: CameraProfile, pose: PtzPose): string {
  const frame = cameraFrame(geometry, pose, profile);
  const half = geometry.stageWidth / 2;
  const corners = [half, -half].map((right) => project(frame, stageToWorld({ right, upstage: 0, height: 0 })));
  if (corners.every(inFrame)) return "Wide";
  const nearest = geometry.marks
    .map((mark) => ({ mark, p: project(frame, stageToWorld({ ...mark.point, height: mark.point.height + AIM_HEIGHT_M })) }))
    .filter(({ p }) => inFrame(p))
    .sort((a, b) => a.p.x * a.p.x + a.p.y * a.p.y - (b.p.x * b.p.x + b.p.y * b.p.y))[0];
  if (!nearest) return `Off stage · pan ${formatSigned(pose.pan, 0)}°`;
  const share = (2 * nearest.p.depth * frame.tanH) / geometry.stageWidth;
  return `${share >= MID_SHARE ? "Mid" : "Tight"} · ${nearest.mark.id}`;
}
