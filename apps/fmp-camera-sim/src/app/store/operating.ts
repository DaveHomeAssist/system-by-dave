import { SPEED_LEVEL_MAX, SPEED_LEVEL_MIN } from "../../domain/camera";
import { type Preset, PRESET_SLOTS, type SpeedLevels } from "../../domain/session";
import { clamp } from "../../domain/units";
import { type ExerciseEvent } from "../../exercises/types";
import { type DriveInput } from "../../sim/ptz";
import { type StoreCore } from "./core";
import { describePreset, OVERWRITE_WINDOW_S } from "./helpers";
import { type PersistenceController } from "./persistence";

/** Joystick / PTZ drive, home, presets and speed levels. */
export class OperatingController {
  constructor(
    private readonly core: StoreCore,
    private readonly persistence: PersistenceController,
    private readonly onPresetStored: (event: ExerciseEvent) => void,
  ) {}

  /** Commanded joystick and zoom deflection, merged from every input source. */
  setDrive(input: DriveInput, wallSeconds: number, advanceTo: (wall: number) => void): void {
    if (this.core.hidden) return;
    advanceTo(wallSeconds);
    this.core.sim.setInput(input);
  }

  stop(wallSeconds: number, advanceTo: (wall: number) => void): void {
    advanceTo(wallSeconds);
    this.core.sim.stop();
  }

  home(wallSeconds: number, advanceTo: (wall: number) => void): void {
    if (this.core.hidden) return;
    advanceTo(wallSeconds);
    const { clamped } = this.core.sim.home();
    this.core.announce(
      clamped
        ? "Home is outside the current limits; moving to the nearest allowed pose."
        : "Moving to home: pan 0°, tilt 0°, full wide.",
    );
    this.core.emit();
  }

  recallPreset(slot: number, wallSeconds: number, advanceTo: (wall: number) => void): void {
    if (this.core.hidden) return;
    advanceTo(wallSeconds);
    this.core.storeArmed = false;
    const preset = this.core.project.session.presets.find((p) => p.slot === slot);
    if (!preset) {
      this.core.announce(`Preset ${slot} is empty. Store the current shot first.`, "warn");
      this.core.emit();
      return;
    }
    if (preset.cameraId !== this.core.project.camera.id) {
      this.core.announce(`Preset ${slot} belongs to camera ${preset.cameraId}, not this camera.`, "warn");
      this.core.emit();
      return;
    }
    const { durationS, clamped } = this.core.sim.recallTo(preset, { kind: "preset", slot, name: preset.name });
    this.core.announce(
      `Recalling ${describePreset(preset)} over ${durationS.toFixed(1)} s${clamped ? ", clamped to the current limits" : ""}.`,
    );
    this.core.emit();
  }

  armStore(armed: boolean): void {
    this.persistence.clearReplacePrompt();
    this.core.storeArmed = armed;
    if (armed) this.core.announce("Store armed. Choose a preset number for the current shot.");
    this.core.emit();
  }

  /** Stores the live pose. Replacing a stored preset needs a second press within three seconds. */
  storePreset(slot: number, wallSeconds: number, advanceTo: (wall: number) => void): void {
    if (slot < 1 || slot > PRESET_SLOTS) return;
    advanceTo(wallSeconds);
    const session = this.core.project.session;
    const existing = session.presets.find((p) => p.slot === slot);
    if (existing && !(this.core.overwrite && this.core.overwrite.slot === slot && wallSeconds <= this.core.overwrite.until)) {
      // A replace prompt that armed Store by itself disarms when its window closes; an operator
      // who pressed Store first keeps it armed.
      const armedByOperator = this.core.storeArmed && !this.core.promptArmed;
      this.persistence.clearReplacePrompt();
      this.core.overwrite = { slot, until: wallSeconds + OVERWRITE_WINDOW_S };
      this.core.storeArmed = true;
      if (!armedByOperator) {
        this.core.promptArmed = true;
        this.core.promptTimer = setTimeout(() => {
          this.core.promptTimer = null;
          if (!this.core.promptArmed) return;
          this.core.promptArmed = false;
          this.core.overwrite = null;
          this.core.storeArmed = false;
          this.core.announce(`Preset ${slot} was kept. Number keys recall presets again.`);
          this.core.emit();
        }, OVERWRITE_WINDOW_S * 1000);
      }
      this.core.announce(`${describePreset(existing)} is already stored. Press ${slot} again within 3 s to replace it.`, "warn");
      this.core.emit();
      return;
    }
    const pose = this.core.sim.getPose();
    const preset: Preset = {
      slot,
      name: existing?.name ?? "",
      cameraId: this.core.project.camera.id,
      pan: pose.pan,
      tilt: pose.tilt,
      lens: pose.lens,
      savedAt: new Date().toISOString(),
    };
    this.core.project = {
      ...this.core.project,
      session: {
        ...session,
        presets: [...session.presets.filter((p) => p.slot !== slot), preset].sort((a, b) => a.slot - b.slot),
      },
    };
    this.persistence.clearReplacePrompt();
    this.core.storeArmed = false;
    this.core.announce(`${existing ? "Replaced" : "Stored"} ${describePreset(preset)}.`, "success");
    const event: ExerciseEvent = { type: "preset-stored", preset, tick: this.core.sim.tick };
    this.onPresetStored(event);
    this.persistence.scheduleSave();
    this.core.emit();
  }

  renamePreset(slot: number, name: string): void {
    const session = this.core.project.session;
    const trimmed = name.slice(0, 40);
    this.core.project = {
      ...this.core.project,
      session: { ...session, presets: session.presets.map((p) => (p.slot === slot ? { ...p, name: trimmed } : p)) },
    };
    this.persistence.scheduleSave();
    this.core.emit();
  }

  deletePreset(slot: number): void {
    const session = this.core.project.session;
    this.core.project = { ...this.core.project, session: { ...session, presets: session.presets.filter((p) => p.slot !== slot) } };
    this.core.announce(`Preset ${slot} deleted.`);
    this.persistence.scheduleSave();
    this.core.emit();
  }

  setSpeed(axis: keyof SpeedLevels, level: number): void {
    const next = clamp(Math.round(level), SPEED_LEVEL_MIN, SPEED_LEVEL_MAX);
    const session = this.core.project.session;
    if (session.speeds[axis] === next) return;
    const speeds = { ...session.speeds, [axis]: next };
    this.core.project = { ...this.core.project, session: { ...session, speeds } };
    this.core.sim.setSpeeds(speeds);
    this.persistence.scheduleSave();
    this.core.emit();
  }

  nudgeSpeed(axes: Array<keyof SpeedLevels>, delta: number): void {
    const levels = axes.map(
      (axis) => `${axis} ${clamp(this.core.project.session.speeds[axis] + delta, SPEED_LEVEL_MIN, SPEED_LEVEL_MAX)}`,
    );
    for (const axis of axes) this.setSpeed(axis, this.core.project.session.speeds[axis] + delta);
    this.core.announce(`Speed: ${levels.join(", ")} of ${SPEED_LEVEL_MAX}.`);
    this.core.emit();
  }
}
