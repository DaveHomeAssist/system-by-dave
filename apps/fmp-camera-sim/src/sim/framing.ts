import { type CameraProfile, MONITOR_ASPECT, tanHalfHfov } from "../domain/camera";
import { DEG } from "../domain/units";
import { type StagePoint, type VenueGeometry } from "../domain/venue";
import { type PtzPose } from "./ptz";

// Projection math shared by the exercise evaluator, the monitor overlay and tests. The renderer
// builds its Three.js camera from the same pose and field of view (see render/cameraRig.ts).
//
// World axes follow Three.js: x toward house right (stage left), y up, z toward the house.
// Looking upstage from the catwalk is looking down -z, so stage right lands on the left of frame.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const vec = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const length = (a: Vec3): number => Math.sqrt(dot(a, a));

export function stageToWorld(point: StagePoint): Vec3 {
  return { x: -point.right, y: point.height, z: -point.upstage };
}

export function worldToStage(point: Vec3): StagePoint {
  return { right: -point.x, upstage: -point.z, height: point.y };
}

export interface CameraFrame {
  position: Vec3;
  forward: Vec3;
  right: Vec3;
  up: Vec3;
  /** Heading actually applied: pan plus the mount's pan-zero bearing, degrees. */
  headingDeg: number;
  tiltDeg: number;
  tanH: number;
  tanV: number;
  hfovDeg: number;
  vfovDeg: number;
}

export function cameraFrame(geometry: VenueGeometry, pose: PtzPose, profile: CameraProfile): CameraFrame {
  const headingDeg = pose.pan + geometry.panZeroBearingDeg;
  const h = headingDeg * DEG;
  const t = pose.tilt * DEG;
  const forward = vec(Math.sin(h) * Math.cos(t), Math.sin(t), -Math.cos(h) * Math.cos(t));
  const right = vec(Math.cos(h), 0, Math.sin(h));
  const up = cross(right, forward);
  const tanH = tanHalfHfov(profile, pose.lens);
  const tanV = tanH / MONITOR_ASPECT;
  return {
    position: stageToWorld(geometry.camera),
    forward,
    right,
    up,
    headingDeg,
    tiltDeg: pose.tilt,
    tanH,
    tanV,
    hfovDeg: (2 * Math.atan(tanH)) / DEG,
    vfovDeg: (2 * Math.atan(tanV)) / DEG,
  };
}

export interface Projection {
  /** Normalised frame position: -1 left edge, +1 right edge. */
  x: number;
  /** Normalised frame position: -1 bottom edge, +1 top edge. */
  y: number;
  /** Distance along the lens axis, metres. Negative is behind the camera. */
  depth: number;
  inFront: boolean;
}

export function project(frame: CameraFrame, world: Vec3): Projection {
  const rel = sub(world, frame.position);
  const depth = dot(rel, frame.forward);
  const inFront = depth > 1e-6;
  const safeDepth = inFront ? depth : 1e-6;
  return {
    x: dot(rel, frame.right) / (safeDepth * frame.tanH),
    y: dot(rel, frame.up) / (safeDepth * frame.tanV),
    depth,
    inFront,
  };
}

/** Inside the centred area covering `fraction` of the frame width and height. */
export function insideArea(p: Projection, widthFraction: number, heightFraction = widthFraction): boolean {
  return p.inFront && Math.abs(p.x) <= widthFraction && Math.abs(p.y) <= heightFraction;
}

/** Pan and tilt (relative to the mount) that centre a world point, ignoring limits. */
export function aimAt(geometry: VenueGeometry, world: Vec3): { pan: number; tilt: number } {
  const camera = stageToWorld(geometry.camera);
  const rel = sub(world, camera);
  const horizontal = Math.sqrt(rel.x * rel.x + rel.z * rel.z);
  const heading = Math.atan2(rel.x, -rel.z) / DEG;
  let pan = heading - geometry.panZeroBearingDeg;
  pan = ((((pan + 180) % 360) + 360) % 360) - 180;
  return { pan, tilt: Math.atan2(rel.y, horizontal) / DEG };
}
