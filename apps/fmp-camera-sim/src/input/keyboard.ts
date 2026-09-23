import { type SimulatorStore } from "../app/store";
import { type DriveInput } from "../sim/ptz";
import { eventSeconds, type InputController } from "./controller";

// Keyboard operation. Held keys give a fixed deflection: 0.7 by default (about half speed through
// the default response curve), full with Shift, 0.35 with Alt/Option for fine moves. Keys are read
// by physical position (event.code) so the layout works on any keyboard language.

type Axis = keyof DriveInput;

const MOVE_KEYS: Record<string, { axis: Axis; direction: 1 | -1 }> = {
  ArrowLeft: { axis: "pan", direction: -1 },
  ArrowRight: { axis: "pan", direction: 1 },
  ArrowUp: { axis: "tilt", direction: 1 },
  ArrowDown: { axis: "tilt", direction: -1 },
  KeyA: { axis: "pan", direction: -1 },
  KeyD: { axis: "pan", direction: 1 },
  KeyW: { axis: "tilt", direction: 1 },
  KeyS: { axis: "tilt", direction: -1 },
  KeyE: { axis: "zoom", direction: 1 },
  Equal: { axis: "zoom", direction: 1 },
  NumpadAdd: { axis: "zoom", direction: 1 },
  KeyQ: { axis: "zoom", direction: -1 },
  Minus: { axis: "zoom", direction: -1 },
  NumpadSubtract: { axis: "zoom", direction: -1 },
};

export const KEYBOARD_DEFLECTION = { normal: 0.7, fast: 1, fine: 0.35 } as const;

export interface KeyboardActions {
  toggleExpanded(): void;
  openHelp(): void;
}

/** Targets that use the keyboard themselves: typing fields, sliders, tabs and radio groups. */
export function usesOwnKeys(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest("dialog")) return true;
  if (target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  if (target.tagName === "INPUT") return !["button", "submit", "reset", "checkbox"].includes((target as HTMLInputElement).type);
  const role = target.getAttribute("role");
  return role !== null && ["tab", "slider", "listbox", "option", "menuitem", "radio", "spinbutton", "textbox"].includes(role);
}

/** Targets that Space or Enter activate. Space must not also stop the camera there. */
function isActivatable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "BUTTON" || tag === "A" || tag === "SUMMARY" || (tag === "INPUT" && (target as HTMLInputElement).type === "checkbox");
}

function digitOf(code: string): number | null {
  const match = /^(?:Digit|Numpad)([1-9])$/.exec(code);
  return match ? Number(match[1]) : null;
}

export function attachKeyboard(store: SimulatorStore, input: InputController, actions: KeyboardActions): () => void {
  const held = new Set<string>();
  let shift = false;
  let alt = false;

  const push = (wall: number) => {
    if (held.size === 0) {
      input.release("keyboard", wall);
      return;
    }
    const magnitude = shift ? KEYBOARD_DEFLECTION.fast : alt ? KEYBOARD_DEFLECTION.fine : KEYBOARD_DEFLECTION.normal;
    const value: DriveInput = { pan: 0, tilt: 0, zoom: 0 };
    for (const code of held) {
      const move = MOVE_KEYS[code];
      value[move.axis] += move.direction;
    }
    for (const axis of ["pan", "tilt", "zoom"] as const) value[axis] = Math.sign(value[axis]) * magnitude;
    input.set("keyboard", value, wall);
  };

  const releaseAll = (wall: number) => {
    held.clear();
    shift = false;
    alt = false;
    input.release("keyboard", wall);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const wall = eventSeconds(event);
    if (event.key === "Shift" || event.key === "Alt") {
      shift = event.shiftKey;
      alt = event.altKey;
      if (held.size) push(wall);
      return;
    }
    if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
    if (usesOwnKeys(event.target)) return;
    shift = event.shiftKey;
    alt = event.altKey;

    const move = MOVE_KEYS[event.code];
    if (move) {
      event.preventDefault();
      if (!held.has(event.code)) {
        held.add(event.code);
        push(wall);
      }
      return;
    }
    if (event.repeat) return;

    const digit = digitOf(event.code);
    if (digit !== null) {
      event.preventDefault();
      if (event.shiftKey || store.getState().storeArmed) store.storePreset(digit, wall);
      else store.recallPreset(digit, wall);
      return;
    }
    switch (event.code) {
      case "KeyH":
        event.preventDefault();
        store.home(wall);
        return;
      case "Space":
        if (isActivatable(event.target)) return;
        event.preventDefault();
        releaseAll(wall);
        store.stop(wall);
        return;
      case "Escape":
        releaseAll(wall);
        store.stop(wall);
        if (store.getState().storeArmed) store.armStore(false);
        return;
      case "BracketLeft":
      case "BracketRight": {
        event.preventDefault();
        const delta = event.code === "BracketRight" ? 1 : -1;
        store.nudgeSpeed(event.shiftKey ? ["zoom"] : ["pan", "tilt"], delta);
        return;
      }
      case "Comma":
      case "Period":
        event.preventDefault();
        store.nudgeSpeed(["preset"], event.code === "Period" ? 1 : -1);
        return;
      case "KeyF":
        event.preventDefault();
        actions.toggleExpanded();
        return;
      case "Slash":
        if (event.shiftKey) {
          event.preventDefault();
          actions.openHelp();
        }
        return;
      default:
        return;
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    const wall = eventSeconds(event);
    if (event.key === "Shift" || event.key === "Alt") {
      shift = event.shiftKey;
      alt = event.altKey;
      if (held.size) push(wall);
      return;
    }
    // Always honour a release, even when focus has moved into a field meanwhile.
    if (held.delete(event.code)) push(wall);
  };

  const onBlur = () => releaseAll(eventSeconds());

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    releaseAll(eventSeconds());
  };
}
