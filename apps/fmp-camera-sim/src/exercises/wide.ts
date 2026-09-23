import { type ExerciseSettings } from "../domain/session";
import { type StagePoint, type VenueGeometry } from "../domain/venue";
import { type CameraFrame, insideArea, project, type Projection, stageToWorld } from "../sim/framing";
import { type Exercise, type ExerciseProgress, type ExerciseSample } from "./types";

/** Height checked above the upstage marks: a standing performer's head. */
export const WIDE_HEAD_HEIGHT_M = 2;

export interface WideMarker {
  id: string;
  label: string;
  /** Compact label drawn on the monitor, where markers can sit close together. */
  short: string;
  point: StagePoint;
}

export function wideShotMarkers(geometry: VenueGeometry): WideMarker[] {
  const half = geometry.stageWidth / 2;
  const mark = (id: string) => geometry.marks.find((m) => m.id === id)?.point ?? { right: 0, upstage: 0, height: 0 };
  return [
    { id: "dsr-corner", label: "DSR corner", short: "DSR", point: { right: half, upstage: 0, height: 0 } },
    { id: "dsl-corner", label: "DSL corner", short: "DSL", point: { right: -half, upstage: 0, height: 0 } },
    { id: "usr-head", label: "USR head height", short: "USR", point: { ...mark("USR"), height: WIDE_HEAD_HEIGHT_M } },
    { id: "usc-head", label: "USC head height", short: "USC", point: { ...mark("USC"), height: WIDE_HEAD_HEIGHT_M } },
    { id: "usl-head", label: "USL head height", short: "USL", point: { ...mark("USL"), height: WIDE_HEAD_HEIGHT_M } },
  ];
}

export interface WideEvaluation {
  markers: Array<WideMarker & { projection: Projection; inside: boolean }>;
  allInside: boolean;
  insideCount: number;
  /** Width of the downstage edge as a percentage of the frame width. */
  stageFillPct: number;
}

export function evaluateWide(frame: CameraFrame, geometry: VenueGeometry, settings: ExerciseSettings["wide"]): WideEvaluation {
  const safe = settings.safeAreaPct / 100;
  const markers = wideShotMarkers(geometry).map((marker) => {
    const projection = project(frame, stageToWorld(marker.point));
    return { ...marker, projection, inside: insideArea(projection, safe) };
  });
  const [dsr, dsl] = markers;
  const stageFillPct =
    dsr.projection.inFront && dsl.projection.inFront ? (Math.abs(dsr.projection.x - dsl.projection.x) / 2) * 100 : 0;
  const insideCount = markers.filter((m) => m.inside).length;
  return { markers, allInside: insideCount === markers.length, insideCount, stageFillPct };
}

export class WideShotExercise implements Exercise {
  readonly id = "wide" as const;
  private startTime: number | null = null;
  private steadyS = 0;
  private done: ExerciseProgress["result"] = null;
  private last: WideEvaluation | null = null;
  private lastMoving = false;
  private holdS = 1;
  private minFill = 55;

  performerTime(): number | null {
    return null;
  }

  sample(s: ExerciseSample): void {
    if (this.done) return;
    if (this.startTime === null) this.startTime = s.time;
    this.holdS = s.settings.wide.holdS;
    this.minFill = s.settings.wide.minStageFillPct;
    const evaluation = evaluateWide(s.frame, s.geometry, s.settings.wide);
    this.last = evaluation;
    this.lastMoving = s.moving;
    const framed = evaluation.allInside && evaluation.stageFillPct >= this.minFill;
    const steady = framed && !s.moving;
    this.steadyS = steady ? this.steadyS + s.dt : 0;
    // Completion needs the shot framed and still on this sample, even with a zero hold time.
    if (steady && this.steadyS + 1e-9 >= this.holdS) {
      const elapsed = s.time - this.startTime;
      this.done = {
        exercise: "wide",
        passed: true,
        summary: `Wide shot held in ${elapsed.toFixed(1)} s. The downstage edge fills ${evaluation.stageFillPct.toFixed(0)}% of the frame and every marker is inside the ${s.settings.wide.safeAreaPct}% safe area.`,
        metrics: {
          elapsedS: Number(elapsed.toFixed(2)),
          stageFillPct: Number(evaluation.stageFillPct.toFixed(1)),
          hfovDeg: Number(s.frame.hfovDeg.toFixed(2)),
          panDeg: Number(s.pose.pan.toFixed(2)),
          tiltDeg: Number(s.pose.tilt.toFixed(2)),
        },
      };
    }
  }

  handleEvent(): void {
    /* The wide shot only looks at the frame. */
  }

  evaluation(): WideEvaluation | null {
    return this.last;
  }

  progress(): ExerciseProgress {
    const e = this.last;
    const checks = e
      ? [
          ...e.markers.map((m) => ({ label: `${m.label} inside safe area`, done: m.inside })),
          { label: `Downstage edge fills at least ${this.minFill}% of frame`, done: e.stageFillPct >= this.minFill },
        ]
      : [];
    let headline = "Frame the whole performance area.";
    if (this.done) headline = "Complete. The wide shot is established.";
    else if (e && !e.allInside) headline = `Bring every marker inside the safe area (${e.insideCount} of ${e.markers.length} inside).`;
    else if (e && e.stageFillPct < this.minFill) headline = `Tighten: the stage fills ${e.stageFillPct.toFixed(0)}% of the frame; aim for ${this.minFill}% or more.`;
    else if (e && this.lastMoving) headline = "Framed. Stop moving to lock the shot.";
    else if (e) headline = `Holding… ${Math.min(this.steadyS, this.holdS).toFixed(1)} of ${this.holdS.toFixed(1)} s.`;
    return {
      id: "wide",
      status: this.done ? "complete" : "running",
      headline,
      note: "",
      checks,
      figures: e ? [{ label: "Stage fill", value: `${e.stageFillPct.toFixed(0)}%` }] : [],
      result: this.done,
    };
  }
}
