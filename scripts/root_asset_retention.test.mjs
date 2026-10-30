import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { previousDeployment, retainAssets } from './root_asset_retention.mjs';
const sha='a'.repeat(40);
const item=(id,extra={})=>({id,sha,ref:'main',environment:'github-pages',...extra});
const git=(repo,...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const put=(root,file,text)=>{mkdirSync(path.dirname(path.join(root,file)),{recursive:true});writeFileSync(path.join(root,file),text);};
export function fixture() {
  const root=mkdtempSync(path.join(tmpdir(),'root-retention-'));
  const repo=path.join(root,'repo'),stage=path.join(root,'stage');mkdirSync(repo);mkdirSync(stage);
  git(repo,'init','-q');git(repo,'config','user.name','Fixture');git(repo,'config','user.email','fixture@example.invalid');
  const commit=()=>{git(repo,'add','.');git(repo,'commit','-qm','fixture');return git(repo,'rev-parse','HEAD');};
  put(repo,'noteforge/index.html','old page');
  put(repo,'noteforge/assets/entry-old.js','import("./lazy-old.js")');put(repo,'noteforge/assets/lazy-old.js','old chunk');
  put(repo,'noteforge/assets/shared.css','old style');
  put(repo,'noteforge/sw.js','old worker');put(repo,'private.txt','not an asset');
  put(repo,'cheesesteaks/index.html','old next page');put(repo,'cheesesteaks/_next/static/build-A/_buildManifest.js','old manifest');
  const previousSha=commit();
  rmSync(path.join(repo,'noteforge/assets'),{recursive:true});
  put(repo,'noteforge/index.html','new page');put(repo,'noteforge/assets/entry-new.js','new chunk');put(repo,'noteforge/assets/shared.css','new style');
  const currentSha=commit();
  put(stage,'noteforge/index.html','new page');put(stage,'noteforge/assets/entry-new.js','new chunk');put(stage,'noteforge/assets/shared.css','new style');
  put(stage,'cheesesteaks/index.html','new next page');put(stage,'cheesesteaks/_next/static/build-B/_buildManifest.js','new manifest');
  return {root,repo,stage,previousSha,currentSha,commit,close:()=>rmSync(root,{recursive:true,force:true})};
}
function run(fn){const f=fixture();try{fn(f)}finally{f.close()}}

test('selects proven main Pages success, skipping pending and unrelated records',async()=>{
  const result=await previousDeployment(async route=>route.includes('/statuses')?[{state:route.includes('/2/')?'success':'in_progress'}]:[item(3),item(7,{ref:'feature'}),item(2)],'owner/repo');
  assert.deepEqual(result,{id:2,sha});
});
test('inactive requires explicit success receipt; failures are not successful baselines',async()=>{
  const states={3:[{state:'failure'},{state:'success'}],2:[{state:'inactive'}],1:[{state:'inactive'},{state:'success'}]};
  assert.equal((await previousDeployment(async route=>route.includes('/statuses')?states[Number(route.split('/').at(-2))]:[item(3),item(2),item(1)],'owner/repo')).id,1);
});
test('pagination, initial publish, malformed metadata and API failure',async()=>{
  let pages=0;
  const found=await previousDeployment(async route=>{
    if(route.includes('/statuses'))return route.includes('/21/')?[{state:'success'}]:[];
    pages++;return pages===1?Array.from({length:20},(_,i)=>item(i+1)):[item(21)];
  },'owner/repo');assert.equal(found.id,21);assert.equal(pages,2);
  assert.equal(await previousDeployment(async()=>[],'owner/repo'),null);
  await assert.rejects(previousDeployment(async()=>{throw new Error('HTTP 403')},'owner/repo'),/403/);
  await assert.rejects(previousDeployment(async()=>[item(1,{sha:'main'})],'owner/repo'),/identity/);
  await assert.rejects(previousDeployment(async()=>({}),'owner/repo'),/list/);
});
test('bounded history search fails instead of guessing a previous commit',async()=>{
  await assert.rejects(previousDeployment(async route=>route.includes('/statuses')?[]:Array.from({length:20},(_,i)=>item(i+1)),'owner/repo'),/100 records/);
});
test('restores old and nested assets while preserving current files and excluding old pages/workers',()=>run(f=>{
  const r=retainAssets(f);assert.equal(r.copied.length,3);
  assert.equal(readFileSync(path.join(f.stage,'noteforge/assets/lazy-old.js'),'utf8'),'old chunk');
  assert.equal(readFileSync(path.join(f.stage,'noteforge/assets/shared.css'),'utf8'),'new style');
  assert.equal(readFileSync(path.join(f.stage,'noteforge/index.html'),'utf8'),'new page');
  assert.equal(existsSync(path.join(f.stage,'noteforge/sw.js')),false);assert.equal(existsSync(path.join(f.stage,'private.txt')),false);
  assert.equal(readFileSync(path.join(f.stage,'cheesesteaks/_next/static/build-A/_buildManifest.js'),'utf8'),'old manifest');
  assert.equal(retainAssets(f).copied.length,0,'repeat is idempotent');
}));
test('removed apps are not resurrected and two-old generations do not accumulate',()=>run(f=>{
  retainAssets(f);const third=path.join(f.root,'third');mkdirSync(third);put(third,'noteforge/index.html','third');put(third,'noteforge/assets/entry-third.js','third');
  const r=retainAssets({...f,stage:third,previousSha:f.currentSha});
  assert.equal(existsSync(path.join(third,'noteforge/assets/entry-old.js')),false);
  assert.equal(existsSync(path.join(third,'noteforge/assets/entry-new.js')),true);
  assert.equal(existsSync(path.join(third,'cheesesteaks')),false);assert.ok(r.skipped>0);
}));
test('invalid revisions, nonancestor and byte/count limits fail before any copy',()=>run(f=>{
  assert.throws(()=>retainAssets({...f,previousSha:'main'}),/exact/);
  assert.throws(()=>retainAssets({...f,previousSha:f.currentSha,currentSha:f.previousSha}));
  assert.throws(()=>retainAssets({...f,maxBytes:1}),/limits/);assert.throws(()=>retainAssets({...f,maxFiles:1}),/limits/);
  assert.equal(existsSync(path.join(f.stage,'noteforge/assets/entry-old.js')),false);
}));
test('staged root, ancestor and dangling target symlinks are refused',()=>run(f=>{
  const link=path.join(f.root,'link');symlinkSync(f.stage,link);assert.throws(()=>retainAssets({...f,stage:link}),/real directory/);
  symlinkSync('/missing-target',path.join(f.stage,'noteforge/assets/entry-old.js'));assert.throws(()=>retainAssets(f),/Symlink/);
  rmSync(path.join(f.stage,'noteforge/assets/entry-old.js'));rmSync(path.join(f.stage,'noteforge/assets'),{recursive:true});symlinkSync(f.repo,path.join(f.stage,'noteforge/assets'));assert.throws(()=>retainAssets(f),/Symlink/);
}));
test('Git symlinks and unexpected assets fail closed',()=>run(f=>{
  symlinkSync('/missing',path.join(f.repo,'noteforge/assets/unsafe.js'));const unsafe=f.commit();
  assert.throws(()=>retainAssets({...f,previousSha:unsafe,currentSha:unsafe}),/mode/);
  rmSync(path.join(f.repo,'noteforge/assets/unsafe.js'));put(f.repo,'noteforge/assets/unexpected.html','not an asset');const html=f.commit();
  assert.throws(()=>retainAssets({...f,previousSha:html,currentSha:html}),/extension/);
}));
