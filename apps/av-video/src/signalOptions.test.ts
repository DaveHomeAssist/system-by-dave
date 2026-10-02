import { expect, it } from "vitest";
import { CONNECTOR_GROUPS, customFormat, isPresetFormat, savedLedTiming } from "./signalOptions";
const wall = { ledMode: "layout", ledCabinetRotation: "0", ledCabinetPixelsWide: 256, ledCabinetPixelsHigh: 128, ledCabinetWidthMm: 500, ledCabinetHeightMm: 250, ledCabinetsWide: 12, ledCabinetsHigh: 4, ledRefreshHz: 59.94, ledProductName: "Test wall" };
it("offers distinct broadcast rates and fixed common connector choices", () => {
  expect(isPresetFormat("1080p59.94")).toBe(true); expect(isPresetFormat("1080p60")).toBe(true);
  expect(isPresetFormat("2160p50")).toBe(true); expect(isPresetFormat("1920x1200p60")).toBe(true);
  expect(CONNECTOR_GROUPS.flatMap(g => g.values)).toEqual(expect.arrayContaining(["HDMI", "DisplayPort", "3G SDI", "12G SDI", "DVI-D"]));
});
it("keeps custom LED raster dimensions exact and rejects incomplete or invalid timings", () => {
  expect(customFormat(3072, 512, 59.94)).toBe("3072x512p59.94");
  expect(() => customFormat(1920.5, 1080, 60)).toThrow();
  expect(() => customFormat("", 1080, 60)).toThrow();
  expect(() => customFormat(1920, 1080, Infinity)).toThrow();
});
it("reads native LED raster with rotation and whole-cabinet target rounding", () => {
  expect(savedLedTiming(JSON.stringify(wall)).format).toBe("3072x512p59.94");
  expect(savedLedTiming(JSON.stringify({ ...wall, ledCabinetRotation: "90" })).format).toBe("1536x1024p59.94");
  expect(savedLedTiming(JSON.stringify({ ...wall, ledMode: "targetRaster", ledTargetWidthPx: 1920, ledTargetHeightPx: 1080 })).format).toBe("2048x1152p59.94");
  expect(savedLedTiming(JSON.stringify({ ...wall, ledMode: "targetSize", ledTargetWidthFt: 10, ledTargetHeightFt: 5 })).format).toBe("1792x896p59.94");
});
it("does not invent a wall from missing, malformed or partial calculator data", () => {
  expect(() => savedLedTiming(null)).toThrow("No saved");
  expect(() => savedLedTiming("[]")).toThrow();
  expect(() => savedLedTiming(JSON.stringify({ ...wall, ledCabinetPixelsHigh: null }))).toThrow("only one");
  expect(() => savedLedTiming(JSON.stringify({ ...wall, ledRefreshHz: null }))).toThrow("incomplete");
  expect(() => savedLedTiming(JSON.stringify({ ...wall, ledCabinetsWide: 1.5 }))).toThrow("whole");
});
