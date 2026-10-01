import { type PtzPose } from "./ptz";

// On-air discipline. While the camera is taken to program (tally lit), a visible reframe is an
// on-air mistake: the audience sees the move. The tracker counts separate moves, zoom moves and
// the fastest pan/tilt speed while live, from the simulation's own samples, so the count is the
// same at any frame rate. These are training figures, not a broadcast standard.

const EPS = 1e-6;

export interface OnAirStats {
  /** Separate camera moves (any axis) that started or continued while live. */
  moves: number;
  /** Moves that included a zoom. */
  zoomMoves: number;
  /** Fastest combined pan/tilt speed while live, degrees per second. */
  peakDegS: number;
  /** Time spent moving while live, seconds. */
  movingS: number;
  /** Time live, seconds. */
  liveS: number;
}

export type OnAirEvent = { type: "move-started"; zoom: boolean; first: boolean } | null;

export function emptyOnAirStats(): OnAirStats {
  return { moves: 0, zoomMoves: 0, peakDegS: 0, movingS: 0, liveS: 0 };
}

export class OnAirTracker {
  private stats = emptyOnAirStats();
  private inMove = false;
  private moveHasZoom = false;

  /** Start a fresh take. A camera already moving at the take counts as a move on air. */
  take(): void {
    this.clear();
  }

  /** Forget the current take, for example when the session it belonged to is replaced. */
  clear(): void {
    this.stats = emptyOnAirStats();
    this.inMove = false;
    this.moveHasZoom = false;
  }

  /** One simulation sample while live. Returns the start of a new move, for the status line. */
  sample(dt: number, moving: boolean, velocity: PtzPose): OnAirEvent {
    this.stats.liveS += dt;
    const zooming = Math.abs(velocity.lens) > EPS;
    let event: OnAirEvent = null;
    if (moving) {
      if (!this.inMove) {
        this.inMove = true;
        this.moveHasZoom = false;
        this.stats.moves += 1;
        event = { type: "move-started", zoom: zooming, first: this.stats.moves === 1 };
      }
      if (zooming && !this.moveHasZoom) {
        this.moveHasZoom = true;
        this.stats.zoomMoves += 1;
      }
      this.stats.movingS += dt;
      const speed = Math.hypot(velocity.pan, velocity.tilt);
      if (speed > this.stats.peakDegS) this.stats.peakDegS = speed;
    } else {
      this.inMove = false;
    }
    return event;
  }

  getStats(): OnAirStats {
    return { ...this.stats };
  }
}

/** One line for the status line when the camera leaves program. */
export function describeTake(stats: OnAirStats): string {
  const seconds = `${stats.liveS.toFixed(0)} s live`;
  if (stats.moves === 0) return `Off air after ${seconds}. Clean take: the camera held still while live.`;
  const moves = `${stats.moves} move${stats.moves === 1 ? "" : "s"} on air`;
  const zoom = stats.zoomMoves > 0 ? `, ${stats.zoomMoves} with zoom` : "";
  return `Off air after ${seconds}. ${moves}${zoom}, fastest ${stats.peakDegS.toFixed(0)}°/s. Reframe on preview, not on program.`;
}
