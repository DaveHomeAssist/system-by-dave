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
 * three.js loads through the page's import map. Include this EXACT pinned
 * map in <head>, before any module runs — versions and integrity hashes
 * stay together (same map the "3D object" skill mandates):
 *
 *   <script type="importmap">
 *   {
 *     "imports": {
 *       "three": "https://unpkg.com/three@0.184.0/build/three.module.js",
 *       "three/addons/controls/OrbitControls.js": "https://unpkg.com/three@0.184.0/examples/jsm/controls/OrbitControls.js",
 *       "three/addons/exporters/OBJExporter.js": "https://unpkg.com/three@0.184.0/examples/jsm/exporters/OBJExporter.js",
 *       "three/addons/exporters/GLTFExporter.js": "https://unpkg.com/three@0.184.0/examples/jsm/exporters/GLTFExporter.js"
 *     },
 *     "integrity": {
 *       "https://unpkg.com/three@0.184.0/build/three.module.js": "sha384-8FCZ1eVO6it4+pbec2aDtnTrwjWXZLJRC+MAGCIPDgsYnUrl/E0A2YlF8ioMKI/J",
 *       "https://unpkg.com/three@0.184.0/build/three.core.js": "sha384-dw2ooPewaEIrAgl6oFDBmmBWCE9oW9LxRGcfwZ0hLvEprzo202wXl7vCYHRlSnOT",
 *       "https://unpkg.com/three@0.184.0/examples/jsm/controls/OrbitControls.js": "sha384-4rziNxOBZKQ69i+w+f89KJ55TCYquwchVbByQwmaOeIOXdOU2PLDn3kOfXHwIJC9",
 *       "https://unpkg.com/three@0.184.0/examples/jsm/exporters/OBJExporter.js": "sha384-nbwtoZENJD3Vq+ACK0CuGQdPMuDWHkamC2KJD70EV5nfg6jQjfppKOea07YJN+N3",
 *       "https://unpkg.com/three@0.184.0/examples/jsm/exporters/GLTFExporter.js": "sha384-VofkvpG6HERhFCYbsUOHeNXBCqID2nfqkQqnVzE1jc/oPcz+qJ13ADdXH08hE+cQ"
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
    canvas:focus-visible {
      outline: 3px solid var(--hazard, #8a6400);
      outline-offset: -3px;
    }
    .toolbar {
      position: absolute;
      right: 16px;
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
    .note {
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
    @media (max-width: 820px) {
      :host {
        height: auto;
        overflow: visible;
        display: grid;
        grid-template-rows: 320px auto auto;
      }
      .viewport {
        position: relative;
        inset: auto;
        grid-row: 1;
        height: 320px;
        min-height: 320px;
      }
      .note {
        position: static;
        grid-row: 2;
        max-width: none;
        min-height: 44px;
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-top: 1px solid var(--line, rgba(20, 20, 19, 0.2));
        background: var(--case, #fff);
        pointer-events: auto;
      }
      .toolbar {
        position: static;
        grid-row: 3;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        padding: 0 12px 12px;
        background: var(--case, #fff);
      }
      .toolbar button { min-height: 44px; }
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
      this._note = document.createElement('div');
      this._note.id = 'stage-instructions';
      this._note.className = 'note';
      this._note.textContent = 'Drag or touch to orbit · wheel or pinch to zoom · right-drag to pan · focus stage for keyboard';
      root.appendChild(this._note);
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
        // Re-attached after a removal — resume what disconnected stopped.
        if (this._renderer) {
          this._renderer.setAnimationLoop(this._loop);
          this._ro && this._ro.observe(this._viewport);
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
      title.textContent = 'Stage 3D needs an internet connection';
      const message = document.createElement('p');
      message.textContent =
        'The optional companion could not load its pinned Three.js modules from unpkg. ' +
        'Your calculation data is not affected; use the self-contained Throwline app offline.';
      const fallback = document.createElement('a');
      fallback.href = this.getAttribute('fallback') || 'index.html';
      fallback.textContent = 'Open the offline Throwline app';
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
      // preserveDrawingBuffer keeps the last frame readable after
      // compositing (toDataURL / drawImage) — it's what lets the
      // screenshot tools capture the scene instead of a blank canvas.
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
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
      renderer.domElement.addEventListener('keydown', (event) => this._handleKey(event));
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
      });
      controls.addEventListener('end', () => this.announce('Stage view adjusted.'));

      const fit = () => {
        const w = this._viewport.clientWidth || 1;
        const h = this._viewport.clientHeight || 1;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      fit();
      this._ro = new ResizeObserver(fit);
      this._loop = () => {
        controls.update();
        renderer.render(scene, camera);
      };
      // Detached while three.js was fetching? Stay idle — the
      // connectedCallback resume starts the loop and observer on
      // reattach.
      if (this.isConnected) {
        this._ro.observe(this._viewport);
        renderer.setAnimationLoop(this._loop);
      }

      this.announce('Stage 3D loaded. Focus the stage for keyboard controls.');
      this._readyResolve({ THREE });
    }

    disconnectedCallback() {
      // Stop rendering and observing while detached; connectedCallback
      // resumes both. (The renderer itself is kept — a move within the
      // document must not rebuild the scene.)
      if (this._renderer) this._renderer.setAnimationLoop(null);
      if (this._ro) this._ro.disconnect();
    }

    /** Show (and own) the object. Replaces any previous object, enables
     *  shadows on every mesh, rests it on the ground plane, and frames
     *  the camera to its bounds. */
    setObject(object) {
      const THREE = this._THREE;
      if (!THREE) throw new Error('three-d-stage: not ready — await stage.ready first');
      if (this._object) this._scene.remove(this._object);
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
      if (options.saveDefault) {
        this._defaultView = {
          position: [...position],
          target: [...target],
          label: label || 'three-quarter'
        };
      }
      if (options.announce !== false) this.announce((label || 'Stage') + ' camera selected.');
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
      this.announce('Stage camera orbited.');
    }

    zoomBy(factor) {
      if (!this._camera || !this._controls) return;
      const offset = this._camera.position.clone().sub(this._controls.target);
      const nextDistance = Math.max(0.25, Math.min(300, offset.length() * factor));
      offset.setLength(nextDistance);
      this._camera.position.copy(this._controls.target).add(offset);
      this._controls.update();
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

    _handleKey(event) {
      const key = event.key;
      if (/^[1-5]$/.test(key)) {
        event.preventDefault();
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
