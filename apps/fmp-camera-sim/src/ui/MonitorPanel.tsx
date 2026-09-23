import { type RefObject } from "react";
import { useTelemetry } from "../app/hooks";
import { type SimulatorStore, type StoreState } from "../app/store";
import { formatSigned } from "../domain/units";
import { type GuidePreferences } from "../domain/session";
import { GraphicsFallback } from "./GraphicsFallback";
import { focusWorkspace, keepFocus } from "./keepFocus";

interface Props {
  state: StoreState;
  store: SimulatorStore;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  overlayRef: RefObject<SVGSVGElement | null>;
  expanded: boolean;
  onToggleExpanded(): void;
  onGuides(patch: Partial<GuidePreferences>): void;
}

const GUIDE_BUTTONS: Array<{ key: keyof GuidePreferences; label: string }> = [
  { key: "safeArea", label: "Safe area" },
  { key: "centre", label: "Centre" },
  { key: "thirds", label: "Thirds" },
];

export function MonitorPanel({ state, store, canvasRef, overlayRef, expanded, onToggleExpanded, onGuides }: Props) {
  // Live figures refresh this panel alone, not the whole interface.
  const { snapshot, lens } = useTelemetry(store);
  const { pose, recall, atLimit, speeds } = snapshot;
  const guides = state.project.session.preferences.guides;
  const approximate = state.unsettled.length > 0;
  const limitText = [
    atLimit.pan && `Pan ${atLimit.pan === "max" ? "right" : "left"} limit`,
    atLimit.tilt && `Tilt ${atLimit.tilt === "max" ? "up" : "down"} limit`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="panel monitor-panel" aria-labelledby="monitor-title">
      <div className="panel-head">
        <h2 id="monitor-title">Camera monitor</h2>
        <div className="panel-tools" role="group" aria-label="Monitor guides">
          {GUIDE_BUTTONS.map(({ key, label }) => (
            <button key={key} {...keepFocus} type="button" className="tool-button" aria-pressed={guides[key]} onClick={() => onGuides({ [key]: !guides[key] })}>
              {label}
            </button>
          ))}
          <button {...keepFocus} type="button" className="tool-button" aria-pressed={expanded} onClick={onToggleExpanded} title="F">
            {expanded ? "Restore layout" : "Expand monitor"}
          </button>
        </div>
      </div>
      <div className="monitor-stage">
        <div className="monitor-frame" data-render={state.renderStatus} onPointerDown={focusWorkspace}>
          <canvas ref={canvasRef} className="monitor-canvas" role="img" aria-label="Live picture from the simulated P240" data-testid="monitor-canvas" />
          <svg ref={overlayRef} className="monitor-overlay" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true" />
          <div className="monitor-osd" aria-hidden="true">
            <span className="osd-chip">SIM · CAM 4 · P240</span>
            <span className="osd-chip osd-warn">
              {approximate ? "APPROX VENUE" : "MEASURED VENUE"} · {state.calibrated ? "CALIBRATED" : "UNCALIBRATED"}
            </span>
          </div>
          {recall && (
            <div className="monitor-recall" aria-hidden="true">
              <span>{recall.target.kind === "home" ? "HOME" : `PRESET ${recall.target.slot}`}</span>
              <span className="recall-bar">
                <span style={{ width: `${(recall.progress * 100).toFixed(0)}%` }} />
              </span>
            </div>
          )}
          {state.renderStatus !== "ok" && state.renderStatus !== "starting" && <GraphicsFallback status={state.renderStatus} note={state.renderNote} />}
          {state.hidden && <div className="monitor-paused">Paused while the page is hidden</div>}
        </div>
      </div>
      <dl className="readout" aria-label="Camera position">
        <div>
          <dt>Pan</dt>
          <dd data-testid="readout-pan">{formatSigned(pose.pan, 1)}°</dd>
        </div>
        <div>
          <dt>Tilt</dt>
          <dd data-testid="readout-tilt">{formatSigned(pose.tilt, 1)}°</dd>
        </div>
        <div>
          <dt>Zoom</dt>
          <dd data-testid="readout-zoom">
            {lens.zoomRatio.toFixed(1)}× <small>{lens.focalMm.toFixed(1)} mm</small>
          </dd>
        </div>
        <div>
          <dt>HFOV</dt>
          <dd data-testid="readout-hfov">{lens.hfovDeg.toFixed(1)}°</dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>
            P{speeds.pan} T{speeds.tilt} Z{speeds.zoom} R{speeds.preset}
          </dd>
        </div>
        <div className="readout-state">
          <dt>State</dt>
          <dd data-testid="readout-state">{snapshot.paused ? "Paused" : recall ? `Recalling ${Math.round(recall.progress * 100)}%` : snapshot.moving ? "Moving" : limitText || "Still"}</dd>
        </div>
      </dl>
    </section>
  );
}
