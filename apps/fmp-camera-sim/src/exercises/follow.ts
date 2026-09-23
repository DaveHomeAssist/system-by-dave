import { insideArea, project, stageToWorld } from "../sim/framing";
import { CHEST_FRACTION } from "../sim/performer";
import { type Exercise, type ExerciseProgress, type ExerciseSample } from "./types";

/** Framing error recorded for a performer who is off frame or behind the lens. */
const OFF_FRAME_ERROR = 2;

export interface FollowEvaluation {
  /** Chest position in the frame, -1..1 each axis. */
  x: number;
  y: number;
  visible: boolean;
  inBox: boolean;
  /** Performer's height as a percentage of the frame height. */
  sizePct: number;
  sizeOk: boolean;
  onTarget: boolean;
  /** Distance of the chest from frame centre; 1 = a frame edge on the horizontal axis. */
  error: number;
}

export function evaluateFollow(s: ExerciseSample): FollowEvaluation {
  const { performer, frame, settings } = s;
  const base = performer.position;
  const chest = project(frame, stageToWorld({ ...base, height: performer.height * CHEST_FRACTION }));
  const head = project(frame, stageToWorld({ ...base, height: performer.height }));
  const feet = project(frame, stageToWorld({ ...base, height: 0 }));
  const visible = chest.inFront && Math.abs(chest.x) <= 1 && Math.abs(chest.y) <= 1;
  const sizePct = head.inFront && feet.inFront ? ((head.y - feet.y) / 2) * 100 : 0;
  const f = settings.follow;
  const inBox = insideArea(chest, f.targetWidthPct / 100, f.targetHeightPct / 100);
  const sizeOk = sizePct >= f.minHeightPct && sizePct <= f.maxHeightPct;
  const error = chest.inFront ? Math.min(OFF_FRAME_ERROR, Math.hypot(chest.x, chest.y)) : OFF_FRAME_ERROR;
  return { x: chest.x, y: chest.y, visible, inBox, sizePct, sizeOk, onTarget: inBox && sizeOk, error };
}

export class FollowExercise implements Exercise {
  readonly id = "follow" as const;
  private startTime: number | null = null;
  private countdownS = 3;
  private elapsedS = 0;
  private onTargetS = 0;
  private lostS = 0;
  private errorIntegral = 0;
  private errorSquaredIntegral = 0;
  private maxError = 0;
  private trackedS = 0;
  private passPct = 70;
  private last: FollowEvaluation | null = null;
  private done: ExerciseProgress["result"] = null;

  /** @param durationS one loop of the performer's path */
  constructor(private readonly durationS: number) {}

  performerTime(time: number): number | null {
    if (this.startTime === null) return 0;
    return Math.min(this.durationS, Math.max(0, time - this.startTime - this.countdownS));
  }

  sample(s: ExerciseSample): void {
    if (this.done) return;
    if (this.startTime === null) {
      this.startTime = s.time;
      this.countdownS = s.settings.follow.countdownS;
    }
    this.passPct = s.settings.follow.passPct;
    this.elapsedS = s.time - this.startTime;
    const walking = this.elapsedS - this.countdownS;
    if (walking < 0) return;
    if (walking >= this.durationS) {
      this.finish();
      return;
    }
    const evaluation = evaluateFollow(s);
    this.last = evaluation;
    this.trackedS += s.dt;
    if (evaluation.onTarget) this.onTargetS += s.dt;
    if (!evaluation.visible) this.lostS += s.dt;
    this.errorIntegral += evaluation.error * s.dt;
    this.errorSquaredIntegral += evaluation.error * evaluation.error * s.dt;
    this.maxError = Math.max(this.maxError, evaluation.error);
  }

  handleEvent(): void {
    /* Tracking is judged from the frame alone. */
  }

  evaluation(): FollowEvaluation | null {
    return this.last;
  }

  private finish(): void {
    const tracked = Math.max(this.trackedS, 1e-9);
    const onTargetPct = (this.onTargetS / tracked) * 100;
    const meanError = this.errorIntegral / tracked;
    const rmsError = Math.sqrt(this.errorSquaredIntegral / tracked);
    const passed = onTargetPct + 1e-9 >= this.passPct;
    this.done = {
      exercise: "follow",
      passed,
      summary: `${passed ? "Passed" : "Not yet"}: on target ${onTargetPct.toFixed(0)}% of the walk (training target ${this.passPct}%). Mean framing error ${(meanError * 100).toFixed(0)}% of half-frame; performer out of frame for ${this.lostS.toFixed(1)} s.`,
      metrics: {
        onTargetPct: Number(onTargetPct.toFixed(1)),
        meanErrorPct: Number((meanError * 100).toFixed(1)),
        rmsErrorPct: Number((rmsError * 100).toFixed(1)),
        maxErrorPct: Number((this.maxError * 100).toFixed(1)),
        lostS: Number(this.lostS.toFixed(2)),
        durationS: Number(this.durationS.toFixed(2)),
      },
    };
  }

  progress(): ExerciseProgress {
    const walking = this.elapsedS - this.countdownS;
    const tracked = Math.max(this.trackedS, 1e-9);
    const onTargetPct = this.trackedS > 0 ? (this.onTargetS / tracked) * 100 : 0;
    let headline: string;
    if (this.done) headline = this.done.passed ? "Complete. Tracking passed." : "Complete. Replay to improve the time on target.";
    else if (this.startTime === null || walking < 0) headline = `Get ready. The performer starts in ${Math.max(0, Math.ceil(this.countdownS - this.elapsedS))} s.`;
    else if (this.last && !this.last.visible) headline = "Performer out of frame. Find them.";
    else if (this.last && !this.last.sizeOk) headline = this.last.sizePct < 1 ? "Performer not visible." : `Adjust size: performer is ${this.last.sizePct.toFixed(0)}% of frame height.`;
    else if (this.last && !this.last.inBox) headline = "Re-centre the performer's chest in the target box.";
    else headline = "On target. Keep following.";
    return {
      id: "follow",
      status: this.done ? "complete" : "running",
      headline,
      note: "",
      checks: [],
      figures: [
        { label: "Walk", value: `${Math.min(this.durationS, Math.max(0, walking)).toFixed(0)} / ${this.durationS.toFixed(0)} s` },
        { label: "On target", value: `${onTargetPct.toFixed(0)}%` },
        { label: "Framing error", value: this.last ? `${(this.last.error * 100).toFixed(0)}%` : "—" },
      ],
      result: this.done,
    };
  }
}
