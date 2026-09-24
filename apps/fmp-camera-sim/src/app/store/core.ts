import { isCameraCalibrated } from "../../domain/camera";
import { defaultProject, type Project } from "../../domain/project";
import { type ExerciseId } from "../../domain/session";
import { deriveVenueGeometry, unsettledVenueItems, type VenueGeometry } from "../../domain/venue";
import { type Exercise } from "../../exercises/types";
import { PtzSimulator } from "../../sim/ptz";
import { loadProject, type StorageStatus } from "../../storage/persist";
import { type Announcement, type RenderStatus, type StoreState } from "./types";

/**
 * Shared mutable bag for SimulatorStore slices. Fields are package-visible so persistence,
 * operating, settings and exercise controllers can collaborate without a god-file.
 */
export class StoreCore {
  project: Project;
  geometry: VenueGeometry;
  sim: PtzSimulator;
  exercise: Exercise | null = null;
  exerciseId: ExerciseId | null = null;
  exerciseRecorded = false;
  performerEpoch = 0;
  storageStatus: StorageStatus;
  storageNotice: string | null;
  announcement: Announcement | null = null;
  announcementCount = 0;
  storeArmed = false;
  overwrite: { slot: number; until: number } | null = null;
  promptArmed = false;
  promptTimer: ReturnType<typeof setTimeout> | null = null;
  storageConflict = false;
  renderStatus: RenderStatus = "starting";
  renderNote = "";
  hidden = false;
  lastWall = 0;
  wasMoving = false;
  lastProgressEmit = -Infinity;
  lastProgressKey = "";
  saveTimer: ReturnType<typeof setTimeout> | null = null;
  listeners = new Set<() => void>();
  state: StoreState;

  constructor(readonly storage: Storage | null) {
    const loaded = loadProject(storage);
    this.project = loaded.project;
    this.storageStatus = loaded.status;
    this.storageNotice = loaded.notice;
    // A loaded project has already passed geometry validation; the fallback guards hand edits.
    let derived = deriveVenueGeometry(this.project.venue);
    if (!derived.ok) {
      this.project = defaultProject();
      derived = deriveVenueGeometry(this.project.venue);
    }
    if (!derived.ok) throw new Error("The default venue geometry is invalid.");
    this.geometry = derived.geometry;
    const { session, camera } = this.project;
    this.sim = new PtzSimulator(camera, this.geometry.mountOrientation, session.speeds, session.pose);
    this.state = this.buildState();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): StoreState => this.state;

  emit(): void {
    this.state = this.buildState();
    for (const listener of this.listeners) listener();
  }

  buildState(): StoreState {
    return {
      project: this.project,
      geometry: this.geometry,
      unsettled: unsettledVenueItems(this.project.venue),
      calibrated: isCameraCalibrated(this.project.camera),
      exercise: this.exercise && this.exerciseId ? { id: this.exerciseId, progress: this.exercise.progress() } : null,
      storage: this.storageStatus,
      storageNotice: this.storageNotice,
      storageConflict: this.storageConflict,
      announcement: this.announcement,
      storeArmed: this.storeArmed,
      renderStatus: this.renderStatus,
      renderNote: this.renderNote,
      hidden: this.hidden,
    };
  }

  announce(text: string, tone: Announcement["tone"] = "info"): void {
    this.announcementCount += 1;
    this.announcement = { id: this.announcementCount, text, tone };
  }
}
