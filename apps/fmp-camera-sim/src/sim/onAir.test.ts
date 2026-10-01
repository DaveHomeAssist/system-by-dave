import { describe, expect, it } from "vitest";
import { describeTake, OnAirTracker } from "./onAir";

const still = { pan: 0, tilt: 0, lens: 0 };
const panning = { pan: 30, tilt: 40, lens: 0 };
const zooming = { pan: 0, tilt: 0, lens: 0.2 };

describe("OnAirTracker", () => {
  it("reports a clean take when nothing moves", () => {
    const tracker = new OnAirTracker();
    tracker.take();
    for (let i = 0; i < 30; i++) expect(tracker.sample(1 / 30, false, still)).toBeNull();
    const stats = tracker.getStats();
    expect(stats.moves).toBe(0);
    expect(stats.liveS).toBeCloseTo(1, 6);
    expect(describeTake(stats)).toContain("Clean take");
  });

  it("counts separate moves, zoom moves and the peak speed", () => {
    const tracker = new OnAirTracker();
    tracker.take();
    expect(tracker.sample(0.1, true, panning)).toEqual({ type: "move-started", zoom: false, first: true });
    expect(tracker.sample(0.1, true, panning)).toBeNull(); // same move
    tracker.sample(0.1, false, still);
    expect(tracker.sample(0.1, true, zooming)).toEqual({ type: "move-started", zoom: true, first: false });
    tracker.sample(0.1, true, zooming); // still one zoom move
    const stats = tracker.getStats();
    expect(stats.moves).toBe(2);
    expect(stats.zoomMoves).toBe(1);
    expect(stats.peakDegS).toBeCloseTo(50, 6);
    expect(stats.movingS).toBeCloseTo(0.4, 6);
    expect(describeTake(stats)).toMatch(/2 moves on air, 1 with zoom, fastest 50°\/s/);
  });

  it("counts a camera already moving at the take, and resets on the next take", () => {
    const tracker = new OnAirTracker();
    tracker.take();
    tracker.sample(0.1, true, panning);
    tracker.take();
    expect(tracker.getStats().moves).toBe(0);
    expect(tracker.sample(0.1, true, panning)?.first).toBe(true);
  });
});
