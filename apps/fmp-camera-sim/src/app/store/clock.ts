import { lensState } from "../../domain/camera";
import { cameraFrame } from "../../sim/framing";
import { describeTake } from "../../sim/onAir";
import { SIM_STEP, type SimEvent } from "../../sim/ptz";
import { type StoreCore } from "./core";
import { type ExerciseController } from "./exercises";
import { PROGRESS_EMIT_INTERVAL_S, SAMPLE_TICKS } from "./helpers";
import { type PersistenceController } from "./persistence";
import { type RenderStatus, type Telemetry } from "./types";

/** Simulation clock, page visibility, telemetry and tick reactions. */
export class ClockController {
  constructor(
    private readonly core: StoreCore,
    private readonly persistence: PersistenceController,
    private readonly exercises: ExerciseController,
  ) {
    this.core.sim.setTickListener((tick) => this.onTick(tick));
  }

  advanceTo(wallSeconds: number): void {
    this.core.lastWall = wallSeconds;
    this.core.sim.advanceTo(wallSeconds);
  }

  /** The page was hidden: stop all motion at once, stop the clock and save. */
  hide(wallSeconds: number): void {
    if (this.core.hidden) return;
    this.advanceTo(wallSeconds);
    this.core.sim.halt("hidden");
    this.core.sim.pause(wallSeconds);
    this.core.hidden = true;
    this.persistence.flushSave();
    this.core.emit();
  }

  show(wallSeconds: number): void {
    if (!this.core.hidden) return;
    this.core.sim.resume(wallSeconds);
    this.core.hidden = false;
    this.core.lastWall = wallSeconds;
    this.core.announce("Simulation resumed. Motion was stopped while the page was hidden.");
    this.core.emit();
  }

  getTelemetry(): Telemetry {
    const snapshot = this.core.sim.snapshot();
    const profile = this.core.project.camera;
    const lens = lensState(profile, snapshot.pose.lens);
    const frame = cameraFrame(this.core.geometry, snapshot.pose, profile);
    const delayMs = this.core.project.session.preferences.monitorDelayMs;
    const shown = delayMs > 0 ? this.core.delayLine.sample(snapshot.tick * SIM_STEP, delayMs, snapshot.pose) : null;
    return {
      snapshot,
      lens,
      frame,
      monitorFrame: shown ? cameraFrame(this.core.geometry, shown, profile) : frame,
      monitorLens: shown ? lensState(profile, shown.lens) : lens,
      onAir: this.core.onAir,
      performer: this.exercises.performerNow(),
      geometry: this.core.geometry,
      profile,
      exercise: this.core.exercise,
    };
  }

  setRenderStatus(status: RenderStatus, note = ""): void {
    if (status === this.core.renderStatus && note === this.core.renderNote) return;
    if (status === "lost") {
      this.core.sim.halt("graphics context lost");
      this.core.announce("The 3D view stopped because the browser reset its graphics. Motion was stopped.", "warn");
    }
    this.core.renderStatus = status;
    this.core.renderNote = note;
    this.core.emit();
  }

  /** Take the camera to program (tally on) or clear it. Clearing reports the take in the status line. */
  setOnAir(live: boolean, wallSeconds: number): void {
    if (live === this.core.onAir) return;
    this.advanceTo(wallSeconds);
    this.core.onAir = live;
    if (live) {
      this.core.onAirTracker.take();
      this.core.announce("On air. Tally is lit: hold the shot, and reframe only once the camera is off air.", "warn");
    } else {
      const stats = this.core.onAirTracker.getStats();
      this.core.announce(describeTake(stats), stats.moves === 0 ? "success" : "info");
    }
    this.core.emit();
  }

  private onTick(tick: number): void {
    this.core.delayLine.push(tick * SIM_STEP, this.core.sim.getPose());
    if (tick % SAMPLE_TICKS !== 0) return;
    const events = this.core.sim.drainEvents();
    const moving = this.core.sim.isMoving();
    if (this.core.onAir) {
      const airEvent = this.core.onAirTracker.sample(SAMPLE_TICKS * SIM_STEP, moving, this.core.sim.snapshot().velocity);
      if (airEvent) {
        this.core.announce(
          airEvent.first
            ? `Camera moved on air${airEvent.zoom ? " with a zoom" : ""}. The audience sees every move while the tally is lit.`
            : `Another move on air${airEvent.zoom ? " with a zoom" : ""} (${this.core.onAirTracker.getStats().moves} this take).`,
          "warn",
        );
        this.core.emit();
      }
    }
    if (events.length === 0 && !this.core.exercise && moving === this.core.wasMoving) return;
    const sample = this.exercises.exerciseSample(SAMPLE_TICKS * SIM_STEP);
    let changed = false;
    for (const event of events) {
      changed = this.reactToSimEvent(event) || changed;
      this.core.exercise?.handleEvent(event, sample);
    }
    if (this.core.wasMoving && !moving) this.persistence.scheduleSave();
    this.core.wasMoving = moving;
    if (this.core.exercise) {
      this.core.exercise.sample(sample);
      changed = this.exercises.recordExerciseIfComplete() || changed;
      const progress = this.core.exercise.progress();
      const key = `${progress.status}|${progress.headline}|${progress.note}|${progress.checks.map((c) => (c.done ? 1 : 0)).join("")}|${progress.figures.map((f) => f.value).join(",")}`;
      if (
        key !== this.core.lastProgressKey &&
        (sample.time - this.core.lastProgressEmit >= PROGRESS_EMIT_INTERVAL_S || progress.status === "complete")
      ) {
        this.core.lastProgressKey = key;
        this.core.lastProgressEmit = sample.time;
        changed = true;
      }
    }
    if (changed) this.core.emit();
  }

  private reactToSimEvent(event: SimEvent): boolean {
    switch (event.type) {
      case "recall-complete": {
        // Home is the camera's mechanical centre, easily mistaken for the show's safe-wide shot.
        const firstHome = event.target.kind === "home" && !this.core.homeExplained;
        if (event.target.kind === "home") this.core.homeExplained = true;
        this.core.announce(
          event.target.kind === "home"
            ? firstHome
              ? "Home reached. Home is not the FMP safe-wide shot: frame that shot and store it as a preset."
              : "Home reached."
            : `Preset ${event.target.slot} reached.`,
          "success",
        );
        this.persistence.scheduleSave();
        return true;
      }
      case "recall-interrupted":
        if (event.reason === "manual") {
          this.core.announce(
            `${event.target.kind === "home" ? "Home" : `Preset ${event.target.slot}`} interrupted by manual control.`,
          );
          return true;
        }
        return false;
      case "limit":
        this.core.announce(
          `${
            event.axis === "lens"
              ? event.side === "max"
                ? "Full tele"
                : "Full wide"
              : `${event.axis === "pan" ? "Pan" : "Tilt"} limit`
          } reached.`,
          "warn",
        );
        return true;
      default:
        return false;
    }
  }
}
