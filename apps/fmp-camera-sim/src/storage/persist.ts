import { defaultProject, exportedAtOf, type Project, parseProjectText, serializeProject } from "../domain/project";
import { formatIssues } from "../domain/validate";
import { deriveVenueGeometry } from "../domain/venue";

// Browser storage keeps the session between visits. The key starts with "fmp" so the
// housevideo.app saved-data transfer carries it (scripts/domain-sites.json storage prefixes).
export const STORAGE_KEY = "fmpCameraSim.v1";
export const UNREADABLE_KEY = "fmpCameraSim.v1.unreadable";
/** Unreadable copies kept at most. Older ones are removed so repeated failures cannot fill storage. */
export const MAX_UNREADABLE_COPIES = 3;

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

/** Keys of the kept unreadable copies, newest first (the suffix is the time they were kept). */
export function unreadableCopies(storage: Storage): string[] {
  const keys: string[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(`${UNREADABLE_KEY}.`)) keys.push(key);
    }
  } catch {
    return [];
  }
  const kept = (key: string) => Number(key.slice(UNREADABLE_KEY.length + 1)) || 0;
  return keys.sort((a, b) => kept(b) - kept(a));
}

/**
 * Keeps `text` under a new timestamped key, after removing the oldest copies so at most
 * MAX_UNREADABLE_COPIES remain. Returns the new key, or null when storage refused the copy.
 */
function keepUnreadableCopy(storage: Storage, text: string, now = Date.now()): string | null {
  for (const key of unreadableCopies(storage).slice(MAX_UNREADABLE_COPIES - 1)) {
    try {
      storage.removeItem(key);
    } catch {
      /* Best effort: a copy that cannot be removed only costs space. */
    }
  }
  const backupKey = `${UNREADABLE_KEY}.${now}`;
  try {
    storage.setItem(backupKey, text);
    return backupKey;
  } catch {
    return null;
  }
}

/**
 * Moves the saved session aside: keeps it as an unreadable copy, then removes it so the next
 * visit starts fresh. Returns the copy's key, or null (and leaves the session in place) when
 * storage has no room for the copy.
 */
export function setAsideSavedSession(storage: Storage | null): string | null {
  if (!storage) return null;
  let text: string | null;
  try {
    text = storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (text === null) return null;
  const backupKey = keepUnreadableCopy(storage, text);
  if (backupKey === null) return null;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    /* The copy is kept; the next save replaces the old session anyway. */
  }
  return backupKey;
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
  // A file that parses but whose venue cannot be built is as unusable as one that does not parse.
  const geometry = parsed.ok ? deriveVenueGeometry(parsed.project.venue) : null;
  if (parsed.ok && geometry?.ok) {
    return { project: parsed.project, status: { state: "ok", savedAt: exportedAtOf(text) }, notice: null };
  }
  const issues = !parsed.ok ? parsed.issues : geometry && !geometry.ok ? geometry.issues : [];
  // Keep the unreadable copy under its own timestamped key, then clear the saved session so the
  // next visit does not trip over it again. Without room for the copy it stays where it is,
  // until this session is saved over it.
  const backupKey = keepUnreadableCopy(storage, text);
  if (backupKey !== null) {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      /* The next save replaces it. */
    }
  }
  return {
    project: defaultProject(),
    status: { state: "ok", savedAt: null },
    notice: `The saved session could not be restored (${formatIssues(issues, 2)}). A fresh session was started. ${
      backupKey !== null
        ? `The old copy was kept in browser storage under ${backupKey}.`
        : "Browser storage was too full to keep a copy of the old session."
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
