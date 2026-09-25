import { type Telemetry } from "../app/store";

// Render on demand. Everything the 3D scene shows is a function of the camera frame, the
// performer and the renderer's own settings, so a frame whose inputs match the last drawn one
// would draw the same picture again. The renderer compares these numbers and skips that draw;
// anything outside them (theme, cutaway, geometry, venue view, context restore) bumps `epoch`.

export type DrawSignature = number[];

/** The scene inputs of one telemetry snapshot, plus the renderer's invalidation epoch and quality level. */
export function sceneSignature(t: Telemetry, epoch: number, quality: number): DrawSignature {
  const { frame, performer } = t;
  return [
    epoch,
    quality,
    frame.position.x,
    frame.position.y,
    frame.position.z,
    frame.headingDeg,
    frame.tiltDeg,
    frame.vfovDeg,
    frame.tanH,
    frame.tanV,
    t.geometry.mountOrientation === "inverted" ? 1 : 0,
    performer.position.right,
    performer.position.upstage,
    performer.position.height,
    performer.facing,
    performer.moving ? 1 : 0,
    // A still performer keeps the same pose whatever its walked distance says.
    performer.moving ? performer.stride : 0,
    performer.height,
  ];
}

/** True when `next` would draw a different picture from `previous` (NaN-safe; no previous means draw). */
export function signatureChanged(previous: DrawSignature | null, next: DrawSignature): boolean {
  if (!previous || previous.length !== next.length) return true;
  for (let i = 0; i < next.length; i++) if (!Object.is(previous[i], next[i])) return true;
  return false;
}
