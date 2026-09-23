import { describe, expect, it } from "vitest";
import { defaultCameraProfile, lensForHfov, MONITOR_ASPECT } from "../domain/camera";
import { defaultExerciseSettings, type PerformerConfig, type Preset } from "../domain/session";
import { DEG } from "../domain/units";
import { defaultVenueProfile, deriveVenueGeometry, type VenueGeometry } from "../domain/venue";
import { aimAt, cameraFrame, stageToWorld } from "../sim/framing";
import { CHEST_FRACTION, pathStateAt, performerState, planPath, type PerformerState } from "../sim/performer";
import { PtzSimulator, type PtzPose } from "../sim/ptz";
import { FollowExercise } from "./follow";
import { RecallExercise } from "./recall";
import { type ExerciseSample } from "./types";
import { WideShotExercise } from "./wide";

const profile = defaultCameraProfile();
const settings = defaultExerciseSettings();
const geometry: VenueGeometry = (() => {
  const result = deriveVenueGeometry(defaultVenueProfile());
  if (!result.ok) throw new Error("bad geometry");
  return result.geometry;
})();
const standing: PerformerState = performerState(
  { mode: "mark", markId: "CS", pathId: "tour", walkSpeed: 1.2, height: 1.75, pauseS: 2 },
  geometry.marks,
  0,
);

function sample(time: number, dt: number, pose: PtzPose, moving = false, performer = standing): ExerciseSample {
  return { time, dt, pose, moving, frame: cameraFrame(geometry, pose, profile), geometry, profile, performer, settings };
}

function widePose(hfovDeg: number): PtzPose {
  const aim = aimAt(geometry, stageToWorld({ right: 0, upstage: geometry.stageDepth * 0.3, height: 1 }));
  return { ...aim, lens: lensForHfov(profile, hfovDeg) };
}

describe("wide shot exercise", () => {
  it("completes once the stage is framed and held still", () => {
    const exercise = new WideShotExercise();
    const pose = widePose(40);
    let t = 0;
    for (; t < 0.5; t += 1 / 30) exercise.sample(sample(t, 1 / 30, pose, true));
    expect(exercise.progress().status).toBe("running");
    for (; t < 2; t += 1 / 30) exercise.sample(sample(t, 1 / 30, pose, false));
    const progress = exercise.progress();
    expect(progress.status).toBe("complete");
    expect(progress.result?.passed).toBe(true);
    expect(progress.result?.metrics.stageFillPct).toBeGreaterThanOrEqual(55);
  });

  it("does not complete while too wide or too tight", () => {
    const wide = new WideShotExercise();
    const tight = new WideShotExercise();
    for (let t = 0; t < 3; t += 1 / 30) {
      wide.sample(sample(t, 1 / 30, widePose(70.2)));
      tight.sample(sample(t, 1 / 30, widePose(18)));
    }
    expect(wide.progress().status).toBe("running");
    expect(wide.progress().headline).toMatch(/Tighten/);
    expect(tight.progress().status).toBe("running");
    expect(tight.progress().headline).toMatch(/safe area/);
  });
});

describe("performer", () => {
  const config: PerformerConfig = { mode: "path", markId: "CS", pathId: "tour", walkSpeed: 1.2, height: 1.75, pauseS: 2 };

  it("stands on its mark", () => {
    const mark = geometry.marks.find((m) => m.id === "CS")!;
    expect(standing.position).toEqual(mark.point);
    expect(standing.moving).toBe(false);
  });

  it("walks a repeatable loop at no more than walking speed", () => {
    const plan = planPath(config, geometry.marks);
    const start = pathStateAt(plan, 1.75, 0);
    expect(start.position).toEqual(geometry.marks.find((m) => m.id === "USC")!.point);
    const later = pathStateAt(plan, 1.75, 7.3);
    const again = pathStateAt(plan, 1.75, 7.3 + plan.loopS);
    expect(again.position.right).toBeCloseTo(later.position.right, 9);
    expect(again.position.upstage).toBeCloseTo(later.position.upstage, 9);
    let fastest = 0;
    const dt = 0.01;
    for (let t = 0; t < plan.loopS; t += dt) {
      const a = pathStateAt(plan, 1.75, t).position;
      const b = pathStateAt(plan, 1.75, t + dt).position;
      fastest = Math.max(fastest, Math.hypot(b.right - a.right, b.upstage - a.upstage) / dt);
    }
    expect(fastest).toBeLessThanOrEqual(1.2 + 1e-6);
    const first = plan.segments[0];
    const arrival = pathStateAt(plan, 1.75, first.pauseS + first.walkS);
    const dsr = geometry.marks.find((m) => m.id === "DSR")!.point;
    expect(arrival.position.right).toBeCloseTo(dsr.right, 6);
    expect(arrival.position.upstage).toBeCloseTo(dsr.upstage, 6);
  });
});

describe("follow exercise", () => {
  const config: PerformerConfig = { mode: "path", markId: "CS", pathId: "tour", walkSpeed: 1.2, height: 1.75, pauseS: 2 };
  const plan = planPath(config, geometry.marks);

  function run(operator: (performer: PerformerState) => PtzPose) {
    const exercise = new FollowExercise(plan.loopS);
    const dt = 1 / 30;
    for (let t = 0; t < plan.loopS + settings.follow.countdownS + 1; t += dt) {
      const performer = pathStateAt(plan, config.height, exercise.performerTime(t) ?? 0);
      exercise.sample(sample(t, dt, operator(performer), true, performer));
    }
    return exercise.progress();
  }

  it("passes an operator who keeps the performer centred at a medium size", () => {
    const result = run((performer) => {
      const chest = stageToWorld({ ...performer.position, height: performer.height * CHEST_FRACTION });
      const aim = aimAt(geometry, chest);
      const camera = stageToWorld(geometry.camera);
      const distance = Math.hypot(chest.x - camera.x, chest.y - camera.y, chest.z - camera.z);
      // Performer fills half the frame height.
      const tanV = performer.height / distance;
      const hfov = (2 * Math.atan(tanV * MONITOR_ASPECT)) / DEG;
      return { ...aim, lens: lensForHfov(profile, hfov) };
    });
    expect(result.status).toBe("complete");
    expect(result.result?.passed).toBe(true);
    expect(result.result?.metrics.onTargetPct).toBeGreaterThan(99);
    expect(result.result?.metrics.lostS).toBe(0);
  });

  it("fails an operator who parks on a static wide", () => {
    const pose = widePose(60);
    const result = run(() => pose);
    expect(result.status).toBe("complete");
    expect(result.result?.passed).toBe(false);
    expect(result.result?.metrics.onTargetPct).toBeLessThan(settings.follow.passPct);
  });
});

describe("save and recall exercise", () => {
  function harness() {
    const sim = new PtzSimulator(profile, "upright", { pan: 4, tilt: 4, zoom: 4, preset: 6 });
    const exercise = new RecallExercise();
    let now = 0;
    sim.advanceTo(0);
    const pump = () => {
      const s = sample(now, 1 / 60, sim.getPose(), sim.isMoving());
      for (const event of sim.drainEvents()) exercise.handleEvent(event, s);
      exercise.sample(s);
    };
    const wait = (seconds: number) => {
      const end = now + seconds;
      while (now < end) {
        now = Math.min(end, now + 1 / 60);
        sim.advanceTo(now);
        pump();
      }
    };
    const store = (slot: number): Preset => {
      const pose = sim.getPose();
      const preset: Preset = { slot, name: "", cameraId: profile.id, ...pose, savedAt: "2026-09-23T07:00:00.000Z" };
      exercise.handleEvent({ type: "preset-stored", preset, tick: sim.tick }, sample(now, 0, pose));
      return preset;
    };
    const recall = (preset: Preset) => {
      sim.recallTo(preset, { kind: "preset", slot: preset.slot, name: preset.name });
      wait(8);
    };
    return { sim, exercise, wait, store, recall };
  }

  it("completes when two distinct shots are recalled within tolerance", () => {
    const h = harness();
    h.sim.place({ pan: -6, tilt: -12, lens: 0.2 });
    const a = h.store(1);
    h.sim.place({ pan: 3, tilt: -9, lens: 0.75 });
    const b = h.store(2);
    expect(h.exercise.progress().checks.slice(0, 2).every((c) => c.done)).toBe(true);
    h.sim.place({ pan: 20, tilt: 0, lens: 0.4 });
    h.wait(0.1);
    h.recall(a);
    h.recall(b);
    const progress = h.exercise.progress();
    expect(progress.status).toBe("complete");
    expect(progress.result?.metrics.maxPanTiltDeviationDeg).toBeLessThanOrEqual(settings.recall.panTiltToleranceDeg);
    expect(progress.result?.metrics.maxLensDeviation).toBeLessThanOrEqual(settings.recall.lensTolerance);
  });

  it("refuses a second shot that is too close to the first", () => {
    const h = harness();
    h.sim.place({ pan: 0, tilt: -10, lens: 0.3 });
    h.store(1);
    h.sim.place({ pan: 1, tilt: -10.5, lens: 0.31 });
    h.store(2);
    const progress = h.exercise.progress();
    expect(progress.checks[1].done).toBe(false);
    expect(progress.note).toMatch(/Too close/);
  });

  it("gives no credit for an interrupted recall", () => {
    const h = harness();
    h.sim.place({ pan: -8, tilt: -12, lens: 0.2 });
    const a = h.store(1);
    h.sim.place({ pan: 8, tilt: -12, lens: 0.2 });
    h.store(2);
    h.sim.place({ pan: 30, tilt: -2, lens: 0.2 });
    h.wait(0.1);
    h.sim.recallTo(a, { kind: "preset", slot: 1, name: "" });
    h.wait(0.2);
    h.sim.setInput({ pan: 1 });
    h.wait(0.1);
    h.sim.release();
    h.wait(1);
    const progress = h.exercise.progress();
    expect(progress.checks[3].done).toBe(false);
    expect(progress.note).toMatch(/interrupted/);
    expect(progress.status).toBe("running");
  });
});
