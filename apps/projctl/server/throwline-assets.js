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
export function throwlineAsset(pathname) {
  const name = pathname.slice('/ProjectorThrow/'.length);
  if (!pathname.startsWith('/ProjectorThrow/') || !THROWLINE_FILES.includes(name)) return null;
  const root = process.env.THROWLINE_ASSETS || (fs.existsSync(path.join(bundledThrowline, 'three-d-stage.js')) ? bundledThrowline : canonicalThrowline);
  const file = path.join(root, name);
  return fs.existsSync(file) ? file : null;
}
