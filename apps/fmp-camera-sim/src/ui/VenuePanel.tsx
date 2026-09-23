import { type RefObject } from "react";
import { type StoreState } from "../app/store";
import { type OverviewPreset } from "../render/renderer";
import { GraphicsFallback } from "./GraphicsFallback";
import { focusWorkspace, keepFocus } from "./keepFocus";

interface Props {
  state: StoreState;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  shown: boolean;
  quality: number;
  cutaway: boolean;
  onCutaway(): void;
  onToggle(): void;
  onView(view: OverviewPreset): void;
}

const VIEWS: Array<{ view: OverviewPreset; label: string }> = [
  { view: "house", label: "House" },
  { view: "top", label: "Top" },
  { view: "side", label: "Side elevation" },
  { view: "behind", label: "Behind camera" },
  { view: "lawn", label: "Lawn" },
];

export function VenuePanel({ state, canvasRef, shown, quality, cutaway, onCutaway, onToggle, onView }: Props) {
  return (
    <section className="panel venue-panel" aria-labelledby="venue-title" data-shown={shown}>
      <div className="panel-head">
        <h2 id="venue-title">Venue view</h2>
        {shown && quality > 0 && (
          <span className="quality-chip" title="The venue view is drawn with less detail on this device so the camera controls stay responsive.">
            Reduced detail
          </span>
        )}
        <div className="panel-tools">
          {shown && <button {...keepFocus} type="button" className="tool-button" aria-pressed={cutaway} onClick={onCutaway}>Shell cutaway</button>}
          {shown &&
            VIEWS.map(({ view, label }) => (
              <button key={view} {...keepFocus} type="button" className="tool-button" onClick={() => onView(view)}>
                {label}
              </button>
            ))}
          <button {...keepFocus} type="button" className="tool-button" aria-expanded={shown} aria-controls="venue-stage" onClick={onToggle}>
            {shown ? "Collapse" : "Show venue view"}
          </button>
        </div>
      </div>
      <div className="venue-stage" id="venue-stage" hidden={!shown}>
        <canvas
          ref={canvasRef}
          onPointerDown={focusWorkspace}
          className="venue-canvas"
          role="img"
          aria-label="Venue overview showing the stage, pit, seating bowl, catwalk, Camera 4 and its viewing cone"
          data-testid="venue-canvas"
        />
        <p className="venue-hint">Drag to orbit · scroll or pinch to zoom · orbiting never moves the camera</p>
        <ul className="venue-legend" aria-label="Legend">
          <li>
            <span className="swatch swatch-cone" aria-hidden="true" /> What Camera 4 sees
          </li>
          <li>
            <span className="swatch swatch-cam" aria-hidden="true" /> P240, physical scale
          </li>
          <li>
            <span className="swatch swatch-schematic" aria-hidden="true" /> Venue and show geometry are provisional
          </li>
        </ul>
        {state.renderStatus !== "ok" && state.renderStatus !== "starting" && <GraphicsFallback status={state.renderStatus} note={state.renderNote} />}
      </div>
    </section>
  );
}
