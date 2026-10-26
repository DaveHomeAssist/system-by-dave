import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HEAD_IDS } from './model';
const BASE = '/equipment-lab/data/models/cartoni.maxima30.reference/';
const hash = async (bytes: ArrayBuffer) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
function dispose(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse(node => { if (node instanceof THREE.Mesh) { geometries.add(node.geometry); for (const material of [node.material].flat()) { materials.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value); } } });
  geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => { value.dispose(); const image = value.image as { close?: () => void } | undefined; image?.close?.(); });
}
function owner(node: THREE.Object3D | null): string | undefined {
  while (node) { for (const id of [node.userData.componentId, node.userData.ownerId]) if (HEAD_IDS.includes(id)) return id; node = node.parent; }
}
export default function Viewer({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const mount = useRef<HTMLDivElement>(null), selectRef = useRef(onSelect), selectedRef = useRef(selected);
  const highlight = useRef<(id: string) => void>(() => {}), preset = useRef<(side: string) => void>(() => {});
  const [generation, setGeneration] = useState(0);
  useEffect(() => { const restore = (event: PageTransitionEvent) => { if (event.persisted) setGeneration(value => value + 1); }; window.addEventListener('pageshow', restore); return () => window.removeEventListener('pageshow', restore); }, []);
  const [status, setStatus] = useState('Loading Cartoni model…'), [problem, setProblem] = useState(false);
  selectRef.current = onSelect; selectedRef.current = selected;
  useEffect(() => { highlight.current(selected); }, [selected]);
  useEffect(() => {
    const container = mount.current!;
    setProblem(false); setStatus('Loading Cartoni model…');
    let disposed = false, renderer: THREE.WebGLRenderer | undefined, controls: OrbitControls | undefined, root: THREE.Object3D | undefined, frame = 0;
    const abort = new AbortController(); const timeout = window.setTimeout(() => abort.abort(), 20000);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(37, 1, .005, 50);
    const fail = (message: string) => { if (!disposed) { setProblem(true); setStatus(message); } };
    const request = () => { if (!disposed && !frame && !document.hidden) frame = requestAnimationFrame(() => { frame = 0; if (renderer && container.clientWidth && container.clientHeight) { renderer.render(scene, camera); container.dataset.renderSize = `${container.clientWidth}x${container.clientHeight}`; container.dataset.renders = String(Number(container.dataset.renders || 0) + 1); } }); };
    const resize = () => { const width = container.clientWidth, height = container.clientHeight; if (renderer && width && height) { camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); request(); } };
    const observer = new ResizeObserver(resize);
    const intersection = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) resize(); });
    const palette = matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => { const theme = document.documentElement.dataset.avTheme; scene.background = new THREE.Color(theme === 'dark' || theme === 'black' || theme === 'system' && palette.matches ? '#171e24' : '#e5e1da'); request(); };
    const themeObserver = new MutationObserver(applyTheme);
    const lost = (event: Event) => { event.preventDefault(); fail('3D view unavailable. The control list and reference remain available. Reload to restore the viewer.'); };
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
      renderer.domElement.setAttribute('aria-label', 'Cartoni Maxima 30 interactive model'); renderer.domElement.setAttribute('role', 'img');
      container.append(renderer.domElement); controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false; controls.minDistance = .18; controls.maxDistance = 3;
      controls.addEventListener('change', request); renderer.domElement.addEventListener('webglcontextlost', lost); renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up);
      applyTheme(); palette.addEventListener('change', applyTheme);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x566171, 2.5)); const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(1, 2, 2); scene.add(light);
      const fill = new THREE.DirectionalLight(0xc6d9ff, 2); fill.position.set(-2, 1, -1); scene.add(fill);
      observer.observe(container); intersection.observe(container); themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-av-theme'] }); document.addEventListener('visibilitychange', hide);
      void (async () => {
        const response = await fetch(BASE + 'cartoni.maxima30.manifest.json', { signal: abort.signal }); if (!response.ok) throw Error('Model manifest unavailable.'); const manifest = await response.json();
        if (manifest.schema !== 'equipment.reference.manifest.v1' || manifest.revision !== '1.0.0' || manifest.assetId !== 'C02') throw Error('Unsupported model package.');
        async function checked(key: string) { const record = manifest.files[key]; if (!record || !/^[a-z0-9.]+$/.test(record.name) || !/^[a-f0-9]{64}$/.test(record.sha256)) throw Error('Invalid asset record.'); const response = await fetch(BASE + record.name, { signal: abort.signal }); if (!response.ok) throw Error('Model asset unavailable.'); const bytes = await response.arrayBuffer(); if (bytes.byteLength !== record.bytes || await hash(bytes) !== record.sha256) throw Error('Model integrity check failed.'); return bytes; }
        const [bytes, rawDefinition] = await Promise.all([checked('model'), checked('definition')]);
        const definition = JSON.parse(new TextDecoder().decode(rawDefinition));
        if (definition.schema !== 'equipment.reference.v1' || definition.revision !== '1.0.0' || definition.frame.units !== 'm' || definition.frame.up !== '+Y' || definition.frame.front !== '+Z' || HEAD_IDS.length !== Object.keys(definition.componentMap || {}).length || !HEAD_IDS.every(id => definition.componentMap[id] === id)) throw Error('Unsupported model definition.');
        const view = new DataView(bytes); if (view.getUint32(0,true) !== 0x46546c67 || view.getUint32(4,true) !== 2 || view.getUint32(8,true) !== bytes.byteLength) throw Error('Invalid GLB.');
        const doc = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,view.getUint32(12,true)))); if ((doc.buffers || []).some((value: {uri?: string}) => value.uri) || (doc.images || []).some((value: {uri?: string}) => value.uri)) throw Error('Model must embed its resources.');
        const loaded = await new GLTFLoader().parseAsync(bytes, ''); if (disposed) { dispose(loaded.scene); return; } root = loaded.scene;
        const found = new Set<string>(); root.traverse(node => { const id = owner(node); if (id) found.add(id); }); if (!HEAD_IDS.every(id => found.has(id))) throw Error('Model control mapping is incomplete.');
        const textures = new Set<THREE.Texture>(); root.traverse(node => { if (node instanceof THREE.Mesh) for (const material of [node.material].flat()) for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value); });
        if (textures.size !== definition.textures.length || [...textures].some(texture => !(texture.image as {width?:number})?.width)) throw Error('Model label textures are incomplete.');
        container.dataset.textures = String(textures.size);
        // Highlights belong to one mesh even when the GLB reuses its base materials.
        const originals = new Set<THREE.Material>();
        root.traverse(node => { if (node instanceof THREE.Mesh) { const copy = (material: THREE.Material) => { originals.add(material); return material.clone(); }; node.material = Array.isArray(node.material) ? node.material.map(copy) : copy(node.material); } });
        originals.forEach(material => material.dispose());
        scene.add(root); const bounds = new THREE.Box3().setFromObject(root), center = bounds.getCenter(new THREE.Vector3()); controls!.target.copy(center);
        const original = new Map<THREE.MeshStandardMaterial, THREE.Color>();
        highlight.current = id => { root?.traverse(node => { if (node instanceof THREE.Mesh) for (const material of [node.material].flat()) if (material instanceof THREE.MeshStandardMaterial) { if (!original.has(material)) original.set(material, material.emissive.clone()); material.emissive.copy(owner(node) === id ? new THREE.Color('#6a3512') : original.get(material)!); } }); container.dataset.selected = id; request(); };
        preset.current = side => { const halfFov = Math.min(THREE.MathUtils.degToRad(camera.fov)/2, Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*camera.aspect)); const distance = bounds.getSize(new THREE.Vector3()).length()/2/Math.sin(halfFov)*1.08; const directions: Record<string, number[]> = { front: [0, .35, 1], rear: [0, .35, -1], side: [1, .3, 0], overview: [.85, .65, 1] }; const direction = directions[side] || directions.overview; camera.position.copy(center).add(new THREE.Vector3(direction[0], direction[1], direction[2]).normalize().multiplyScalar(distance)); controls!.target.copy(center); controls!.update(); request(); };
        resize(); preset.current('overview'); highlight.current(selectedRef.current); container.dataset.ready = 'true'; container.dataset.controls = String(found.size); setStatus('Drag to orbit. Scroll to zoom. Select a control on the model or in the list.');
      })().catch(error => fail(`${error instanceof Error ? error.message : '3D view unavailable.'} Use the control list and reference below.`)).finally(() => clearTimeout(timeout));
    } catch { fail('WebGL is unavailable. Use the control list and reference below.'); }
    const release = () => { if (disposed) return; disposed = true; window.removeEventListener('pagehide', release); abort.abort(); clearTimeout(timeout); cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); themeObserver.disconnect(); palette.removeEventListener('change', applyTheme); document.removeEventListener('visibilitychange', hide); controls?.dispose(); if (root) dispose(root); renderer?.domElement.removeEventListener('webglcontextlost', lost); renderer?.domElement.removeEventListener('pointerdown', down); renderer?.domElement.removeEventListener('pointerup', up); renderer?.dispose(); renderer?.forceContextLoss(); container.replaceChildren(); for (const key of ['ready','textures','controls','renderSize','renders','selected']) delete container.dataset[key]; highlight.current = () => {}; preset.current = () => {}; };
    window.addEventListener('pagehide', release);
    return release;
  }, [generation]);
  return <div className="lab-viewer"><div className="lab-canvas" ref={mount} /><div className="lab-view-buttons" aria-label="Model views">{['overview','front','rear','side'].map(side => <button key={side} onClick={() => preset.current(side)}>{side[0].toUpperCase() + side.slice(1)}</button>)}</div><p className={problem ? 'lab-error' : 'lab-help'} role="status">{status}</p></div>;
}
