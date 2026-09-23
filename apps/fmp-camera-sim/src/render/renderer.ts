import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  SpotLight,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { type Telemetry } from "../app/store";
import { type VenueGeometry } from "../domain/venue";
import { stageToWorld } from "../sim/framing";
import { applyFrameToCamera } from "./cameraRig";
import { buildP240, lensDirection, type P240Model } from "./p240Model";
import { buildPerformer, type PerformerModel } from "./performerModel";
import { buildVenue, OVERVIEW_LAYER, type VenueObjects } from "./venueScene";
import { buildViewCone, type ViewCone } from "./viewCone";
import { makeLabel } from "./labels";

export class WebGLUnavailableError extends Error {}

export type OverviewPreset = "house" | "top" | "behind";

export interface RenderCallbacks {
  onContextLost(): void;
  onContextRestored(): void;
  onQualityChange(level: number): void;
}

type Triple = [number, number, number];

export interface RenderDiagnostics {
  frames: number;
  monitorFrames: number;
  overviewFrames: number;
  quality: number;
  /** Where each drawn element actually pointed on the last frame, read back from Three.js. */
  monitorForward: Triple;
  monitorPosition: Triple;
  monitorVfovDeg: number;
  modelForward: Triple;
  modelPosition: Triple;
  coneAxis: Triple;
  coneApex: Triple;
}

// Quality ladder for the venue view. The monitor keeps full quality until the last step, so
// slow devices lose overview detail before the camera picture or control response.
const QUALITY = [
  { overviewRatio: 1.5, overviewEvery: 1, monitorRatio: 2 },
  { overviewRatio: 1, overviewEvery: 1, monitorRatio: 2 },
  { overviewRatio: 0.75, overviewEvery: 2, monitorRatio: 2 },
  { overviewRatio: 0.5, overviewEvery: 3, monitorRatio: 2 },
  { overviewRatio: 0.5, overviewEvery: 4, monitorRatio: 1 },
];
const SLOW_FRAME_MS = 26;
const FAST_FRAME_MS = 18;
// A steady 30 Hz (33 ms) stays below the slow ceiling and recovers under the fast ceiling.
const SLOW_CEILING_MS = 55;
const FAST_CEILING_MS = 40;
const INTERVAL_WINDOW = 120;

function createRenderer(canvas: HTMLCanvasElement, exposure: number): WebGLRenderer {
  try {
    const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = exposure;
    return renderer;
  } catch (error) {
    throw new WebGLUnavailableError(error instanceof Error ? error.message : "WebGL could not start.");
  }
}

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export class SceneRenderer {
  readonly scene = new Scene();
  private readonly monitor: WebGLRenderer;
  private readonly overview: WebGLRenderer;
  private readonly monitorCamera = new PerspectiveCamera(40, 16 / 9, 0.25, 900);
  private readonly overviewCamera = new PerspectiveCamera(45, 1.6, 0.5, 2500);
  private readonly controls: OrbitControls;
  private readonly p240: P240Model;
  private readonly performer: PerformerModel;
  private readonly cone: ViewCone;
  private readonly cameraLabel = makeLabel("CAM 4 · P240", { height: 1.1, alwaysVisible: true, background: "rgba(158, 67, 43, 0.92)" });
  private venue: VenueObjects | null = null;
  private venueKey = "";
  private quality = 0;
  private frameCount = 0;
  private monitorFrames = 0;
  private overviewFrames = 0;
  private slowSince: number | null = null;
  private fastSince: number | null = null;
  private lastFrameTime: number | null = null;
  private frameEma = 16.7;
  /** Recent frame intervals (about 2 s at 60 Hz); their minimum is the display's pacing baseline. */
  private readonly recentIntervals: number[] = [];
  private intervalIndex = 0;
  private theme: "light" | "dark" = "light";
  private lost = false;
  private diagnostics: RenderDiagnostics = {
    frames: 0,
    monitorFrames: 0,
    overviewFrames: 0,
    quality: 0,
    monitorForward: [0, 0, -1],
    monitorPosition: [0, 0, 0],
    monitorVfovDeg: 0,
    modelForward: [0, 0, -1],
    modelPosition: [0, 0, 0],
    coneAxis: [0, 0, -1],
    coneApex: [0, 0, 0],
  };
  private readonly scratch = new Vector3();
  private readonly cleanups: Array<() => void> = [];

  constructor(
    private readonly monitorCanvas: HTMLCanvasElement,
    private readonly overviewCanvas: HTMLCanvasElement,
    private readonly callbacks: RenderCallbacks,
  ) {
    this.monitor = createRenderer(monitorCanvas, 1.05);
    try {
      this.overview = createRenderer(overviewCanvas, 1.5);
    } catch (error) {
      this.monitor.dispose();
      throw error;
    }
    this.applyClearColors();
    this.monitorCamera.layers.set(0);
    this.overviewCamera.layers.enable(OVERVIEW_LAYER);

    // A dim house and a lit stage. Intensities are physical units (Lambert divides by pi).
    this.scene.add(new AmbientLight(0xffffff, 0.55));
    this.scene.add(new HemisphereLight(0x9fb2cc, 0x1a1512, 0.75));
    const wash = new SpotLight(0xffe4c7, 5.5, 0, Math.PI / 5, 0.55, 0);
    wash.position.set(0, 22, 24);
    wash.target.position.set(0, 1, -10);
    this.scene.add(wash, wash.target);
    const back = new DirectionalLight(0xa9c8ff, 1.3);
    back.position.set(0, 18, -45);
    this.scene.add(back);
    const fill = new DirectionalLight(0xfff0dc, 0.7);
    fill.position.set(-25, 30, 40);
    this.scene.add(fill);

    this.p240 = buildP240();
    this.p240.root.traverse((child) => child.layers.set(OVERVIEW_LAYER));
    this.cone = buildViewCone();
    this.cone.root.traverse((child) => child.layers.set(OVERVIEW_LAYER));
    this.cameraLabel.layers.set(OVERVIEW_LAYER);
    this.performer = buildPerformer();
    this.scene.add(this.p240.root, this.cone.root, this.cameraLabel, this.performer.root);

    this.controls = new OrbitControls(this.overviewCamera, overviewCanvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 400;

    for (const [canvas, name] of [
      [monitorCanvas, "monitor"],
      [overviewCanvas, "overview"],
    ] as const) {
      const lost = (event: Event) => {
        event.preventDefault();
        this.lost = true;
        this.callbacks.onContextLost();
        canvas.dataset.context = "lost";
      };
      const restored = () => {
        canvas.dataset.context = "ok";
        // A restored context starts from default GL state; put the background colours back.
        this.applyClearColors();
        if (this.monitorCanvas.dataset.context !== "lost" && this.overviewCanvas.dataset.context !== "lost") {
          this.lost = false;
          this.callbacks.onContextRestored();
        }
      };
      canvas.dataset.context = "ok";
      canvas.dataset.view = name;
      canvas.addEventListener("webglcontextlost", lost);
      canvas.addEventListener("webglcontextrestored", restored);
      this.cleanups.push(() => {
        canvas.removeEventListener("webglcontextlost", lost);
        canvas.removeEventListener("webglcontextrestored", restored);
      });
    }
  }

  setTheme(theme: "light" | "dark"): void {
    this.theme = theme;
    this.applyClearColors();
  }

  private applyClearColors(): void {
    this.monitor.setClearColor(new Color(0x07090c));
    this.overview.setClearColor(new Color(this.theme === "dark" ? 0x0e141c : 0xdcd4c7));
  }

  /** Rebuilds the static venue when its dimensions change. */
  setGeometry(geometry: VenueGeometry): void {
    const key = JSON.stringify([
      geometry.stageWidth,
      geometry.stageDepth,
      geometry.deckHeight,
      geometry.pitDepth,
      geometry.camera,
      geometry.mountOrientation,
      geometry.marks.length,
    ]);
    if (key === this.venueKey) return;
    const first = this.venue === null;
    if (this.venue) {
      this.scene.remove(this.venue.root);
      this.venue.dispose();
    }
    this.venue = buildVenue(geometry);
    this.venueKey = key;
    this.scene.add(this.venue.root);
    if (first) this.setOverviewView("house", geometry);
  }

  setOverviewView(view: OverviewPreset, geometry: VenueGeometry): void {
    const camera = stageToWorld(geometry.camera);
    const target = new Vector3(0, 0, -geometry.stageDepth * 0.35);
    if (view === "top") {
      this.overviewCamera.position.set(0.01, Math.max(70, (this.venue?.extent ?? 60) * 1.4), -geometry.stageDepth * 0.2 + 0.01);
      target.set(0, 0, camera.z * 0.3 - geometry.stageDepth * 0.25);
    } else if (view === "behind") {
      this.overviewCamera.position.set(camera.x + 4, camera.y + 5, camera.z + 12);
      target.set(0, 1, -geometry.stageDepth * 0.3);
    } else {
      this.overviewCamera.position.set(-38, 32, camera.z + 26);
    }
    this.controls.target.copy(target);
    this.controls.update();
  }

  private resize(renderer: WebGLRenderer, canvas: HTMLCanvasElement, ratioCap: number): boolean {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width < 2 || height < 2) return false;
    const ratio = Math.min(window.devicePixelRatio || 1, ratioCap);
    const w = Math.max(1, Math.round(width * ratio));
    const h = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
    }
    return true;
  }

  /**
   * Frame pacing is judged against the display's own rate: the shortest recent frame interval.
   * A steady 30 Hz (low-power mode, a 30 Hz display) is normal there, not a slow device; only
   * frames well beyond that baseline step the venue view down.
   */
  private trackPerformance(time: number): void {
    if (this.lastFrameTime !== null) {
      const delta = Math.min(250, time - this.lastFrameTime);
      this.frameEma += (delta - this.frameEma) * 0.08;
      if (this.recentIntervals.length < INTERVAL_WINDOW) this.recentIntervals.push(delta);
      else {
        this.recentIntervals[this.intervalIndex] = delta;
        this.intervalIndex = (this.intervalIndex + 1) % INTERVAL_WINDOW;
      }
      // Judge nothing until the baseline has settled.
      if (this.recentIntervals.length < 30) {
        this.lastFrameTime = time;
        return;
      }
      // The baseline only relaxes the thresholds as far as a 30 Hz display. A device that can
      // never draw faster than that is genuinely slow and still sheds venue-view detail.
      const baseline = Math.min(...this.recentIntervals);
      const slow = Math.max(SLOW_FRAME_MS, Math.min(baseline * 1.6, SLOW_CEILING_MS));
      const fast = Math.max(FAST_FRAME_MS, Math.min(baseline * 1.15, FAST_CEILING_MS));
      if (this.frameEma > slow) {
        this.fastSince = null;
        this.slowSince ??= time;
        if (time - this.slowSince > 1500 && this.quality < QUALITY.length - 1) {
          this.quality += 1;
          this.slowSince = time;
          this.callbacks.onQualityChange(this.quality);
        }
      } else if (this.frameEma < fast) {
        this.slowSince = null;
        this.fastSince ??= time;
        if (time - this.fastSince > 6000 && this.quality > 0) {
          this.quality -= 1;
          this.fastSince = time;
          this.callbacks.onQualityChange(this.quality);
        }
      } else {
        this.slowSince = null;
        this.fastSince = null;
      }
    }
    this.lastFrameTime = time;
  }

  /** Draws both views from one telemetry snapshot. `overviewVisible` skips a collapsed venue view. */
  render(t: Telemetry, frameTimeMs: number, overviewVisible: boolean): void {
    if (this.lost) return;
    this.trackPerformance(frameTimeMs);
    this.frameCount += 1;
    const q = QUALITY[this.quality];

    // One camera state drives the monitor, the modelled head and the cone.
    const { frame } = t;
    applyFrameToCamera(this.monitorCamera, frame);
    this.p240.root.position.set(frame.position.x, frame.position.y, frame.position.z);
    this.p240.setPose(frame.headingDeg, frame.tiltDeg, t.geometry.mountOrientation);
    this.cone.update(frame);
    this.cameraLabel.position.set(frame.position.x, frame.position.y + (t.geometry.mountOrientation === "inverted" ? -1.6 : 1.9), frame.position.z);
    this.performer.update(t.performer);

    if (this.resize(this.monitor, this.monitorCanvas, q.monitorRatio)) {
      this.monitor.render(this.scene, this.monitorCamera);
      this.monitorFrames += 1;
    }
    if (overviewVisible && this.frameCount % q.overviewEvery === 0 && this.resize(this.overview, this.overviewCanvas, q.overviewRatio)) {
      this.overviewCamera.aspect = this.overviewCanvas.clientWidth / Math.max(1, this.overviewCanvas.clientHeight);
      this.overviewCamera.updateProjectionMatrix();
      this.controls.update();
      this.overview.render(this.scene, this.overviewCamera);
      this.overviewFrames += 1;
    }
  }

  /** Reads back where the monitor camera, the P240 model and the cone point. Used by probes. */
  getDiagnostics(): RenderDiagnostics {
    const forward = this.monitorCamera.getWorldDirection(this.scratch);
    const monitorForward: Triple = [forward.x, forward.y, forward.z];
    const corners = this.cone.corners();
    const apex = this.cone.apex();
    const axis = corners.reduce(
      (sum, c) => {
        const dx = c.x - apex.x;
        const dy = c.y - apex.y;
        const dz = c.z - apex.z;
        const length = Math.hypot(dx, dy, dz) || 1;
        return [sum[0] + dx / length, sum[1] + dy / length, sum[2] + dz / length] as Triple;
      },
      [0, 0, 0] as Triple,
    );
    const axisLength = Math.hypot(...axis) || 1;
    this.p240.root.getWorldPosition(this.scratch);
    this.diagnostics = {
      frames: this.frameCount,
      monitorFrames: this.monitorFrames,
      overviewFrames: this.overviewFrames,
      quality: this.quality,
      monitorForward,
      monitorPosition: this.monitorCamera.position.toArray() as Triple,
      monitorVfovDeg: this.monitorCamera.fov,
      modelForward: lensDirection(this.p240.tilt),
      modelPosition: [this.scratch.x, this.scratch.y, this.scratch.z],
      coneAxis: [axis[0] / axisLength, axis[1] / axisLength, axis[2] / axisLength],
      coneApex: [apex.x, apex.y, apex.z],
    };
    return this.diagnostics;
  }

  get qualityLevel(): number {
    return this.quality;
  }

  dispose(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.controls.dispose();
    this.venue?.dispose();
    this.monitor.dispose();
    this.overview.dispose();
  }
}
