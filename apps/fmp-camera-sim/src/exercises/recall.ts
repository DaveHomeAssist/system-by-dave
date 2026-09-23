import { type CameraProfile, lensState } from "../domain/camera";
import { type ExerciseSettings, type Preset } from "../domain/session";
import { type PtzPose } from "../sim/ptz";
import { type Exercise, type ExerciseEvent, type ExerciseProgress, type ExerciseSample } from "./types";

type Step = "store-a" | "store-b" | "move-away" | "recall";

export interface PoseDistance {
  /** Largest pan or tilt difference, degrees. */
  angleDeg: number;
  /** Ratio of the wider to the narrower horizontal field of view. */
  fovRatio: number;
}

export function poseDistance(profile: CameraProfile, a: PtzPose, b: PtzPose): PoseDistance {
  const fovA = lensState(profile, a.lens).hfovDeg;
  const fovB = lensState(profile, b.lens).hfovDeg;
  return {
    angleDeg: Math.max(Math.abs(a.pan - b.pan), Math.abs(a.tilt - b.tilt)),
    fovRatio: Math.max(fovA, fovB) / Math.min(fovA, fovB),
  };
}

const presetPose = (preset: Preset): PtzPose => ({ pan: preset.pan, tilt: preset.tilt, lens: preset.lens });

export function isDistinct(profile: CameraProfile, a: PtzPose, b: PtzPose, settings: ExerciseSettings["recall"]): boolean {
  const d = poseDistance(profile, a, b);
  return d.angleDeg >= settings.distinctDeg || d.fovRatio >= settings.distinctFovRatio;
}

export interface Landing {
  slot: number;
  panTiltDeviationDeg: number;
  lensDeviation: number;
  ok: boolean;
}

export function landingFor(preset: Preset, landed: PtzPose, settings: ExerciseSettings["recall"]): Landing {
  const panTiltDeviationDeg = Math.max(Math.abs(landed.pan - preset.pan), Math.abs(landed.tilt - preset.tilt));
  const lensDeviation = Math.abs(landed.lens - preset.lens);
  return {
    slot: preset.slot,
    panTiltDeviationDeg,
    lensDeviation,
    ok: panTiltDeviationDeg <= settings.panTiltToleranceDeg && lensDeviation <= settings.lensTolerance,
  };
}

export class RecallExercise implements Exercise {
  readonly id = "recall" as const;
  private step: Step = "store-a";
  private a: Preset | null = null;
  private b: Preset | null = null;
  private landings = new Map<number, Landing>();
  private note = "";
  private startTime: number | null = null;
  private lastTime = 0;
  private done: ExerciseProgress["result"] = null;

  performerTime(): number | null {
    return null;
  }

  sample(s: ExerciseSample): void {
    if (this.startTime === null) this.startTime = s.time;
    this.lastTime = s.time;
    if (this.done || this.step !== "move-away" || !this.a || !this.b) return;
    const settings = s.settings.recall;
    const away = (preset: Preset) => {
      const d = poseDistance(s.profile, s.pose, presetPose(preset));
      return d.angleDeg >= settings.moveAwayDeg || d.fovRatio >= settings.distinctFovRatio;
    };
    if (away(this.a) && away(this.b)) {
      this.step = "recall";
      this.note = "";
    }
  }

  handleEvent(event: ExerciseEvent, s: ExerciseSample): void {
    if (this.done) return;
    const settings = s.settings.recall;
    if (event.type === "preset-stored") {
      const preset = event.preset;
      if (this.step === "store-a") {
        this.a = preset;
        this.step = "store-b";
        this.note = `Shot A stored in preset ${preset.slot}.`;
        return;
      }
      if (this.step === "store-b" && this.a) {
        if (preset.slot === this.a.slot) {
          this.a = preset;
          this.note = `Preset ${preset.slot} replaced shot A. Store shot B in a different slot.`;
          return;
        }
        if (!isDistinct(s.profile, presetPose(this.a), presetPose(preset), settings)) {
          this.note = `Too close to shot A. Change pan or tilt by ${settings.distinctDeg}° or the field of view by ${settings.distinctFovRatio}×, then store again.`;
          return;
        }
        this.b = preset;
        this.step = "move-away";
        this.note = `Shot B stored in preset ${preset.slot}. Now move away from both shots.`;
        return;
      }
      // Re-storing A or B after that point replaces it and asks for a fresh recall.
      if (this.a && preset.slot === this.a.slot) this.a = preset;
      else if (this.b && preset.slot === this.b.slot) this.b = preset;
      else return;
      this.landings.delete(preset.slot);
      this.step = "move-away";
      this.note = `Preset ${preset.slot} was stored again. Move away, then recall both shots.`;
      return;
    }
    if (event.type === "recall-interrupted" && event.target.kind === "preset" && this.step === "recall") {
      this.note = `Recall of preset ${event.target.slot} was interrupted. Recall it again without touching the controls.`;
      return;
    }
    if (event.type !== "recall-complete" || event.target.kind !== "preset" || this.step !== "recall" || !this.a || !this.b) return;
    const slot = event.target.slot;
    const preset = slot === this.a.slot ? this.a : slot === this.b.slot ? this.b : null;
    if (!preset) {
      this.note = `Preset ${slot} is not part of this exercise. Recall preset ${this.a.slot} and preset ${this.b.slot}.`;
      return;
    }
    const landing = landingFor(preset, event.pose, settings);
    this.landings.set(slot, landing);
    this.note = landing.ok
      ? `Preset ${slot} landed within tolerance.`
      : `Preset ${slot} landed ${landing.panTiltDeviationDeg.toFixed(2)}° away, outside the ${settings.panTiltToleranceDeg}° tolerance.`;
    const la = this.landings.get(this.a.slot);
    const lb = this.landings.get(this.b.slot);
    if (la?.ok && lb?.ok) {
      const elapsed = s.time - (this.startTime ?? s.time);
      this.done = {
        exercise: "recall",
        passed: true,
        summary: `Both shots recalled within tolerance (presets ${this.a.slot} and ${this.b.slot}) in ${elapsed.toFixed(1)} s.`,
        metrics: {
          elapsedS: Number(elapsed.toFixed(2)),
          maxPanTiltDeviationDeg: Number(Math.max(la.panTiltDeviationDeg, lb.panTiltDeviationDeg).toFixed(4)),
          maxLensDeviation: Number(Math.max(la.lensDeviation, lb.lensDeviation).toFixed(5)),
          presetA: this.a.slot,
          presetB: this.b.slot,
        },
      };
    }
  }

  progress(): ExerciseProgress {
    const a = this.a;
    const b = this.b;
    const landed = (preset: Preset | null) => Boolean(preset && this.landings.get(preset.slot)?.ok);
    const checks = [
      { label: a ? `Shot A stored (preset ${a.slot})` : "Store shot A in a preset", done: Boolean(a) },
      { label: b ? `Shot B stored (preset ${b.slot})` : "Store a different shot B in another preset", done: Boolean(b) },
      { label: "Move away from both shots", done: this.step === "recall" || Boolean(this.done) },
      { label: a ? `Recall preset ${a.slot} within tolerance` : "Recall shot A", done: landed(a) },
      { label: b ? `Recall preset ${b.slot} within tolerance` : "Recall shot B", done: landed(b) },
    ];
    const headlines: Record<Step, string> = {
      "store-a": "Frame shot A, then store it in a preset slot.",
      "store-b": "Frame a clearly different shot B, then store it in another slot.",
      "move-away": "Move the camera away from both stored shots.",
      recall: "Recall both presets. Keep your hands off the controls while each recall runs.",
    };
    return {
      id: "recall",
      status: this.done ? "complete" : "running",
      headline: this.done ? "Complete. Both shots recalled within tolerance." : headlines[this.step],
      note: this.done ? "" : this.note,
      checks,
      figures: [{ label: "Elapsed", value: `${Math.max(0, this.lastTime - (this.startTime ?? this.lastTime)).toFixed(0)} s` }],
      result: this.done,
    };
  }
}
