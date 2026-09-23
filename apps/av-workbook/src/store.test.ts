import { describe, expect, it } from "vitest";
import { createBlankWorkbook } from "./sampleWorkbook";
import { importWorkbook } from "./store";

describe("workbook JSON import", () => {
  it("rejects fields the current schema would silently discard", () => {
    const workbook = createBlankWorkbook();
    expect(() => importWorkbook(JSON.stringify({ ...workbook, show: { ...workbook.show, clientContact: "Keep me" } })))
      .toThrow(/Unsupported workbook fields: show.clientContact/);
  });

  it("accepts the current exported shape", () => {
    const workbook = createBlankWorkbook();
    expect(importWorkbook(JSON.stringify(workbook))).toEqual(workbook);
  });
});
