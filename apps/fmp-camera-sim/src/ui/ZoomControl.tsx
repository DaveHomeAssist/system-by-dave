import { type KeyboardEvent, type PointerEvent, useEffect, useRef } from "react";
import { type LensState } from "../domain/camera";
import { eventSeconds, type InputController, nowSeconds } from "../input/controller";

interface Props {
  input: InputController;
  lens: LensState;
  commandedZoom: number;
}

const BUTTON_RATE = 0.6;

/** Spring-loaded zoom rocker (drag up for tele) plus hold-to-zoom T and W buttons. */
export function ZoomControl({ input, lens, commandedZoom }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const held = useRef<"tele" | "wide" | null>(null);

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
    held.current = direction;
    input.set("zoomButton", { zoom: direction === "tele" ? BUTTON_RATE : -BUTTON_RATE }, wall);
  };
  const endHold = (wall: number) => {
    if (held.current === null) return;
    held.current = null;
    input.release("zoomButton", wall);
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

  const holdProps = (direction: "tele" | "wide") => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      startHold(direction, eventSeconds(event.nativeEvent));
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => endHold(eventSeconds(event.nativeEvent)),
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => endHold(eventSeconds(event.nativeEvent)),
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
    onBlur: () => endHold(nowSeconds()),
    onContextMenu: (event: { preventDefault(): void }) => event.preventDefault(),
  });

  return (
    <div className="zoom-control">
      <div className="zoom-row">
        <div className="zoom-buttons">
          <button type="button" className="hold-button" aria-label="Zoom in (tele), hold" {...holdProps("tele")}>
            T
          </button>
          <div
            ref={trackRef}
            className="zoom-track"
            role="application"
            aria-roledescription="zoom rocker"
            aria-label="Zoom rocker. Drag up for tele, down for wide."
            tabIndex={-1}
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
