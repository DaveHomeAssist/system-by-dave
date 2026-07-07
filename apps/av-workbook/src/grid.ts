export type CellValue = string | number | boolean | undefined;

export interface GridColumn<T extends { id: string }> {
  key: keyof T & string;
  label: string;
  width?: string;
  options?: readonly string[];
}

export function updateGridCell<T extends { id: string }>(
  rows: readonly T[],
  rowId: string,
  key: keyof T & string,
  value: CellValue
): T[] {
  return rows.map((row) => (row.id === rowId ? { ...row, [key]: value } : row));
}

export function addGridRow<T extends { id: string }>(rows: readonly T[], createRow: () => T): T[] {
  return [...rows, createRow()];
}

export function filterRows<T extends { id: string }>(rows: readonly T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...rows];
  return rows.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(needle)));
}

export function sortRows<T extends { id: string }>(rows: readonly T[], key: keyof T & string, direction: "asc" | "desc"): T[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = String(a[key] ?? "").toLowerCase();
    const bv = String(b[key] ?? "").toLowerCase();
    return av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" }) * sign;
  });
}

export function parseDelimitedRows(text: string): string[][] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split("\t"));
}

export function applyDelimitedPaste<T extends { id: string }>(
  rows: readonly T[],
  columns: readonly GridColumn<T>[],
  startRowId: string,
  startKey: keyof T & string,
  text: string
): T[] {
  const matrix = parseDelimitedRows(text);
  if (!matrix.length) return [...rows];
  const startRowIndex = Math.max(0, rows.findIndex((row) => row.id === startRowId));
  const startColumnIndex = Math.max(0, columns.findIndex((column) => column.key === startKey));
  const next = rows.map((row) => ({ ...row }));

  matrix.forEach((line, lineIndex) => {
    const rowIndex = startRowIndex + lineIndex;
    if (!next[rowIndex]) return;
    line.forEach((cell, cellIndex) => {
      const column = columns[startColumnIndex + cellIndex];
      if (!column) return;
      next[rowIndex] = { ...next[rowIndex], [column.key]: cell };
    });
  });

  return next;
}
