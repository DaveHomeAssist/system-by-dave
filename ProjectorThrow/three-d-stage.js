// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).
/* BEGIN USAGE */
/**
 * <three-d-stage> — 3D object viewer + exporter shell (three.js).
 *
 * The stage owns the whole scene: WebGL renderer, neutral studio lighting
 * with a soft ground shadow, orbit controls (drag to orbit, wheel to zoom,
 * right-drag to pan), a camera auto-framed to the object's bounds, resize
 * handling, and a download toolbar that exports the current object as
 * OBJ + MTL or GLB (binary glTF). FBX cannot be exported in the browser;
 * GLB is the interchange format every modern 3D tool imports.
 *
 * three.js loads through the page's import map. Throwline vendors the pinned
 * modules locally so the renderer works without a network connection:
 *
 *   <script type="importmap">
 *   {
 *     "imports": {
 *       "three": "./vendor/three/three.module.js",
 *       "three/addons/controls/OrbitControls.js": "./vendor/three/addons/controls/OrbitControls.js",
 *       "three/addons/exporters/OBJExporter.js": "./vendor/three/addons/exporters/OBJExporter.js",
 *       "three/addons/exporters/GLTFExporter.js": "./vendor/three/addons/exporters/GLTFExporter.js"
 *     }
 *   }
 *   </script>
 *
 * Usage:
 *   <style>three-d-stage:not(:defined){visibility:hidden}</style>
 *   <three-d-stage name="rocket"></three-d-stage>
 *   <script src="three-d-stage.js"></script>
 *   <script type="module">
 *     const stage = document.querySelector('three-d-stage');
 *     const { THREE } = await stage.ready;
 *     const model = new THREE.Group();
 *     // …build the model out of named meshes with named materials —
 *     // the names become the o / usemtl entries in the exported OBJ…
 *     stage.setObject(model);
 *   </script>
 *
 * Attributes:
 *   name       — export file basename (default "model")
 *   background — CSS color behind the scene (default a warm paper tone)
 *   autorotate — when present, a slow turntable until the user interacts
 *
 * Model in real-world meters, centered on the origin, y-up — exports
 * inherit the scene's units and orientation. The stage fills its own box;
 * size it with ordinary CSS (default 100vw/100vh page hero).
 *
 * Default setup: neutral studio lighting (hemisphere + key + fill), a
 * soft ground shadow, and NO environment map — so high metalness has
 * nothing to reflect and renders near-black. Cap metalness around
 * 0.3–0.4 and carry a metal look with a brighter base color. The copied
 * file is yours: adjust the lights, shadow, or background in _boot()
 * when the object needs a different look.
 *
 * Additive editor API:
 *   setManipulationTargets(targets), getManipulationTargets()
 *   selectManipulationTarget(id), clearManipulationSelection()
 *   setDimensionAnnotations(items), setDimensionView(view)
 *   capturePng(options) / captureImage(options) -> Promise<Blob>
 *
 * Additive composed events:
 *   stage-manipulation       { version, id, type, projectorId, obstacleId,
 *                              key, value, phase, source, snapStep, delta }
 *   stage-selection-change  { version, target, source }
 *   stage-dimension-view-change { version, view, resolvedView, source }
 */
/* END USAGE */

(() => {
  const stylesheet = `
    :host {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      min-height: 0;
      background: var(--stage-bg, var(--deck, #f0eee6));
      color: var(--chalk, #1a1915);
      overflow: hidden;
    }
    .viewport {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      outline: none;
      touch-action: none;
    }
    canvas[data-selectable="true"] { cursor: grab; }
    canvas[data-manipulating="true"] { cursor: grabbing; }
    canvas:focus-visible {
      outline: 3px solid var(--hazard, #8a6400);
      outline-offset: -3px;
    }
    .toolbar {
      position: absolute;
      left: 16px;
      right: auto;
      bottom: 16px;
      z-index: 2;
      display: flex;
      gap: 8px;
      font-family: var(--mono, ui-monospace, monospace);
    }
    .toolbar button {
      appearance: none;
      min-height: 36px;
      border: 1px solid var(--line, rgba(20, 20, 19, 0.2));
      border-radius: var(--r, 4px);
      background: var(--overlay, var(--case, #fff));
      color: var(--chalk, #1a1915);
      font-family: inherit;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      letter-spacing: .05em;
      text-transform: uppercase;
      padding: 9px 12px;
      cursor: pointer;
    }
    .toolbar button:hover { border-color: var(--hazard, #8a6400); }
    .toolbar button:focus-visible {
      outline: 2px solid var(--hazard, #8a6400);
      outline-offset: 2px;
    }
    .toolbar button:active { transform: translateY(1px); }
    .toolbar button[disabled] { opacity: 0.5; pointer-events: none; }
    .first-use {
      position: absolute;
      left: 16px;
      bottom: 16px;
      z-index: 2;
      max-width: min(48%, 560px);
      font: 600 10px/1.5 var(--mono, ui-monospace, monospace);
      letter-spacing: .06em;
      text-transform: uppercase;
      color: var(--dimmer, #666e79);
      user-select: none;
      pointer-events: none;
    }
    .first-use[hidden] { display: none; }
    .controls-help {
      position: absolute;
      left: 16px;
      bottom: 16px;
      z-index: 2;
    }
    .controls-help[hidden] { display: none; }
    .controls-help button {
      min-width: 44px;
      min-height: 44px;
      padding: 8px 11px;
      border: 1px solid var(--line, rgba(20, 20, 19, 0.2));
      border-radius: var(--r, 4px);
      background: var(--overlay, var(--case, #fff));
      color: var(--chalk, #1a1915);
      font: 700 10px/1 var(--mono, ui-monospace, monospace);
      letter-spacing: .07em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .controls-help button:focus-visible {
      outline: 2px solid var(--hazard, #8a6400);
      outline-offset: 2px;
    }
    .controls-panel {
      position: absolute;
      left: 0;
      bottom: calc(100% + 7px);
      width: min(320px, calc(100vw - 32px));
      padding: 10px 12px;
      border: 1px solid var(--line, rgba(20, 20, 19, 0.2));
      border-radius: var(--r, 4px);
      background: var(--overlay, var(--case, #fff));
      color: var(--dim, #4c535d);
      font: 600 10px/1.55 var(--mono, ui-monospace, monospace);
      letter-spacing: .04em;
      text-transform: none;
      box-shadow: 0 10px 28px rgba(0,0,0,.16);
    }
    .controls-panel[hidden] { display: none; }
    :host([field-verify]) .toolbar { display: none; }
    .status {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .drag-readout {
      position: absolute;
      left: 50%;
      bottom: 18px;
      z-index: 3;
      translate: -50% 0;
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 6px 10px;
      border: 1px solid var(--hazard, #8a6400);
      border-radius: 999px;
      background: var(--overlay, var(--case, #fff));
      color: var(--hazard, #8a6400);
      font: 700 10px/1 var(--mono, ui-monospace, monospace);
      letter-spacing: .07em;
      text-transform: uppercase;
      pointer-events: none;
    }
    .drag-readout[hidden] { display: none; }
    .dimension-layer {
      position: absolute;
      inset: 0;
      z-index: 1;
      overflow: hidden;
      pointer-events: none;
      contain: layout paint;
    }
    .dimension-layer[hidden] { display: none; }
    .dimension-badge {
      --leader: 10px;
      position: absolute;
      translate: -50% calc(-100% - var(--leader));
      max-width: min(210px, calc(100% - 24px));
      padding: 5px 7px;
      border: 1px solid var(--hazard, #8a6400);
      border-radius: var(--r, 4px);
      background: var(--overlay, var(--case, #fff));
      color: var(--chalk, #1a1915);
      font: 700 9px/1.35 var(--mono, ui-monospace, monospace);
      letter-spacing: .045em;
      text-transform: uppercase;
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(0,0,0,.12);
    }
    .dimension-badge::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      width: 1px;
      height: var(--leader);
      background: var(--hazard, #8a6400);
      opacity: .65;
    }
    .dimension-badge[data-kind="obstruction"] {
      border-color: var(--safety, #8a2f20);
    }
    .dimension-badge[data-kind="obstruction"]::after { background: var(--safety, #8a2f20); }
    .err {
      position: absolute;
      inset: 0;
      z-index: 3;
      display: grid;
      place-content: center;
      gap: 10px;
      padding: 24px;
      background: var(--overlay, var(--deck, #f0eee6));
      font: 500 14px/1.55 var(--sans, system-ui, sans-serif);
      color: var(--safety, #8a2f20);
      text-align: center;
    }
    .err[hidden] { display: none; }
    .err strong { font: 700 16px/1.3 var(--mono, ui-monospace, monospace); }
    .err p { max-width: 520px; margin: 0; color: var(--dim, #4c535d); }
    .err a {
      justify-self: center;
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 8px 14px;
      border: 1px solid var(--hazard, #8a6400);
      border-radius: var(--r, 4px);
      color: var(--hazard, #8a6400);
      font-family: var(--mono, ui-monospace, monospace);
      font-weight: 700;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { transition: none !important; animation: none !important; }
      .toolbar button:active { transform: none; }
    }
    @media (max-width: 820px) {
      :host {
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }
      .viewport {
        position: absolute;
        inset: 0;
        height: auto;
        min-height: 0;
      }
      .first-use {
        left: 12px;
        bottom: 12px;
        max-width: calc(100% - 24px);
      }
      .controls-help {
        position: absolute;
        left: 12px;
        bottom: 12px;
      }
      .controls-panel {
        position: absolute;
        width: min(320px, calc(100vw - 24px));
      }
      .toolbar {
        position: absolute;
        display: none;
      }
      .toolbar button { min-height: 44px; }
      .drag-readout { bottom: 14px; }
      .dimension-badge {
        max-width: min(172px, calc(100% - 20px));
        padding: 4px 6px;
        font-size: 8px;
      }
      .dimension-badge:nth-child(n + 6) { display: none; }
    }
    @media (max-width: 560px) {
      .dimension-badge:nth-child(n + 5) { display: none; }
    }
  `;

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /** Tell the host an export attempt settled — telemetry only. The host
   *  (HTMLViewer) verifies the source and re-reads these fields defensively
   *  before counting; nothing else crosses the frame boundary. Guarded so
   *  telemetry can never break the download path. */
  function notifyExport(format, ok) {
    try {
      window.parent.postMessage(
        { type: 'omelette:notify-3d-export', format: format, ok: ok === true },
        '*'
      );
    } catch (e) {}
  }

  class ThreeDStage extends HTMLElement {
    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = stylesheet;
      root.appendChild(style);
      this._viewport = document.createElement('div');
      this._viewport.className = 'viewport';
      root.appendChild(this._viewport);
      this._err = document.createElement('div');
      this._err.className = 'err';
      this._err.hidden = true;
      this._viewport.appendChild(this._err);
      this._firstUse = document.createElement('div');
      this._firstUse.className = 'first-use';
      this._firstUse.textContent = 'Drag to orbit · pinch to zoom';
      root.appendChild(this._firstUse);
      this._help = document.createElement('div');
      this._help.className = 'controls-help';
      this._help.hidden = true;
      this._helpBtn = document.createElement('button');
      this._helpBtn.id = 'controlsHelp';
      this._helpBtn.type = 'button';
      this._helpBtn.textContent = 'Controls';
      this._helpBtn.setAttribute('aria-expanded', 'false');
      this._helpBtn.setAttribute('aria-controls', 'stage-instructions');
      this._note = document.createElement('div');
      this._note.id = 'stage-instructions';
      this._note.className = 'controls-panel';
      this._note.hidden = true;
      this._note.textContent = 'Drag or touch to orbit. Wheel or pinch to zoom. Right-drag to pan. Select a gold handle, then use arrow keys to adjust it; Shift makes a fine adjustment. Brackets choose the previous or next handle, Escape clears it. Use keys 1 through 5 for cameras; plus and minus zoom; 0 or Home resets.';
      this._helpBtn.addEventListener('click', () => {
        const expanded = this._helpBtn.getAttribute('aria-expanded') === 'true';
        this._helpBtn.setAttribute('aria-expanded', String(!expanded));
        this._note.hidden = expanded;
      });
      this._help.append(this._helpBtn, this._note);
      root.appendChild(this._help);
      this._toolbar = document.createElement('div');
      this._toolbar.className = 'toolbar';
      this._toolbar.setAttribute('role', 'group');
      this._toolbar.setAttribute('aria-label', 'Stage export');
      this._objBtn = document.createElement('button');
      this._objBtn.type = 'button';
      this._objBtn.textContent = 'Download OBJ + MTL';
      this._objBtn.addEventListener('click', () => this._runExport('obj'));
      this._glbBtn = document.createElement('button');
      this._glbBtn.type = 'button';
      this._glbBtn.textContent = 'Download GLB';
      this._glbBtn.addEventListener('click', () => this._runExport('glb'));
      this._toolbar.appendChild(this._objBtn);
      this._toolbar.appendChild(this._glbBtn);
      root.appendChild(this._toolbar);
      this._status = document.createElement('div');
      this._status.className = 'status';
      this._status.setAttribute('role', 'status');
      this._status.setAttribute('aria-live', 'polite');
      this._status.setAttribute('aria-atomic', 'true');
      root.appendChild(this._status);
      this._dragReadout = document.createElement('div');
      this._dragReadout.className = 'drag-readout';
      this._dragReadout.hidden = true;
      root.appendChild(this._dragReadout);
      this._dimensionLayer = document.createElement('div');
      this._dimensionLayer.className = 'dimension-layer';
      this._dimensionLayer.hidden = true;
      this._dimensionLayer.setAttribute('aria-hidden', 'true');
      root.appendChild(this._dimensionLayer);
      this._manipulationTargets = [];
      this._dimensionAnnotations = [];
      this._dimensionView = 'auto';
      this._cameraDimensionView = 'perspective';
      this._setButtonsEnabled(false);
      /** Resolves with { THREE } once the scene is live — build the model
       *  in `await stage.ready` so nothing races the library load. */
      this.ready = new Promise((resolve, reject) => {
        this._readyResolve = resolve;
        this._readyReject = reject;
      });
    }

    connectedCallback() {
      if (this._booted) {
        // Re-attached after a move — resume observation and paint one frame.
        if (this._renderer && !this._destroyed) {
          this._ro && this._ro.observe(this._viewport);
          this.requestRender();
        }
        return;
      }
      this._booted = true;
      this._boot().catch((err) => {
        this._showDependencyError(err);
        this._readyReject(err);
      });
    }

    _showDependencyError(err) {
      const title = document.createElement('strong');
      title.textContent = 'Stage 3D could not start';
      const message = document.createElement('p');
      message.textContent =
        'The WebGL 2 renderer could not start. ' +
        'Throwline will keep the live 2D plan, calculations, placement controls, scene JSON, and job sheet available.';
      const fallback = document.createElement('a');
      fallback.href = this.getAttribute('fallback') || 'index.html?workspace=planner';
      fallback.textContent = 'Open the Throwline planner';
      this._err.replaceChildren(title, message, fallback);
      this._err.hidden = false;
      this.announce('Stage 3D unavailable. Open the Throwline planner.');
      this.dispatchEvent(new CustomEvent('stage-dependency-error', {
        detail: { message: String(err && err.message ? err.message : err) }
      }));
    }

    _showContextLoss() {
      if (this._destroyed || this._contextLost) return;
      this._contextLost = true;
      this.setAttribute('context-lost', '');
      if (this._frameId !== undefined) cancelAnimationFrame(this._frameId);
      this._frameId = undefined;
      this._setButtonsEnabled(false);
      const title = document.createElement('strong');
      title.textContent = '3D view paused';
      const message = document.createElement('p');
      message.textContent =
        'The graphics context was interrupted. Throwline is keeping your numbers and will restore the 3D view automatically when the device recovers.';
      const fallback = document.createElement('a');
      fallback.href = this.getAttribute('fallback') || 'index.html?workspace=planner';
      fallback.textContent = 'Open the Throwline planner';
      this._err.replaceChildren(title, message, fallback);
      this._err.hidden = false;
      this.announce('The 3D view paused. Your calculation data is safe while graphics recover.');
      this.dispatchEvent(new CustomEvent('stage-context-lost', { bubbles: true }));
    }

    _restoreContext() {
      if (this._destroyed || !this._contextLost) return;
      this._contextLost = false;
      this.removeAttribute('context-lost');
      this._err.hidden = true;
      this._setButtonsEnabled(Boolean(this._object));
      if (this._viewport && this._renderer && this._camera) {
        const width = this._viewport.clientWidth || 1;
        const height = this._viewport.clientHeight || 1;
        this._renderer.setSize(width, height, false);
        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();
      }
      this.requestRender();
      this.announce('The 3D view recovered. Scene controls and downloads are ready.');
      this.dispatchEvent(new CustomEvent('stage-context-restored', { bubbles: true }));
    }

    async _boot() {
      const bg = this.getAttribute('background');
      if (bg) this.style.setProperty('--stage-bg', bg);
      const [THREE, controlsMod] = await Promise.all([
        import('three'),
        import('three/addons/controls/OrbitControls.js'),
      ]);
      this._THREE = THREE;
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch (standardError) {
        try {
          renderer = new THREE.WebGLRenderer({
            antialias: false,
            alpha: true,
            powerPreference: 'low-power',
            failIfMajorPerformanceCaveat: false,
          });
          this.dataset.rendererStartup = 'low-power';
        } catch (lowPowerError) {
          const unavailable = new Error('three-d-stage: WebGL 2 unavailable after standard and low-power startup attempts');
          unavailable.cause = lowPowerError;
          unavailable.standardError = standardError;
          throw unavailable;
        }
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      this._renderer = renderer;
      renderer.domElement.tabIndex = 0;
      renderer.domElement.setAttribute('role', 'application');
      renderer.domElement.setAttribute(
        'aria-label',
        'Interactive Throwline stage. Select a visible handle or use bracket keys to choose one, then use arrow keys to adjust it. Shift makes a fine adjustment. Keys 1 through 5 select cameras, plus and minus zoom, and 0 resets.'
      );
      renderer.domElement.setAttribute('aria-describedby', 'stage-instructions');
      renderer.domElement.setAttribute(
        'aria-keyshortcuts',
        '1 2 3 4 5 [ ] ArrowLeft ArrowRight ArrowUp ArrowDown PageUp PageDown + - Escape 0 Home'
      );
      this._keyHandler = (event) => this._handleKey(event);
      renderer.domElement.addEventListener('keydown', this._keyHandler);
      this._contextLostHandler = (event) => {
        event.preventDefault();
        this._showContextLoss();
      };
      this._contextRestoredHandler = () => this._restoreContext();
      renderer.domElement.addEventListener('webglcontextlost', this._contextLostHandler, false);
      renderer.domElement.addEventListener('webglcontextrestored', this._contextRestoredHandler, false);
      this._viewport.insertBefore(renderer.domElement, this._err);

      const scene = new THREE.Scene();
      this._scene = scene;

      const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 500);
      camera.position.set(3, 2.2, 4);
      this._camera = camera;

      const controls = new controlsMod.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      this._controls = controls;
      this._raycaster = new THREE.Raycaster();
      this._pointer = new THREE.Vector2();
      this._pointerDownHandler = event => this._handleManipulationStart(event);
      this._pointerMoveHandler = event => this._handleManipulationMove(event);
      this._pointerUpHandler = event => this._handleManipulationEnd(event);
      renderer.domElement.addEventListener('pointerdown', this._pointerDownHandler, true);
      renderer.domElement.addEventListener('pointermove', this._pointerMoveHandler, true);
      renderer.domElement.addEventListener('pointerup', this._pointerUpHandler, true);
      renderer.domElement.addEventListener('pointercancel', this._pointerUpHandler, true);

      // Neutral studio: soft sky/ground wash, a shadow-casting key light,
      // and a dim fill from behind so silhouettes never go black.
      const hemi = new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.0);
      this._hemi = hemi;
      scene.add(hemi);
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(4, 7, 5);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.bias = -0.0002;
      this._key = key;
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xfff4e6, 0.5);
      fill.position.set(-5, 3, -4);
      this._fill = fill;
      scene.add(fill);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.ShadowMaterial({ opacity: 0.18 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      this._ground = ground;
      scene.add(ground);

      this._autorotate = this.hasAttribute('autorotate');
      controls.autoRotate = this._autorotate;
      controls.autoRotateSpeed = 1.2;
      controls.addEventListener('start', () => {
        controls.autoRotate = false;
        this._interacting = true;
        this._completeFirstInteraction();
        this.requestRender();
      });
      controls.addEventListener('change', () => this.requestRender());
      controls.addEventListener('end', () => {
        this._interacting = false;
        this.requestRender();
        this.announce('Stage view adjusted.');
      });

      const fit = () => {
        const w = this._viewport.clientWidth || 1;
        const h = this._viewport.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        this._renderDimensionAnnotations();
        this.requestRender();
      };
      this._ro = new ResizeObserver(fit);
      this._frame = () => {
        this._frameId = undefined;
        if (this._destroyed || this._contextLost || document.hidden || !this.isConnected) return;
        const changed = controls.update();
        renderer.render(scene, camera);
        this._renderDimensionAnnotations();
        if (this._interacting || controls.autoRotate || changed) this.requestRender();
      };
      this._visibilityHandler = () => {
        if (document.hidden) {
          if (this._frameId !== undefined) cancelAnimationFrame(this._frameId);
          this._frameId = undefined;
        } else {
          this.requestRender();
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);
      fit();
      if (this.isConnected) {
        this._ro.observe(this._viewport);
        this.requestRender();
      }

      this.announce('Stage 3D loaded. Focus the stage for keyboard controls.');
      this._readyResolve({ THREE });
    }

    disconnectedCallback() {
      if (this._frameId !== undefined) cancelAnimationFrame(this._frameId);
      this._frameId = undefined;
      if (this._ro) this._ro.disconnect();
    }

    /** Show (and own) the object. Replaces any previous object, enables
     *  shadows on every mesh, rests it on the ground plane, and frames
     *  the camera to its bounds. */
    setObject(object) {
      const THREE = this._THREE;
      if (!THREE) throw new Error('three-d-stage: not ready — await stage.ready first');
      this._clearSelectionGizmo();
      if (this._object) {
        this._scene.remove(this._object);
        this._disposeObject(this._object);
      }
      this._object = object;
      object.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      const box = new THREE.Box3().setFromObject(object);
      if (!box.isEmpty()) {
        // Rest the object on the ground without moving its origin.
        this._ground.position.y = box.min.y;
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        const dist =
          (sphere.radius / Math.tan((this._camera.fov * Math.PI) / 360)) * 1.35;
        const dir = new THREE.Vector3(1, 0.55, 1.25).normalize();
        this._camera.position
          .copy(sphere.center)
          .add(dir.multiplyScalar(dist));
        this._camera.near = Math.max(dist / 100, 0.01);
        this._camera.far = dist * 100;
        this._camera.updateProjectionMatrix();
        this._controls.target.copy(sphere.center);
        this._controls.update();
        const span = sphere.radius * 3;
        this._key.shadow.camera.left = -span;
        this._key.shadow.camera.right = span;
        this._key.shadow.camera.top = span;
        this._key.shadow.camera.bottom = -span;
        this._key.shadow.camera.updateProjectionMatrix();
      }
      this._scene.add(object);
      if (this._registeredManipulationTargets) this.setManipulationTargets(this._registeredManipulationTargets);
      this._setButtonsEnabled(!this._contextLost);
      this.requestRender();
    }

    announce(message) {
      if (!this._status) return;
      this._status.textContent = '';
      requestAnimationFrame(() => {
        this._status.textContent = message;
      });
    }

    setView(position, target, label, options = {}) {
      if (!this._camera || !this._controls) return;
      this._camera.position.set(position[0], position[1], position[2]);
      this._controls.target.set(target[0], target[1], target[2]);
      this._controls.update();
      const previousDimensionView = this._cameraDimensionView;
      const normalizedLabel = String(label || '').toLowerCase();
      this._cameraDimensionView = normalizedLabel.includes('top')
        ? 'plan'
        : (normalizedLabel.includes('side') || normalizedLabel.includes('front') || normalizedLabel.includes('operator'))
          ? 'elevation'
          : 'perspective';
      if (this._dimensionView === 'auto' && previousDimensionView !== this._cameraDimensionView) {
        this.dispatchEvent(new CustomEvent('stage-dimension-view-change', {
          bubbles: true,
          composed: true,
          detail: { version: 1, view: 'auto', resolvedView: this._cameraDimensionView, source: 'camera' }
        }));
      }
      this._renderDimensionAnnotations();
      this.requestRender();
      if (options.saveDefault) {
        this._defaultView = {
          position: [...position],
          target: [...target],
          label: label || 'three-quarter'
        };
      }
      if (options.announce !== false) this.announce((label || 'Stage') + ' camera selected.');
    }

    /** Frame the current scene from a requested direction. Unlike setView,
     * this derives distance and target from the live object bounds so visible
     * manipulation handles stay inside the canvas as the room and rig change. */
    frameObject(direction, label, options = {}) {
      if (!this._THREE || !this._object || !this._camera || !this._controls) return false;
      const THREE = this._THREE;
      const box = new THREE.Box3().setFromObject(this._object);
      if (box.isEmpty()) return false;
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const view = new THREE.Vector3(
        Number(direction?.[0]) || 0,
        Number(direction?.[1]) || 0,
        Number(direction?.[2]) || 0
      );
      if (view.lengthSq() < 0.000001) view.set(1, 0.55, 1.25);
      view.normalize();
      const verticalFov = THREE.MathUtils.degToRad(this._camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(this._camera.aspect, 0.01));
      const limitingFov = Math.max(THREE.MathUtils.degToRad(5), Math.min(verticalFov, horizontalFov));
      const padding = Number.isFinite(Number(options.padding)) ? Math.max(1, Number(options.padding)) : 1.25;
      const distance = Math.max(0.5, (sphere.radius / Math.sin(limitingFov / 2)) * padding);
      const position = sphere.center.clone().add(view.multiplyScalar(distance));
      this._camera.near = Math.max(distance / 500, 0.01);
      this._camera.far = Math.max(distance * 20, 500);
      this._camera.updateProjectionMatrix();
      this.setView(position.toArray(), sphere.center.toArray(), label, options);
      return true;
    }

    /** Browser-space centre and projected adjustment axis for a visible handle.
     * Useful to external automation and future guided-training overlays without
     * exposing Three.js objects across the component boundary. */
    getManipulationTargetScreenPoint(id) {
      if (!this._renderer || !this._camera || !this._THREE) return undefined;
      const target = this._manipulationTargets.find(candidate => candidate.id === id);
      if (!target || !this._objectVisible(target.object)) return undefined;
      const rect = this._renderer.domElement.getBoundingClientRect();
      const world = target.object.getWorldPosition(new this._THREE.Vector3());
      const projected = world.clone().project(this._camera);
      const axis = this._screenAxis(target, rect);
      return {
        x: rect.left + ((projected.x + 1) * rect.width / 2),
        y: rect.top + ((1 - projected.y) * rect.height / 2),
        ndcX: projected.x,
        ndcY: projected.y,
        ndcZ: projected.z,
        axisX: axis.x,
        axisY: axis.y,
        canvas: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
      };
    }

    /** Register host-owned meshes as direct-manipulation handles. The stage
     * emits preview/commit intents and never owns Throwline calculations.
     *
     * A target is { id, type, label, value, min, max, step, fineStep, axis,
     * metersPerUnit, object, projectorId?, obstacleId?, key? }. `object` and
     * the axis stay renderer-only; every emitted event carries serializable
     * values. Room obstruction meshes are also discovered by their existing
     * `userData.obstacleId` marker and gain x/y/z targets automatically. */
    setManipulationTargets(targets) {
      const registered = Array.isArray(targets)
        ? targets.filter(target => target && target.object && target.id && Array.isArray(target.axis))
            .map(target => this._normalizeManipulationTarget(target))
        : [];
      this._registeredManipulationTargets = registered;
      this._manipulationTargets = registered.concat(this._obstructionTargets(registered));
      if (this._selectedTargetId && !this._manipulationTargets.some(target => target.id === this._selectedTargetId)) {
        this.clearManipulationSelection({ source: 'scene' });
      } else {
        this._updateSelectionGizmo();
      }
      this._renderDimensionAnnotations();
    }

    _normalizeManipulationTarget(target) {
      const value = Number(target.value);
      const step = Number(target.step);
      const fineStep = Number(target.fineStep);
      return {
        ...target,
        value: Number.isFinite(value) ? value : 0,
        min: Number.isFinite(Number(target.min)) ? Number(target.min) : -Infinity,
        max: Number.isFinite(Number(target.max)) ? Number(target.max) : Infinity,
        step: Number.isFinite(step) && step > 0 ? step : 0.25,
        fineStep: Number.isFinite(fineStep) && fineStep > 0 ? fineStep : 0.05,
        metersPerUnit: Number.isFinite(Number(target.metersPerUnit)) && Number(target.metersPerUnit) > 0
          ? Number(target.metersPerUnit)
          : 1,
        axis: target.axis.slice(0, 3).map(value => Number(value) || 0),
        label: String(target.label || target.id),
      };
    }

    _obstructionTargets(registered) {
      if (!this._object || !this._THREE) return [];
      const targets = [];
      const unitScale = registered.find(target => target.metersPerUnit)?.metersPerUnit || 0.3048;
      const seen = new Set();
      this._object.traverse(object => {
        const obstacleId = object.userData && object.userData.obstacleId;
        if (!obstacleId || seen.has(obstacleId)) return;
        seen.add(obstacleId);
        const label = String(object.userData.label || object.name || obstacleId).replace(/[-_]+/g, ' ');
        const axes = [
          { key: 'x', axis: [1, 0, 0], min: -100, max: 100, suffix: 'left / right' },
          { key: 'y', axis: [0, 1, 0], min: 0, max: 100, suffix: 'height' },
          { key: 'z', axis: [0, 0, 1], min: 0, max: 300, suffix: 'depth' },
        ];
        axes.forEach(({ key, axis, min, max, suffix }) => {
          targets.push(this._normalizeManipulationTarget({
            id: `obstacle:${obstacleId}:${key}`,
            type: 'set-obstacle',
            label: `${label} ${suffix}`,
            value: Number(object.position[key]) / unitScale,
            min,
            max,
            step: 0.25,
            fineStep: 0.05,
            axis,
            metersPerUnit: unitScale,
            object,
            obstacleId,
            key,
            implicit: true,
          }));
        });
      });
      return targets;
    }

    /** Return a deterministic, serializable description of every handle. */
    getManipulationTargets() {
      return this._manipulationTargets.map(target => ({
        id: target.id,
        type: target.type,
        label: target.label,
        value: target.value,
        min: Number.isFinite(target.min) ? target.min : null,
        max: Number.isFinite(target.max) ? target.max : null,
        step: target.step,
        fineStep: target.fineStep,
        axis: [...target.axis],
        metersPerUnit: target.metersPerUnit,
        projectorId: target.projectorId,
        obstacleId: target.obstacleId,
        key: target.key,
      }));
    }

    selectManipulationTarget(id, options = {}) {
      const target = this._manipulationTargets.find(candidate => candidate.id === id);
      if (!target) return false;
      const changed = this._selectedTargetId !== target.id;
      this._selectedTargetId = target.id;
      this._updateSelectionGizmo();
      this._updateCanvasAccessibleName(target);
      if (changed || options.force) {
        this._emitSelectionChange(target, options.source || 'api');
        this.announce(`${target.label} selected. Use arrow keys to adjust; hold Shift for fine steps.`);
      }
      this.requestRender();
      return true;
    }

    clearManipulationSelection(options = {}) {
      if (!this._selectedTargetId) return false;
      this._selectedTargetId = undefined;
      this._clearSelectionGizmo();
      this._updateCanvasAccessibleName();
      this._emitSelectionChange(null, options.source || 'api');
      this.requestRender();
      return true;
    }

    _selectedTarget() {
      return this._manipulationTargets.find(target => target.id === this._selectedTargetId);
    }

    _serializableTarget(target) {
      if (!target) return null;
      return {
        id: target.id,
        type: target.type,
        label: target.label,
        value: target.value,
        axis: [...target.axis],
        projectorId: target.projectorId,
        obstacleId: target.obstacleId,
        key: target.key,
      };
    }

    _emitSelectionChange(target, source) {
      this.dispatchEvent(new CustomEvent('stage-selection-change', {
        bubbles: true,
        composed: true,
        detail: { version: 1, target: this._serializableTarget(target), source }
      }));
    }

    _updateCanvasAccessibleName(target) {
      if (!this._renderer) return;
      const suffix = target ? ` Selected handle: ${target.label}, ${this._formatDimensionValue(target.value, 'ft')}.` : '';
      this._renderer.domElement.setAttribute(
        'aria-label',
        `Interactive Throwline stage.${suffix} Select a visible handle or use bracket keys to choose one, then use arrow keys to adjust it. Shift makes a fine adjustment. Keys 1 through 5 select cameras, plus and minus zoom, and 0 resets.`
      );
    }

    _targetForObject(object, event) {
      let current = object;
      while (current) {
        const matches = this._manipulationTargets.filter(target => target.object === current);
        if (matches.length) {
          const selected = matches.find(target => target.id === this._selectedTargetId);
          if (selected && !(event && (event.altKey || event.ctrlKey || event.metaKey))) return selected;
          if (event && event.altKey) return matches.find(target => target.key === 'y') || matches[0];
          if (event && (event.ctrlKey || event.metaKey)) return matches.find(target => target.key === 'z') || matches[0];
          return matches.find(target => target.key === 'x') || matches[0];
        }
        current = current.parent;
      }
      return undefined;
    }

    _objectVisible(object) {
      let current = object;
      while (current) {
        if (current.visible === false) return false;
        current = current.parent;
      }
      return true;
    }

    _pointerPosition(event) {
      const rect = this._renderer.domElement.getBoundingClientRect();
      return { rect, x: event.clientX - rect.left, y: event.clientY - rect.top, ndcX: ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1, ndcY: -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1 };
    }

    _screenAxis(target, rect) {
      const origin = new this._THREE.Vector3();
      target.object.getWorldPosition(origin);
      const axis = new this._THREE.Vector3(target.axis[0], target.axis[1], target.axis[2]).normalize();
      const unitScale = Number(target.metersPerUnit) || 1;
      const projectedOrigin = origin.clone().project(this._camera);
      const projectedEnd = origin.clone().add(axis.multiplyScalar(unitScale)).project(this._camera);
      return { x: (projectedEnd.x - projectedOrigin.x) * rect.width / 2, y: -(projectedEnd.y - projectedOrigin.y) * rect.height / 2 };
    }

    _handleManipulationStart(event) {
      if (event.button !== 0 || !this._renderer || !this._raycaster || !this._manipulationTargets.length) return;
      const pointer = this._pointerPosition(event);
      this._pointer.set(pointer.ndcX, pointer.ndcY);
      this._raycaster.setFromCamera(this._pointer, this._camera);
      const hit = this._raycaster.intersectObjects(
        [...new Set(this._manipulationTargets.map(target => target.object).filter(object => this._objectVisible(object)))],
        true
      )[0];
      const target = hit && this._targetForObject(hit.object, event);
      if (!target) return;
      event.preventDefault(); event.stopImmediatePropagation();
      this.selectManipulationTarget(target.id, { source: 'pointer' });
      this._controls.enabled = false;
      this._renderer.domElement.setPointerCapture(event.pointerId);
      this._renderer.domElement.dataset.manipulating = 'true';
      this._manipulation = { pointerId: event.pointerId, target, startX: pointer.x, startY: pointer.y, startValue: Number(target.value), axis: this._screenAxis(target, pointer.rect), value: Number(target.value), snapStep: Number(target.step) || 0.25 };
      this._dragReadout.hidden = false;
      this._dragReadout.textContent = `${target.label} · ${Number(target.value).toFixed(2)} ft`;
      this._completeFirstInteraction();
    }

    _handleManipulationMove(event) {
      const active = this._manipulation;
      if (!active) {
        if (!this._renderer || !this._raycaster || !this._manipulationTargets.length) return;
        const pointer = this._pointerPosition(event);
        this._pointer.set(pointer.ndcX, pointer.ndcY);
        this._raycaster.setFromCamera(this._pointer, this._camera);
        const hit = this._raycaster.intersectObjects(
          [...new Set(this._manipulationTargets.map(target => target.object).filter(object => this._objectVisible(object)))],
          true
        )[0];
        if (hit && this._targetForObject(hit.object, event)) this._renderer.domElement.dataset.selectable = 'true';
        else delete this._renderer.domElement.dataset.selectable;
        return;
      }
      if (event.pointerId !== active.pointerId) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const pointer = this._pointerPosition(event);
      const axisLength = Math.max(1, active.axis.x * active.axis.x + active.axis.y * active.axis.y);
      const delta = ((pointer.x - active.startX) * active.axis.x + (pointer.y - active.startY) * active.axis.y) / axisLength;
      const step = event.shiftKey ? (Number(active.target.fineStep) || Number(active.target.step) || 0.01) : (Number(active.target.step) || 0.25);
      const raw = active.startValue + delta * (Number(active.target.sensitivity) || 1);
      const value = Math.min(Number(active.target.max), Math.max(Number(active.target.min), Math.round(raw / step) * step));
      if (!Number.isFinite(value) || value === active.value) return;
      active.value = value;
      active.snapStep = step;
      this._dragReadout.textContent = `${active.target.label} · ${value.toFixed(2)} ft`;
      this._emitManipulation(active.target, value, 'preview', 'pointer', step, value - active.startValue);
    }

    _handleManipulationEnd(event) {
      const active = this._manipulation;
      if (!active || event.pointerId !== active.pointerId) return;
      event.preventDefault(); event.stopImmediatePropagation();
      this._manipulation = undefined;
      this._controls.enabled = true;
      delete this._renderer.domElement.dataset.manipulating;
      delete this._renderer.domElement.dataset.selectable;
      this._dragReadout.hidden = true;
      this._emitManipulation(active.target, active.value, 'commit', 'pointer', active.snapStep, active.value - active.startValue);
      this.requestRender();
    }

    _emitManipulation(target, value, phase, source, snapStep, delta) {
      this.dispatchEvent(new CustomEvent('stage-manipulation', {
        bubbles: true,
        composed: true,
        detail: {
          version: 1,
          id: target.id,
          type: target.type,
          projectorId: target.projectorId,
          obstacleId: target.obstacleId,
          key: target.key,
          value,
          phase,
          source,
          snapStep,
          delta,
        }
      }));
    }

    _cycleManipulationTarget(direction) {
      const available = this._manipulationTargets.filter(target => this._objectVisible(target.object));
      if (!available.length) {
        this.announce('No direct manipulation handles are available in this scene.');
        return;
      }
      const current = available.findIndex(target => target.id === this._selectedTargetId);
      const index = current < 0
        ? (direction > 0 ? 0 : available.length - 1)
        : (current + direction + available.length) % available.length;
      this.selectManipulationTarget(available[index].id, { source: 'keyboard' });
    }

    _adjustSelectedTarget(direction, event) {
      const target = this._selectedTarget();
      if (!target) return false;
      const step = event && event.shiftKey ? target.fineStep : target.step;
      const value = Math.min(target.max, Math.max(target.min, Math.round((target.value + direction * step) / step) * step));
      if (!Number.isFinite(value) || value === target.value) {
        this.announce(`${target.label} is at its limit.`);
        return true;
      }
      const startValue = target.value;
      target.value = value;
      this._emitManipulation(target, value, 'commit', 'keyboard', step, value - startValue);
      this._dragReadout.hidden = false;
      this._dragReadout.textContent = `${target.label} · ${value.toFixed(2)} ft`;
      clearTimeout(this._keyboardReadoutTimer);
      this._keyboardReadoutTimer = setTimeout(() => { this._dragReadout.hidden = true; }, 1200);
      this.announce(`${target.label} set to ${this._formatDimensionValue(value, 'ft')}.`);
      this._updateCanvasAccessibleName(target);
      this._renderDimensionAnnotations();
      return true;
    }

    _clearSelectionGizmo() {
      if (!this._selectionGizmo || !this._scene) return;
      this._scene.remove(this._selectionGizmo);
      this._disposeObject(this._selectionGizmo);
      this._selectionGizmo = undefined;
    }

    _updateSelectionGizmo() {
      this._clearSelectionGizmo();
      const target = this._selectedTarget();
      if (!target || !this._THREE || !this._scene || !target.object || !target.object.parent) return;
      const THREE = this._THREE;
      const box = new THREE.Box3().setFromObject(target.object);
      if (box.isEmpty()) return;
      const group = new THREE.Group();
      group.name = 'stage_selection_gizmo';
      const bounds = new THREE.Box3Helper(box, 0xd59600);
      bounds.name = 'selected_handle_bounds';
      group.add(bounds);
      const origin = new THREE.Vector3();
      target.object.getWorldPosition(origin);
      const direction = new THREE.Vector3(target.axis[0], target.axis[1], target.axis[2]).normalize();
      const size = box.getSize(new THREE.Vector3());
      const length = Math.max(0.22, Math.min(1.2, size.length() * 1.8));
      const arrow = new THREE.ArrowHelper(direction, origin, length, 0xd59600, Math.min(0.16, length * 0.28), Math.min(0.09, length * 0.16));
      arrow.name = 'selected_handle_axis';
      group.add(arrow);
      this._selectionGizmo = group;
      this._scene.add(group);
    }

    /** Supply additional callouts without coupling the renderer to the scene
     * model. Each item is { id, label, value?, unit?, anchor:[x,y,z] or
     * object, kind?, views?:[] }. Coordinates are real-world metres. */
    setDimensionAnnotations(items) {
      this._dimensionAnnotations = Array.isArray(items)
        ? items.filter(item => item && item.id && item.label && (item.object || (Array.isArray(item.anchor) && item.anchor.length >= 3)))
            .map(item => ({ ...item, id: String(item.id), label: String(item.label), views: Array.isArray(item.views) ? [...item.views] : undefined }))
        : [];
      this._renderDimensionAnnotations();
      this.requestRender();
    }

    setDimensionView(view, options = {}) {
      const normalized = ['auto', 'plan', 'elevation', 'perspective'].includes(view) ? view : 'auto';
      if (this._dimensionView === normalized && !options.force) return;
      this._dimensionView = normalized;
      this._renderDimensionAnnotations();
      this.dispatchEvent(new CustomEvent('stage-dimension-view-change', {
        bubbles: true,
        composed: true,
        detail: { version: 1, view: normalized, resolvedView: normalized === 'auto' ? this._cameraDimensionView : normalized, source: options.source || 'api' }
      }));
      this.requestRender();
    }

    _dimensionOverlayEnabled() {
      return Boolean(
        this._dimensionAnnotations.length ||
        this.hasAttribute('dimensions') ||
        (this._object && this._object.getObjectByName && this._object.getObjectByName('screen_width_dimension'))
      );
    }

    _formatDimensionValue(value, unit = '') {
      const number = Number(value);
      if (!Number.isFinite(number)) return String(value ?? '');
      if (unit === 'ft') {
        let feet = Math.floor(Math.abs(number));
        let inches = Math.round((Math.abs(number) - feet) * 12);
        if (inches === 12) { feet += 1; inches = 0; }
        return `${number < 0 ? '−' : ''}${feet}′${inches ? ` ${inches}″` : ''}`;
      }
      if (unit === 'm') return `${number.toFixed(2)} m`;
      return `${number.toFixed(2)}${unit ? ` ${unit}` : ''}`;
    }

    _worldAnchor(item) {
      if (!this._THREE) return undefined;
      if (item.object && item.object.getWorldPosition) return item.object.getWorldPosition(new this._THREE.Vector3());
      if (Array.isArray(item.anchor)) return new this._THREE.Vector3(Number(item.anchor[0]) || 0, Number(item.anchor[1]) || 0, Number(item.anchor[2]) || 0);
      return undefined;
    }

    _derivedDimensionAnnotations() {
      if (!this._THREE || !this._object) return [];
      const THREE = this._THREE;
      const items = [];
      const known = [
        { id: 'distance', label: 'Throw', kind: 'throw', views: ['auto', 'plan', 'perspective'] },
        { id: 'lens-height', label: 'Lens height', kind: 'height', views: ['auto', 'elevation', 'perspective'] },
        { id: 'projector-x', label: 'Horizontal offset', kind: 'offset', views: ['auto', 'plan', 'perspective'] },
        { id: 'screen-width', label: 'Screen width', kind: 'screen', views: ['auto', 'plan', 'elevation', 'perspective'] },
      ];
      known.forEach(meta => {
        const target = this._manipulationTargets.find(candidate => candidate.id === meta.id);
        if (target) items.push({ ...meta, value: target.value, unit: 'ft', object: target.object });
      });

      const screen = this._object.getObjectByName('screen');
      if (screen) {
        const screenBox = new THREE.Box3().setFromObject(screen);
        const size = screenBox.getSize(new THREE.Vector3());
        const center = screenBox.getCenter(new THREE.Vector3());
        const scale = this._manipulationTargets.find(target => target.metersPerUnit)?.metersPerUnit || 0.3048;
        items.push({
          id: 'screen-size',
          label: `Screen ${this._formatDimensionValue(size.x / scale, 'ft')} × ${this._formatDimensionValue(size.y / scale, 'ft')}`,
          kind: 'screen',
          anchor: [center.x, screenBox.max.y, center.z],
          views: ['auto', 'elevation', 'perspective'],
        });
      }

      const body = this._object.getObjectByName('projector_body');
      const obstacleObjects = [];
      this._object.traverse(object => {
        if (object.userData && object.userData.obstacleId && this._objectVisible(object) && !obstacleObjects.includes(object)) obstacleObjects.push(object);
      });
      if (body && obstacleObjects.length) {
        const bodyBox = new THREE.Box3().setFromObject(body);
        let nearest;
        obstacleObjects.forEach(object => {
          const obstacleBox = new THREE.Box3().setFromObject(object);
          const dx = Math.max(obstacleBox.min.x - bodyBox.max.x, bodyBox.min.x - obstacleBox.max.x, 0);
          const dy = Math.max(obstacleBox.min.y - bodyBox.max.y, bodyBox.min.y - obstacleBox.max.y, 0);
          const dz = Math.max(obstacleBox.min.z - bodyBox.max.z, bodyBox.min.z - obstacleBox.max.z, 0);
          const distance = Math.hypot(dx, dy, dz);
          if (!nearest || distance < nearest.distance) nearest = { distance, obstacleBox };
        });
        if (nearest) {
          const scale = this._manipulationTargets.find(target => target.metersPerUnit)?.metersPerUnit || 0.3048;
          const anchor = bodyBox.getCenter(new THREE.Vector3());
          anchor.y = bodyBox.max.y;
          items.push({ id: 'body-clearance', label: 'Nearest body clearance', value: nearest.distance / scale, unit: 'ft', kind: 'clearance', anchor: [anchor.x, anchor.y, anchor.z], views: ['auto', 'plan', 'elevation', 'perspective'] });
        }
      }

      obstacleObjects.forEach(object => {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale = this._manipulationTargets.find(target => target.metersPerUnit)?.metersPerUnit || 0.3048;
        const label = String(object.userData.label || object.name || object.userData.obstacleId).replace(/[-_]+/g, ' ');
        items.push({
          id: `obstacle-callout:${object.userData.obstacleId}`,
          label: `${label} · ${this._formatDimensionValue(size.x / scale, 'ft')} × ${this._formatDimensionValue(size.y / scale, 'ft')} × ${this._formatDimensionValue(size.z / scale, 'ft')}`,
          kind: 'obstruction',
          anchor: [center.x, box.max.y, center.z],
          views: ['auto', 'plan', 'elevation', 'perspective'],
        });
      });
      return items;
    }

    _renderDimensionAnnotations() {
      if (!this._dimensionLayer || !this._renderer || !this._camera || !this._THREE) return;
      if (!this._dimensionOverlayEnabled()) {
        this._dimensionLayer.hidden = true;
        this._dimensionLayer.replaceChildren();
        return;
      }
      const rect = this._renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const view = this._dimensionView === 'auto' ? this._cameraDimensionView : this._dimensionView;
      const explicit = this._dimensionAnnotations;
      const seen = new Set(explicit.map(item => item.id));
      const items = explicit.concat(this._derivedDimensionAnnotations().filter(item => !seen.has(item.id)));
      const nodes = [];
      items.forEach(item => {
        if (item.views && !item.views.includes(view)) return;
        const anchor = this._worldAnchor(item);
        if (!anchor) return;
        const projected = anchor.clone().project(this._camera);
        if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y) || projected.z < -1 || projected.z > 1) return;
        const x = Math.max(12, Math.min(rect.width - 12, (projected.x + 1) * rect.width / 2));
        const y = Math.max(20, Math.min(rect.height - 12, (-projected.y + 1) * rect.height / 2));
        const badge = document.createElement('div');
        badge.className = 'dimension-badge';
        badge.dataset.dimensionId = item.id;
        badge.dataset.kind = item.kind || 'measurement';
        const value = item.value === undefined ? '' : ` · ${this._formatDimensionValue(item.value, item.unit)}`;
        badge.textContent = `${item.label}${value}`;
        badge.style.left = `${x}px`;
        badge.style.top = `${y}px`;
        nodes.push(badge);
      });
      this._dimensionLayer.replaceChildren(...nodes);
      this._dimensionLayer.hidden = nodes.length === 0;
    }

    _completeFirstInteraction() {
      if (!this._firstUse || this._firstUse.hidden) return;
      this._firstUse.hidden = true;
      this._help.hidden = false;
      this.dispatchEvent(new CustomEvent('stage-first-interaction', { bubbles: true }));
    }

    setLightingTheme(theme) {
      const dark = theme === 'dark';
      if (this._hemi) {
        this._hemi.color.setHex(dark ? 0xd8e1ef : 0xffffff);
        this._hemi.groundColor.setHex(dark ? 0x252d38 : 0xd8d2c4);
        this._hemi.intensity = dark ? 1.35 : 1.0;
      }
      if (this._key) {
        this._key.color.setHex(dark ? 0xfff0cf : 0xffffff);
        this._key.intensity = dark ? 2.65 : 2.2;
      }
      if (this._fill) {
        this._fill.color.setHex(dark ? 0xb9d6ff : 0xfff4e6);
        this._fill.intensity = dark ? 0.88 : 0.5;
      }
      if (this._ground && this._ground.material) {
        this._ground.material.opacity = dark ? 0.28 : 0.18;
        this._ground.material.needsUpdate = true;
      }
      this.requestRender();
    }

    orbitBy(azimuthDelta, polarDelta) {
      if (!this._THREE || !this._camera || !this._controls) return;
      const offset = this._camera.position.clone().sub(this._controls.target);
      const spherical = new this._THREE.Spherical().setFromVector3(offset);
      spherical.theta += azimuthDelta;
      spherical.phi = Math.max(0.08, Math.min(Math.PI - 0.08, spherical.phi + polarDelta));
      offset.setFromSpherical(spherical);
      this._camera.position.copy(this._controls.target).add(offset);
      this._controls.update();
      this.requestRender();
      this.announce('Stage camera orbited.');
    }

    zoomBy(factor) {
      if (!this._camera || !this._controls) return;
      const offset = this._camera.position.clone().sub(this._controls.target);
      const nextDistance = Math.max(0.25, Math.min(300, offset.length() * factor));
      offset.setLength(nextDistance);
      this._camera.position.copy(this._controls.target).add(offset);
      this._controls.update();
      this.requestRender();
      this.announce(factor < 1 ? 'Stage zoomed in.' : 'Stage zoomed out.');
    }

    resetView() {
      if (!this._defaultView) return;
      this.setView(
        this._defaultView.position,
        this._defaultView.target,
        this._defaultView.label,
        { announce: false }
      );
      this.announce('Stage camera reset to three-quarter view.');
    }

    requestRender() {
      if (this._destroyed || this._contextLost || document.hidden || !this.isConnected || !this._renderer || this._frameId !== undefined) return;
      this._frameId = requestAnimationFrame(this._frame);
    }

    captureCanvas() {
      if (this._destroyed || this._contextLost || !this._renderer || !this._scene || !this._camera) return undefined;
      if (this._controls) this._controls.update();
      this._renderer.render(this._scene, this._camera);
      return this._renderer.domElement;
    }

    /** Capture the current WebGL view for a handoff package. The returned
     * Blob contains the rendered scene; HTML dimension badges intentionally
     * remain separate so exported evidence never depends on DOM rasterizers. */
    capturePng(options = {}) {
      const canvas = this.captureCanvas();
      if (!canvas) return Promise.reject(new Error('three-d-stage: capture unavailable while the renderer is paused'));
      const type = typeof options.type === 'string' && /^image\/(png|jpeg|webp)$/.test(options.type)
        ? options.type
        : 'image/png';
      const quality = Number.isFinite(Number(options.quality)) ? Math.max(0, Math.min(1, Number(options.quality))) : undefined;
      return new Promise((resolve, reject) => {
        try {
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('three-d-stage: the browser returned an empty image capture')), type, quality);
        } catch (error) {
          reject(error);
        }
      });
    }

    captureImage(options = {}) {
      return this.capturePng(options);
    }

    _disposeObject(object) {
      if (!object) return;
      const geometries = new Set();
      const materials = new Set();
      const textures = new Set();
      object.traverse((part) => {
        if (part.geometry) geometries.add(part.geometry);
        const list = Array.isArray(part.material) ? part.material : [part.material];
        list.filter(Boolean).forEach((material) => {
          materials.add(material);
          Object.values(material).forEach((value) => {
            if (value && value.isTexture) textures.add(value);
          });
        });
      });
      textures.forEach((texture) => texture.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    }

    destroy() {
      if (this._destroyed) return;
      this._destroyed = true;
      clearTimeout(this._keyboardReadoutTimer);
      if (this._frameId !== undefined) cancelAnimationFrame(this._frameId);
      this._frameId = undefined;
      if (this._ro) this._ro.disconnect();
      if (this._visibilityHandler) document.removeEventListener('visibilitychange', this._visibilityHandler);
      if (this._renderer && this._keyHandler) this._renderer.domElement.removeEventListener('keydown', this._keyHandler);
      if (this._renderer && this._contextLostHandler) {
        this._renderer.domElement.removeEventListener('webglcontextlost', this._contextLostHandler, false);
        this._renderer.domElement.removeEventListener('webglcontextrestored', this._contextRestoredHandler, false);
      }
      if (this._renderer && this._pointerDownHandler) {
        this._renderer.domElement.removeEventListener('pointerdown', this._pointerDownHandler, true);
        this._renderer.domElement.removeEventListener('pointermove', this._pointerMoveHandler, true);
        this._renderer.domElement.removeEventListener('pointerup', this._pointerUpHandler, true);
        this._renderer.domElement.removeEventListener('pointercancel', this._pointerUpHandler, true);
      }
      if (this._controls) this._controls.dispose();
      this._clearSelectionGizmo();
      this._disposeObject(this._object);
      this._object = undefined;
      this._disposeObject(this._ground);
      if (this._renderer) {
        this._renderer.dispose();
        this._renderer.forceContextLoss();
      }
      this._setButtonsEnabled(false);
    }

    _handleKey(event) {
      const key = event.key;
      if (key === '[' || key === ']') {
        event.preventDefault();
        this._completeFirstInteraction();
        this._cycleManipulationTarget(key === ']' ? 1 : -1);
        return;
      }
      if (key === 'Escape' && this._selectedTargetId) {
        event.preventDefault();
        this.clearManipulationSelection({ source: 'keyboard' });
        this.announce('Direct manipulation handle cleared. Arrow keys orbit the stage.');
        return;
      }
      if (this._selectedTargetId && ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'PageDown', 'PageUp'].includes(key)) {
        event.preventDefault();
        this._completeFirstInteraction();
        this._adjustSelectedTarget(['ArrowRight', 'ArrowUp', 'PageUp'].includes(key) ? 1 : -1, event);
        return;
      }
      if (/^[1-5]$/.test(key)) {
        event.preventDefault();
        this._completeFirstInteraction();
        this.dispatchEvent(new CustomEvent('stage-camera-shortcut', {
          detail: { index: Number(key) - 1 },
          bubbles: true
        }));
        return;
      }
      const orbitStep = Math.PI / 24;
      const actions = {
        ArrowLeft: () => this.orbitBy(-orbitStep, 0),
        ArrowRight: () => this.orbitBy(orbitStep, 0),
        ArrowUp: () => this.orbitBy(0, -orbitStep),
        ArrowDown: () => this.orbitBy(0, orbitStep),
        '+': () => this.zoomBy(0.86),
        '=': () => this.zoomBy(0.86),
        '-': () => this.zoomBy(1.16),
        '_': () => this.zoomBy(1.16),
        '0': () => this.dispatchEvent(new CustomEvent('stage-reset', { bubbles: true })),
        Home: () => this.dispatchEvent(new CustomEvent('stage-reset', { bubbles: true }))
      };
      const action = actions[key];
      if (!action) return;
      event.preventDefault();
      this._completeFirstInteraction();
      action();
    }

    get _basename() {
      return (this.getAttribute('name') || 'model').replace(/[^\w.-]+/g, '_');
    }

    _setButtonsEnabled(on) {
      this._objBtn.disabled = !on;
      this._glbBtn.disabled = !on;
    }

    /** Every mesh and material needs a unique name for o/usemtl lines —
     *  fill in stable fallbacks, and return the unique material list. */
    _nameParts() {
      const mats = [];
      const seen = new Set();
      let meshI = 0;
      let matI = 0;
      this._object.traverse((o) => {
        if (!o.isMesh) return;
        if (!o.name) o.name = 'part_' + meshI;
        meshI += 1;
        const list = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of list) {
          if (!m || mats.includes(m)) continue;
          if (!m.name) {
            m.name = 'mat_' + matI;
            matI += 1;
          }
          while (seen.has(m.name)) {
            m.name = m.name + '_' + matI;
            matI += 1;
          }
          seen.add(m.name);
          mats.push(m);
        }
      });
      return mats;
    }

    /** One export attempt, reported to the host however it settles.
     *  Rethrows so a failure stays visible on the guest console exactly as
     *  before. The no-object early return is not an attempt (the toolbar is
     *  disabled until the model loads) and reports nothing. */
    runExport(format) {
      return this._runExport(format);
    }

    async _runExport(format) {
      if (!this._object || this._contextLost) {
        if (this._contextLost) this.announce('Model downloads will return when the 3D view recovers.');
        return;
      }
      this.announce(format === 'obj' ? 'Preparing OBJ and MTL downloads.' : 'Preparing GLB download.');
      try {
        await (format === 'obj' ? this._exportObj() : this._exportGlb());
        this.announce(format === 'obj' ? 'OBJ and MTL downloads ready.' : 'GLB download ready.');
        notifyExport(format, true);
      } catch (err) {
        this.announce('Stage export failed.');
        notifyExport(format, false);
        throw err;
      }
    }

    async _exportObj() {
      if (!this._object) return;
      const mod = await import('three/addons/exporters/OBJExporter.js');
      const mats = this._nameParts();
      const base = this._basename;
      const obj =
        'mtllib ' + base + '.mtl\n' + new mod.OBJExporter().parse(this._object);
      let mtl = '# Exported by three-d-stage\n';
      for (const m of mats) {
        const c = m.color || { r: 0.8, g: 0.8, b: 0.8 };
        const rough = typeof m.roughness === 'number' ? m.roughness : 0.5;
        const opacity = typeof m.opacity === 'number' ? m.opacity : 1;
        mtl += 'newmtl ' + m.name + '\n';
        mtl +=
          'Kd ' + c.r.toFixed(4) + ' ' + c.g.toFixed(4) + ' ' + c.b.toFixed(4) + '\n';
        mtl += 'Ks 0.2000 0.2000 0.2000\n';
        mtl += 'Ns ' + Math.round((1 - rough) * 200) + '\n';
        mtl += 'd ' + opacity.toFixed(4) + '\n\n';
      }
      download(new Blob([obj], { type: 'text/plain' }), base + '.obj');
      download(new Blob([mtl], { type: 'text/plain' }), base + '.mtl');
    }

    async _exportGlb() {
      if (!this._object) return;
      const mod = await import('three/addons/exporters/GLTFExporter.js');
      this._nameParts();
      const base = this._basename;
      const buf = await new mod.GLTFExporter().parseAsync(this._object, {
        binary: true,
      });
      download(
        new Blob([buf], { type: 'model/gltf-binary' }),
        base + '.glb'
      );
    }
  }

  customElements.define('three-d-stage', ThreeDStage);
})();
