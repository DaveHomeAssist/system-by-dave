import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const THROWLINE_FILES = Object.freeze([
  'three-d-stage.js',
  'vendor/three/three.module.min.js',
  'vendor/three/three.core.min.js',
  'vendor/three/addons/controls/OrbitControls.js',
]);
export const canonicalThrowline = fileURLToPath(new URL('../../../ProjectorThrow/', import.meta.url));
export const bundledThrowline = fileURLToPath(new URL('../runtime/throwline/', import.meta.url));
// The static public copy has no relay or private plot. Only the local relay
// advertises its same-origin renderer, independently of public domain cutover.
export function withThrowlineImports(html) {
  const imports = {
    three: '/ProjectorThrow/vendor/three/three.module.min.js',
    'three/addons/controls/OrbitControls.js': '/ProjectorThrow/vendor/three/addons/controls/OrbitControls.js',
  };
  return html.replace('<!-- Local Throwline import map: supplied by the relay. -->', `<script type="importmap">${JSON.stringify({ imports })}</script>`);
}
export function throwlineAsset(pathname) {
  const name = pathname.slice('/ProjectorThrow/'.length);
  if (!pathname.startsWith('/ProjectorThrow/') || !THROWLINE_FILES.includes(name)) return null;
  const root = process.env.THROWLINE_ASSETS || (fs.existsSync(path.join(bundledThrowline, 'three-d-stage.js')) ? bundledThrowline : canonicalThrowline);
  const file = path.join(root, name);
  return fs.existsSync(file) ? file : null;
}
