import { type CameraProfile } from "../../domain/camera";
import { type ShowPackage } from "../../domain/structures";
import {
  type ExerciseId,
  type ExerciseSettings,
  type GuidePreferences,
  type PerformerConfig,
  type SpeedLevels,
} from "../../domain/session";
import { type LengthUnit } from "../../domain/units";
import { type VenueProfile } from "../../domain/venue";
import { type DriveInput } from "../../sim/ptz";
import { ClockController } from "./clock";
import { StoreCore } from "./core";
import { ExerciseController } from "./exercises";
import { OperatingController } from "./operating";
import { PersistenceController } from "./persistence";
import { SettingsController } from "./settings";
import { type RenderStatus, type StoreState, type Telemetry, type UpdateResult } from "./types";

/**
 * Thin façade over focused store controllers. Public method signatures match the former
 * monolithic SimulatorStore so existing UI imports keep working.
 */
export class SimulatorStore {
  private readonly core: StoreCore;
  private readonly persistence: PersistenceController;
  private readonly exercises: ExerciseController;
  private readonly clock: ClockController;
  private readonly operating: OperatingController;
  private readonly settings: SettingsController;

  constructor(storage: Storage | null) {
    this.core = new StoreCore(storage);
    this.persistence = new PersistenceController(this.core);
    this.exercises = new ExerciseController(this.core, this.persistence);
    this.clock = new ClockController(this.core, this.persistence, this.exercises);
    this.operating = new OperatingController(this.core, this.persistence, (event) =>
      this.exercises.handlePresetStored(event),
    );
    this.settings = new SettingsController(this.core, this.persistence);
  }

  // ------------------------------------------------------------------------------------------
  // Subscription
  // ------------------------------------------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => this.core.subscribe(listener);

  getState = (): StoreState => this.core.getState();

  // ------------------------------------------------------------------------------------------
  // Clock and telemetry
  // ------------------------------------------------------------------------------------------

  advanceTo(wallSeconds: number): void {
    this.clock.advanceTo(wallSeconds);
  }

  hide(wallSeconds: number): void {
    this.clock.hide(wallSeconds);
  }

  show(wallSeconds: number): void {
    this.clock.show(wallSeconds);
  }

  getTelemetry(): Telemetry {
    return this.clock.getTelemetry();
  }

  setRenderStatus(status: RenderStatus, note = ""): void {
    this.clock.setRenderStatus(status, note);
  }

  // ------------------------------------------------------------------------------------------
  // Operating commands
  // ------------------------------------------------------------------------------------------

  setDrive(input: DriveInput, wallSeconds: number): void {
    this.operating.setDrive(input, wallSeconds, (wall) => this.advanceTo(wall));
  }

  stop(wallSeconds: number): void {
    this.operating.stop(wallSeconds, (wall) => this.advanceTo(wall));
  }

  home(wallSeconds: number): void {
    this.operating.home(wallSeconds, (wall) => this.advanceTo(wall));
  }

  recallPreset(slot: number, wallSeconds: number): void {
    this.operating.recallPreset(slot, wallSeconds, (wall) => this.advanceTo(wall));
  }

  armStore(armed: boolean): void {
    this.operating.armStore(armed);
  }

  storePreset(slot: number, wallSeconds: number): void {
    this.operating.storePreset(slot, wallSeconds, (wall) => this.advanceTo(wall));
  }

  renamePreset(slot: number, name: string): void {
    this.operating.renamePreset(slot, name);
  }

  deletePreset(slot: number): void {
    this.operating.deletePreset(slot);
  }

  setSpeed(axis: keyof SpeedLevels, level: number): void {
    this.operating.setSpeed(axis, level);
  }

  nudgeSpeed(axes: Array<keyof SpeedLevels>, delta: number): void {
    this.operating.nudgeSpeed(axes, delta);
  }

  // ------------------------------------------------------------------------------------------
  // Settings
  // ------------------------------------------------------------------------------------------

  updateVenue(next: VenueProfile): UpdateResult {
    return this.settings.updateVenue(next);
  }

  updateCamera(next: CameraProfile): UpdateResult {
    return this.settings.updateCamera(next);
  }

  updateShowPackage(showPackage: ShowPackage): UpdateResult {
    return this.settings.updateShowPackage(showPackage);
  }

  updatePerformer(patch: Partial<PerformerConfig>): UpdateResult {
    return this.settings.updatePerformer(patch);
  }

  restartPerformer(): void {
    this.settings.restartPerformer();
  }

  updateExerciseSettings(next: ExerciseSettings): UpdateResult {
    return this.settings.updateExerciseSettings(next);
  }

  setUnit(unit: LengthUnit): void {
    this.settings.setUnit(unit);
  }

  setGuides(patch: Partial<GuidePreferences>): void {
    this.settings.setGuides(patch);
  }

  resetVenue(): UpdateResult {
    return this.settings.resetVenue();
  }

  resetCamera(): UpdateResult {
    return this.settings.resetCamera();
  }

  resetSession(wallSeconds: number): void {
    this.settings.resetSession(wallSeconds, (wall) => this.advanceTo(wall));
  }

  // ------------------------------------------------------------------------------------------
  // Exercises
  // ------------------------------------------------------------------------------------------

  startExercise(id: ExerciseId, wallSeconds: number): void {
    this.exercises.startExercise(id, wallSeconds, (wall) => this.advanceTo(wall));
  }

  resetExercise(): void {
    this.exercises.resetExercise();
  }

  clearResults(): void {
    this.exercises.clearResults();
  }

  // ------------------------------------------------------------------------------------------
  // Import, export and persistence
  // ------------------------------------------------------------------------------------------

  exportText(): string {
    return this.persistence.exportText();
  }

  importText(text: string, wallSeconds: number): UpdateResult {
    return this.persistence.importText(text, wallSeconds, (wall) => this.advanceTo(wall));
  }

  noteExternalSave(newValue?: string | null): void {
    this.persistence.noteExternalSave(newValue);
  }

  useSavedCopy(wallSeconds: number): UpdateResult {
    return this.persistence.useSavedCopy(wallSeconds, (wall) => this.advanceTo(wall));
  }

  keepThisCopy(): void {
    this.persistence.keepThisCopy();
  }

  flushSave(): void {
    this.persistence.flushSave();
  }

  dismissStorageNotice(): void {
    this.persistence.dismissStorageNotice();
  }

  /** A one-line hint in the status line, for a control used in a way that does nothing. */
  hint(text: string): void {
    this.core.announce(text);
    this.core.emit();
  }

  /** Wall clock of the last processed input or frame, seconds. */
  get wall(): number {
    return this.core.lastWall;
  }
}
