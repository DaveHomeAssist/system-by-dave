import { MONITOR_DELAY_LIMIT_MS } from "../domain/session";
import { SIM_HZ, type PtzPose } from "./ptz";

// The monitor delay line. A real P240 picture reaches the monitor after encoding, the NDI or SDI
// path and the switcher, so what the operator sees trails what the head is doing. The simulation
// keeps the true pose; this line keeps the recent poses so the monitor can show the one from
// `delayMs` ago. It is uncalibrated: the default is no delay, and any value is a training setting.

/** Longest delay the monitor can simulate, milliseconds. */
export const MONITOR_DELAY_MAX_MS = MONITOR_DELAY_LIMIT_MS;

/** Poses kept: the longest delay at the simulation rate, plus a margin. */
const CAPACITY = Math.ceil((MONITOR_DELAY_MAX_MS / 1000) * SIM_HZ) + 8;

interface Entry {
  time: number;
  pan: number;
  tilt: number;
  lens: number;
}

export class PoseDelayLine {
  private readonly entries: Entry[] = [];
  private head = 0;
  private size = 0;

  constructor() {
    for (let i = 0; i < CAPACITY; i++) this.entries.push({ time: 0, pan: 0, tilt: 0, lens: 0 });
  }

  /** Record the pose at simulation time `time`, seconds. Time running backwards clears the line. */
  push(time: number, pose: PtzPose): void {
    if (this.size > 0 && time < this.newest().time) this.clear();
    const entry = this.entries[this.head];
    entry.time = time;
    entry.pan = pose.pan;
    entry.tilt = pose.tilt;
    entry.lens = pose.lens;
    this.head = (this.head + 1) % CAPACITY;
    this.size = Math.min(this.size + 1, CAPACITY);
  }

  clear(): void {
    this.size = 0;
  }

  /**
   * The newest recorded pose no later than `now - delayMs`. With no delay, or nothing recorded,
   * returns `fallback` (the live pose). With too little history, returns the oldest pose kept.
   */
  sample(now: number, delayMs: number, fallback: PtzPose): PtzPose {
    if (delayMs <= 0 || this.size === 0) return fallback;
    const target = now - Math.min(delayMs, MONITOR_DELAY_MAX_MS) / 1000;
    for (let i = 1; i <= this.size; i++) {
      const entry = this.entries[(this.head - i + CAPACITY) % CAPACITY];
      if (entry.time <= target + 1e-9) return { pan: entry.pan, tilt: entry.tilt, lens: entry.lens };
    }
    const oldest = this.entries[(this.head - this.size + CAPACITY) % CAPACITY];
    return { pan: oldest.pan, tilt: oldest.tilt, lens: oldest.lens };
  }

  private newest(): Entry {
    return this.entries[(this.head - 1 + CAPACITY) % CAPACITY];
  }
}
