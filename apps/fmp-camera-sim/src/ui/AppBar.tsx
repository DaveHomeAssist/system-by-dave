import { type StoreState } from "../app/store";
import { type Theme } from "../app/theme";
import { type PanelTab } from "./SidePanel";
import { keepFocus } from "./keepFocus";

interface Props {
  state: StoreState;
  theme: Theme;
  drawerOpen: boolean;
  drawerTab: PanelTab;
  showPanelButtons: boolean;
  onOpen(tab: PanelTab, opener: HTMLElement): void;
  onHelp(): void;
  onToggleTheme(): void;
}

/** Title, the persistent evidence flags, panel shortcuts and the theme toggle. */
export function AppBar({ state, theme, drawerOpen, drawerTab, showPanelButtons, onOpen, onHelp, onToggleTheme }: Props) {
  const approximate = state.unsettled.length > 0;
  const exercise = state.exercise;
  return (
    <header className="sim-bar">
      <div className="sim-title">
        <h1>Camera Simulator</h1>
        <p>Virtual BirdDog P240 · Camera 4 · catwalk position</p>
        <p className="sim-scope">Framing, zoom, and presets only — not SuperJoy or focus</p>
      </div>
      <div className="sim-flags" role="group" aria-label="Accuracy">
        <button
          type="button"
          className={`flag ${approximate ? "flag-warn" : "flag-ok"}`}
          onClick={(event) => onOpen("venue", event.currentTarget)}
          title={approximate ? `Not yet measured: ${state.unsettled.join(", ")}` : "All critical venue dimensions are measured or confirmed"}
          data-testid="flag-venue"
        >
          <span className="flag-label">{approximate ? "Approximate venue" : "Measured venue"}</span>
          {approximate && <span className="flag-count">{state.unsettled.length}</span>}
        </button>
        <button
          type="button"
          className={`flag ${state.calibrated ? "flag-ok" : "flag-warn"}`}
          onClick={(event) => onOpen("camera", event.currentTarget)}
          title={state.calibrated ? "Camera behaviour calibrated" : "Response, stopping and preset travel are training assumptions"}
          data-testid="flag-camera"
        >
          <span className="flag-label">{state.calibrated ? "Calibrated camera" : "Uncalibrated camera"}</span>
        </button>
        {exercise && exercise.progress.status === "running" && (
          <button type="button" className="flag flag-live" onClick={(event) => onOpen("exercises", event.currentTarget)}>
            <span className="flag-label">Exercise running</span>
          </button>
        )}
      </div>
      <nav className="sim-actions" aria-label="Simulator panels">
        {showPanelButtons && (
          <>
            <button
              type="button"
              className="tool-button"
              aria-pressed={drawerOpen && drawerTab === "exercises"}
              onClick={(event) => onOpen("exercises", event.currentTarget)}
            >
              Exercises
            </button>
            <button
              type="button"
              className="tool-button"
              aria-pressed={drawerOpen && drawerTab !== "exercises"}
              onClick={(event) => onOpen(drawerTab === "exercises" ? "venue" : drawerTab, event.currentTarget)}
            >
              Settings
            </button>
          </>
        )}
        <button type="button" className="tool-button" onClick={onHelp} aria-label="Help and keyboard shortcuts">
          Help
        </button>
        <button {...keepFocus} type="button" className="tool-button theme-button" aria-pressed={theme === "dark"} onClick={onToggleTheme}>
          Dark mode
        </button>
      </nav>
    </header>
  );
}
