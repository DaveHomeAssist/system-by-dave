import { type KeyboardEvent, useEffect, useRef } from "react";
import { type SimulatorStore, type StoreState } from "../app/store";
import { CameraSettings } from "./CameraSettings";
import { ExercisesPanel } from "./ExercisesPanel";
import { PerformerSettings } from "./PerformerSettings";
import { SessionPanel } from "./SessionPanel";
import { VenueSettings } from "./VenueSettings";

export type PanelTab = "exercises" | "venue" | "camera" | "performer" | "session";

export const PANEL_TABS: Array<{ id: PanelTab; label: string }> = [
  { id: "exercises", label: "Exercises" },
  { id: "venue", label: "Venue" },
  { id: "camera", label: "Camera" },
  { id: "performer", label: "Performer" },
  { id: "session", label: "Session" },
];

interface Props {
  store: SimulatorStore;
  state: StoreState;
  open: boolean;
  docked: boolean;
  tab: PanelTab;
  tabs?: PanelTab[];
  onTab(tab: PanelTab): void;
  onClose(): void;
}

/** Settings and exercises. Opens over the workspace, or docks as a column on ultrawide screens. */
export function SidePanel({ store, state, open, docked, tab, tabs, onTab, onClose }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const available = PANEL_TABS.filter((t) => !tabs || tabs.includes(t.id));

  useEffect(() => {
    if (open && !docked) headingRef.current?.focus({ preventScroll: true });
  }, [open, docked]);

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % available.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + available.length) % available.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = available.length - 1;
    else return;
    event.preventDefault();
    onTab(available[next].id);
    const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
  };

  return (
    <aside
      ref={panelRef}
      className="side-panel"
      data-open={open}
      data-docked={docked}
      aria-labelledby="side-panel-title"
      hidden={!open}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !docked) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="side-head">
        <h2 id="side-panel-title" ref={headingRef} tabIndex={-1}>
          {PANEL_TABS.find((t) => t.id === tab)?.label}
        </h2>
        {!docked && (
          <button type="button" className="tool-button" onClick={onClose}>
            Close
          </button>
        )}
      </div>
      <div className="side-tabs" role="tablist" aria-label="Simulator settings">
        {available.map((t, index) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`tabpanel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => onTab(t.id)}
            onKeyDown={(event) => onTabKey(event, index)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="side-body" role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "exercises" && <ExercisesPanel store={store} state={state} />}
        {tab === "venue" && <VenueSettings store={store} state={state} />}
        {tab === "camera" && <CameraSettings store={store} state={state} />}
        {tab === "performer" && <PerformerSettings store={store} state={state} />}
        {tab === "session" && <SessionPanel store={store} state={state} />}
      </div>
    </aside>
  );
}
