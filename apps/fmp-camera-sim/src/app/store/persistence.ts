import { type Project, parseProjectText, serializeProject } from "../../domain/project";
import { deriveVenueGeometry } from "../../domain/venue";
import { loadProject, saveProject } from "../../storage/persist";
import { type StoreCore } from "./core";
import { SAVE_DEBOUNCE_MS } from "./helpers";
import { type UpdateResult } from "./types";

/** Debounced autosave, import/export, and multi-tab conflict handling. */
export class PersistenceController {
  constructor(private readonly core: StoreCore) {}

  projectForSave(): Project {
    const pose = this.core.sim.getPose();
    return {
      ...this.core.project,
      session: { ...this.core.project.session, pose: { pan: pose.pan, tilt: pose.tilt, lens: pose.lens } },
    };
  }

  exportText(): string {
    return serializeProject(this.projectForSave());
  }

  /** Swaps in a complete, already-validated project: camera, speeds, pose and performer clock. */
  replaceProject(project: Project, wallSeconds: number, advanceTo: (wall: number) => void): UpdateResult {
    const geometry = deriveVenueGeometry(project.venue);
    if (!geometry.ok) return { ok: false, issues: geometry.issues };
    advanceTo(wallSeconds);
    this.core.project = project;
    this.core.geometry = geometry.geometry;
    this.core.exercise = null;
    this.core.exerciseId = null;
    this.clearReplacePrompt();
    this.core.storeArmed = false;
    this.core.sim.configure(this.core.project.camera, this.core.geometry.mountOrientation);
    this.core.sim.setSpeeds(this.core.project.session.speeds);
    this.core.sim.place(this.core.project.session.pose);
    this.core.performerEpoch = this.core.sim.time;
    return { ok: true };
  }

  clearReplacePrompt(): void {
    if (this.core.promptTimer !== null) clearTimeout(this.core.promptTimer);
    this.core.promptTimer = null;
    this.core.promptArmed = false;
    this.core.overwrite = null;
  }

  importText(
    text: string,
    wallSeconds: number,
    advanceTo: (wall: number) => void,
  ): UpdateResult {
    const parsed = parseProjectText(text);
    if (!parsed.ok) {
      this.core.announce("Import rejected. The open session was kept.", "warn");
      this.core.emit();
      return { ok: false, issues: parsed.issues };
    }
    const result = this.replaceProject(parsed.project, wallSeconds, advanceTo);
    if (!result.ok) return result;
    // An explicit import defines this session, so it is saved even over another tab's copy.
    this.core.storageConflict = false;
    this.core.announce(
      `Imported ${this.core.project.session.presets.length} presets, the venue profile and the camera profile.`,
      "success",
    );
    this.scheduleSave();
    this.core.emit();
    return { ok: true };
  }

  /**
   * Another tab saved over this session. Autosave pauses so neither copy is silently lost until
   * the operator chooses one.
   */
  noteExternalSave(): void {
    if (this.core.storageConflict) return;
    this.core.storageConflict = true;
    if (this.core.saveTimer !== null) clearTimeout(this.core.saveTimer);
    this.core.saveTimer = null;
    this.core.announce("Another tab saved a different copy of this session. Choose which one to keep.", "warn");
    this.core.emit();
  }

  /** Loads the copy the other tab saved, replacing this tab's session. */
  useSavedCopy(wallSeconds: number, advanceTo: (wall: number) => void): UpdateResult {
    const loaded = loadProject(this.core.storage);
    if (loaded.status.state !== "ok" || loaded.notice) {
      const message = loaded.notice ?? "The saved copy could not be read.";
      this.core.announce(message, "warn");
      this.core.emit();
      return { ok: false, issues: [{ path: "storage", message }] };
    }
    const result = this.replaceProject(loaded.project, wallSeconds, advanceTo);
    if (!result.ok) return result;
    this.core.storageConflict = false;
    this.core.announce("Loaded the session saved by the other tab.", "success");
    this.core.emit();
    return { ok: true };
  }

  /** Keeps this tab's session and saves it over the other tab's copy. */
  keepThisCopy(): void {
    this.core.storageConflict = false;
    this.flushSave();
    this.core.announce("Kept this tab's session. It is saved again.");
    this.core.emit();
  }

  scheduleSave(): void {
    if (this.core.saveTimer !== null) clearTimeout(this.core.saveTimer);
    if (this.core.storageConflict) return;
    this.core.saveTimer = setTimeout(() => {
      this.core.saveTimer = null;
      this.flushSave();
    }, SAVE_DEBOUNCE_MS);
  }

  flushSave(): void {
    if (this.core.saveTimer !== null) {
      clearTimeout(this.core.saveTimer);
      this.core.saveTimer = null;
    }
    if (this.core.storageConflict) return;
    const before = this.core.storageStatus.state;
    this.core.storageStatus = saveProject(this.core.storage, this.projectForSave());
    if (this.core.storageStatus.state !== before) {
      if (this.core.storageStatus.state === "unavailable") {
        this.core.announce(`${this.core.storageStatus.reason} Export the session to keep it.`, "warn");
      }
      this.core.emit();
    }
  }

  dismissStorageNotice(): void {
    this.core.storageNotice = null;
    this.core.emit();
  }
}
