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
      this._note.textContent = 'Drag or touch to orbit. Wheel or pinch to zoom. Right-drag to pan. Focus the stage for keys 1–5, arrows, plus, minus, 0, or Home.';
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
      this._manipulationTargets = [];
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
        'The local 3D engine or WebGL renderer could not start. ' +
        'Your calculation data is not affected; use the Throwline planner.';
      const fallback = document.createElement('a');
      fallback.href = this.getAttribute('fallback') || 'index.html?workspace=planner';
      fallback.textContent = 'Open the Throwline planner';
      this._err.replaceChildren(title, message, fallback);
      this._err.hidden = false;
      this.announce('Stage 3D unavailable. Open the offline Throwline app.');
      this.dispatchEvent(new CustomEvent('stage-dependency-error', {
        detail: { message: String(err && err.message ? err.message : err) }
      }));
    }

    async _boot() {
      const bg = this.getAttribute('background');
      if (bg) this.style.setProperty('--stage-bg', bg);
      const [THREE, controlsMod] = await Promise.all([
        import('three'),
        import('three/addons/controls/OrbitControls.js'),
      ]);
      this._THREE = THREE;
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      this._renderer = renderer;
      renderer.domElement.tabIndex = 0;
      renderer.domElement.setAttribute('role', 'application');
      renderer.domElement.setAttribute(
        'aria-label',
        'Interactive Throwline stage. Use keys 1 through 5 for cameras, arrow keys to orbit, plus and minus to zoom, and 0 to reset.'
      );
      renderer.domElement.setAttribute('aria-describedby', 'stage-instructions');
      renderer.domElement.setAttribute(
        'aria-keyshortcuts',
        '1 2 3 4 5 ArrowLeft ArrowRight ArrowUp ArrowDown + - 0 Home'
      );
      this._keyHandler = (event) => this._handleKey(event);
      renderer.domElement.addEventListener('keydown', this._keyHandler);
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
        this.requestRender();
      };
      this._ro = new ResizeObserver(fit);
      this._frame = () => {
        this._frameId = undefined;
        if (this._destroyed || document.hidden || !this.isConnected) return;
        const changed = controls.update();
        renderer.render(scene, camera);
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
      this._setButtonsEnabled(true);
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

    /** Register host-owned meshes as direct-manipulation handles. The stage
     * emits preview/commit intents and never owns Throwline calculations. */
    setManipulationTargets(targets) {
      this._manipulationTargets = Array.isArray(targets)
        ? targets.filter(target => target && target.object && target.id && Array.isArray(target.axis))
        : [];
    }

    _targetForObject(object) {
      let current = object;
      while (current) {
        const match = this._manipulationTargets.find(target => target.object === current);
        if (match) return match;
        current = current.parent;
      }
      return undefined;
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
      const hit = this._raycaster.intersectObjects(this._manipulationTargets.map(target => target.object), true)[0];
      const target = hit && this._targetForObject(hit.object);
      if (!target) return;
      event.preventDefault(); event.stopImmediatePropagation();
      this._controls.enabled = false;
      this._renderer.domElement.setPointerCapture(event.pointerId);
      this._renderer.domElement.dataset.manipulating = 'true';
      this._manipulation = { pointerId: event.pointerId, target, startX: pointer.x, startY: pointer.y, startValue: Number(target.value), axis: this._screenAxis(target, pointer.rect), value: Number(target.value) };
      this._dragReadout.hidden = false;
      this._dragReadout.textContent = `${target.label} · ${Number(target.value).toFixed(2)} ft`;
      this._completeFirstInteraction();
    }

    _handleManipulationMove(event) {
      const active = this._manipulation;
      if (!active || event.pointerId !== active.pointerId) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const pointer = this._pointerPosition(event);
      const axisLength = Math.max(1, active.axis.x * active.axis.x + active.axis.y * active.axis.y);
      const delta = ((pointer.x - active.startX) * active.axis.x + (pointer.y - active.startY) * active.axis.y) / axisLength;
      const step = event.shiftKey ? (Number(active.target.fineStep) || Number(active.target.step) || 0.01) : (Number(active.target.step) || 0.25);
      const raw = active.startValue + delta * (Number(active.target.sensitivity) || 1);
      const value = Math.min(Number(active.target.max), Math.max(Number(active.target.min), Math.round(raw / step) * step));
      if (!Number.isFinite(value) || value === active.value) return;
      active.value = value;
      this._dragReadout.textContent = `${active.target.label} · ${value.toFixed(2)} ft`;
      this.dispatchEvent(new CustomEvent('stage-manipulation', { bubbles: true, detail: { id: active.target.id, type: active.target.type, projectorId: active.target.projectorId, value, phase: 'preview' } }));
    }

    _handleManipulationEnd(event) {
      const active = this._manipulation;
      if (!active || event.pointerId !== active.pointerId) return;
      event.preventDefault(); event.stopImmediatePropagation();
      this._manipulation = undefined;
      this._controls.enabled = true;
      delete this._renderer.domElement.dataset.manipulating;
      this._dragReadout.hidden = true;
      this.dispatchEvent(new CustomEvent('stage-manipulation', { bubbles: true, detail: { id: active.target.id, type: active.target.type, projectorId: active.target.projectorId, value: active.value, phase: 'commit' } }));
      this.requestRender();
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
      if (this._destroyed || document.hidden || !this.isConnected || !this._renderer || this._frameId !== undefined) return;
      this._frameId = requestAnimationFrame(this._frame);
    }

    captureCanvas() {
      if (this._destroyed || !this._renderer || !this._scene || !this._camera) return undefined;
      if (this._controls) this._controls.update();
      this._renderer.render(this._scene, this._camera);
      return this._renderer.domElement;
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
      if (this._frameId !== undefined) cancelAnimationFrame(this._frameId);
      this._frameId = undefined;
      if (this._ro) this._ro.disconnect();
      if (this._visibilityHandler) document.removeEventListener('visibilitychange', this._visibilityHandler);
      if (this._renderer && this._keyHandler) this._renderer.domElement.removeEventListener('keydown', this._keyHandler);
      if (this._renderer && this._pointerDownHandler) {
        this._renderer.domElement.removeEventListener('pointerdown', this._pointerDownHandler, true);
        this._renderer.domElement.removeEventListener('pointermove', this._pointerMoveHandler, true);
        this._renderer.domElement.removeEventListener('pointerup', this._pointerUpHandler, true);
        this._renderer.domElement.removeEventListener('pointercancel', this._pointerUpHandler, true);
      }
      if (this._controls) this._controls.dispose();
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
      if (!this._object) return;
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
