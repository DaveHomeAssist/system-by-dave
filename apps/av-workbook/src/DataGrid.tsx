import { useMemo, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { addGridRow, applyDelimitedPaste, filterRows, sortRows, updateGridCell, type CellValue, type GridColumn } from "./grid";

interface DataGridProps<T extends { id: string }> {
  title: string;
  description: string;
  rows: T[];
  columns: GridColumn<T>[];
  createRow: () => T;
  onRowsChange: (rows: T[]) => void;
}

type SortState<T extends { id: string }> = {
  key: keyof T & string;
  direction: "asc" | "desc";
};

function normalizeValue(value: CellValue): string {
  if (value === undefined) return "";
  return String(value);
}

export function DataGrid<T extends { id: string }>({ title, description, rows, columns, createRow, onRowsChange }: DataGridProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState<T> | null>(null);
  const visibleRows = useMemo(() => {
    const filtered = filterRows(rows, query);
    return sort ? sortRows(filtered, sort.key, sort.direction) : filtered;
  }, [query, rows, sort]);

  function commitCell(rowId: string, key: keyof T & string, value: string) {
    onRowsChange(updateGridCell(rows, rowId, key, value));
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>, rowId: string, key: keyof T & string) {
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return;
    event.preventDefault();
    onRowsChange(applyDelimitedPaste(rows, columns, rowId, key, text));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>, rowIndex: number, columnIndex: number) {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Tab"].includes(event.key)) return;
    const target = event.currentTarget as HTMLElement;
    const table = target.closest("[data-grid-root]");
    if (!table) return;
    let nextRow = rowIndex;
    let nextColumn = columnIndex;
    if (event.key === "ArrowUp") nextRow -= 1;
    if (event.key === "ArrowDown" || event.key === "Enter") nextRow += 1;
    if (event.key === "ArrowLeft") nextColumn -= 1;
    if (event.key === "ArrowRight" || event.key === "Tab") nextColumn += event.shiftKey ? -1 : 1;
    nextRow = Math.max(0, Math.min(visibleRows.length - 1, nextRow));
    nextColumn = Math.max(0, Math.min(columns.length - 1, nextColumn));
    const selector = `[data-grid-cell="${nextRow}:${nextColumn}"]`;
    const next = table.querySelector<HTMLElement>(selector);
    if (next && next !== target) {
      event.preventDefault();
      next.focus();
      if (next instanceof HTMLInputElement) next.select();
    }
  }

  function toggleSort(key: keyof T & string) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: "asc" };
      return { key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  }

  return (
    <section className="grid-panel" data-grid-root>
      <div className="grid-panel-head">
        <div>
          <p className="kicker">Shared grid</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="grid-tools">
          <input aria-label={`Search ${title}`} placeholder="Search rows" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button type="button" onClick={() => onRowsChange(addGridRow(rows, createRow))}>Add Row</button>
        </div>
      </div>
      <div className="grid-scroll" role="region" aria-label={`${title} editable grid`}>
        <table className="workbook-grid">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} style={{ width: column.width }}>
                  <button type="button" onClick={() => toggleSort(column.key)}>
                    {column.label}
                    {sort?.key === column.key ? <span>{sort.direction === "asc" ? "Asc" : "Desc"}</span> : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={row.id}>
                {columns.map((column, columnIndex) => (
                  <td key={column.key}>
                    {column.options ? (
                      <select
                        data-grid-cell={`${rowIndex}:${columnIndex}`}
                        value={normalizeValue(row[column.key] as CellValue)}
                        onChange={(event) => commitCell(row.id, column.key, event.target.value)}
                        onKeyDown={(event) => handleKeyDown(event, rowIndex, columnIndex)}
                        onPaste={(event) => handlePaste(event, row.id, column.key)}
                      >
                        {column.options.map((option) => (
                          <option key={option} value={option}>{option.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        data-grid-cell={`${rowIndex}:${columnIndex}`}
                        value={normalizeValue(row[column.key] as CellValue)}
                        onChange={(event) => commitCell(row.id, column.key, event.target.value)}
                        onKeyDown={(event) => handleKeyDown(event, rowIndex, columnIndex)}
                        onPaste={(event) => handlePaste(event, row.id, column.key)}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
