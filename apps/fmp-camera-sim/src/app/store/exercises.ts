import {
  type ExerciseId,
  type ExerciseResult,
  MAX_EXERCISE_RESULTS,
  type PerformerConfig,
} from "../../domain/session";
import { FollowExercise } from "../../exercises/follow";
import { RecallExercise } from "../../exercises/recall";
import { type ExerciseEvent, type ExerciseSample } from "../../exercises/types";
import { WideShotExercise, wideStartPose } from "../../exercises/wide";
import { cameraFrame } from "../../sim/framing";
import { performerState, planPath } from "../../sim/performer";
import { recordSimResult } from "../training";
import { type StoreCore } from "./core";
import { newId } from "./helpers";
import { type PersistenceController } from "./persistence";

/** Guided exercise lifecycle and result recording. */
export class ExerciseController {
  constructor(
    private readonly core: StoreCore,
    private readonly persistence: PersistenceController,
  ) {}

  performerConfig(): PerformerConfig {
    const config = this.core.project.session.performer;
    return this.core.exerciseId === "follow" && this.core.exercise ? { ...config, mode: "path" } : config;
  }

  performerNow() {
    const time = this.core.sim.time;
    const exerciseTime = this.core.exercise?.performerTime(time);
    const pathTime = exerciseTime ?? time - this.core.performerEpoch;
    return performerState(this.performerConfig(), this.core.geometry.marks, pathTime);
  }

  exerciseSample(dt: number): ExerciseSample {
    const pose = this.core.sim.getPose();
    return {
      time: this.core.sim.time,
      dt,
      pose,
      moving: this.core.sim.isMoving(),
      frame: cameraFrame(this.core.geometry, pose, this.core.project.camera),
      geometry: this.core.geometry,
      profile: this.core.project.camera,
      performer: this.performerNow(),
      settings: this.core.project.session.exerciseSettings,
    };
  }

  startExercise(id: ExerciseId, wallSeconds: number, advanceTo: (wall: number) => void): void {
    advanceTo(wallSeconds);
    this.core.exerciseId = id;
    this.core.exerciseRecorded = false;
    this.core.lastProgressKey = "";
    if (id === "wide") {
      // Every attempt starts from the same tight shot on downstage right, which is not a wide.
      this.core.sim.place(wideStartPose(this.core.geometry, this.core.project.camera));
      this.core.exercise = new WideShotExercise();
    } else if (id === "recall") this.core.exercise = new RecallExercise();
    else {
      const plan = planPath({ ...this.core.project.session.performer, mode: "path" }, this.core.geometry.marks);
      this.core.exercise = new FollowExercise(plan.loopS);
    }
    this.core.exercise.sample(this.exerciseSample(0));
    this.core.announce(
      id === "wide"
        ? "Exercise started: the camera is on a tight shot of downstage right. Open out to a wide shot of the whole performance area."
        : `Exercise started: ${id === "follow" ? "follow a performer" : "save and recall two shots"}.`,
    );
    this.core.emit();
  }

  resetExercise(): void {
    this.core.exercise = null;
    this.core.exerciseId = null;
    this.core.announce("Exercise reset.");
    this.core.emit();
  }

  recordExerciseIfComplete(): boolean {
    if (!this.core.exercise || this.core.exerciseRecorded) return false;
    const progress = this.core.exercise.progress();
    if (progress.status !== "complete" || !progress.result) return false;
    this.core.exerciseRecorded = true;
    const result: ExerciseResult = { ...progress.result, id: newId(), completedAt: new Date().toISOString() };
    const session = this.core.project.session;
    const results = [...session.exerciseResults, result].slice(-MAX_EXERCISE_RESULTS);
    this.core.project = { ...this.core.project, session: { ...session, exerciseResults: results } };
    recordSimResult(result.exercise, result.passed);
    this.core.announce(result.summary, result.passed ? "success" : "warn");
    this.persistence.scheduleSave();
    return true;
  }

  handlePresetStored(event: ExerciseEvent): void {
    if (this.core.exercise) {
      this.core.exercise.handleEvent(event, this.exerciseSample(0));
      this.recordExerciseIfComplete();
    }
  }

  clearResults(): void {
    const session = this.core.project.session;
    this.core.project = { ...this.core.project, session: { ...session, exerciseResults: [] } };
    this.persistence.scheduleSave();
    this.core.emit();
  }
}
