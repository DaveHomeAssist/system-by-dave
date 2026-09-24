import { defaultCameraProfile, parseCameraProfile, type CameraProfile } from "../../domain/camera";
import { type ShowPackage } from "../../domain/structures";
import {
  defaultSession,
  type ExerciseSettings,
  type GuidePreferences,
  type PerformerConfig,
  parseSession,
} from "../../domain/session";
import { type LengthUnit } from "../../domain/units";
import { defaultVenueProfile, deriveVenueGeometry, parseVenueProfile, type VenueProfile } from "../../domain/venue";
import { type StoreCore } from "./core";
import { type PersistenceController } from "./persistence";
import { type UpdateResult } from "./types";

/** Venue / camera / session preference editors and resets. */
export class SettingsController {
  constructor(
    private readonly core: StoreCore,
    private readonly persistence: PersistenceController,
  ) {}

  private followRunning(): boolean {
    return this.core.exerciseId === "follow" && this.core.exercise?.progress().status === "running";
  }

  updateVenue(next: VenueProfile): UpdateResult {
    // Stage dimensions place the marks the follow run is walking; changing them mid-run skews it.
    if (this.followRunning()) {
      return {
        ok: false,
        issues: [{ path: "venue", message: "The follow exercise is running on this stage. Finish or reset it first." }],
      };
    }
    const parsed = parseVenueProfile(next);
    if (!parsed.ok) return { ok: false, issues: parsed.issues };
    const geometry = deriveVenueGeometry(parsed.venue);
    if (!geometry.ok) return { ok: false, issues: geometry.issues };
    const mountChanged = geometry.geometry.mountOrientation !== this.core.geometry.mountOrientation;
    this.core.project = { ...this.core.project, venue: parsed.venue };
    this.core.geometry = geometry.geometry;
    if (mountChanged) this.core.sim.configure(this.core.project.camera, this.core.geometry.mountOrientation);
    this.persistence.scheduleSave();
    this.core.emit();
    return { ok: true };
  }

  updateCamera(next: CameraProfile): UpdateResult {
    const parsed = parseCameraProfile(next);
    if (!parsed.ok) return { ok: false, issues: parsed.issues };
    this.core.project = { ...this.core.project, camera: parsed.camera };
    this.core.sim.configure(parsed.camera, this.core.geometry.mountOrientation);
    this.persistence.scheduleSave();
    this.core.emit();
    return { ok: true };
  }

  updateShowPackage(showPackage: ShowPackage): UpdateResult {
    const parsed = parseSession({ ...this.core.project.session, showPackage });
    if (!parsed.ok) return { ok: false, issues: parsed.issues };
    this.core.project = {
      ...this.core.project,
      session: { ...this.core.project.session, showPackage: parsed.session.showPackage },
    };
    this.persistence.scheduleSave();
    this.core.emit();
    return { ok: true };
  }

  updatePerformer(patch: Partial<PerformerConfig>): UpdateResult {
    // The follow exercise timed its run from the performer's path; changing it mid-run would skew the result.
    if (this.followRunning()) {
      return {
        ok: false,
        issues: [{ path: "session.performer", message: "The follow exercise is using the performer. Finish or reset it first." }],
      };
    }
    const session = this.core.project.session;
    const candidate = { ...session, performer: { ...session.performer, ...patch } };
    const parsed = parseSession(candidate);
    if (!parsed.ok) return { ok: false, issues: parsed.issues };
    const restart = patch.mode === "path" || patch.pathId !== undefined;
    this.core.project = { ...this.core.project, session: { ...session, performer: parsed.session.performer } };
    if (restart) this.core.performerEpoch = this.core.sim.time;
    this.persistence.scheduleSave();
    this.core.emit();
    return { ok: true };
  }

  restartPerformer(): void {
    this.core.performerEpoch = this.core.sim.time;
    this.core.emit();
  }

  updateExerciseSettings(next: ExerciseSettings): UpdateResult {
    const session = this.core.project.session;
    const parsed = parseSession({ ...session, exerciseSettings: next });
    if (!parsed.ok) return { ok: false, issues: parsed.issues };
    this.core.project = {
      ...this.core.project,
      session: { ...session, exerciseSettings: parsed.session.exerciseSettings },
    };
    this.persistence.scheduleSave();
    this.core.emit();
    return { ok: true };
  }

  setUnit(unit: LengthUnit): void {
    const session = this.core.project.session;
    this.core.project = {
      ...this.core.project,
      session: { ...session, preferences: { ...session.preferences, unit } },
    };
    this.persistence.scheduleSave();
    this.core.emit();
  }

  setGuides(patch: Partial<GuidePreferences>): void {
    const session = this.core.project.session;
    const guides = { ...session.preferences.guides, ...patch };
    this.core.project = {
      ...this.core.project,
      session: { ...session, preferences: { ...session.preferences, guides } },
    };
    this.persistence.scheduleSave();
    this.core.emit();
  }

  // Resets keep the profile's identity: the session and every stored preset refer to it by id.
  resetVenue(): UpdateResult {
    const result = this.updateVenue({ ...defaultVenueProfile(), id: this.core.project.venue.id });
    this.core.announce(
      result.ok ? "Venue reset to the default FMP estimates." : result.issues[0].message,
      result.ok ? "info" : "warn",
    );
    this.core.emit();
    return result;
  }

  resetCamera(): UpdateResult {
    const result = this.updateCamera({ ...defaultCameraProfile(), id: this.core.project.camera.id });
    this.core.announce(
      result.ok ? "Camera profile reset to the P240 defaults." : result.issues[0].message,
      result.ok ? "info" : "warn",
    );
    this.core.emit();
    return result;
  }

  /** Clears presets, results and preferences but keeps the venue and camera profiles. */
  resetSession(wallSeconds: number, advanceTo: (wall: number) => void): void {
    advanceTo(wallSeconds);
    const session = defaultSession(this.core.project.venue.id, this.core.project.camera.id);
    this.core.project = { ...this.core.project, session };
    this.core.exercise = null;
    this.core.exerciseId = null;
    this.core.sim.place(session.pose);
    this.core.sim.setSpeeds(session.speeds);
    this.core.performerEpoch = this.core.sim.time;
    this.core.announce("Session reset. Presets and exercise results were cleared.");
    this.persistence.scheduleSave();
    this.core.emit();
  }
}
