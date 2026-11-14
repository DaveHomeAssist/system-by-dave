/* Some browsers refuse site storage outright (every cookie blocked, some
   private and embedded contexts). Reading window.localStorage then throws, and
   every pack reads it while it mounts, so the console rendered nothing at all.

   The shell checks once, before anything mounts. When storage is refused it
   gives the page a stand-in that holds nothing and refuses every write: reads
   see an empty browser, and each save, draft and layout write fails through the
   handling the packs already have for full storage, so nothing is reported as
   kept. App.tsx tells the operator; main.tsx covers a browser where even the
   stand-in cannot be installed. */
export type StorageState = "ok" | "blocked" | "unusable";

const refused: Storage = {
  get length() { return 0; },
  clear() {},
  getItem() { return null; },
  key() { return null; },
  removeItem() {},
  setItem() { throw new DOMException("This browser is blocking site storage.", "QuotaExceededError"); },
};

function readable(): boolean {
  try { void window.localStorage; return true; } catch { return false; }
}

function check(): StorageState {
  if (readable()) return "ok";
  try { Object.defineProperty(window, "localStorage", { configurable: true, value: refused }); } catch { /* reported as unusable */ }
  return readable() ? "blocked" : "unusable";
}

export const storageState: StorageState = check();
