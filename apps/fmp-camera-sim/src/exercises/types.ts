import { type CameraProfile } from "../domain/camera";
import { type ExerciseId, type ExerciseResult, type ExerciseSettings, type Preset } from "../domain/session";
import { type VenueGeometry } from "../domain/venue";
import { type CameraFrame } from "../sim/framing";
import { type PerformerState } from "../sim/performer";
import { type PtzPose, type SimEvent } from "../sim/ptz";

/** Everything an exercise may look at on one evaluation step. */
export interface ExerciseSample {
  /** Simulation time, seconds. */
  time: number;
  /** Seconds since the previous sample. */
  dt: number;
  pose: PtzPose;
  moving: boolean;
  frame: CameraFrame;
  geometry: VenueGeometry;
  profile: CameraProfile;
  performer: PerformerState;
  settings: ExerciseSettings;
}

export type ExerciseEvent =
  | SimEvent
  | { type: "preset-stored"; preset: Preset; tick: number };

export type ExerciseStatus = "running" | "complete";

export interface ExerciseProgress {
  id: ExerciseId;
  status: ExerciseStatus;
  /** One-line instruction or state for the operator. */
  headline: string;
  /** Feedback on the operator's last action, if any. */
  note: string;
  /** Checklist lines with pass state, for display and screen readers. */
  checks: Array<{ label: string; done: boolean }>;
  /** Live figures shown while running. */
  figures: Array<{ label: string; value: string }>;
  result: Omit<ExerciseResult, "id" | "completedAt"> | null;
}

export interface Exercise {
  readonly id: ExerciseId;
  /** Performer time when the exercise drives the performer, otherwise null. */
  performerTime(time: number): number | null;
  sample(sample: ExerciseSample): void;
  handleEvent(event: ExerciseEvent, sample: ExerciseSample): void;
  progress(): ExerciseProgress;
}

export const EXERCISE_TITLES: Record<ExerciseId, string> = {
  wide: "Establish a wide shot",
  follow: "Follow a performer",
  recall: "Save and recall two shots",
};

export const EXERCISE_BRIEFS: Record<ExerciseId, string> = {
  wide: "The camera starts on a tight shot of downstage right. Open out and frame the whole performance area: both downstage corners and a standing performer's head height at the upstage marks, inside the safe area, and hold it steady.",
  follow: "The performer walks a fixed tour of the stage. Keep their chest inside the target box at a usable size for the whole walk.",
  recall: "Store two clearly different shots in two preset slots, move away from both, then recall each one. Both must land within tolerance.",
};
