import { type InputController, nowSeconds } from "../input/controller";
import { type MonitorOverlay } from "../render/monitorOverlay";
import { type SceneRenderer } from "../render/renderer";
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
    if (document.visibilityState === "hidden") this.onVisibility();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pagehide", this.onPageHide);
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
}
