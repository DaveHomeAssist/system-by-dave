import { defaultProject, type Project, parseProjectText, serializeProject } from "../domain/project";
import { formatIssues } from "../domain/validate";

// Browser storage keeps the session between visits. The key starts with "fmp" so the
// housevideo.app saved-data transfer carries it (scripts/domain-sites.json storage prefixes).
export const STORAGE_KEY = "fmpCameraSim.v1";
export const UNREADABLE_KEY = "fmpCameraSim.v1.unreadable";

export type StorageStatus =
  | { state: "ok"; savedAt: string | null }
  | { state: "unavailable"; reason: string };

export interface LoadResult {
  project: Project;
  status: StorageStatus;
  /** Shown once when a saved session could not be restored. */
  notice: string | null;
}

/** Returns browser storage, or null when access itself throws (blocked or sandboxed). */
export function browserStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    // Some browsers expose storage but throw on first use.
    storage.getItem(STORAGE_KEY);
    return storage;
  } catch {
    return null;
  }
}

export function loadProject(storage: Storage | null): LoadResult {
  if (!storage) {
    return {
      project: defaultProject(),
      status: { state: "unavailable", reason: "This browser is blocking storage for this page." },
      notice: null,
    };
  }
  let text: string | null;
  try {
    text = storage.getItem(STORAGE_KEY);
  } catch {
    return {
      project: defaultProject(),
      status: { state: "unavailable", reason: "Browser storage could not be read." },
      notice: null,
    };
  }
  if (text === null) return { project: defaultProject(), status: { state: "ok", savedAt: null }, notice: null };
  const parsed = parseProjectText(text);
  if (parsed.ok) return { project: parsed.project, status: { state: "ok", savedAt: null }, notice: null };
  // Keep the unreadable copy under its own timestamped key, so a later failure cannot overwrite
  // an earlier one, then start fresh.
  const backupKey = `${UNREADABLE_KEY}.${Date.now()}`;
  let kept = false;
  try {
    storage.setItem(backupKey, text);
    kept = true;
  } catch {
    /* The fresh session still works; the notice says the copy could not be kept. */
  }
  return {
    project: defaultProject(),
    status: { state: "ok", savedAt: null },
    notice: `The saved session could not be restored (${formatIssues(parsed.issues, 2)}). A fresh session was started. ${
      kept ? `The old copy was kept in browser storage under ${backupKey}.` : "Browser storage was too full to keep a copy of the old session."
    }`,
  };
}

export function saveProject(storage: Storage | null, project: Project, now = new Date()): StorageStatus {
  if (!storage) return { state: "unavailable", reason: "This browser is blocking storage for this page." };
  try {
    storage.setItem(STORAGE_KEY, serializeProject(project, now.toISOString()));
    return { state: "ok", savedAt: now.toISOString() };
  } catch {
    return { state: "unavailable", reason: "Browser storage is full or blocked, so changes are not being saved." };
  }
}
