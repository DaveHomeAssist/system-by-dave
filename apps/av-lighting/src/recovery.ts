import { useEffect, useRef, useState } from "react";
import { createDraftSession, draftSnapshot, DRAFT_INDEX, readLayout, writeLayout, type DraftResult, type LayoutState } from "../../shared/av-console/drafts";
import { DRAFT_KEY, LAYOUT_KEY, parsePlan, type Plan } from "./model";

export function useRecovery(doc: Plan, dirty: boolean, baseline: string | null, initial: Plan, update: (doc: Plan) => void, notify: (message: string) => void, canRestore: () => boolean) {
  const current = useRef(doc);
  current.current = doc;
  const [errors, setErrors] = useState<Record<string, string>>({});
  function report(result: DraftResult) {
    if (!result.ok && !result.error) return;
    setErrors(e => ({ ...e, draft: result.error || "", index: result.indexChecked ? result.indexError || "" : e.index || "" }));
  }
  const [layout] = useState(() => {
    let stored = null;
    try { stored = readLayout(localStorage, LAYOUT_KEY); } catch { /* Writes report failures below. */ }
    return { initial: stored, save: (state: LayoutState) => {
      let ok = false;
      try { ok = writeLayout(localStorage, LAYOUT_KEY, state); } catch { /* Report without blocking edits. */ }
      setErrors(e => ({ ...e, layout: ok ? "" : "Layout could not be saved. This arrangement is available for this visit only." }));
    } };
  });
  const [recovery] = useState(() => {
    try {
      const snapshot = draftSnapshot(localStorage, DRAFT_KEY, "lighting", parsePlan);
      const lock = navigator.locks ? (action: () => DraftResult) => navigator.locks.request(DRAFT_INDEX, action) : undefined;
      return { snapshot, session: createDraftSession(localStorage, DRAFT_KEY, "lighting", snapshot, lock) };
    } catch { return { snapshot: { raw: null, draft: null, error: "Draft recovery unavailable. Export edits before leaving." }, session: null }; }
  });
  const [offer, setOffer] = useState(() => recovery.snapshot.draft && JSON.stringify(recovery.snapshot.draft.doc) !== JSON.stringify(initial) ? recovery.snapshot.draft : null);
  useEffect(() => {
    if (!recovery.session || !recovery.snapshot.draft || JSON.stringify(recovery.snapshot.draft.doc) !== JSON.stringify(initial)) return;
    // A prior tab may have saved and exited before its draft cleanup completed.
    // Claim only the exact matching snapshot under the shared lock, then clear.
    void recovery.session.restore().then(async result => {
      if (!result.ok || current.current !== initial) { report(result); return; }
      report(await recovery.session!.sync(initial, baseline, false, "Lighting"));
    });
  }, [recovery, initial]);
  useEffect(() => {
    if (recovery.snapshot.error) { report({ ok: false, error: recovery.snapshot.error }); return; }
    if (offer) {
      if (dirty) report({ ok: false, error: "An earlier draft awaits review. Export current edits before restoring or leaving." });
      return;
    }
    const timer = setTimeout(() => { void recovery.session?.sync(doc, baseline, dirty, "Lighting").then(report); }, 400);
    return () => clearTimeout(timer);
  }, [doc, dirty, baseline, offer, recovery]);
  async function restore() {
    if (!offer || !recovery.session) return;
    if (dirty || !canRestore()) { notify("Apply and export current edits before restoring a draft. Reload to review recovery without replacing edits."); return; }
    const before = current.current;
    const result = await recovery.session.restore(); report(result);
    if (!result.ok) return;
    if (current.current !== before || !canRestore()) { notify("Edits changed while recovery was waiting. Apply and export them before restoring."); return; }
    update(offer.doc); setOffer(null); notify("Draft restored as unsaved edits. Save to keep it on this device.");
  }
  async function discard() {
    const result = await recovery.session?.discard();
    if (!result) return;
    report(result);
    if (result.ok) { setOffer(null); notify("Draft discarded. The saved plan is unchanged."); }
  }
  async function saved(next: Plan, raw: string) {
    if (!recovery.session || offer) return;
    report(await recovery.session.sync(next, raw, false, "Lighting"));
  }
  return { layout, offer, restore, discard, saved, errors: Object.values(errors).filter(Boolean) };
}
