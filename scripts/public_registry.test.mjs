import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,readFileSync,readdirSync,renameSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect,normalizeRepository,snapshot,validateSnapshot,serialize,parse,renderHtml,replaceArtifacts,START,END } from './public_registry_lib.mjs';
const now='2026-10-30T19:00:00.000Z';
const config={version:1,owner:'Example',repositories:[{name:'old-name',category:'Tools'}]};
function repo(){return{nameWithOwner:'Example/new-name',url:'https://github.com/Example/new-name',visibility:'PUBLIC',isPrivate:false,isArchived:false,isEmpty:false,description:'Public <script>text</script> & "quote"',pushedAt:now,diskUsage:12,languages:{nodes:[{name:'JavaScript'}],pageInfo:{hasNextPage:false}},defaultBranchRef:{name:'main',target:{oid:'a'.repeat(40),history:{totalCount:9}}}};}
function data(){return snapshot(config,[normalizeRepository(repo(),config.repositories[0],config.owner)],now);}
test('public metadata only, renamed identity, window and static text escaping',()=>{
 const d=data();assert.equal(d.projects[0].name,'new-name');assert.equal(d.registry.activitySince,'2026-08-01T19:00:00.000Z');assert.equal(d.projects[0].recentCommits90d,9);
 const js=serialize(d);assert.ok(!js.includes('<script>'));assert.deepEqual(parse(js),d);
 const html=renderHtml('before'+START+END+'after',d);assert.ok(html.includes('&lt;script&gt;text&lt;/script&gt;'));assert.ok(html.includes('https://github.com/Example/new-name'));assert.equal(renderHtml(html,d),html);
});
test('reject private, missing, transferred, invalid URL and incomplete metadata',()=>{
 for(const change of [r=>{r.visibility='PRIVATE';},r=>{r.isPrivate=true;},r=>{r.nameWithOwner='Other/repo';},r=>{r.url='javascript:alert(1)';},r=>{r.languages.pageInfo.hasNextPage=true;},r=>{r.defaultBranchRef.target.history.totalCount=null;},r=>{r.defaultBranchRef=null;},r=>{r.pushedAt='invalid';}]){const r=repo();change(r);assert.throws(()=>normalizeRepository(r,config.repositories[0],config.owner));}
 assert.throws(()=>normalizeRepository(null,config.repositories[0],config.owner));
});
test('empty public repository explicitly has no branch and zero activity',()=>{const r=repo();r.isEmpty=true;r.defaultBranchRef=null;r.pushedAt=null;r.description=null;const p=normalizeRepository(r,config.repositories[0],config.owner);assert.equal(p.defaultBranch,null);assert.equal(p.recentCommits90d,0);assert.equal(p.lastRemoteUpdate,null);assert.equal(p.purpose,'No public description provided.');});
test('reject stale or future timestamps, counts drift, unapproved fields and missing membership',()=>{
 assert.throws(()=>validateSnapshot(data(),config,Date.parse(now)+31*86400000),/stale/);assert.throws(()=>validateSnapshot(data(),config,Date.parse(now)-3600000),/future/);
 for(const change of [d=>{d.registry.counts.total=2;},d=>{d.projects[0].privatePath='/fixture/private';},d=>{d.projects[0].requestedName='unknown';},d=>{d.projects.pop();}]){const d=data();change(d);assert.throws(()=>validateSnapshot(d,config,Date.parse(now)));}
});
test('serial batches fail closed on API partial errors and renamed duplicates',async()=>{
 let calls=0;const d=await collect(config,now,async query=>{calls++;assert.match(query,/history\(since:/);return{data:{r0:repo()}};});assert.equal(calls,1);assert.equal(d.projects.length,1);
 await assert.rejects(()=>collect(config,now,async()=>({errors:[{message:'unavailable'}],data:{r0:repo()}})));
 const duplicate={...config,repositories:[...config.repositories,{name:'new-name',category:'Tools'}]};await assert.rejects(()=>collect(duplicate,now,async()=>({data:{r0:repo(),r1:repo()}})),/Duplicate canonical/);
});
test('two artifact promotion is complete and failed second promotion restores first',()=>{
 const dir=mkdtempSync(join(tmpdir(),'registry-fixture-'));const a=join(dir,'a'),b=join(dir,'b');
 try{writeFileSync(a,'original a');writeFileSync(b,'original b');let n=0;assert.throws(()=>replaceArtifacts([[a,'new a'],[b,'new b']],{rename:(src,dst)=>{if(++n===2)throw new Error('synthetic promotion failure');renameSync(src,dst);}}));assert.equal(readFileSync(a,'utf8'),'original a');assert.equal(readFileSync(b,'utf8'),'original b');assert.deepEqual(readdirSync(dir).sort(),['a','b']);replaceArtifacts([[a,'new a'],[b,'new b']]);assert.equal(readFileSync(a,'utf8'),'new a');assert.equal(readFileSync(b,'utf8'),'new b');assert.deepEqual(readdirSync(dir).sort(),['a','b']);}finally{rmSync(dir,{recursive:true});}
});
test('failed rollback retains original backup instead of deleting recovery evidence',()=>{
 const dir=mkdtempSync(join(tmpdir(),'registry-fixture-'));const a=join(dir,'a'),b=join(dir,'b');
 try{writeFileSync(a,'original a');writeFileSync(b,'original b');let n=0;assert.throws(()=>replaceArtifacts([[a,'new a'],[b,'new b']],{rename:(src,dst)=>{if(++n>1)throw new Error('synthetic denied rename');renameSync(src,dst);}}),/retain .bak/);const backup=readdirSync(dir).find(p=>p.startsWith('a.')&&p.endsWith('.bak'));assert.equal(readFileSync(join(dir,backup),'utf8'),'original a');assert.equal(readFileSync(b,'utf8'),'original b');}finally{rmSync(dir,{recursive:true});}
});
test('invalid template never creates a misleading replacement',()=>{assert.throws(()=>renderHtml('unmarked content',data()),/markers/);assert.throws(()=>renderHtml(START+START+END,data()),/markers/);});
