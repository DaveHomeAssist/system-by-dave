import { type ShowPackage } from "../domain/structures";
import { type CameraProfile, isCameraCalibrated, type LensState, lensState, parseCameraProfile, defaultCameraProfile, SPEED_LEVEL_MAX, SPEED_LEVEL_MIN } from "../domain/camera";
import { defaultProject, type Project, parseProjectText, serializeProject } from "../domain/project";
import {
  defaultSession,
  type ExerciseId,
  type ExerciseResult,
  type ExerciseSettings,
  type GuidePreferences,
  MAX_EXERCISE_RESULTS,
  parseSession,
  type PerformerConfig,
  type Preset,
  PRESET_SLOTS,
  type SpeedLevels,
} from "../domain/session";
import { clamp, type LengthUnit } from "../domain/units";
import { type Issue } from "../domain/validate";
import { defaultVenueProfile, deriveVenueGeometry, parseVenueProfile, unsettledVenueItems, type VenueGeometry, type VenueProfile } from "../domain/venue";
import { FollowExercise } from "../exercises/follow";
import { RecallExercise } from "../exercises/recall";
import { type Exercise, type ExerciseEvent, type ExerciseProgress, type ExerciseSample } from "../exercises/types";
import { WideShotExercise } from "../exercises/wide";
import { type CameraFrame, cameraFrame } from "../sim/framing";
import { type PerformerState, performerState, planPath } from "../sim/performer";
import { type DriveInput, PtzSimulator, type PtzSnapshot, SIM_STEP, type SimEvent } from "../sim/ptz";
import { loadProject, saveProject, type StorageStatus } from "../storage/persist";

/** Exercises sample the simulation 30 times a second of simulation time. */
const SAMPLE_TICKS = 8;
const SAVE_DEBOUNCE_MS = 400;
const OVERWRITE_WINDOW_S = 3;
const PROGRESS_EMIT_INTERVAL_S = 0.2;

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

function newId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `r-${Date.now().toString(36)}-${random}`;
}

function describePreset(preset: Preset): string {
  return preset.name ? `preset ${preset.slot} (${preset.name})` : `preset ${preset.slot}`;
}

export class SimulatorStore {
  private project: Project;
  private geometry: VenueGeometry;
  private sim: PtzSimulator;
  private exercise: Exercise | null = null;
  private exerciseId: ExerciseId | null = null;
  private exerciseRecorded = false;
  private performerEpoch = 0;
  private storageStatus: StorageStatus;
  private storageNotice: string | null;
  private announcement: Announcement | null = null;
  private announcementCount = 0;
  private storeArmed = false;
  private overwrite: { slot: number; until: number } | null = null;
  private promptArmed = false;
  private promptTimer: ReturnType<typeof setTimeout> | null = null;
  private storageConflict = false;
  private renderStatus: RenderStatus = "starting";
  private renderNote = "";
  private hidden = false;
  private lastWall = 0;
  private wasMoving = false;
  private lastProgressEmit = -Infinity;
  private lastProgressKey = "";
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  private state: StoreState;

  constructor(private readonly storage: Storage | null) {
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
    this.sim.setTickListener((tick) => this.onTick(tick));
    this.state = this.buildState();
  }

  // ------------------------------------------------------------------------------------------
  // Subscription
  // ------------------------------------------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): StoreState => this.state;

  private emit(): void {
    this.state = this.buildState();
    for (const listener of this.listeners) listener();
  }

  private buildState(): StoreState {
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

  private announce(text: string, tone: Announcement["tone"] = "info"): void {
    this.announcementCount += 1;
    this.announcement = { id: this.announcementCount, text, tone };
  }

  // ------------------------------------------------------------------------------------------
  // Clock and telemetry
  // ------------------------------------------------------------------------------------------

  advanceTo(wallSeconds: number): void {
    this.lastWall = wallSeconds;
    this.sim.advanceTo(wallSeconds);
  }

  /** The page was hidden: stop all motion at once, stop the clock and save. */
  hide(wallSeconds: number): void {
    if (this.hidden) return;
    this.advanceTo(wallSeconds);
    this.sim.halt("hidden");
    this.sim.pause(wallSeconds);
    this.hidden = true;
    this.flushSave();
    this.emit();
  }

  show(wallSeconds: number): void {
    if (!this.hidden) return;
    this.sim.resume(wallSeconds);
    this.hidden = false;
    this.lastWall = wallSeconds;
    this.announce("Simulation resumed. Motion was stopped while the page was hidden.");
    this.emit();
  }

  getTelemetry(): Telemetry {
    const snapshot = this.sim.snapshot();
    const profile = this.project.camera;
    return {
      snapshot,
      lens: lensState(profile, snapshot.pose.lens),
      frame: cameraFrame(this.geometry, snapshot.pose, profile),
      performer: this.performerNow(),
      geometry: this.geometry,
      profile,
      exercise: this.exercise,
    };
  }

  setRenderStatus(status: RenderStatus, note = ""): void {
    if (status === this.renderStatus && note === this.renderNote) return;
    if (status === "lost") {
      this.sim.halt("graphics context lost");
      this.announce("The 3D view stopped because the browser reset its graphics. Motion was stopped.", "warn");
    }
    this.renderStatus = status;
    this.renderNote = note;
    this.emit();
  }

  private performerConfig(): PerformerConfig {
    const config = this.project.session.performer;
    return this.exerciseId === "follow" && this.exercise ? { ...config, mode: "path" } : config;
  }

  private performerNow(): PerformerState {
    const time = this.sim.time;
    const exerciseTime = this.exercise?.performerTime(time);
    const pathTime = exerciseTime ?? time - this.performerEpoch;
    return performerState(this.performerConfig(), this.geometry.marks, pathTime);
  }

  private exerciseSample(dt: number): ExerciseSample {
    const pose = this.sim.getPose();
    return {
      time: this.sim.time,
      dt,
      pose,
      moving: this.sim.isMoving(),
      frame: cameraFrame(this.geometry, pose, this.project.camera),
      geometry: this.geometry,
      profile: this.project.camera,
      performer: this.performerNow(),
      settings: this.project.session.exerciseSettings,
    };
  }

  private onTick(tick: number): void {
    if (tick % SAMPLE_TICKS !== 0) return;
    const events = this.sim.drainEvents();
    const moving = this.sim.isMoving();
    if (events.length === 0 && !this.exercise && moving === this.wasMoving) return;
    const sample = this.exerciseSample(SAMPLE_TICKS * SIM_STEP);
    let changed = false;
    for (const event of events) {
      changed = this.reactToSimEvent(event) || changed;
      this.exercise?.handleEvent(event, sample);
    }
    if (this.wasMoving && !moving) this.scheduleSave();
    this.wasMoving = moving;
    if (this.exercise) {
      this.exercise.sample(sample);
      changed = this.recordExerciseIfComplete() || changed;
      const progress = this.exercise.progress();
      const key = `${progress.status}|${progress.headline}|${progress.note}|${progress.checks.map((c) => (c.done ? 1 : 0)).join("")}|${progress.figures.map((f) => f.value).join(",")}`;
      if (key !== this.lastProgressKey && (sample.time - this.lastProgressEmit >= PROGRESS_EMIT_INTERVAL_S || progress.status === "complete")) {
        this.lastProgressKey = key;
        this.lastProgressEmit = sample.time;
        changed = true;
      }
    }
    if (changed) this.emit();
  }

  private reactToSimEvent(event: SimEvent): boolean {
    switch (event.type) {
      case "recall-complete":
        this.announce(event.target.kind === "home" ? "Home reached." : `Preset ${event.target.slot} reached.`, "success");
        this.scheduleSave();
        return true;
      case "recall-interrupted":
        if (event.reason === "manual") {
          this.announce(`${event.target.kind === "home" ? "Home" : `Preset ${event.target.slot}`} interrupted by manual control.`);
          return true;
        }
        return false;
      case "limit":
        this.announce(`${event.axis === "lens" ? (event.side === "max" ? "Full tele" : "Full wide") : `${event.axis === "pan" ? "Pan" : "Tilt"} limit`} reached.`, "warn");
        return true;
      default:
        return false;
    }
  }

  // ------------------------------------------------------------------------------------------
  // Operating commands
  // ------------------------------------------------------------------------------------------

  /** Commanded joystick and zoom deflection, merged from every input source. */
  setDrive(input: DriveInput, wallSeconds: number): void {
    if (this.hidden) return;
    this.advanceTo(wallSeconds);
    this.sim.setInput(input);
  }

  stop(wallSeconds: number): void {
    this.advanceTo(wallSeconds);
    this.sim.stop();
  }

  home(wallSeconds: number): void {
    if (this.hidden) return;
    this.advanceTo(wallSeconds);
    const { clamped } = this.sim.home();
    this.announce(clamped ? "Home is outside the current limits; moving to the nearest allowed pose." : "Moving to home: pan 0°, tilt 0°, full wide.");
    this.emit();
  }

  recallPreset(slot: number, wallSeconds: number): void {
    if (this.hidden) return;
    this.advanceTo(wallSeconds);
    this.storeArmed = false;
    const preset = this.project.session.presets.find((p) => p.slot === slot);
    if (!preset) {
      this.announce(`Preset ${slot} is empty. Store the current shot first.`, "warn");
      this.emit();
      return;
    }
    if (preset.cameraId !== this.project.camera.id) {
      this.announce(`Preset ${slot} belongs to camera ${preset.cameraId}, not this camera.`, "warn");
      this.emit();
      return;
    }
    const { durationS, clamped } = this.sim.recallTo(preset, { kind: "preset", slot, name: preset.name });
    this.announce(`Recalling ${describePreset(preset)} over ${durationS.toFixed(1)} s${clamped ? ", clamped to the current limits" : ""}.`);
    this.emit();
  }

  armStore(armed: boolean): void {
    this.clearReplacePrompt();
    this.storeArmed = armed;
    if (armed) this.announce("Store armed. Choose a preset number for the current shot.");
    this.emit();
  }

  private clearReplacePrompt(): void {
    if (this.promptTimer !== null) clearTimeout(this.promptTimer);
    this.promptTimer = null;
    this.promptArmed = false;
    this.overwrite = null;
  }

  /** Stores the live pose. Replacing a stored preset needs a second press within three seconds. */
  storePreset(slot: number, wallSeconds: number): void {
    if (slot < 1 || slot > PRESET_SLOTS) return;
    this.advanceTo(wallSeconds);
    const session = this.project.session;
    const existing = session.presets.find((p) => p.slot === slot);
    if (existing && !(this.overwrite && this.overwrite.slot === slot && wallSeconds <= this.overwrite.until)) {
      // A replace prompt that armed Store by itself disarms when its window closes; an operator
      // who pressed Store first keeps it armed.
      const armedByOperator = this.storeArmed && !this.promptArmed;
      this.clearReplacePrompt();
      this.overwrite = { slot, until: wallSeconds + OVERWRITE_WINDOW_S };
      this.storeArmed = true;
      if (!armedByOperator) {
        this.promptArmed = true;
        this.promptTimer = setTimeout(() => {
          this.promptTimer = null;
          if (!this.promptArmed) return;
          this.promptArmed = false;
          this.overwrite = null;
          this.storeArmed = false;
          this.announce(`Preset ${slot} was kept. Number keys recall presets again.`);
          this.emit();
        }, OVERWRITE_WINDOW_S * 1000);
      }
      this.announce(`${describePreset(existing)} is already stored. Press ${slot} again within 3 s to replace it.`, "warn");
      this.emit();
      return;
    }
    const pose = this.sim.getPose();
    const preset: Preset = {
      slot,
      name: existing?.name ?? "",
      cameraId: this.project.camera.id,
      pan: pose.pan,
      tilt: pose.tilt,
      lens: pose.lens,
      savedAt: new Date().toISOString(),
    };
    this.project = {
      ...this.project,
      session: { ...session, presets: [...session.presets.filter((p) => p.slot !== slot), preset].sort((a, b) => a.slot - b.slot) },
    };
    this.clearReplacePrompt();
    this.storeArmed = false;
    this.announce(`${existing ? "Replaced" : "Stored"} ${describePreset(preset)}.`, "success");
    const event: ExerciseEvent = { type: "preset-stored", preset, tick: this.sim.tick };
    if (this.exercise) {
      this.exercise.handleEvent(event, this.exerciseSample(0));
      this.recordExerciseIfComplete();
    }
    this.scheduleSave();
    this.emit();
  }

  renamePreset(slot: number, name: string): void {
    const session = this.project.session;
    const trimmed = name.slice(0, 40);
    this.project = {
      ...this.project,
      session: { ...session, presets: session.presets.map((p) => (p.slot === slot ? { ...p, name: trimmed } : p)) },
    };
    this.scheduleSave();
    this.emit();
  }

  deletePreset(slot: number): void {
    const session = this.project.session;
    this.project = { ...this.project, session: { ...session, presets: session.presets.filter((p) => p.slot !== slot) } };
    this.announce(`Preset ${slot} deleted.`);
    this.scheduleSave();
    this.emit();
  }

  setSpeed(axis: keyof SpeedLevels, level: number): void {
    const next = clamp(Math.round(level), SPEED_LEVEL_MIN, SPEED_LEVEL_MAX);
    const session = this.project.session;
    if (session.speeds[axis] === next) return;
    const speeds = { ...session.speeds, [axis]: next };
    this.project = { ...this.project, session: { ...session, speeds } };
    this.sim.setSpeeds(speeds);
    this.scheduleSave();
    this.emit();
  }

  nudgeSpeed(axes: Array<keyof SpeedLevels>, delta: number): void {
    const levels = axes.map((axis) => `${axis} ${clamp(this.project.session.speeds[axis] + delta, SPEED_LEVEL_MIN, SPEED_LEVEL_MAX)}`);
    for (const axis of axes) this.setSpeed(axis, this.project.session.speeds[axis] + delta);
    this.announce(`Speed: ${levels.join(", ")} of ${SPEED_LEVEL_MAX}.`);
    this.emit();
  }

  // ------------------------------------------------------------------------------------------
  // Settings
  // ------------------------------------------------------------------------------------------

  private followRunning(): boolean {
    return this.exerciseId === "follow" && this.exercise?.progress().status === "running";
  }

  updateVenue(next: VenueProfile): UpdateResult {
    // Stage dimensions place the marks the follow run is walking; changing them mid-run skews it.
    if (this.followRunning()) {
      return { ok: false, issues: [{ path: "venue", message: "The follow exercise is running on this stage. Finish or reset it first." }] };
    }
    const parsed = parseVenueProfile(next);
    if (!parsed.ok) return { ok: false, issues: parsed.issues };
    const geometry = deriveVenueGeometry(parsed.venue);
    if (!geometry.ok) return { ok: false, issues: geometry.issues };
    const mountChanged = geometry.geometry.mountOrientation !== this.geometry.mountOrientation;
    this.project = { ...this.project, venue: parsed.venue };
    this.geometry = geometry.geometry;
    if (mountChanged) this.sim.configure(this.project.camera, this.geometry.mountOrientation);
    this.scheduleSave();
    this.emit();
    return { ok: true };
  }

  updateCamera(next: CameraProfile): UpdateResult {
    const parsed = parseCameraProfile(next);
    if (!parsed.ok) return { ok: false, issues: parsed.issues };
    this.project = { ...this.project, camera: parsed.camera };
    this.sim.configure(parsed.camera, this.geometry.mountOrientation);
    this.scheduleSave();
    this.emit();
    return { ok: true };
  }

  updateShowPackage(showPackage: ShowPackage): UpdateResult {
    const parsed = parseSession({ ...this.project.session, showPackage });
    if (!parsed.ok) return { ok: false, issues: parsed.issues };
    this.project = { ...this.project, session: { ...this.project.session, showPackage: parsed.session.showPackage } };
    this.scheduleSave();
    this.emit();
    return { ok: true };
  }

  updatePerformer(patch: Partial<PerformerConfig>): UpdateResult {
    // The follow exercise timed its run from the performer's path; changing it mid-run would skew the result.
    if (this.followRunning()) {
      return { ok: false, issues: [{ path: "session.performer", message: "The follow exercise is using the performer. Finish or reset it first." }] };
    }
    const session = this.project.session;
    const candidate = { ...session, performer: { ...session.performer, ...patch } };
    const parsed = parseSession(candidate);
    if (!parsed.ok) return { ok: false, issues: parsed.issues };
    const restart = patch.mode === "path" || patch.pathId !== undefined;
    this.project = { ...this.project, session: { ...session, performer: parsed.session.performer } };
    if (restart) this.performerEpoch = this.sim.time;
    this.scheduleSave();
    this.emit();
    return { ok: true };
  }

  restartPerformer(): void {
    this.performerEpoch = this.sim.time;
    this.emit();
  }

  updateExerciseSettings(next: ExerciseSettings): UpdateResult {
    const session = this.project.session;
    const parsed = parseSession({ ...session, exerciseSettings: next });
    if (!parsed.ok) return { ok: false, issues: parsed.issues };
    this.project = { ...this.project, session: { ...session, exerciseSettings: parsed.session.exerciseSettings } };
    this.scheduleSave();
    this.emit();
    return { ok: true };
  }

  setUnit(unit: LengthUnit): void {
    const session = this.project.session;
    this.project = { ...this.project, session: { ...session, preferences: { ...session.preferences, unit } } };
    this.scheduleSave();
    this.emit();
  }

  setGuides(patch: Partial<GuidePreferences>): void {
    const session = this.project.session;
    const guides = { ...session.preferences.guides, ...patch };
    this.project = { ...this.project, session: { ...session, preferences: { ...session.preferences, guides } } };
    this.scheduleSave();
    this.emit();
  }

  // Resets keep the profile's identity: the session and every stored preset refer to it by id.
  resetVenue(): UpdateResult {
    const result = this.updateVenue({ ...defaultVenueProfile(), id: this.project.venue.id });
    this.announce(result.ok ? "Venue reset to the default FMP estimates." : result.issues[0].message, result.ok ? "info" : "warn");
    this.emit();
    return result;
  }

  resetCamera(): UpdateResult {
    const result = this.updateCamera({ ...defaultCameraProfile(), id: this.project.camera.id });
    this.announce(result.ok ? "Camera profile reset to the P240 defaults." : result.issues[0].message, result.ok ? "info" : "warn");
    this.emit();
    return result;
  }

  /** Clears presets, results and preferences but keeps the venue and camera profiles. */
  resetSession(wallSeconds: number): void {
    this.advanceTo(wallSeconds);
    const session = defaultSession(this.project.venue.id, this.project.camera.id);
    this.project = { ...this.project, session };
    this.exercise = null;
    this.exerciseId = null;
    this.sim.place(session.pose);
    this.sim.setSpeeds(session.speeds);
    this.performerEpoch = this.sim.time;
    this.announce("Session reset. Presets and exercise results were cleared.");
    this.scheduleSave();
    this.emit();
  }

  // ------------------------------------------------------------------------------------------
  // Exercises
  // ------------------------------------------------------------------------------------------

  startExercise(id: ExerciseId, wallSeconds: number): void {
    this.advanceTo(wallSeconds);
    this.exerciseId = id;
    this.exerciseRecorded = false;
    this.lastProgressKey = "";
    if (id === "wide") {
      // Every attempt starts from the same place: the camera's home pose, which is not a usable wide.
      this.sim.home();
      this.exercise = new WideShotExercise();
    } else if (id === "recall") this.exercise = new RecallExercise();
    else {
      const plan = planPath({ ...this.project.session.performer, mode: "path" }, this.geometry.marks);
      this.exercise = new FollowExercise(plan.loopS);
    }
    this.exercise.sample(this.exerciseSample(0));
    this.announce(
      id === "wide"
        ? "Exercise started: the camera is returning home. Establish a wide shot of the whole performance area."
        : `Exercise started: ${id === "follow" ? "follow a performer" : "save and recall two shots"}.`,
    );
    this.emit();
  }

  resetExercise(): void {
    this.exercise = null;
    this.exerciseId = null;
    this.announce("Exercise reset.");
    this.emit();
  }

  private recordExerciseIfComplete(): boolean {
    if (!this.exercise || this.exerciseRecorded) return false;
    const progress = this.exercise.progress();
    if (progress.status !== "complete" || !progress.result) return false;
    this.exerciseRecorded = true;
    const result: ExerciseResult = { ...progress.result, id: newId(), completedAt: new Date().toISOString() };
    const session = this.project.session;
    const results = [...session.exerciseResults, result].slice(-MAX_EXERCISE_RESULTS);
    this.project = { ...this.project, session: { ...session, exerciseResults: results } };
    this.announce(result.summary, result.passed ? "success" : "warn");
    this.scheduleSave();
    return true;
  }

  clearResults(): void {
    const session = this.project.session;
    this.project = { ...this.project, session: { ...session, exerciseResults: [] } };
    this.scheduleSave();
    this.emit();
  }

  // ------------------------------------------------------------------------------------------
  // Import, export and persistence
  // ------------------------------------------------------------------------------------------

  private projectForSave(): Project {
    const pose = this.sim.getPose();
    return { ...this.project, session: { ...this.project.session, pose: { pan: pose.pan, tilt: pose.tilt, lens: pose.lens } } };
  }

  exportText(): string {
    return serializeProject(this.projectForSave());
  }

  importText(text: string, wallSeconds: number): UpdateResult {
    const parsed = parseProjectText(text);
    if (!parsed.ok) {
      this.announce("Import rejected. The open session was kept.", "warn");
      this.emit();
      return { ok: false, issues: parsed.issues };
    }
    const result = this.replaceProject(parsed.project, wallSeconds);
    if (!result.ok) return result;
    // An explicit import defines this session, so it is saved even over another tab's copy.
    this.storageConflict = false;
    this.announce(`Imported ${this.project.session.presets.length} presets, the venue profile and the camera profile.`, "success");
    this.scheduleSave();
    this.emit();
    return { ok: true };
  }

  /** Swaps in a complete, already-validated project: camera, speeds, pose and performer clock. */
  private replaceProject(project: Project, wallSeconds: number): UpdateResult {
    const geometry = deriveVenueGeometry(project.venue);
    if (!geometry.ok) return { ok: false, issues: geometry.issues };
    this.advanceTo(wallSeconds);
    this.project = project;
    this.geometry = geometry.geometry;
    this.exercise = null;
    this.exerciseId = null;
    this.clearReplacePrompt();
    this.storeArmed = false;
    this.sim.configure(this.project.camera, this.geometry.mountOrientation);
    this.sim.setSpeeds(this.project.session.speeds);
    this.sim.place(this.project.session.pose);
    this.performerEpoch = this.sim.time;
    return { ok: true };
  }

  /**
   * Another tab saved over this session. Autosave pauses so neither copy is silently lost until
   * the operator chooses one.
   */
  noteExternalSave(): void {
    if (this.storageConflict) return;
    this.storageConflict = true;
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.announce("Another tab saved a different copy of this session. Choose which one to keep.", "warn");
    this.emit();
  }

  /** Loads the copy the other tab saved, replacing this tab's session. */
  useSavedCopy(wallSeconds: number): UpdateResult {
    const loaded = loadProject(this.storage);
    if (loaded.status.state !== "ok" || loaded.notice) {
      const message = loaded.notice ?? "The saved copy could not be read.";
      this.announce(message, "warn");
      this.emit();
      return { ok: false, issues: [{ path: "storage", message }] };
    }
    const result = this.replaceProject(loaded.project, wallSeconds);
    if (!result.ok) return result;
    this.storageConflict = false;
    this.announce("Loaded the session saved by the other tab.", "success");
    this.emit();
    return { ok: true };
  }

  /** Keeps this tab's session and saves it over the other tab's copy. */
  keepThisCopy(): void {
    this.storageConflict = false;
    this.flushSave();
    this.announce("Kept this tab's session. It is saved again.");
    this.emit();
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    if (this.storageConflict) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flushSave();
    }, SAVE_DEBOUNCE_MS);
  }

  flushSave(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.storageConflict) return;
    const before = this.storageStatus.state;
    this.storageStatus = saveProject(this.storage, this.projectForSave());
    if (this.storageStatus.state !== before) {
      if (this.storageStatus.state === "unavailable") this.announce(`${this.storageStatus.reason} Export the session to keep it.`, "warn");
      this.emit();
    }
  }

  dismissStorageNotice(): void {
    this.storageNotice = null;
    this.emit();
  }

  /** Wall clock of the last processed input or frame, seconds. */
  get wall(): number {
    return this.lastWall;
  }
}
