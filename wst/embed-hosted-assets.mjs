import fs from 'node:fs';
import {gunzipSync, gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
for(const name of ['reference-view.js','reference-view.css'])fs.copyFileSync(path.resolve(root,'../apps/projctl/public',name),path.join(root,name));
const worker=path.join(root,'hosting/worker/index.js');
const source=fs.readFileSync(worker,'utf8');
const seam=source.indexOf(';\nconst rates');
if(seam<0)throw Error('Worker asset boundary changed; refusing to overwrite.');
const files={'/':'index.html','/workspace.css':'workspace.css','/workspace.js':'workspace.js','/snow-splash.css':'snow-splash.css','/snow-splash.js':'snow-splash.js','/vendor/gsap.min.js':'vendor/gsap.min.js','/workspace-config.json':'workspace-config.json','/projectors.json':'projectors.json','/reference-view.js':'reference-view.js','/reference-view.css':'reference-view.css'};
const stageRoot=path.join(root,'stage');
const publicRoot=path.resolve(root,'../apps/projctl/public');
for(const name of ['stage-view.js','stage-plot.js','stage-3d.js','stage-reference.js','stage-visibility.js','stage-planner.js','stage-scenario.js','venue-view.js','lanes.js','stage.css','app.css','avd/tokens.css','avd/bundle.css']) {const dest=path.join(stageRoot,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(publicRoot,name),dest);}
const throwline=['three-d-stage.js','throwline-scene-state.js','vendor/three/three.module.min.js','vendor/three/three.core.min.js','vendor/three/addons/controls/OrbitControls.js','vendor/three/addons/loaders/GLTFLoader.js','vendor/three/addons/utils/BufferGeometryUtils.js','vendor/three/addons/utils/SkeletonUtils.js'];
for(const name of throwline)files['/ProjectorThrow/'+name]='../ProjectorThrow/'+name;
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(!file.endsWith('.glb'))files['/stage/'+path.relative(stageRoot,file).split(path.sep).join('/')]=path.relative(root,file);}}walk(stageRoot);
const roomPath=path.join(stageRoot,'room.glb');
const roomBytes=fs.readFileSync(roomPath);
let roomGzip=gzipSync(roomBytes).toString('base64');
const priorBinary=source.slice(source.lastIndexOf('const BINARY = '), source.indexOf(';\nconst rates'));
try{const prior=JSON.parse(priorBinary.slice('const BINARY = '.length))['/stage/room.glb'];if(prior&&gunzipSync(Buffer.from(prior,'base64')).equals(roomBytes))roomGzip=prior;}catch{/* Recompress when the saved model payload is missing or no longer matches. */}
const binary={'/stage/room.glb':roomGzip};
const assets=Object.fromEntries(Object.entries(files).map(([url,file])=>[url,fs.readFileSync(path.join(root,file),'utf8')]));
fs.writeFileSync(worker,'const ASSETS = '+JSON.stringify(assets)+';\nconst BINARY = '+JSON.stringify(binary)+source.slice(seam));
const local=path.resolve(root,'../apps/projctl/public/workspace');
fs.mkdirSync(local,{recursive:true});
for(const file of ['index.html','workspace.css','workspace.js','snow-splash.css','snow-splash.js','vendor/gsap.min.js','workspace-config.json','projectors.json','reference-view.js','reference-view.css']){const dest=path.join(local,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
console.log('Embedded canonical WST assets, configuration and projector reference.');
