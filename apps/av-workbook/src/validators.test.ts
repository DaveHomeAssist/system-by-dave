import { describe, expect, it } from "vitest";
import { createBlankWorkbook, createSampleWorkbook } from "./sampleWorkbook";
import { validateWorkbook } from "./store";
import { validateAudio, validatePower, validateRf, validateWorkbookIssues } from "./validators";

describe("workbook validators", () => {
  it("creates a valid blank workbook without demo operations", () => {
    const workbook = validateWorkbook(createBlankWorkbook());
    expect(workbook.show.showName).toBe("Untitled AV Workbook");
    expect(workbook.operators).toEqual([]);
    expect(workbook.rooms).toEqual([]);
    expect(workbook.auditEvents).toEqual([]);
  });

  it("flags duplicate hard audio targets", () => {
    const workbook = createSampleWorkbook();
    const audio = validateAudio(workbook);
    expect(audio.some((issue) => issue.severity === "red" && /multiple hard targets/.test(issue.message))).toBe(true);
  });

  it("flags power circuits above the 80 percent load gate", () => {
    const workbook = createSampleWorkbook();
    const power = validatePower(workbook);
    expect(power.some((issue) => issue.category === "power" && issue.severity === "red")).toBe(true);
  });

  it("flags RF guard-band conflicts and unscanned channels", () => {
    const workbook = createSampleWorkbook();
    const rf = validateRf(workbook);
    expect(rf.some((issue) => /guard band/.test(issue.message))).toBe(true);
    expect(rf.some((issue) => /not scan verified/.test(issue.message))).toBe(true);
  });

  it("returns deterministic issue ids for the same workbook state", () => {
    const a = validateWorkbookIssues(createSampleWorkbook()).map((issue) => issue.id);
    const b = validateWorkbookIssues(createSampleWorkbook()).map((issue) => issue.id);
    expect(a).toEqual(b);
  });
});
