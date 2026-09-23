import {
  type CameraProfile,
  effectiveTiltLimits,
  panSpeedForLevel,
  type PresetEasing,
  presetSpeedForLevel,
  SPEED_LEVEL_MAX,
  tiltSpeedForLevel,
  zoomRateForLevel,
  zoomSpeedFactor,
} from "../domain/camera";
import { type SpeedLevels } from "../domain/session";
import { clamp } from "../domain/units";
import { type MountOrientation } from "../domain/venue";

// The PTZ simulation owns camera state. It integrates at a fixed 240 Hz step on its own clock,
// so identical input over identical elapsed time produces identical motion at any render rate.
// Callers advance it to the timestamp of each input event before applying the event.

export const SIM_HZ = 240;
export const SIM_STEP = 1 / SIM_HZ;
/** Longest real-time gap the simulation will catch up; anything longer is skipped, not replayed. */
export const MAX_CATCH_UP_S = 0.5;

export interface PtzPose {
  /** Degrees, positive to the camera's right. */
  pan: number;
  /** Degrees, positive up. */
  tilt: number;
  /** Lens position, 0 = wide, 1 = tele. */
  lens: number;
}

/** Commanded deflection from -1 to 1. Zoom positive is tele. */
export interface DriveInput {
  pan: number;
  tilt: number;
  zoom: number;
}

export type MotionTarget = { kind: "preset"; slot: number; name: string } | { kind: "home" };

export type InterruptReason = "manual" | "stop" | "halt" | "profile";

export type SimEvent =
  | { type: "recall-start"; target: MotionTarget; durationS: number; tick: number }
  | { type: "recall-complete"; target: MotionTarget; pose: PtzPose; tick: number }
  | { type: "recall-interrupted"; target: MotionTarget; reason: InterruptReason; tick: number }
  | { type: "limit"; axis: "pan" | "tilt" | "lens"; side: "min" | "max"; tick: number }
  | { type: "halt"; reason: string; tick: number };

interface ActiveRecall {
  target: MotionTarget;
  from: PtzPose;
  to: PtzPose;
  startTick: number;
  durationTicks: number;
}

export interface PtzLimits {
  panMin: number;
  panMax: number;
  tiltMin: number;
  tiltMax: number;
}

export interface PtzSnapshot {
  tick: number;
  time: number;
  pose: PtzPose;
  velocity: PtzPose;
  input: DriveInput;
  speeds: SpeedLevels;
  recall: { target: MotionTarget; progress: number; durationS: number } | null;
  limits: PtzLimits;
  atLimit: { pan: "min" | "max" | null; tilt: "min" | "max" | null; lens: "min" | "max" | null };
  moving: boolean;
  paused: boolean;
}

const EASING_PEAK: Record<PresetEasing, number> = { linear: 1, smoothstep: 1.5, smootherstep: 1.875 };

export function ease(easing: PresetEasing, t: number): number {
  const x = clamp(t, 0, 1);
  if (easing === "linear") return x;
  if (easing === "smoothstep") return x * x * (3 - 2 * x);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function easeDerivative(easing: PresetEasing, t: number): number {
  const x = clamp(t, 0, 1);
  if (easing === "linear") return 1;
  if (easing === "smoothstep") return 6 * x * (1 - x);
  return 30 * x * x * (x - 1) * (x - 1);
}

/** Maps a deflection through the deadband and response curve to a signed 0-1 speed fraction. */
export function shapeDeflection(deflection: number, deadband: number, exponent: number): number {
  const magnitude = Math.abs(clamp(deflection, -1, 1));
  if (magnitude <= deadband) return 0;
  const normalised = (magnitude - deadband) / (1 - deadband);
  return Math.sign(deflection) * Math.pow(normalised, exponent);
}

function approach(current: number, target: number, accel: number, decel: number, dt: number): number {
  const delta = target - current;
  if (delta === 0) return current;
  const braking = current !== 0 && Math.sign(delta) !== Math.sign(current);
  const rate = braking ? decel : accel;
  const stepSize = rate * dt;
  return Math.abs(delta) <= stepSize ? target : current + Math.sign(delta) * stepSize;
}

const EPSILON = 1e-9;

export class PtzSimulator {
  private profile: CameraProfile;
  private mount: MountOrientation;
  private tickCount = 0;
  private origin: number | null = null;
  private pausedAt: number | null = null;
  private pose: PtzPose;
  private velocity: PtzPose = { pan: 0, tilt: 0, lens: 0 };
  private input: DriveInput = { pan: 0, tilt: 0, zoom: 0 };
  private speeds: SpeedLevels;
  private recall: ActiveRecall | null = null;
  private atLimit: PtzSnapshot["atLimit"] = { pan: null, tilt: null, lens: null };
  private events: SimEvent[] = [];

  constructor(profile: CameraProfile, mount: MountOrientation, speeds: SpeedLevels, pose: PtzPose = { pan: 0, tilt: 0, lens: 0 }) {
    this.profile = profile;
    this.mount = mount;
    this.speeds = { ...speeds };
    this.pose = this.clampPose(pose);
  }

  // ------------------------------------------------------------------------------------------
  // Clock
  // ------------------------------------------------------------------------------------------

  /** Advance the simulation to a wall-clock time in seconds. Returns the number of steps run. */
  advanceTo(wallSeconds: number): number {
    if (!Number.isFinite(wallSeconds)) return 0;
    if (this.origin === null) {
      this.origin = wallSeconds - this.tickCount * SIM_STEP;
      return 0;
    }
    if (this.pausedAt !== null) return 0;
    let target = wallSeconds - this.origin;
    const behind = target - this.tickCount * SIM_STEP;
    if (behind > MAX_CATCH_UP_S) {
      this.origin += behind - MAX_CATCH_UP_S;
      target = wallSeconds - this.origin;
    }
    const targetTick = Math.floor(target * SIM_HZ + 1e-7);
    let steps = 0;
    while (this.tickCount < targetTick) {
      this.step();
      steps += 1;
    }
    return steps;
  }

  /** Stop the clock. Time that passes while paused is never simulated. */
  pause(wallSeconds: number): void {
    if (this.pausedAt !== null) return;
    this.advanceTo(wallSeconds);
    this.pausedAt = wallSeconds;
  }

  resume(wallSeconds: number): void {
    if (this.pausedAt === null) return;
    if (this.origin !== null) this.origin += wallSeconds - this.pausedAt;
    this.pausedAt = null;
  }

  get paused(): boolean {
    return this.pausedAt !== null;
  }

  get tick(): number {
    return this.tickCount;
  }

  get time(): number {
    return this.tickCount * SIM_STEP;
  }

  // ------------------------------------------------------------------------------------------
  // Commands
  // ------------------------------------------------------------------------------------------

  /** Commanded deflection. Any manual input outside the deadband interrupts a recall at once. */
  setInput(input: Partial<DriveInput>): void {
    const next: DriveInput = {
      pan: clamp(input.pan ?? this.input.pan, -1, 1),
      tilt: clamp(input.tilt ?? this.input.tilt, -1, 1),
      zoom: clamp(input.zoom ?? this.input.zoom, -1, 1),
    };
    this.input = next;
    const deadband = this.profile.behaviour.deadband;
    if (this.recall && (Math.abs(next.pan) > deadband || Math.abs(next.tilt) > deadband || Math.abs(next.zoom) > deadband)) {
      this.interruptRecall("manual");
    }
  }

  /** Release every commanded axis. The head decelerates over its stopping time. */
  release(): void {
    this.input = { pan: 0, tilt: 0, zoom: 0 };
  }

  /** Stop: release input and abandon any recall. Motion decelerates over the stopping time. */
  stop(): void {
    this.release();
    if (this.recall) this.interruptRecall("stop");
  }

  /** Immediate halt with no deceleration: used when the page hides or rendering is lost. */
  halt(reason: string): void {
    this.input = { pan: 0, tilt: 0, zoom: 0 };
    if (this.recall) this.interruptRecall("halt");
    this.velocity = { pan: 0, tilt: 0, lens: 0 };
    this.events.push({ type: "halt", reason, tick: this.tickCount });
  }

  setSpeeds(speeds: SpeedLevels): void {
    this.speeds = { ...speeds };
  }

  /** Replace the camera profile or mount. Motion stops and the pose is clamped to the new limits. */
  configure(profile: CameraProfile, mount: MountOrientation): void {
    this.profile = profile;
    this.mount = mount;
    if (this.recall) this.interruptRecall("profile");
    this.input = { pan: 0, tilt: 0, zoom: 0 };
    this.velocity = { pan: 0, tilt: 0, lens: 0 };
    this.pose = this.clampPose(this.pose);
  }

  /** Place the camera without animation (restoring a saved session). */
  place(pose: PtzPose): void {
    if (this.recall) this.interruptRecall("stop");
    this.velocity = { pan: 0, tilt: 0, lens: 0 };
    this.pose = this.clampPose(pose);
  }

  /** Animate toward a saved pose. Duration follows the preset speed; easing follows the profile. */
  recallTo(pose: PtzPose, target: MotionTarget): { durationS: number; clamped: boolean } {
    const to = this.clampPose(pose);
    const clamped = Math.abs(to.pan - pose.pan) > EPSILON || Math.abs(to.tilt - pose.tilt) > EPSILON || Math.abs(to.lens - pose.lens) > EPSILON;
    if (this.recall) this.interruptRecall("stop");
    this.input = { pan: 0, tilt: 0, zoom: 0 };
    const from = { ...this.pose };
    const angular = presetSpeedForLevel(this.profile, this.speeds.preset);
    // Recalls drive the zoom at full speed; the preset speed level governs pan and tilt travel.
    const zoomRate = zoomRateForLevel(this.profile, SPEED_LEVEL_MAX);
    const peak = EASING_PEAK[this.profile.behaviour.presetEasing];
    const travel = Math.max(Math.abs(to.pan - from.pan) / angular, Math.abs(to.tilt - from.tilt) / angular, Math.abs(to.lens - from.lens) / zoomRate);
    const durationS = Math.max(this.profile.behaviour.presetMinDurationS, peak * travel);
    const durationTicks = Math.max(1, Math.round(durationS * SIM_HZ));
    this.recall = { target, from, to, startTick: this.tickCount, durationTicks };
    this.events.push({ type: "recall-start", target, durationS: durationTicks * SIM_STEP, tick: this.tickCount });
    return { durationS: durationTicks * SIM_STEP, clamped };
  }

  home(): { durationS: number; clamped: boolean } {
    return this.recallTo({ pan: 0, tilt: 0, lens: 0 }, { kind: "home" });
  }

  drainEvents(): SimEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  // ------------------------------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------------------------------

  limits(): PtzLimits {
    const tilt = effectiveTiltLimits(this.profile, this.mount);
    return {
      panMin: this.profile.limits.panMinDeg,
      panMax: this.profile.limits.panMaxDeg,
      tiltMin: tilt.min,
      tiltMax: tilt.max,
    };
  }

  getPose(): PtzPose {
    return { ...this.pose };
  }

  isMoving(): boolean {
    return (
      this.recall !== null ||
      Math.abs(this.velocity.pan) > EPSILON ||
      Math.abs(this.velocity.tilt) > EPSILON ||
      Math.abs(this.velocity.lens) > EPSILON
    );
  }

  snapshot(): PtzSnapshot {
    const recall = this.recall
      ? {
          target: this.recall.target,
          progress: clamp((this.tickCount - this.recall.startTick) / this.recall.durationTicks, 0, 1),
          durationS: this.recall.durationTicks * SIM_STEP,
        }
      : null;
    return {
      tick: this.tickCount,
      time: this.time,
      pose: { ...this.pose },
      velocity: { ...this.velocity },
      input: { ...this.input },
      speeds: { ...this.speeds },
      recall,
      limits: this.limits(),
      atLimit: { ...this.atLimit },
      moving: this.isMoving(),
      paused: this.paused,
    };
  }

  // ------------------------------------------------------------------------------------------
  // Integration
  // ------------------------------------------------------------------------------------------

  private clampPose(pose: PtzPose): PtzPose {
    const limits = this.limits();
    return {
      pan: clamp(pose.pan, limits.panMin, limits.panMax),
      tilt: clamp(pose.tilt, limits.tiltMin, limits.tiltMax),
      lens: clamp(pose.lens, 0, 1),
    };
  }

  private interruptRecall(reason: InterruptReason): void {
    if (!this.recall) return;
    this.events.push({ type: "recall-interrupted", target: this.recall.target, reason, tick: this.tickCount });
    // The head keeps the velocity it had at the interruption; the manual dynamics take it from there.
    this.recall = null;
  }

  private step(): void {
    const tick = this.tickCount + 1;
    if (this.recall) this.stepRecall(tick);
    else this.stepManual();
    this.tickCount = tick;
  }

  private stepRecall(tick: number): void {
    const recall = this.recall as ActiveRecall;
    const easing = this.profile.behaviour.presetEasing;
    const t = (tick - recall.startTick) / recall.durationTicks;
    if (t >= 1) {
      this.pose = { ...recall.to };
      this.velocity = { pan: 0, tilt: 0, lens: 0 };
      this.recall = null;
      this.atLimit = { pan: null, tilt: null, lens: null };
      this.events.push({ type: "recall-complete", target: recall.target, pose: { ...recall.to }, tick });
      return;
    }
    const e = ease(easing, t);
    const rate = easeDerivative(easing, t) / (recall.durationTicks * SIM_STEP);
    this.pose = {
      pan: recall.from.pan + (recall.to.pan - recall.from.pan) * e,
      tilt: recall.from.tilt + (recall.to.tilt - recall.from.tilt) * e,
      lens: recall.from.lens + (recall.to.lens - recall.from.lens) * e,
    };
    this.velocity = {
      pan: (recall.to.pan - recall.from.pan) * rate,
      tilt: (recall.to.tilt - recall.from.tilt) * rate,
      lens: (recall.to.lens - recall.from.lens) * rate,
    };
  }

  private stepManual(): void {
    const dt = SIM_STEP;
    const b = this.profile.behaviour;
    const minSpeed = this.profile.published.minSpeedDegS;
    const factor = zoomSpeedFactor(this.profile, this.pose.lens);
    const panMax = Math.max(panSpeedForLevel(this.profile, this.speeds.pan) * factor, minSpeed);
    const tiltMax = Math.max(tiltSpeedForLevel(this.profile, this.speeds.tilt) * factor, minSpeed);
    const zoomMax = zoomRateForLevel(this.profile, this.speeds.zoom);

    const panTarget = shapeDeflection(this.input.pan, b.deadband, b.curveExponent) * panMax;
    const tiltTarget = shapeDeflection(this.input.tilt, b.deadband, b.curveExponent) * tiltMax;
    const zoomTarget = shapeDeflection(this.input.zoom, b.deadband, b.curveExponent) * zoomMax;

    const v = this.velocity;
    v.pan = approach(v.pan, panTarget, panMax / b.rampUpS, Math.max(Math.abs(v.pan), panMax) / b.stopS, dt);
    v.tilt = approach(v.tilt, tiltTarget, tiltMax / b.rampUpS, Math.max(Math.abs(v.tilt), tiltMax) / b.stopS, dt);
    v.lens = approach(v.lens, zoomTarget, zoomMax / b.zoomRampS, Math.max(Math.abs(v.lens), zoomMax) / b.zoomRampS, dt);

    const limits = this.limits();
    this.pose.pan = this.integrate("pan", this.pose.pan, v, dt, limits.panMin, limits.panMax);
    this.pose.tilt = this.integrate("tilt", this.pose.tilt, v, dt, limits.tiltMin, limits.tiltMax);
    this.pose.lens = this.integrate("lens", this.pose.lens, v, dt, 0, 1);
  }

  private integrate(axis: keyof PtzPose, value: number, velocity: PtzPose, dt: number, min: number, max: number): number {
    const next = value + velocity[axis] * dt;
    if (next <= min && velocity[axis] < 0) {
      velocity[axis] = 0;
      if (this.atLimit[axis] !== "min") this.events.push({ type: "limit", axis, side: "min", tick: this.tickCount + 1 });
      this.atLimit[axis] = "min";
      return min;
    }
    if (next >= max && velocity[axis] > 0) {
      velocity[axis] = 0;
      if (this.atLimit[axis] !== "max") this.events.push({ type: "limit", axis, side: "max", tick: this.tickCount + 1 });
      this.atLimit[axis] = "max";
      return max;
    }
    if (next > min && next < max) this.atLimit[axis] = null;
    return clamp(next, min, max);
  }
}
