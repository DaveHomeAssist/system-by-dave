import type { ReactNode } from "react";
import type { LayoutState } from "./drafts";
import type { Panel, PanelDef, View } from "./layout";
import type { PanelRender } from "./Workspace";

/* Panel pack (docs/av-suite-shell.md). An application exposes everything its
   standalone page held except the workspace and page chrome: its document,
   recovery, actions and a renderer for its own short panel types. The suite
   shell mounts every pack in one workspace and namespaces the types; the
   application's standalone host mounts the same hook around its own
   workspace. The hook never reads or writes another application's data. */

export type PackHost = {
  /* Bring one of this pack's panels forward, by its short type. */
  show: (type: string) => boolean;
  /* Report status text; `error` marks it as a problem. */
  notify: (text: string, error?: boolean) => void;
  /* Clear device-local arrangement state after a document replacement. */
  resetLayout: () => void;
  /* Short types of this pack's panels currently on screen, and the mode. */
  panels: () => string[];
  mode: () => "phone" | "tablet" | "desktop";
};

export type PackRecovery = {
  offer: { at: string; baseline: string | null } | null;
  restore: () => void | Promise<void>;
  discard: () => void | Promise<void>;
  errors: string[];
};

export type Pack = {
  id: string;
  label: string;
  /* Document identity for the header: title and a one-line summary. */
  title: string;
  summary: string;
  dirty: boolean;
  /* Saved data is unreadable; editing waits for explicit recovery. */
  blocked: boolean;
  /* Input is held outside the document (unapplied forms); Save waits for it. */
  pending?: boolean;
  save: () => void | Promise<void>;
  exportDoc: () => void;
  status: string;
  problem: boolean;
  /* Show a message in this pack's status line (the standalone host routes
     workspace messages here). */
  notify: (text: string, error?: boolean) => void;
  recovery: PackRecovery;
  render: (type: string, panel: Panel) => PanelRender;
  /* Dialogs that must stay mounted while the pack is live. */
  dialogs?: ReactNode;
  /* Extra header controls, such as undo and redo. */
  actions?: ReactNode;
  quick: { type: string; label: string; badge?: number }[];
  /* Current library: packs with optional modules hide disabled panels. */
  library: PanelDef[];
  /* Stored views from the pack's own document, for its standalone host. */
  views: View[];
  storeViews: (views: View[], text: string) => void;
  /* Device-local layout persistence for the standalone host. */
  layout?: { initial: LayoutState | null; save: (state: LayoutState) => void };
};

export type PackDef = {
  id: string;
  label: string;
  /* Rail identity (`console:<id>` in the registry) that recalls this pack. */
  consoleId: string;
  library: PanelDef[];
  defaultViews: View[];
  use: (host: PackHost) => Pack;
};

export const CONTEXT_KEYS = ["sbdShow", "sbdVenue", "sbdDate", "sbdOperator", "sbdPhase"] as const;

/* Read-only show context from the page query; never written back. */
export function showContext(search = typeof location === "undefined" ? "" : location.search) {
  const params = new URLSearchParams(search);
  return CONTEXT_KEYS.map(key => params.get(key)?.slice(0, 200)).filter(Boolean).join(" · ");
}

export function download(name: string, raw: string, mime = "application/json") {
  const url = URL.createObjectURL(new Blob([raw], { type: mime }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const errorText = (error: unknown, fallback = "Operation failed. Export your work before leaving.") => error instanceof Error ? error.message : fallback;
