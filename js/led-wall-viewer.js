import * as THREE from '../ProjectorThrow/vendor/three/three.module.min.js';

const preview = document.getElementById('ledWallPreview');
const hint = document.getElementById('ledViewerHint');
const frontButton = document.getElementById('ledPreviewFrontBtn');
const isoButton = document.getElementById('ledPreviewIsoBtn');
const canvas = document.createElement('canvas');
const context = canvas.getContext('webgl2', { alpha: true, antialias: true });

if (!context) {
  hint.textContent = '3D is unavailable in this browser. The cabinet grid remains visible; use the calculated dimensions for planning.';
  preview.dataset.viewerState = 'fallback';
} else {
  const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
  scene.add(new THREE.HemisphereLight(0xdce8ff, 0x283047, 2.3));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
  keyLight.position.set(-3, 5, 7);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x8f89ff, 1.25);
  rimLight.position.set(4, 2, -4);
  scene.add(rimLight);

  let model = null;
  let outline = null;
  let texture = null;
  let signature = '';
  let fitRadius = 5;
  let zoom = 1;
  let yaw = -0.38;
  let pitch = 0.16;
  let drawFrame = 0;
  let tweenFrame = 0;
  let disposed = false;
  const pointers = new Map();
  let pinchDistance = 0;

  function requestRender() {
    if (drawFrame || document.hidden || disposed || !preview.classList.contains('has-3d')) return;
    drawFrame = requestAnimationFrame(() => {
      drawFrame = 0;
      renderer.render(scene, camera);
    });
  }

  function applyCamera() {
    const radius = fitRadius * zoom;
    camera.position.set(
      radius * Math.sin(yaw) * Math.cos(pitch),
      radius * Math.sin(pitch),
      radius * Math.cos(yaw) * Math.cos(pitch)
    );
    camera.lookAt(0, 0, 0);
    canvas.dataset.yaw = yaw.toFixed(3);
    canvas.dataset.pitch = pitch.toFixed(3);
    canvas.dataset.zoom = zoom.toFixed(3);
    requestRender();
  }

  function setFreeView() {
    frontButton.setAttribute('aria-pressed', 'false');
    isoButton.setAttribute('aria-pressed', 'false');
  }

  function stopTween() {
    if (tweenFrame) cancelAnimationFrame(tweenFrame);
    tweenFrame = 0;
  }

  function setView(view) {
    stopTween();
    const targetYaw = view === 'front' ? 0 : -0.38;
    const targetPitch = view === 'front' ? 0 : 0.16;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) {
      yaw = targetYaw;
      pitch = targetPitch;
      applyCamera();
      return;
    }
    const startYaw = yaw;
    const startPitch = pitch;
    const started = performance.now();
    const step = now => {
      const progress = Math.min(1, (now - started) / 220);
      const eased = 1 - (1 - progress) ** 3;
      yaw = startYaw + (targetYaw - startYaw) * eased;
      pitch = startPitch + (targetPitch - startPitch) * eased;
      applyCamera();
      tweenFrame = progress < 1 ? requestAnimationFrame(step) : 0;
    };
    tweenFrame = requestAnimationFrame(step);
  }

  function makeFrontTexture(columns, rows, ratio) {
    const surface = document.createElement('canvas');
    surface.width = Math.min(2048, Math.max(512, Math.round(1024 * Math.sqrt(ratio))));
    surface.height = Math.min(2048, Math.max(512, Math.round(1024 / Math.sqrt(ratio))));
    const ctx = surface.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, surface.width, surface.height);
    gradient.addColorStop(0, '#263c77');
    gradient.addColorStop(0.48, '#704493');
    gradient.addColorStop(1, '#b84d30');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, surface.width, surface.height);
    const glow = ctx.createRadialGradient(surface.width * 0.7, surface.height * 0.2, 0,
      surface.width * 0.7, surface.height * 0.2, surface.width * 0.7);
    glow.addColorStop(0, 'rgba(255,255,255,.32)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, surface.width, surface.height);
    const columnStep = Math.max(1, Math.ceil(columns / 180));
    const rowStep = Math.max(1, Math.ceil(rows / 180));
    ctx.strokeStyle = 'rgba(9,15,29,.8)';
    ctx.lineWidth = Math.max(1, surface.width / columns * 0.018);
    ctx.beginPath();
    for (let col = columnStep; col < columns; col += columnStep) {
      const x = Math.round(col * surface.width / columns) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, surface.height);
    }
    for (let row = rowStep; row < rows; row += rowStep) {
      const y = Math.round(row * surface.height / rows) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(surface.width, y);
    }
    ctx.stroke();
    const map = new THREE.CanvasTexture(surface);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }

  function resize() {
    const width = Math.max(1, Math.round(preview.clientWidth));
    const height = Math.max(1, Math.round(preview.clientHeight));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (width !== Math.round(renderer.domElement.width / renderer.getPixelRatio())
      || height !== Math.round(renderer.domElement.height / renderer.getPixelRatio())) {
      renderer.setSize(width, height, false);
    }
    if (model) {
      const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      const vertical = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      const horizontal = size.x / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
      fitRadius = Math.max(vertical, horizontal, size.z * 2) * 1.42;
    }
    applyCamera();
  }

  function updateGeometry() {
    const columns = Number(preview.dataset.columns);
    const rows = Number(preview.dataset.rows);
    const cabinetWidth = Number(preview.dataset.cabinetWidthMm);
    const cabinetHeight = Number(preview.dataset.cabinetHeightMm);
    if (![columns, rows, cabinetWidth, cabinetHeight].every(Number.isFinite)
      || columns < 1 || rows < 1 || cabinetWidth <= 0 || cabinetHeight <= 0) return;
    const nextSignature = `${columns}:${rows}:${cabinetWidth}:${cabinetHeight}`;
    canvas.setAttribute('aria-label', `${preview.getAttribute('aria-label')} Drag or use arrow keys to rotate; scroll or pinch to zoom.`);
    if (signature === nextSignature) return;
    signature = nextSignature;
    if (model) {
      scene.remove(model, outline);
      model.geometry.dispose();
      model.material.forEach(material => material.dispose());
      outline.geometry.dispose();
      outline.material.dispose();
      texture.dispose();
    }
    const fullWidth = columns * cabinetWidth;
    const fullHeight = rows * cabinetHeight;
    const scale = 3 / Math.max(fullWidth, fullHeight);
    const width = fullWidth * scale;
    const height = fullHeight * scale;
    const depth = Math.min(0.28, Math.max(0.1, cabinetHeight * scale * 0.7));
    texture = makeFrontTexture(columns, rows, fullWidth / fullHeight);
    const steel = new THREE.MeshStandardMaterial({ color: 0x303b4b, metalness: 0.48, roughness: 0.58 });
    const side = new THREE.MeshStandardMaterial({ color: 0x222e3d, metalness: 0.48, roughness: 0.58 });
    const front = new THREE.MeshBasicMaterial({ map: texture });
    const back = new THREE.MeshStandardMaterial({ color: 0x151e2c, metalness: 0.38, roughness: 0.7 });
    model = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), [side, side, steel, side, front, back]);
    outline = new THREE.LineSegments(new THREE.EdgesGeometry(model.geometry),
      new THREE.LineBasicMaterial({ color: 0x71839c, transparent: true, opacity: 0.8 }));
    scene.add(model, outline);
    preview.dataset.viewerColumns = String(columns);
    preview.dataset.viewerRows = String(rows);
    resize();
    applyCamera();
  }

  function changeZoom(delta) {
    zoom = THREE.MathUtils.clamp(zoom * delta, 0.65, 2.7);
    applyCamera();
  }

  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-describedby', 'ledViewerHint');
  preview.setAttribute('role', 'group');
  preview.append(canvas);
  preview.classList.add('has-3d');
  preview.dataset.viewerState = 'ready';
  hint.textContent = 'Drag to orbit · pinch or scroll to zoom · arrows to rotate. Depth is schematic.';
  updateGeometry();
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(preview);
  preview.addEventListener('led-wall:geometry', updateGeometry);
  preview.addEventListener('led-wall:view', event => setView(event.detail));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopTween();
    else requestRender();
  });

  canvas.addEventListener('pointerdown', event => {
    stopTween();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      pinchDistance = Math.hypot(first.x - second.x, first.y - second.y);
    }
  });
  canvas.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      if (pinchDistance) changeZoom(pinchDistance / Math.max(distance, 1));
      pinchDistance = distance;
      return;
    }
    yaw -= (event.clientX - previous.x) * 0.009;
    pitch = THREE.MathUtils.clamp(pitch + (event.clientY - previous.y) * 0.009, -1.3, 1.3);
    setFreeView();
    applyCamera();
  });
  const releasePointer = event => {
    pointers.delete(event.pointerId);
    pinchDistance = 0;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    changeZoom(Math.exp(event.deltaY * 0.001));
  }, { passive: false });
  canvas.addEventListener('keydown', event => {
    const step = THREE.MathUtils.degToRad(10);
    if (event.key === 'ArrowLeft') yaw -= step;
    else if (event.key === 'ArrowRight') yaw += step;
    else if (event.key === 'ArrowUp') pitch = Math.min(1.3, pitch + step);
    else if (event.key === 'ArrowDown') pitch = Math.max(-1.3, pitch - step);
    else if (event.key === '+' || event.key === '=') changeZoom(0.88);
    else if (event.key === '-') changeZoom(1.12);
    else return;
    event.preventDefault();
    setFreeView();
    applyCamera();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    stopTween();
    if (drawFrame) cancelAnimationFrame(drawFrame);
    drawFrame = 0;
    preview.classList.remove('has-3d');
    preview.setAttribute('role', 'img');
    preview.dataset.viewerState = 'fallback';
    hint.textContent = '3D connection was lost. The cabinet grid remains visible while the viewer recovers.';
  });
  canvas.addEventListener('webglcontextrestored', () => {
    preview.classList.add('has-3d');
    preview.setAttribute('role', 'group');
    preview.dataset.viewerState = 'ready';
    hint.textContent = 'Drag to orbit · pinch or scroll to zoom · arrows to rotate. Depth is schematic.';
    resize();
    requestRender();
  });
  window.addEventListener('pagehide', event => {
    if (event.persisted || disposed) return;
    stopTween();
    if (drawFrame) cancelAnimationFrame(drawFrame);
    disposed = true;
    observer.disconnect();
    if (model) {
      model.geometry.dispose();
      model.material.forEach(material => material.dispose());
      outline.geometry.dispose();
      outline.material.dispose();
      texture.dispose();
    }
    renderer.dispose();
  });
  window.addEventListener('pageshow', () => requestRender());
}
