import { type ShowPackage, defaultShowPackage } from "../domain/structures";
import { SHELL_LAYER, setShellCutaway } from "./structureBuilder";
import {
  type Material,
  type Mesh,
  type Object3D,
  type Texture,
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
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
import { type DrawSignature, sceneSignature, signatureChanged } from "./drawSignature";

export class WebGLUnavailableError extends Error {}

export type OverviewPreset = "house" | "top" | "behind" | "side" | "lawn";

export interface RenderCallbacks {
  onContextLost(): void;
  onContextRestored(): void;
  onQualityChange(level: number): void;
  /** The deferred venue-view context could not start. The monitor keeps drawing. */
  onOverviewUnavailable?(): void;
  /** The shown venue view is (true) or is not (false) big enough to draw; below it no context starts. */
  onOverviewRoom?(room: boolean): void;
  /** The venue view alone lost (true) or got back (false) its context. The monitor and motion carry on. */
  onOverviewPaused?(paused: boolean): void;
}

export interface RendererOptions {
  /** Draw every frame even when nothing changed (`?render=always`): a comparison and fallback switch. */
  continuous?: boolean;
}

export interface ViewInfo {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
}

type Triple = [number, number, number];

export interface RenderDiagnostics {
  bowlMaxTreadY?: number;
  terrainMaxY?: number;
  monitorHelperCount?: number;
  monitorShellCount?: number;
  overviewShellCount?: number;
  showMeshCount?: number;
  frames: number;
  /** Draws per view. A frame whose picture would not change is skipped and counted instead. */
  monitorFrames: number;
  overviewFrames: number;
  monitorSkipped: number;
  overviewSkipped: number;
  continuous: boolean;
  /** Live WebGL contexts: 1 until the venue view first draws, then 2. */
  contexts: number;
  /** Frame count when the venue-view context started, or null while it has not. */
  overviewCreatedAtFrame: number | null;
  /** Whether the shown venue view is big enough to draw (null while it is hidden). */
  overviewRoom: boolean | null;
  overviewPaused: boolean;
  /** Three.js counters from each view's last draw and its uploaded resources. */
  monitorInfo: ViewInfo;
  overviewInfo: ViewInfo | null;
  quality: number;
  /** The last quality-ladder steps, oldest first: frame time in ms, EMA and display baseline. */
  qualityHistory: QualityStep[];
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
const QUALITY_HISTORY = 20;
// Below this CSS size the venue view is a strip nobody can read (a landscape tablet once gave it
// 1002 × 10 px): it starts no second context and draws nothing, and the panel says why.
export const OVERVIEW_MIN_WIDTH = 200;
export const OVERVIEW_MIN_HEIGHT = 120;

export interface QualityStep {
  t: number;
  from: number;
  to: number;
  emaMs: number;
  baselineMs: number;
}

function viewInfo(renderer: WebGLRenderer): ViewInfo {
  const { render, memory, programs } = renderer.info;
  return { calls: render.calls, triangles: render.triangles, geometries: memory.geometries, textures: memory.textures, programs: programs?.length ?? 0 };
}

/** Frees the GPU resources of a helper model that `VenueObjects.dispose` does not own. */
function disposeTree(root: Object3D): void {
  const textures = new Set<Texture>();
  root.traverse((child) => {
    const node = child as Partial<Mesh>;
    node.geometry?.dispose();
    const materials: Material[] = node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : [];
    for (const material of materials) {
      const map = (material as Material & { map?: Texture | null }).map;
      if (map) textures.add(map);
      material.dispose();
    }
  });
  textures.forEach((texture) => texture.dispose());
}

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
  /** Created on first visible venue frame so collapsed/mobile Operate skips a second GPU context. */
  private overview: WebGLRenderer | null = null;
  private overviewInitFailed = false;
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
  private monitorSkipped = 0;
  private overviewSkipped = 0;
  /** Bumped by `invalidate()`: every view draws on its next visible frame. */
  private epoch = 0;
  private sceneSig: DrawSignature | null = null;
  /** Scene revision: rises whenever the scene objects were moved to a new signature. */
  private sceneVersion = 0;
  private monitorDrawnVersion = -1;
  private overviewDrawnVersion = -1;
  /** OrbitControls moved the venue camera (a drag, a zoom or the damping tail). */
  private overviewCameraMoved = true;
  private drewLastFrame = false;
  private overviewRoom: boolean | null = null;
  private overviewCreatedAtFrame: number | null = null;
  private readonly qualityHistory: QualityStep[] = [];
  private readonly continuous: boolean;
  private slowSince: number | null = null;
  private fastSince: number | null = null;
  private lastFrameTime: number | null = null;
  private frameEma = 16.7;
  /** Recent frame intervals (about 2 s at 60 Hz); their minimum is the display's pacing baseline. */
  private readonly recentIntervals: number[] = [];
  private intervalIndex = 0;
  private theme: "light" | "dark" = "light";
  /** Each canvas's context is lost independently: losing the venue view never stops the monitor. */
  private monitorLost = false;
  private overviewLost = false;
  private diagnostics: RenderDiagnostics = {
    frames: 0,
    monitorFrames: 0,
    overviewFrames: 0,
    monitorSkipped: 0,
    overviewSkipped: 0,
    continuous: false,
    contexts: 1,
    overviewCreatedAtFrame: null,
    overviewRoom: null,
    overviewPaused: false,
    monitorInfo: { calls: 0, triangles: 0, geometries: 0, textures: 0, programs: 0 },
    overviewInfo: null,
    quality: 0,
    qualityHistory: [],
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
    options: RendererOptions = {},
  ) {
    this.continuous = options.continuous ?? false;
    this.monitor = createRenderer(monitorCanvas, 1.05);
    this.applyClearColors();
    // Overview WebGL is deferred until the venue panel is actually shown (see ensureOverview).
    this.monitorCamera.layers.set(0);
    this.monitorCamera.layers.enable(SHELL_LAYER);
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
    // Orbit inertia is decorative motion: it stops with the drag when the operator asks for
    // reduced motion. Camera moves are the simulation itself and keep their real timing.
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const applyMotion = () => {
      this.controls.enableDamping = !reduceMotion?.matches;
    };
    applyMotion();
    reduceMotion?.addEventListener?.("change", applyMotion);
    this.cleanups.push(() => reduceMotion?.removeEventListener?.("change", applyMotion));
    const moved = () => {
      this.overviewCameraMoved = true;
    };
    this.controls.addEventListener("change", moved);
    this.cleanups.push(() => this.controls.removeEventListener("change", moved));
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
        canvas.dataset.context = "lost";
        if (name === "monitor") {
          this.monitorLost = true;
          this.callbacks.onContextLost();
        } else {
          // The venue view is secondary: it pauses on its own while the monitor and motion carry on.
          this.overviewLost = true;
          this.callbacks.onOverviewPaused?.(true);
        }
      };
      const restored = () => {
        canvas.dataset.context = "ok";
        // A restored context starts from default GL state; put the background colours back.
        this.applyClearColors();
        this.invalidate();
        if (name === "monitor") {
          this.monitorLost = false;
          this.callbacks.onContextRestored();
        } else {
          this.overviewLost = false;
          this.callbacks.onOverviewPaused?.(false);
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
    this.invalidate();
  }

  /** Draws every view again on its next visible frame. Call after changing anything the signature does not cover. */
  invalidate(): void {
    this.epoch += 1;
  }

  private applyClearColors(): void {
    this.monitor.setClearColor(new Color(0x07090c));
    this.overview?.setClearColor(new Color(this.theme === "dark" ? 0x0e141c : 0xdcd4c7));
  }

  /** Lazily start the venue-view WebGL context the first time the panel is wide enough to draw. */
  private ensureOverview(): WebGLRenderer | null {
    if (this.overview) return this.overview;
    if (this.overviewInitFailed) return null;
    try {
      this.overview = createRenderer(this.overviewCanvas, 1.5);
      this.overviewCreatedAtFrame = this.frameCount;
      this.applyClearColors();
      return this.overview;
    } catch {
      this.overviewInitFailed = true;
      this.callbacks.onOverviewUnavailable?.();
      return null;
    }
  }

  /** Rebuilds the static venue when its dimensions change. */
  setCutaway(cutaway: boolean): void {
    setShellCutaway(this.overviewCamera, cutaway);
    this.invalidate();
  }

  setGeometry(geometry: VenueGeometry, show: ShowPackage = defaultShowPackage()): void {
    const key = JSON.stringify([
      geometry.stageWidth,
      geometry.stageDepth,
      geometry.deckHeight,
      geometry.pitDepth,
      geometry.camera,
      geometry.mountOrientation,
      geometry.marks.length,
      geometry.bowl,
      geometry.structures,
      geometry.terrain,
      show,
    ]);
    if (key === this.venueKey) return;
    const first = this.venue === null;
    if (this.venue) {
      this.scene.remove(this.venue.root);
      this.venue.dispose();
    }
    this.venue = buildVenue(geometry, show);
    this.venueKey = key;
    this.scene.add(this.venue.root);
    this.applySeatDetail();
    this.invalidate();
    if (first) this.setOverviewView("house", geometry);
  }

  /** Seat detail follows the quality level; it only changes with the level or a rebuilt bowl. */
  private applySeatDetail(): void {
    this.venue?.root.getObjectByName("seating-bowl")?.traverse(child => {
      if (child.name.startsWith("seat-detail")) child.visible = this.quality < 2;
      if (child.name.startsWith("seat-reduced")) child.visible = this.quality >= 2;
    });
  }

  private setQuality(level: number, time: number, baselineMs: number): void {
    this.qualityHistory.push({ t: Math.round(time), from: this.quality, to: level, emaMs: Math.round(this.frameEma * 10) / 10, baselineMs: Math.round(baselineMs * 10) / 10 });
    if (this.qualityHistory.length > QUALITY_HISTORY) this.qualityHistory.shift();
    this.quality = level;
    this.applySeatDetail();
    this.invalidate();
    this.callbacks.onQualityChange(level);
  }

  setOverviewView(view: OverviewPreset, geometry: VenueGeometry): void {
    const camera = stageToWorld(geometry.camera);
    const bounds = this.venue ? new Box3().setFromObject(this.venue.root) : new Box3(new Vector3(-40, -2, -20), new Vector3(40, 20, 60));
    const target = bounds.getCenter(new Vector3()), size = bounds.getSize(new Vector3());
    this.controls.maxDistance = Math.max(400, size.length() * 3);
    this.controls.maxPolarAngle = view === "side" ? Math.PI / 2 : Math.PI * 0.49;
    const aspect = this.overviewCanvas.clientWidth / Math.max(1, this.overviewCanvas.clientHeight) || 1.6;
    const tanV = Math.tan(this.overviewCamera.fov * Math.PI / 360), tanH = tanV * aspect;
    if (view === "top") {
      const distance = (Math.max(size.x / (2 * tanH), size.z / (2 * tanV)) + size.y / 2) * 1.15;
      this.overviewCamera.position.copy(target).add(new Vector3(0, distance, 0.001));
    } else if (view === "side") {
      const distance = (Math.max(size.z / (2 * tanH), size.y / (2 * tanV)) + size.x / 2) * 1.15;
      this.overviewCamera.position.copy(target).add(new Vector3(distance, 0, 0));
    } else if (view === "lawn") {
      const t = geometry.terrain;
      this.overviewCamera.position.set(0, t.frontElevation.value + 12, geometry.structures.shell.rearDownstage.value + t.boundary.value.at(-1)!.depth * 0.9);
      target.set(0, geometry.structures.shell.rearFloor.value + 2, geometry.structures.shell.rearDownstage.value);
    } else if (view === "behind") {
      this.overviewCamera.position.set(camera.x + 4, camera.y + 5, camera.z + 12);
      target.set(0, 1, -geometry.stageDepth * 0.3);
    } else {
      const distance = size.length() / (2 * Math.sin(Math.atan(Math.min(tanV, tanH)))) * 1.1;
      this.overviewCamera.position.copy(target).add(new Vector3(-0.7, 0.65, 1).normalize().multiplyScalar(distance));
    }
    this.controls.target.copy(target);
    this.controls.update();
    this.invalidate();
  }

  /** Sizes the drawing buffer to the canvas. Null when the canvas is not visible; true when it changed (which clears it). */
  private resize(renderer: WebGLRenderer, canvas: HTMLCanvasElement, ratioCap: number): boolean | null {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width < 2 || height < 2) return null;
    const ratio = Math.min(window.devicePixelRatio || 1, ratioCap);
    const w = Math.max(1, Math.round(width * ratio));
    const h = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      return true;
    }
    return false;
  }

  private noteOverviewRoom(room: boolean | null): void {
    if (room === this.overviewRoom) return;
    this.overviewRoom = room;
    if (room !== null) this.callbacks.onOverviewRoom?.(room);
  }

  /**
   * Frame pacing is judged against the display's own rate: the shortest recent frame interval.
   * A steady 30 Hz (low-power mode, a 30 Hz display) is normal there, not a slow device; only
   * frames well beyond that baseline step the venue view down.
   */
  private trackPerformance(time: number): void {
    // Only a frame that follows a draw says anything about drawing cost. Idle frames draw
    // nothing, so they neither shed nor restore detail.
    if (!this.drewLastFrame) {
      this.slowSince = null;
      this.fastSince = null;
      this.lastFrameTime = time;
      return;
    }
    if (this.lastFrameTime !== null) {
      const delta = Math.min(250, time - this.lastFrameTime);
      this.frameEma += (delta - this.frameEma) * 0.08;
      if (this.recentIntervals.length < INTERVAL_WINDOW) this.recentIntervals.push(delta);
      else {
        this.recentIntervals[this.intervalIndex] = delta;
        this.intervalIndex = (this.intervalIndex + 1) % INTERVAL_WINDOW;
      }
      // Dense new venues can exceed the simulation catch-up guard before 30 frames arrive.
      // Shed decorative detail promptly; keep timing and physical treads unchanged.
      if (this.frameEma > 100 && this.quality < QUALITY.length - 1) {
        this.setQuality(QUALITY.length - 1, time, delta);
      }
      // Normal display-rate adaptation waits until the baseline has settled.
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
          this.slowSince = time;
          this.setQuality(this.quality + 1, time, baseline);
        }
      } else if (this.frameEma < fast) {
        this.slowSince = null;
        this.fastSince ??= time;
        if (time - this.fastSince > 6000 && this.quality > 0) {
          this.fastSince = time;
          this.setQuality(this.quality - 1, time, baseline);
        }
      } else {
        this.slowSince = null;
        this.fastSince = null;
      }
    }
    this.lastFrameTime = time;
  }

  /**
   * Draws both views from one telemetry snapshot, each only when its picture would change: the
   * camera or performer moved, the venue camera orbited, the canvas resized, or something called
   * `invalidate()`. An unchanged frame keeps the last picture on screen and costs no GPU work.
   * `overviewVisible` skips a collapsed venue view.
   */
  render(t: Telemetry, frameTimeMs: number, overviewVisible: boolean): void {
    if (this.monitorLost) return;
    this.trackPerformance(frameTimeMs);
    this.frameCount += 1;
    let drew = false;
    const q = QUALITY[this.quality];

    // One camera state drives the monitor, the modelled head and the cone.
    const sig = sceneSignature(t, this.epoch, this.quality);
    if (signatureChanged(this.sceneSig, sig)) {
      this.sceneSig = sig;
      this.sceneVersion += 1;
      const { frame } = t;
      applyFrameToCamera(this.monitorCamera, frame);
      this.p240.root.position.set(frame.position.x, frame.position.y, frame.position.z);
      this.p240.setPose(frame.headingDeg, frame.tiltDeg, t.geometry.mountOrientation);
      this.cone.update(frame);
      this.cameraLabel.position.set(frame.position.x, frame.position.y + (t.geometry.mountOrientation === "inverted" ? -1.6 : 1.9), frame.position.z);
      this.performer.update(t.performer);
    }

    const monitorSize = this.resize(this.monitor, this.monitorCanvas, q.monitorRatio);
    if (monitorSize !== null) {
      if (this.continuous || monitorSize || this.monitorDrawnVersion !== this.sceneVersion) {
        this.monitor.render(this.scene, this.monitorCamera);
        this.monitorDrawnVersion = this.sceneVersion;
        this.monitorFrames += 1;
        drew = true;
      } else this.monitorSkipped += 1;
    }

    const room = overviewVisible
      ? this.overviewCanvas.clientWidth >= OVERVIEW_MIN_WIDTH && this.overviewCanvas.clientHeight >= OVERVIEW_MIN_HEIGHT
      : null;
    this.noteOverviewRoom(room);
    if (room && !this.overviewLost && this.frameCount % q.overviewEvery === 0) {
      const overview = this.ensureOverview();
      const overviewSize = overview ? this.resize(overview, this.overviewCanvas, q.overviewRatio) : null;
      if (overview && overviewSize !== null) {
        if (overviewSize) {
          this.overviewCamera.aspect = this.overviewCanvas.clientWidth / Math.max(1, this.overviewCanvas.clientHeight);
          this.overviewCamera.updateProjectionMatrix();
        }
        // Applies a drag or the damping tail; either one fires "change" and marks the view moved.
        this.controls.update();
        if (this.continuous || overviewSize || this.overviewCameraMoved || this.overviewDrawnVersion !== this.sceneVersion) {
          overview.render(this.scene, this.overviewCamera);
          this.overviewDrawnVersion = this.sceneVersion;
          this.overviewCameraMoved = false;
          this.overviewFrames += 1;
          drew = true;
        } else this.overviewSkipped += 1;
      }
    }
    this.drewLastFrame = drew;
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
    const tread = this.venue?.root.getObjectByName("bowl-treads") as Mesh | undefined;
    const positions = tread?.geometry.getAttribute("position");
    let bowlMaxTreadY = -Infinity, monitorHelperCount = 0;
    if (positions) for (let i = 0; i < positions.count; i++) bowlMaxTreadY = Math.max(bowlMaxTreadY, positions.getY(i));
    this.scene.traverseVisible(child => { if (child.name.startsWith("label:") && child.layers.test(this.monitorCamera.layers)) monitorHelperCount++; });
    for (const helper of [this.p240.root, this.cone.root]) helper.traverseVisible(child => { if (child.layers.test(this.monitorCamera.layers)) monitorHelperCount++; });
    this.diagnostics = {
      bowlMaxTreadY, monitorHelperCount,
      terrainMaxY: (() => { const p=(this.venue?.root.getObjectByName("lawn-surface") as Mesh | undefined)?.geometry.getAttribute("position"); let y=-Infinity;if(p)for(let i=0;i<p.count;i++)y=Math.max(y,p.getY(i));return y; })(),
      monitorShellCount: this.layerMeshCount("venue-shell", this.monitorCamera),
      overviewShellCount: this.layerMeshCount("venue-shell", this.overviewCamera),
      showMeshCount: this.layerMeshCount("show-package", this.monitorCamera),
      frames: this.frameCount,
      monitorFrames: this.monitorFrames,
      overviewFrames: this.overviewFrames,
      monitorSkipped: this.monitorSkipped,
      overviewSkipped: this.overviewSkipped,
      continuous: this.continuous,
      contexts: this.overview ? 2 : 1,
      overviewCreatedAtFrame: this.overviewCreatedAtFrame,
      overviewRoom: this.overviewRoom,
      overviewPaused: this.overviewLost,
      monitorInfo: viewInfo(this.monitor),
      overviewInfo: this.overview ? viewInfo(this.overview) : null,
      quality: this.quality,
      qualityHistory: this.qualityHistory.map((step) => ({ ...step })),
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

  private layerMeshCount(name: string, camera: PerspectiveCamera): number {
    let count = 0;
    this.venue?.root.getObjectByName(name)?.traverseVisible(child => {
      if ((child as Mesh).isMesh && child.layers.test(camera.layers)) count++;
    });
    return count;
  }

  get qualityLevel(): number {
    return this.quality;
  }

  /** Frees everything this renderer uploaded and releases both contexts (browsers cap live contexts). */
  dispose(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.controls.dispose();
    this.venue?.dispose();
    for (const helper of [this.p240.root, this.cone.root, this.cameraLabel, this.performer.root]) disposeTree(helper);
    for (const renderer of [this.monitor, this.overview]) {
      renderer?.dispose();
      renderer?.forceContextLoss();
    }
  }
}
