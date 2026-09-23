import { type PerformerConfig, type PathId } from "../domain/session";
import { type MarkId, type StageMark, type StagePoint } from "../domain/venue";

// A human-scale performer who stands on a mark or walks a repeatable path. Position is a pure
// function of simulation time, so a replayed exercise sees exactly the same movement.

const ACCEL_TIME_S = 0.45;

const PATH_POINTS: Record<PathId, MarkId[]> = {
  tour: ["USC", "DSR", "DSL", "CS", "USL", "USR"],
  cross: ["DSL", "DSR"],
};

export interface PerformerState {
  position: StagePoint;
  /** Facing direction in stage coordinates, radians. 0 faces the house (downstage). */
  facing: number;
  moving: boolean;
  /** Distance walked so far along the path, metres (drives the stride animation). */
  stride: number;
  height: number;
}

interface Segment {
  from: StagePoint;
  to: StagePoint;
  length: number;
  pauseS: number;
  walkS: number;
  peakSpeed: number;
  accelS: number;
  startS: number;
  strideStart: number;
}

export interface PathPlan {
  segments: Segment[];
  loopS: number;
  loopLength: number;
}

const FACE_HOUSE = 0;

function distance(a: StagePoint, b: StagePoint): number {
  return Math.hypot(b.right - a.right, b.upstage - a.upstage);
}

/** Facing angle for a walking direction: 0 = toward the house, positive turns toward stage right. */
function facingFor(from: StagePoint, to: StagePoint): number {
  return Math.atan2(to.right - from.right, -(to.upstage - from.upstage));
}

function markPoint(marks: readonly StageMark[], id: MarkId): StagePoint {
  const mark = marks.find((m) => m.id === id) ?? marks[0];
  return { ...mark.point };
}

export function planPath(config: PerformerConfig, marks: readonly StageMark[]): PathPlan {
  const ids = PATH_POINTS[config.pathId];
  const points = ids.map((id) => markPoint(marks, id));
  const speed = Math.max(0.1, config.walkSpeed);
  const segments: Segment[] = [];
  let time = 0;
  let stride = 0;
  for (let i = 0; i < points.length; i += 1) {
    const from = points[i];
    const to = points[(i + 1) % points.length];
    const length = distance(from, to);
    const accel = speed / ACCEL_TIME_S;
    // Trapezoid when there is room to reach walking speed, otherwise a triangle.
    const reaches = length >= speed * ACCEL_TIME_S;
    const peakSpeed = reaches ? speed : Math.sqrt(length * accel);
    const accelS = peakSpeed / accel;
    const walkS = length === 0 ? 0 : reaches ? length / speed + ACCEL_TIME_S : 2 * accelS;
    segments.push({ from, to, length, pauseS: config.pauseS, walkS, peakSpeed, accelS, startS: time, strideStart: stride });
    time += config.pauseS + walkS;
    stride += length;
  }
  return { segments, loopS: time, loopLength: stride };
}

function travelled(segment: Segment, tau: number): { s: number; speed: number } {
  const { walkS, peakSpeed, accelS, length } = segment;
  if (walkS === 0) return { s: length, speed: 0 };
  const accel = peakSpeed / accelS;
  if (tau <= accelS) return { s: 0.5 * accel * tau * tau, speed: accel * tau };
  if (tau >= walkS - accelS) {
    const remaining = walkS - tau;
    return { s: length - 0.5 * accel * remaining * remaining, speed: accel * remaining };
  }
  return { s: 0.5 * peakSpeed * accelS + peakSpeed * (tau - accelS), speed: peakSpeed };
}

function blendAngle(a: number, b: number, t: number): number {
  let delta = b - a;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return a + delta * t;
}

/** Performer on a path at a time since the path started. Loops forever. */
export function pathStateAt(plan: PathPlan, height: number, time: number): PerformerState {
  if (plan.loopS <= 0 || plan.segments.length === 0) {
    const origin = plan.segments[0]?.from ?? { right: 0, upstage: 0, height: 0 };
    return { position: { ...origin }, facing: FACE_HOUSE, moving: false, stride: 0, height };
  }
  const wrapped = ((time % plan.loopS) + plan.loopS) % plan.loopS;
  const loop = Math.floor(time / plan.loopS);
  for (const segment of plan.segments) {
    const end = segment.startS + segment.pauseS + segment.walkS;
    if (wrapped >= end && segment !== plan.segments[plan.segments.length - 1]) continue;
    const local = wrapped - segment.startS;
    const strideBase = loop * plan.loopLength + segment.strideStart;
    if (local < segment.pauseS) {
      return { position: { ...segment.from }, facing: FACE_HOUSE, moving: false, stride: strideBase, height };
    }
    const tau = Math.min(local - segment.pauseS, segment.walkS);
    const { s, speed } = travelled(segment, tau);
    const f = segment.length > 0 ? Math.min(1, s / segment.length) : 1;
    const position: StagePoint = {
      right: segment.from.right + (segment.to.right - segment.from.right) * f,
      upstage: segment.from.upstage + (segment.to.upstage - segment.from.upstage) * f,
      height: 0,
    };
    const walkFacing = facingFor(segment.from, segment.to);
    const turn = segment.peakSpeed > 0 ? Math.min(1, speed / segment.peakSpeed) : 0;
    return {
      position,
      facing: blendAngle(FACE_HOUSE, walkFacing, turn),
      moving: speed > 1e-6,
      stride: strideBase + s,
      height,
    };
  }
  const last = plan.segments[plan.segments.length - 1];
  return { position: { ...last.to }, facing: FACE_HOUSE, moving: false, stride: 0, height };
}

export function performerState(
  config: PerformerConfig,
  marks: readonly StageMark[],
  pathTime: number,
): PerformerState {
  if (config.mode === "mark") {
    return { position: markPoint(marks, config.markId), facing: FACE_HOUSE, moving: false, stride: 0, height: config.height };
  }
  return pathStateAt(planPath(config, marks), config.height, pathTime);
}

/** Chest height as a fraction of standing height; the follow exercise frames this point. */
export const CHEST_FRACTION = 0.72;
