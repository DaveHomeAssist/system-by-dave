import { type Project } from "../../domain/project";
import { type CameraProfile, type LensState } from "../../domain/camera";
import { type ExerciseId } from "../../domain/session";
import { type Issue } from "../../domain/validate";
import { type VenueGeometry } from "../../domain/venue";
import { type Exercise, type ExerciseProgress } from "../../exercises/types";
import { type CameraFrame } from "../../sim/framing";
import { type PerformerState } from "../../sim/performer";
import { type PtzSnapshot } from "../../sim/ptz";
import { type StorageStatus } from "../../storage/persist";

export type RenderStatus = "starting" | "ok" | "unavailable" | "lost";

export interface Announcement {
  id: number;
  text: string;
  tone: "info" | "warn" | "success";
}

export interface StoreState {
  project: Project;
  geometry: VenueGeometry;
  unsettled: string[];
  calibrated: boolean;
  exercise: { id: ExerciseId; progress: ExerciseProgress } | null;
  storage: StorageStatus;
  storageNotice: string | null;
  /** Another tab saved a different copy; autosave is paused until the operator chooses. */
  storageConflict: boolean;
  announcement: Announcement | null;
  storeArmed: boolean;
  renderStatus: RenderStatus;
  renderNote: string;
  hidden: boolean;
}

export interface Telemetry {
  snapshot: PtzSnapshot;
  lens: LensState;
  frame: CameraFrame;
  performer: PerformerState;
  geometry: VenueGeometry;
  profile: CameraProfile;
  exercise: Exercise | null;
}

export type UpdateResult = { ok: true } | { ok: false; issues: Issue[] };
