import { type RenderStatus } from "../app/store";

/** Shown instead of the picture when WebGL is unavailable or lost. Never a frozen frame. */
export function GraphicsFallback({ status, note }: { status: RenderStatus; note: string }) {
  if (status === "lost") {
    return (
      <div className="graphics-fallback" role="alert">
        <strong>Picture paused: the browser reset its graphics.</strong>
        <p>This is not a live view. Camera motion was stopped. The picture returns when the browser restores graphics; reload the page if it does not.</p>
      </div>
    );
  }
  return (
    <div className="graphics-fallback" role="alert">
      <strong>3D view unavailable.</strong>
      <p>
        This browser could not start WebGL, which the simulator needs to draw the camera picture and venue view. Turn on hardware
        acceleration or use a current version of Chrome, Edge, Firefox or Safari. The controls and readouts still work, but there is
        no picture.
      </p>
      {note && <p className="fallback-detail">Details: {note}</p>}
    </div>
  );
}
