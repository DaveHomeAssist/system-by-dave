import { describe, expect, it } from "vitest";
import {
  type CameraProfile,
  defaultCameraProfile,
  panSpeedForLevel,
  presetSpeedForLevel,
  tiltSpeedForLevel,
  zoomSpeedFactor,
} from "../domain/camera";
import { type SpeedLevels } from "../domain/session";
import { type DriveInput, MAX_CATCH_UP_S, PtzSimulator, SIM_STEP, shapeDeflection } from "./ptz";

const SPEEDS: SpeedLevels = { pan: 4, tilt: 4, zoom: 4, preset: 4 };

/** A simulator with a wall clock that advances in small frames, like a browser rendering at 50 Hz. */
function makeSim(profile: CameraProfile = defaultCameraProfile(), speeds: SpeedLevels = SPEEDS) {
  const sim = new PtzSimulator(profile, "upright", speeds);
  sim.advanceTo(0);
  let now = 0;
  const to = (t: number) => {
    while (now < t) {
      now = Math.min(t, now + 0.02);
      sim.advanceTo(now);
    }
  };
  return Object.assign(sim, { to });
}

type Scheduled = { at: number; input: Partial<DriveInput> } | { at: number; command: "stop" | "home" | "release" };

/** Runs a schedule of inputs while "rendering" at the given frame times. */
function runSchedule(frameTimes: number[], schedule: Scheduled[], end: number) {
  const sim = makeSim();
  const events = [...schedule].sort((a, b) => a.at - b.at);
  let next = 0;
  for (const frame of [...frameTimes, end]) {
    while (next < events.length && events[next].at <= frame) {
      const event = events[next];
      sim.advanceTo(event.at);
      if ("input" in event) sim.setInput(event.input);
      else if (event.command === "stop") sim.stop();
      else if (event.command === "release") sim.release();
      else sim.home();
      next += 1;
    }
    sim.advanceTo(frame);
  }
  return sim.snapshot();
}

function frames(rate: number, end: number, jitter = 0): number[] {
  const out: number[] = [];
  let t = 0;
  let i = 0;
  while (t < end) {
    // Deterministic pseudo-jitter keeps the test repeatable.
    const wobble = jitter ? Math.sin(i * 12.9898) * jitter : 0;
    t = Math.min(end, t + 1 / rate + wobble);
    out.push(t);
    i += 1;
  }
  return out;
}

describe("PTZ simulation timing", () => {
  const schedule: Scheduled[] = [
    { at: 0.1, input: { pan: 0.8, tilt: -0.35 } },
    { at: 0.9, input: { zoom: 1 } },
    { at: 1.6, input: { pan: -0.2 } },
    { at: 2.25, command: "release" },
    { at: 2.7, input: { tilt: 0.6, zoom: -0.5 } },
    { at: 3.4, command: "stop" },
    { at: 3.9, command: "home" },
    { at: 4.3, input: { pan: 0.5 } },
    { at: 5.1, command: "release" },
  ];

  it("produces identical motion at different render rates", () => {
    const reference = runSchedule(frames(60, 6), schedule, 6);
    for (const result of [
      runSchedule(frames(24, 6), schedule, 6),
      runSchedule(frames(30, 6), schedule, 6),
      runSchedule(frames(144, 6), schedule, 6),
      runSchedule(frames(50, 6, 0.006), schedule, 6),
    ]) {
      expect(result.tick).toBe(reference.tick);
      expect(result.pose).toEqual(reference.pose);
      expect(result.velocity).toEqual(reference.velocity);
    }
  });

  it("keeps moving while a deflection is held", () => {
    const sim = makeSim();
    sim.setInput({ pan: 1 });
    sim.to(1);
    const first = sim.getPose().pan;
    sim.to(2);
    const second = sim.getPose().pan;
    expect(first).toBeGreaterThan(0);
    const vmax = panSpeedForLevel(defaultCameraProfile(), SPEEDS.pan);
    expect(second - first).toBeCloseTo(vmax, 6);
  });

  it("limits speed by the selected level", () => {
    const profile = defaultCameraProfile();
    for (const level of [1, 4, 8]) {
      const sim = makeSim(profile, { ...SPEEDS, pan: level, tilt: level });
      sim.setInput({ pan: 1, tilt: 1 });
      sim.to(1);
      const v = sim.snapshot().velocity;
      expect(v.pan).toBeCloseTo(panSpeedForLevel(profile, level), 9);
      expect(v.tilt).toBeCloseTo(tiltSpeedForLevel(profile, level), 9);
    }
    expect(panSpeedForLevel(profile, 8)).toBeCloseTo(100, 9);
    expect(tiltSpeedForLevel(profile, 8)).toBeCloseTo(50, 9);
    expect(presetSpeedForLevel(profile, 8)).toBeCloseTo(150, 9);
  });

  it("stops within the stopping time after release", () => {
    const profile = defaultCameraProfile();
    const sim = makeSim(profile);
    sim.setInput({ pan: 1 });
    sim.to(1.5);
    const atRelease = sim.getPose().pan;
    const vmax = sim.snapshot().velocity.pan;
    sim.release();
    sim.to(1.5 + profile.behaviour.stopS + 2 * SIM_STEP);
    const snap = sim.snapshot();
    expect(snap.velocity.pan).toBe(0);
    expect(snap.moving).toBe(false);
    // A linear stop covers about half of vmax * stopTime.
    expect(snap.pose.pan - atRelease).toBeLessThanOrEqual(vmax * profile.behaviour.stopS * 0.5 + vmax * SIM_STEP);
    sim.to(3);
    expect(sim.getPose().pan).toBe(snap.pose.pan);
  });

  it("applies the deadband and response curve", () => {
    expect(shapeDeflection(0.05, 0.06, 1.8)).toBe(0);
    expect(shapeDeflection(1, 0.06, 1.8)).toBe(1);
    expect(shapeDeflection(-1, 0.06, 1.8)).toBe(-1);
    const half = shapeDeflection(0.53, 0.06, 2);
    expect(half).toBeCloseTo(0.25, 9);
    expect(shapeDeflection(0.3, 0.06, 1)).toBeGreaterThan(shapeDeflection(0.3, 0.06, 2.5));
  });
});

describe("PTZ limits and lens", () => {
  it("stops pan at the configured limit and reports it once", () => {
    const profile = defaultCameraProfile();
    profile.limits.panMaxDeg = 20;
    const sim = makeSim(profile, { ...SPEEDS, pan: 8 });
    sim.setInput({ pan: 1 });
    sim.to(3);
    const snap = sim.snapshot();
    expect(snap.pose.pan).toBe(20);
    expect(snap.velocity.pan).toBe(0);
    expect(snap.atLimit.pan).toBe("max");
    const limitEvents = sim.drainEvents().filter((e) => e.type === "limit" && e.axis === "pan");
    expect(limitEvents).toHaveLength(1);
  });

  it("uses published tilt travel upright and mirrors it when inverted", () => {
    const upright = new PtzSimulator(defaultCameraProfile(), "upright", SPEEDS);
    expect(upright.limits()).toMatchObject({ tiltMin: -30, tiltMax: 90, panMin: -175, panMax: 175 });
    const inverted = makeSim(defaultCameraProfile(), { ...SPEEDS, tilt: 8 });
    inverted.configure(defaultCameraProfile(), "inverted");
    expect(inverted.limits()).toMatchObject({ tiltMin: -90, tiltMax: 30 });
    inverted.setInput({ tilt: -1 });
    inverted.to(4);
    expect(inverted.getPose().tilt).toBe(-90);
  });

  it("changes only the lens when zooming", () => {
    const sim = makeSim();
    sim.setInput({ zoom: 1 });
    sim.to(2);
    const pose = sim.getPose();
    expect(pose.lens).toBeGreaterThan(0);
    expect(pose.pan).toBe(0);
    expect(pose.tilt).toBe(0);
    sim.setInput({ zoom: 1 });
    sim.to(120);
    expect(sim.getPose().lens).toBe(1);
  });

  it("scales pan speed with zoom when zoom-adaptive sensitivity is on", () => {
    const adaptive = defaultCameraProfile();
    const flat = defaultCameraProfile();
    flat.behaviour.zoomAdaptiveStrength = 0;
    const measure = (profile: CameraProfile) => {
      const sim = makeSim(profile);
      sim.place({ pan: 0, tilt: 0, lens: 1 });
      sim.setInput({ pan: 1 });
      sim.to(1);
      return sim.snapshot().velocity.pan;
    };
    const tele = measure(adaptive);
    expect(tele).toBeCloseTo(Math.max(panSpeedForLevel(adaptive, 4) * zoomSpeedFactor(adaptive, 1), 0.05), 9);
    expect(tele).toBeLessThan(measure(flat) / 10);
    expect(zoomSpeedFactor(flat, 1)).toBe(1);
  });
});

describe("PTZ presets", () => {
  it("animates to a saved pose and lands on it exactly", () => {
    const profile = defaultCameraProfile();
    const sim = makeSim(profile);
    const target = { pan: 32.5, tilt: -14.25, lens: 0.61 };
    const { durationS } = sim.recallTo(target, { kind: "preset", slot: 3, name: "Lead" });
    const travel = Math.max(32.5 / presetSpeedForLevel(profile, 4), 0.61 * profile.behaviour.zoomFastTravelS);
    const expected = Math.max(profile.behaviour.presetMinDurationS, 1.5 * travel);
    expect(durationS).toBeCloseTo(expected, 2);
    sim.to(durationS / 2);
    const midway = sim.getPose();
    expect(midway.pan).toBeGreaterThan(0);
    expect(midway.pan).toBeLessThan(target.pan);
    sim.to(durationS + 0.1);
    expect(sim.getPose()).toEqual(target);
    const events = sim.drainEvents();
    expect(events.map((e) => e.type)).toEqual(["recall-start", "recall-complete"]);
  });

  it("moves monotonically during a recall", () => {
    const sim = makeSim();
    const { durationS } = sim.recallTo({ pan: -40, tilt: 10, lens: 0.3 }, { kind: "home" });
    let previous = sim.getPose().pan;
    for (let t = 0.02; t <= durationS; t += 0.02) {
      sim.to(t);
      const pan = sim.getPose().pan;
      expect(pan).toBeLessThanOrEqual(previous + 1e-12);
      previous = pan;
    }
  });

  it("lets manual input interrupt a recall immediately", () => {
    const sim = makeSim();
    sim.recallTo({ pan: 60, tilt: 0, lens: 0 }, { kind: "preset", slot: 1, name: "" });
    sim.to(0.6);
    const before = sim.snapshot();
    expect(before.recall).not.toBeNull();
    sim.setInput({ pan: -1 });
    const after = sim.snapshot();
    expect(after.recall).toBeNull();
    expect(after.velocity.pan).toBe(before.velocity.pan);
    expect(sim.drainEvents().some((e) => e.type === "recall-interrupted" && e.reason === "manual")).toBe(true);
    sim.to(2);
    expect(sim.snapshot().velocity.pan).toBeLessThan(0);
  });

  it("ignores inputs inside the deadband during a recall", () => {
    const sim = makeSim();
    sim.recallTo({ pan: 60, tilt: 0, lens: 0 }, { kind: "preset", slot: 1, name: "" });
    sim.to(0.3);
    sim.setInput({ pan: 0.03 });
    expect(sim.snapshot().recall).not.toBeNull();
  });

  it("stop abandons a recall and halt stops at once", () => {
    const sim = makeSim();
    sim.recallTo({ pan: 90, tilt: 0, lens: 0 }, { kind: "home" });
    sim.to(0.5);
    sim.stop();
    expect(sim.snapshot().recall).toBeNull();
    sim.to(2);
    expect(sim.snapshot().moving).toBe(false);

    sim.setInput({ pan: 1 });
    sim.to(3);
    expect(sim.snapshot().velocity.pan).toBeGreaterThan(0);
    sim.halt("hidden");
    const halted = sim.snapshot();
    expect(halted.velocity).toEqual({ pan: 0, tilt: 0, lens: 0 });
    expect(halted.input).toEqual({ pan: 0, tilt: 0, zoom: 0 });
  });

  it("clamps a recall target to the current limits", () => {
    const profile = defaultCameraProfile();
    profile.limits.panMaxDeg = 10;
    const sim = makeSim(profile);
    const result = sim.recallTo({ pan: 40, tilt: 0, lens: 0 }, { kind: "preset", slot: 2, name: "" });
    expect(result.clamped).toBe(true);
    sim.to(10);
    expect(sim.getPose().pan).toBe(10);
  });
});

describe("PTZ clock", () => {
  it("does not simulate time that passes while paused", () => {
    const sim = makeSim();
    sim.setInput({ pan: 1 });
    sim.to(1);
    sim.halt("hidden");
    sim.pause(1);
    sim.to(30);
    expect(sim.time).toBeCloseTo(1, 9);
    sim.resume(30);
    sim.to(31);
    expect(sim.time).toBeCloseTo(2, 9);
    expect(sim.snapshot().moving).toBe(false);
  });

  it("skips long gaps instead of replaying them", () => {
    const sim = makeSim();
    sim.advanceTo(10);
    expect(sim.time).toBeCloseTo(MAX_CATCH_UP_S, 9);
    sim.advanceTo(10.25);
    expect(sim.time).toBeCloseTo(MAX_CATCH_UP_S + 0.25, 9);
  });
});
