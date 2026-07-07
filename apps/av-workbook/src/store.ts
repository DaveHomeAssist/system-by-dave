import Dexie, { type Table } from "dexie";
import { avWorkbookSchema } from "./workbookSchema";
import { createSampleWorkbook } from "./sampleWorkbook";
import type { AvWorkbook } from "./types";

const ACTIVE_KEY = "system-by-dave.av-workbook.active.v1";
const FALLBACK_KEY = "system-by-dave.av-workbook.fallback.v1";

class WorkbookDb extends Dexie {
  workbooks!: Table<AvWorkbook, string>;

  constructor() {
    super("system-by-dave-av-workbook");
    this.version(1).stores({
      workbooks: "workbookId, savedAt, show.showName, show.targetDate"
    });
  }
}

const db = new WorkbookDb();

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const probe = "__sbd_av_workbook_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function validateWorkbook(value: unknown): AvWorkbook {
  return avWorkbookSchema.parse(value) as AvWorkbook;
}

export async function loadActiveWorkbook(): Promise<AvWorkbook> {
  const storage = safeLocalStorage();
  const activeId = storage?.getItem(ACTIVE_KEY);
  if (activeId) {
    try {
      const found = await db.workbooks.get(activeId);
      if (found) return validateWorkbook(found);
    } catch {
      const fallback = storage?.getItem(FALLBACK_KEY);
      if (fallback) return validateWorkbook(JSON.parse(fallback));
    }
  }

  const seeded = createSampleWorkbook();
  await saveWorkbook(seeded);
  return seeded;
}

export async function saveWorkbook(workbook: AvWorkbook): Promise<AvWorkbook> {
  const next = validateWorkbook({ ...workbook, savedAt: new Date().toISOString() });
  const storage = safeLocalStorage();
  try {
    await db.workbooks.put(next);
    storage?.setItem(ACTIVE_KEY, next.workbookId);
  } catch {
    storage?.setItem(FALLBACK_KEY, JSON.stringify(next));
    storage?.setItem(ACTIVE_KEY, next.workbookId);
  }
  return next;
}

export function exportWorkbook(workbook: AvWorkbook): string {
  return JSON.stringify(validateWorkbook(workbook), null, 2);
}

export function importWorkbook(text: string): AvWorkbook {
  return validateWorkbook(JSON.parse(text));
}

export function downloadText(filename: string, text: string, type = "application/json;charset=utf-8"): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
