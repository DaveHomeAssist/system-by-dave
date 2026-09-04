#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const files = [
  ['node_modules/three/build/three.module.js', 'ProjectorThrow/vendor/three/three.module.js'],
  ['node_modules/three/build/three.core.js', 'ProjectorThrow/vendor/three/three.core.js'],
  ['node_modules/three/examples/jsm/controls/OrbitControls.js', 'ProjectorThrow/vendor/three/addons/controls/OrbitControls.js'],
  ['node_modules/three/examples/jsm/exporters/OBJExporter.js', 'ProjectorThrow/vendor/three/addons/exporters/OBJExporter.js'],
  ['node_modules/three/examples/jsm/exporters/GLTFExporter.js', 'ProjectorThrow/vendor/three/addons/exporters/GLTFExporter.js']
];

files.forEach(([source, target]) => {
  const sourcePath = path.join(root, source);
  const targetPath = path.join(root, target);
  if (!fs.existsSync(sourcePath)) throw new Error(`Missing ${source}; run npm install first.`);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const sourceText = fs.readFileSync(sourcePath, 'utf8');
  fs.writeFileSync(targetPath, sourceText.replace(/ \t/g, '\t'));
});

console.log(`Vendored Three.js ${require('../node_modules/three/package.json').version} for Throwline (${files.length} files).`);
