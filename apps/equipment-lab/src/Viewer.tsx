import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Joint, ModelPackage } from './model';
const hash = async (bytes: ArrayBuffer) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
function dispose(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse(node => { if (node instanceof THREE.Mesh) { geometries.add(node.geometry); for (const material of [node.material].flat()) { materials.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value); } } });
  geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => { value.dispose(); const image = value.image as { close?: () => void } | undefined; image?.close?.(); });
}
/* A narrow panel keeps a button row on one scrolling line. The row is marked while more buttons follow, so the stylesheet can fade that edge. */
function useScrollMark(row: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const node = row.current; if (!node) return;
    const mark = () => node.toggleAttribute('data-more', node.scrollWidth - node.clientWidth - node.scrollLeft > 1);
    const observer = new ResizeObserver(mark); observer.observe(node); node.addEventListener('scroll', mark, { passive: true }); mark();
    return () => { observer.disconnect(); node.removeEventListener('scroll', mark); };
  }, []);
}
/* Loads one catalog package: `base` and `manifest` come from its catalog row, `pack` from the bundled registry.
   The parent keys this component by package, so one mount serves one package.
   A package with service joints also takes `state`: the viewer moves the tagged nodes to it and frames the view that shows it. */
export default function Viewer({ pack, base, manifest: manifestName, name, selected, onSelect, state, onState }: { pack: ModelPackage; base: string; manifest: string; name: string; selected: string; onSelect: (id: string) => void; state: string; onState: (id: string) => void }) {
  const mount = useRef<HTMLDivElement>(null), views = useRef<HTMLDivElement>(null), states = useRef<HTMLDivElement>(null), selectRef = useRef(onSelect), selectedRef = useRef(selected), stateRef = useRef(state);
  const highlight = useRef<(id: string) => void>(() => {}), preset = useRef<(view: string) => void>(() => {}), pose = useRef<(id: string, animate: boolean) => void>(() => {});
  const [generation, setGeneration] = useState(0);
  useEffect(() => { const restore = (event: PageTransitionEvent) => { if (event.persisted) setGeneration(value => value + 1); }; window.addEventListener('pageshow', restore); return () => window.removeEventListener('pageshow', restore); }, []);
  const loading = `Loading ${pack.label} model…`, list = `Use the ${pack.noun} list and reference below.`;
  const [status, setStatus] = useState(loading), [problem, setProblem] = useState(false);
  selectRef.current = onSelect; selectedRef.current = selected; stateRef.current = state;
  useEffect(() => { highlight.current(selected); }, [selected]);
  useEffect(() => { pose.current(state, true); }, [state]);
  useEffect(() => {
    const container = mount.current!, ids = pack.ids;
    const owner = (node: THREE.Object3D | null): string | undefined => { while (node) { for (const id of [node.userData.componentId, node.userData.ownerId]) if (ids.includes(id)) return id; node = node.parent; } };
    setProblem(false); setStatus(loading);
    let disposed = false, renderer: THREE.WebGLRenderer | undefined, controls: OrbitControls | undefined, root: THREE.Object3D | undefined, frame = 0, tween = 0;
    const abort = new AbortController(); const timeout = window.setTimeout(() => abort.abort(), 20000);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(37, 1, .005, 50);
    const fail = (message: string) => { if (!disposed) { setProblem(true); setStatus(message); } };
    const draw = () => { if (renderer && container.clientWidth && container.clientHeight) { renderer.render(scene, camera); container.dataset.renderSize = `${container.clientWidth}x${container.clientHeight}`; container.dataset.renders = String(Number(container.dataset.renders || 0) + 1); } };
    const request = () => { if (!disposed && !frame && !document.hidden) frame = requestAnimationFrame(() => { frame = 0; draw(); }); };
    const resize = () => { const width = container.clientWidth, height = container.clientHeight; if (renderer && width && height) { camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); request(); } };
    const observer = new ResizeObserver(resize);
    const intersection = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) resize(); });
    const palette = matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => { const theme = document.documentElement.dataset.avTheme; scene.background = new THREE.Color(theme === 'dark' || theme === 'black' || theme === 'system' && palette.matches ? '#171e24' : '#e5e1da'); request(); };
    const themeObserver = new MutationObserver(applyTheme);
    const lost = (event: Event) => { event.preventDefault(); fail(`3D view unavailable. The ${pack.noun} list and reference remain available. Reload to restore the viewer.`); };
    let pointer = { x: 0, y: 0 }; const down = (event: PointerEvent) => { pointer = { x: event.clientX, y: event.clientY }; };
    const up = (event: PointerEvent) => {
      if (!root || Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 5) return;
      const rect = renderer!.domElement.getBoundingClientRect(), ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      const id = ray.intersectObject(root, true).map(hit => owner(hit.object)).find(Boolean); if (id) selectRef.current(id);
    };
    const hide = () => { if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; } else request(); };
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute('aria-label', `${name} interactive model`); renderer.domElement.setAttribute('role', 'img');
      container.append(renderer.domElement); controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false; controls.minDistance = pack.distance[0]; controls.maxDistance = pack.distance[1];
      controls.addEventListener('change', request); renderer.domElement.addEventListener('webglcontextlost', lost); renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up);
      applyTheme(); palette.addEventListener('change', applyTheme);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x566171, 2.5)); const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(1, 2, 2); scene.add(light);
      const fill = new THREE.DirectionalLight(0xc6d9ff, 2); fill.position.set(-2, 1, -1); scene.add(fill);
      observer.observe(container); intersection.observe(container); themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-av-theme'] }); document.addEventListener('visibilitychange', hide);
      void (async () => {
        const response = await fetch(base + manifestName, { signal: abort.signal }); if (!response.ok) throw Error('Model manifest unavailable.'); const manifest = await response.json();
        if (manifest.schema !== 'equipment.reference.manifest.v1' || manifest.revision !== '1.0.0' || manifest.assetId !== pack.id) throw Error('Unsupported model package.');
        async function checked(key: string) { const record = manifest.files[key]; if (!record || !/^[a-z0-9.]+$/.test(record.name) || !/^[a-f0-9]{64}$/.test(record.sha256)) throw Error('Invalid asset record.'); const response = await fetch(base + record.name, { signal: abort.signal }); if (!response.ok) throw Error('Model asset unavailable.'); const bytes = await response.arrayBuffer(); if (bytes.byteLength !== record.bytes || await hash(bytes) !== record.sha256) throw Error('Model integrity check failed.'); return bytes; }
        const [bytes, rawDefinition] = await Promise.all([checked('model'), checked('definition')]);
        const definition = JSON.parse(new TextDecoder().decode(rawDefinition));
        if (definition.schema !== 'equipment.reference.v1' || definition.revision !== '1.0.0' || definition.frame.units !== 'm' || definition.frame.up !== '+Y' || definition.frame.front !== '+Z' || ids.length !== Object.keys(definition.componentMap || {}).length || !ids.every(id => definition.componentMap[id] === id)) throw Error('Unsupported model definition.');
        const view = new DataView(bytes); if (view.getUint32(0,true) !== 0x46546c67 || view.getUint32(4,true) !== 2 || view.getUint32(8,true) !== bytes.byteLength) throw Error('Invalid GLB.');
        const doc = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,view.getUint32(12,true)))); if ((doc.buffers || []).some((value: {uri?: string}) => value.uri) || (doc.images || []).some((value: {uri?: string}) => value.uri)) throw Error('Model must embed its resources.');
        const loaded = await new GLTFLoader().parseAsync(bytes, ''); if (disposed) { dispose(loaded.scene); return; } root = loaded.scene;
        const found = new Set<string>(); root.traverse(node => { const id = owner(node); if (id) found.add(id); }); if (!ids.every(id => found.has(id))) throw Error(`Model ${pack.noun} mapping is incomplete.`);
        const textures = new Set<THREE.Texture>(); root.traverse(node => { if (node instanceof THREE.Mesh) for (const material of [node.material].flat()) for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value); });
        if (textures.size !== definition.textures.length || [...textures].some(texture => !(texture.image as {width?:number})?.width)) throw Error('Model label textures are incomplete.');
        container.dataset.textures = String(textures.size);
        // Highlights belong to one mesh even when the GLB reuses its base materials.
        const originals = new Set<THREE.Material>();
        root.traverse(node => { if (node instanceof THREE.Mesh) { const copy = (material: THREE.Material) => { originals.add(material); return material.clone(); }; node.material = Array.isArray(node.material) ? node.material.map(copy) : copy(node.material); } });
        originals.forEach(material => material.dispose());
        // Service joints. A node moves with a joint when its extras name it; each starts from its exported transform.
        const joints: Record<string, Joint> = pack.joints || {}, moving: { node: THREE.Object3D; id: string; joint: Joint; position: THREE.Vector3; quaternion: THREE.Quaternion }[] = [];
        root.traverse(node => { const id = node.userData.joint; if (typeof id !== 'string') return; if (!joints[id]) throw Error('Model joints are not supported.'); moving.push({ node, id, joint: joints[id], position: node.position.clone(), quaternion: node.quaternion.clone() }); });
        if (Object.keys(joints).some(id => !moving.some(item => item.id === id))) throw Error('Model joints are incomplete.');
        const place = (values: Record<string, number>) => { for (const item of moving) {
          const value = values[item.id] ?? item.joint.rest, axis = new THREE.Vector3(item.joint.axis[0], item.joint.axis[1], item.joint.axis[2]).normalize();
          item.node.position.copy(item.position); item.node.quaternion.copy(item.quaternion);
          if (item.joint.kind === 'hinge' && item.joint.pivot) { const turn = new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(value)), pivot = new THREE.Vector3(item.joint.pivot[0], item.joint.pivot[1], item.joint.pivot[2]); item.node.position.sub(pivot).applyQuaternion(turn).add(pivot); item.node.quaternion.premultiply(turn); }
          else item.node.position.addScaledVector(axis, value / 1000);
        } };
        scene.add(root); let bounds = new THREE.Box3().setFromObject(root), center = bounds.getCenter(new THREE.Vector3()); controls!.target.copy(center);
        // Framing follows the parts as they stand now, so an open cover or a withdrawn unit stays in the picture.
        const measure = () => { root!.updateMatrixWorld(true); bounds = new THREE.Box3().setFromObject(root!); center = bounds.getCenter(new THREE.Vector3()); container.dataset.extent = bounds.getSize(new THREE.Vector3()).toArray().map(value => Math.round(value * 1000)).join('x'); };
        const original = new Map<THREE.MeshStandardMaterial, THREE.Color>();
        highlight.current = id => { root?.traverse(node => { if (node instanceof THREE.Mesh) for (const material of [node.material].flat()) if (material instanceof THREE.MeshStandardMaterial) { if (!original.has(material)) original.set(material, material.emissive.clone()); material.emissive.copy(owner(node) === id ? new THREE.Color('#6a3512') : original.get(material)!); } }); container.dataset.selected = id; request(); };
        // The distance from which the box of the parts, as they stand, just fills the picture when seen from `direction`.
        const fit = (direction: THREE.Vector3) => {
          const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize(), up = new THREE.Vector3().crossVectors(direction, right);
          const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), horizontal = vertical * camera.aspect, corner = new THREE.Vector3(); let reach = 0;
          for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) { corner.set(x, y, z).sub(center); const near = corner.dot(direction); reach = Math.max(reach, near + Math.abs(corner.dot(right)) / horizontal, near + Math.abs(corner.dot(up)) / vertical); }
          return reach * 1.14;
        };
        preset.current = viewId => {
          const halfFov = Math.min(THREE.MathUtils.degToRad(camera.fov)/2, Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*camera.aspect)); const distance = bounds.getSize(new THREE.Vector3()).length()/2/Math.sin(halfFov)*1.08;
          const chosen = pack.views.find(item => item.id === viewId) || pack.views[0], direction = new THREE.Vector3(chosen.direction[0], chosen.direction[1], chosen.direction[2]).normalize();
          // Orbit controls keep +Y up, so a straight-down view leans slightly to settle which way is up on screen.
          if (chosen.up) direction.addScaledVector(new THREE.Vector3(chosen.up[0], chosen.up[1], chosen.up[2]), -.02).normalize();
          // A package with states is framed on the box of its parts as they stand, so an open cover does not shrink the picture more than it must.
          const reach = pack.states ? fit(direction) : distance;
          camera.position.copy(center).add(direction.multiplyScalar(reach)); controls!.target.copy(center); controls!.update(); request();
        };
        const rest = Object.fromEntries(Object.entries(joints).map(([id, joint]) => [id, joint.rest])), values: Record<string, number> = { ...rest };
        let shown = pack.states?.[0]?.id || '';
        pose.current = (id, animate) => {
          const next = pack.states?.find(item => item.id === id); if (!next || !moving.length || next.id === shown) return;
          cancelAnimationFrame(tween); tween = 0;
          const from = { ...values }, to: Record<string, number> = { ...rest, ...next.joints };
          // The camera goes first, to the view that shows this state, framed on where the parts will end up.
          place(to); measure(); preset.current(next.view); place(from);
          const settle = () => { Object.assign(values, to); place(values); shown = next.id; container.dataset.state = next.id; request(); };
          if (!animate || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) { settle(); return; }
          delete container.dataset.state;
          const started = performance.now();
          const step = (now: number) => { if (disposed) return; const t = Math.min(1, (now - started) / 450), eased = t * t * (3 - 2 * t); for (const key of Object.keys(to)) values[key] = from[key] + (to[key] - from[key]) * eased; place(values); draw(); if (t < 1) tween = requestAnimationFrame(step); else { tween = 0; settle(); } };
          tween = requestAnimationFrame(step);
        };
        resize(); measure(); preset.current(pack.firstView || pack.views[0].id); highlight.current(selectedRef.current);
        if (shown) container.dataset.state = shown; container.dataset.joints = String(moving.length);
        pose.current(stateRef.current, false);
        container.dataset.ready = 'true'; container.dataset.controls = String(found.size); setStatus(`Drag to orbit. Scroll to zoom. Select a ${pack.noun} on the model or in the list.`);
      })().catch(error => fail(`${error instanceof Error ? error.message : '3D view unavailable.'} ${list}`)).finally(() => clearTimeout(timeout));
    } catch { fail(`WebGL is unavailable. ${list}`); }
    const release = () => { if (disposed) return; disposed = true; window.removeEventListener('pagehide', release); abort.abort(); clearTimeout(timeout); cancelAnimationFrame(frame); cancelAnimationFrame(tween); observer.disconnect(); intersection.disconnect(); themeObserver.disconnect(); palette.removeEventListener('change', applyTheme); document.removeEventListener('visibilitychange', hide); controls?.dispose(); if (root) dispose(root); renderer?.domElement.removeEventListener('webglcontextlost', lost); renderer?.domElement.removeEventListener('pointerdown', down); renderer?.domElement.removeEventListener('pointerup', up); renderer?.dispose(); renderer?.forceContextLoss(); container.replaceChildren(); for (const key of ['ready','textures','controls','renderSize','renders','selected','state','joints','extent']) delete container.dataset[key]; highlight.current = () => {}; preset.current = () => {}; pose.current = () => {}; };
    window.addEventListener('pagehide', release);
    return release;
  }, [generation]);
  useScrollMark(views); useScrollMark(states);
  // A browser may leave a partly hidden button where it is on focus, so each one asks to be shown.
  return <div className="lab-viewer"><div className="lab-canvas" ref={mount} /><div className="lab-view-buttons" ref={views} aria-label="Model views">{pack.views.map(view => <button key={view.id} onFocus={event => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })} onClick={() => preset.current(view.id)}>{view.label}</button>)}</div>{pack.states && <div className="lab-state-buttons" ref={states} role="group" aria-label="Model states">{pack.states.map(item => <button key={item.id} aria-pressed={item.id === state} onFocus={event => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })} onClick={() => onState(item.id)}>{item.label}</button>)}</div>}<p className={problem ? 'lab-error' : 'lab-help'} role="status">{status}</p></div>;
}
