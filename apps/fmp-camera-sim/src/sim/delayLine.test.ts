import { describe, expect, it } from "vitest";
import { MONITOR_DELAY_MAX_MS, PoseDelayLine } from "./delayLine";
import { SIM_STEP } from "./ptz";

const live = { pan: 99, tilt: 99, lens: 1 };

function filled(seconds: number): PoseDelayLine {
  const line = new PoseDelayLine();
  const ticks = Math.round(seconds / SIM_STEP);
  // Pan equals the tick number, so a sample names the tick it came from.
  for (let tick = 1; tick <= ticks; tick++) line.push(tick * SIM_STEP, { pan: tick, tilt: 0, lens: 0 });
  return line;
}

describe("PoseDelayLine", () => {
  it("returns the live pose with no delay or no history", () => {
    expect(filled(1).sample(1, 0, live)).toEqual(live);
    expect(new PoseDelayLine().sample(1, 100, live)).toEqual(live);
  });

  it("returns the pose from the delay ago, to the tick", () => {
    const line = filled(1); // ticks 1..240, now = tick 240
    expect(line.sample(240 * SIM_STEP, 100, live).pan).toBe(216); // 100 ms = 24 ticks
    expect(line.sample(240 * SIM_STEP, 250, live).pan).toBe(180); // 250 ms = 60 ticks
  });

  it("caps the delay at the maximum", () => {
    const line = filled(2);
    const now = 480 * SIM_STEP;
    expect(line.sample(now, 5000, live)).toEqual(line.sample(now, MONITOR_DELAY_MAX_MS, live));
    expect(line.sample(now, MONITOR_DELAY_MAX_MS, live).pan).toBe(360);
  });

  it("holds the oldest pose while history is shorter than the delay", () => {
    const line = filled(0.05); // 12 ticks
    expect(line.sample(12 * SIM_STEP, 400, live).pan).toBe(1);
  });

  it("clears when time runs backwards (a new simulator)", () => {
    const line = filled(1);
    line.push(SIM_STEP, { pan: -5, tilt: 0, lens: 0 });
    expect(line.sample(SIM_STEP, 100, live).pan).toBe(-5);
  });
});
