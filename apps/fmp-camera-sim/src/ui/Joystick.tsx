import { type PointerEvent, useEffect, useRef } from "react";
import { eventSeconds, type InputController, nowSeconds } from "../input/controller";
import { type DriveInput } from "../sim/ptz";

interface Props {
  input: InputController;
  /** Commanded input from every source, for showing keyboard deflection on the knob. */
  commanded: DriveInput;
}

/** Drag to pan and tilt. Deflection sets speed; releasing, cancelling or losing capture stops. */
export function Joystick({ input, commanded }: Props) {
  const padRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);

  const place = (x: number, y: number) => {
    const pad = padRef.current;
    const knob = knobRef.current;
    if (!pad || !knob) return;
    const travel = pad.clientWidth / 2 - knob.clientWidth / 2;
    knob.style.transform = `translate(${(x * travel).toFixed(1)}px, ${(-y * travel).toFixed(1)}px)`;
  };

  const drive = (event: PointerEvent<HTMLDivElement>) => {
    const pad = padRef.current;
    const knob = knobRef.current;
    if (!pad || !knob) return;
    const rect = pad.getBoundingClientRect();
    const travel = rect.width / 2 - knob.clientWidth / 2;
    let x = (event.clientX - (rect.left + rect.width / 2)) / travel;
    let y = -(event.clientY - (rect.top + rect.height / 2)) / travel;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    place(x, y);
    input.set("joystick", { pan: x, tilt: y }, eventSeconds(event.nativeEvent));
  };

  const release = (event?: PointerEvent<HTMLDivElement>) => {
    if (event && event.pointerId !== pointer.current) return;
    pointer.current = null;
    padRef.current?.classList.remove("is-active");
    place(0, 0);
    input.release("joystick", event ? eventSeconds(event.nativeEvent) : nowSeconds());
  };

  useEffect(() => () => input.release("joystick", nowSeconds()), [input]);

  // Leaving the window ends the drag: the engine releases the input, this resets the pad.
  useEffect(() => {
    const onBlur = () => {
      if (pointer.current !== null) release();
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  });

  // Mirror keyboard deflection on the knob when the pad is not being dragged.
  useEffect(() => {
    if (pointer.current === null) place(commanded.pan, commanded.tilt);
  }, [commanded.pan, commanded.tilt]);

  return (
    <div className="joystick">
      <div
        ref={padRef}
        className="joystick-pad"
        role="application"
        aria-roledescription="joystick"
        aria-label="Pan and tilt joystick"
        aria-describedby="joystick-help"
        tabIndex={0}
        onPointerDown={(event) => {
          if (pointer.current !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
          pointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.classList.add("is-active");
          event.currentTarget.focus({ preventScroll: true });
          event.preventDefault();
          drive(event);
        }}
        onPointerMove={(event) => {
          if (event.pointerId === pointer.current) drive(event);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        <span className="joystick-ring" aria-hidden="true" />
        <span className="joystick-cross" aria-hidden="true" />
        <div ref={knobRef} className="joystick-knob" aria-hidden="true" />
      </div>
      <p id="joystick-help" className="control-label">
        Pan / tilt
        <span className="control-hint">Drag, or arrow keys · Shift fast · Alt fine</span>
      </p>
    </div>
  );
}
