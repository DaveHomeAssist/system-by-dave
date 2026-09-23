import type { AvWorkbook } from "./types";

export type LaunchContext = Partial<Pick<AvWorkbook["show"], "showName" | "venue" | "targetDate">>;

export interface LaunchContextChange {
  field: keyof LaunchContext;
  label: string;
  current: string;
  incoming: string;
}

function cleanParam(params: URLSearchParams, key: string, limit: number): string {
  return String(params.get(key) || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

export function readLaunchContext(search: string): LaunchContext {
  const params = new URLSearchParams(search);
  const showName = cleanParam(params, "sbdShow", 120);
  const venue = cleanParam(params, "sbdVenue", 120);
  const targetDate = cleanParam(params, "sbdDate", 20);
  return {
    ...(showName ? { showName } : {}),
    ...(venue ? { venue } : {}),
    ...(targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? { targetDate } : {})
  };
}

export function launchContextChanges(workbook: AvWorkbook, context: LaunchContext): LaunchContextChange[] {
  const fields: { field: keyof LaunchContext; label: string }[] = [
    { field: "showName", label: "Show name" },
    { field: "venue", label: "Venue" },
    { field: "targetDate", label: "Show date" }
  ];
  return fields.flatMap(({ field, label }) => {
    const incoming = context[field];
    if (!incoming || workbook.show[field] === incoming) return [];
    return [{ field, label, current: workbook.show[field], incoming }];
  });
}

export function withLaunchContext(workbook: AvWorkbook, changes: LaunchContextChange[]): AvWorkbook {
  const show = { ...workbook.show };
  for (const change of changes) show[change.field] = change.incoming;
  return { ...workbook, show };
}
