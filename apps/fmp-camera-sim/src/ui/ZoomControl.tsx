import { type KeyboardEvent, type PointerEvent, useEffect, useRef } from "react";
import { type LensState } from "../domain/camera";
import { eventSeconds, type InputController, nowSeconds } from "../input/controller";
import { keepFocus } from "./keepFocus";

interface Props {
  input: InputController;
  lens: LensState;
  commandedZoom: number;
  /** A T or W press too short to zoom visibly: say that these buttons are held. */
  onShortPress(): void;
}

const BUTTON_RATE = 0.6;
/** Presses shorter than this barely move the lens (0.6 × speed), so they read as a tap. */
const TAP_S = 0.25;

/** Spring-loaded zoom rocker (drag up for tele) plus hold-to-zoom T and W buttons. */
export function ZoomControl({ input, lens, commandedZoom, onShortPress }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const held = useRef<{ direction: "tele" | "wide"; since: number } | null>(null);

  const place = (value: number) => {
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return;
    const travel = track.clientHeight / 2 - knob.clientHeight / 2;
    knob.style.transform = `translateY(${(-value * travel).toFixed(1)}px)`;
  };

  const drive = (event: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return;
    const rect = track.getBoundingClientRect();
    const travel = rect.height / 2 - knob.clientHeight / 2;
    const value = Math.max(-1, Math.min(1, -(event.clientY - (rect.top + rect.height / 2)) / travel));
    place(value);
    input.set("zoomRocker", { zoom: value }, eventSeconds(event.nativeEvent));
  };

  const releaseRocker = (event?: PointerEvent<HTMLDivElement>) => {
    if (event && event.pointerId !== pointer.current) return;
    pointer.current = null;
    trackRef.current?.classList.remove("is-active");
    place(0);
    input.release("zoomRocker", event ? eventSeconds(event.nativeEvent) : nowSeconds());
  };

  const startHold = (direction: "tele" | "wide", wall: number) => {
    held.current = { direction, since: wall };
    input.set("zoomButton", { zoom: direction === "tele" ? BUTTON_RATE : -BUTTON_RATE }, wall);
  };
  const endHold = (wall: number, tapHint = true) => {
    if (held.current === null) return;
    const heldFor = wall - held.current.since;
    held.current = null;
    input.release("zoomButton", wall);
    if (tapHint && heldFor < TAP_S) onShortPress();
  };

  useEffect(
    () => () => {
      input.release("zoomRocker", nowSeconds());
      input.release("zoomButton", nowSeconds());
    },
    [input],
  );

  useEffect(() => {
    if (pointer.current === null) place(commandedZoom);
  }, [commandedZoom]);

  // Leaving the window ends any drag or hold on this control.
  useEffect(() => {
    const onBlur = () => {
      if (pointer.current !== null) releaseRocker();
      endHold(nowSeconds(), false);
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  });

  const holdProps = (direction: "tele" | "wide") => ({
    ...keepFocus,
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      startHold(direction, eventSeconds(event.nativeEvent));
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => endHold(eventSeconds(event.nativeEvent)),
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => endHold(eventSeconds(event.nativeEvent), false),
    onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => endHold(eventSeconds(event.nativeEvent)),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if ((event.key === " " || event.key === "Enter") && !event.repeat) {
        event.preventDefault();
        startHold(direction, eventSeconds(event.nativeEvent));
      }
    },
    onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === " " || event.key === "Enter") endHold(eventSeconds(event.nativeEvent));
    },
    onBlur: () => endHold(nowSeconds(), false),
    onContextMenu: (event: { preventDefault(): void }) => event.preventDefault(),
  });

  return (
    <div className="zoom-control">
      <div className="zoom-row">
        <div className="zoom-buttons">
          <button type="button" className="hold-button" aria-label="Zoom in (tele), hold" {...holdProps("tele")}>
            T
          </button>
          {/* A pointer-only duplicate of T and W, hidden from assistive technology: the held T/W
              buttons, E and Q, and the lens meter are the accessible path. */}
          <div
            ref={trackRef}
            className="zoom-track"
            aria-hidden="true"
            title="Zoom rocker: drag up for tele, down for wide"
            onPointerDown={(event) => {
              if (pointer.current !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
              pointer.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              event.currentTarget.classList.add("is-active");
              event.preventDefault();
              drive(event);
            }}
            onPointerMove={(event) => {
              if (event.pointerId === pointer.current) drive(event);
            }}
            onPointerUp={releaseRocker}
            onPointerCancel={releaseRocker}
            onLostPointerCapture={releaseRocker}
          >
            <div ref={knobRef} className="zoom-knob" aria-hidden="true" />
          </div>
          <button type="button" className="hold-button" aria-label="Zoom out (wide), hold" {...holdProps("wide")}>
            W
          </button>
        </div>
        <div className="zoom-meter" role="meter" aria-label="Lens position" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(lens.lens * 100)} aria-valuetext={`${lens.zoomRatio.toFixed(1)} times, ${lens.hfovDeg.toFixed(1)} degrees wide`}>
          <span className="zoom-meter-fill" style={{ height: `${(lens.lens * 100).toFixed(1)}%` }} />
        </div>
      </div>
      <p className="control-label">
        Zoom {lens.zoomRatio.toFixed(1)}×<span className="control-hint">Hold T/W, drag, or E / Q</span>
      </p>
    </div>
  );
}
