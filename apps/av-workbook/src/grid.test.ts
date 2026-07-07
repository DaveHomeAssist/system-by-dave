import { describe, expect, it } from "vitest";
import { applyDelimitedPaste, filterRows, sortRows, updateGridCell, type GridColumn } from "./grid";

interface Row {
  id: string;
  name: string;
  role: string;
  status: string;
}

const columns: GridColumn<Row>[] = [
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" }
];

const rows: Row[] = [
  { id: "1", name: "Avery", role: "A1", status: "draft" },
  { id: "2", name: "Mara", role: "V1", status: "ready" }
];

describe("grid mechanics", () => {
  it("updates one cell without mutating other rows", () => {
    const next = updateGridCell(rows, "1", "role", "Audio Lead");
    expect(next[0].role).toBe("Audio Lead");
    expect(next[1]).toEqual(rows[1]);
    expect(rows[0].role).toBe("A1");
  });

  it("filters across visible row values", () => {
    expect(filterRows(rows, "mara")).toHaveLength(1);
    expect(filterRows(rows, "v1")[0].name).toBe("Mara");
  });

  it("sorts with numeric-aware text comparison", () => {
    expect(sortRows(rows, "name", "desc").map((row) => row.name)).toEqual(["Mara", "Avery"]);
  });

  it("pastes tab-delimited cells from a starting cell", () => {
    const next = applyDelimitedPaste(rows, columns, "1", "role", "Lead A1\tready_for_show\nLead V1\tissue");
    expect(next[0]).toMatchObject({ role: "Lead A1", status: "ready_for_show" });
    expect(next[1]).toMatchObject({ role: "Lead V1", status: "issue" });
  });
});
