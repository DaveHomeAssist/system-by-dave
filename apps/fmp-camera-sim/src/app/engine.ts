import { type InputController, nowSeconds } from "../input/controller";
import { type MonitorOverlay } from "../render/monitorOverlay";
import { type SceneRenderer } from "../render/renderer";
import { STORAGE_KEY } from "../storage/persist";
import { type SimulatorStore } from "./store";

// The frame loop. The simulation advances on its own fixed step; rendering only reads its state,
// so a slow frame never changes how fast the camera moves. A hidden page halts all motion.

export interface EngineParts {
  store: SimulatorStore;
  input: InputController;
  renderer: SceneRenderer | null;
  overlay: MonitorOverlay | null;
  overviewVisible(): boolean;
}

export class Engine {
  private raf = 0;
  private running = false;

  constructor(private readonly parts: EngineParts) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("pagehide", this.onPageHide);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("storage", this.onStorage);
    if (document.visibilityState === "hidden") this.onVisibility();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pagehide", this.onPageHide);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("storage", this.onStorage);
  }

  private frame = (time: number): void => {
    if (!this.running) return;
    const { store, renderer, overlay } = this.parts;
    // A frame timestamp can trail the last input event; the simulation never runs backwards.
    store.advanceTo(Math.max(time / 1000, store.wall));
    const state = store.getState();
    if (!state.hidden) {
      const telemetry = store.getTelemetry();
      if (renderer && state.renderStatus === "ok") renderer.render(telemetry, time, this.parts.overviewVisible());
      overlay?.update(telemetry, state);
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private onVisibility = (): void => {
    const wall = nowSeconds();
    if (document.visibilityState === "hidden") {
      this.parts.input.releaseAll(wall);
      this.parts.store.hide(wall);
    } else {
      this.parts.store.show(wall);
    }
  };

  private onPageHide = (): void => {
    this.parts.store.flushSave();
  };

  /** Losing window focus stops every commanded move, including a joystick or rocker drag. */
  private onBlur = (): void => {
    this.parts.input.releaseAll(nowSeconds());
  };

  /** Another tab wrote or removed the saved session (storage events never fire in the writing tab). */
  private onStorage = (event: StorageEvent): void => {
    // A null key is storage.clear(): the saved session is gone along with everything else.
    if (event.key === null) this.parts.store.noteExternalSave(null);
    else if (event.key === STORAGE_KEY) this.parts.store.noteExternalSave(event.newValue);
  };
}
