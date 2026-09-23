import { describe, expect, it } from "vitest";
import { createBlankWorkbook } from "./sampleWorkbook";
import { launchContextChanges, readLaunchContext, withLaunchContext } from "./launchContext";

describe("launch context", () => {
  it("treats URL values as a bounded offer without mutating the workbook", () => {
    const workbook = createBlankWorkbook();
    const original = { ...workbook.show };
    const context = readLaunchContext("?sbdShow=  Harbor%20Gala  &sbdVenue=Pier%2068&sbdDate=2026-10-09&sbdOperator=CAM%201");
    const changes = launchContextChanges(workbook, context);

    expect(changes.map(({ label, incoming }) => [label, incoming])).toEqual([
      ["Show name", "Harbor Gala"], ["Venue", "Pier 68"], ["Show date", "2026-10-09"]
    ]);
    expect(workbook.show).toEqual(original);
    expect(withLaunchContext(workbook, changes).show).toMatchObject({ showName: "Harbor Gala", venue: "Pier 68", targetDate: "2026-10-09" });
    expect(workbook.show).toEqual(original);
  });

  it("ignores malformed dates and absent values", () => {
    const workbook = createBlankWorkbook();
    expect(launchContextChanges(workbook, readLaunchContext("?sbdDate=tomorrow&sbdShow=%20"))).toEqual([]);
  });
});
