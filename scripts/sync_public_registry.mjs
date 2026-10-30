#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve,dirname } from 'node:path';
import assert from 'node:assert/strict';
import { collect,parse,serialize,validateSnapshot,renderHtml,replaceArtifacts } from './public_registry_lib.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(readFileSync(resolve(root,'scripts/public-registry-repositories.json'),'utf8'));
const jsPath=resolve(root,'project-registry-public.js'),htmlPath=resolve(root,'project-registry.html');
const args=process.argv.slice(2);assert.ok(args.length===0 || (args.length===1&&args[0]==='--check'),'Only --check is supported');
try {
  const html=readFileSync(htmlPath,'utf8');
  const originalSource=readFileSync(jsPath,'utf8');
  if(args[0]==='--check'){
    const source=readFileSync(jsPath,'utf8');const data=validateSnapshot(parse(source),config);
    assert.equal(source,serialize(data),'Snapshot serialization drift');
    assert.equal(html,renderHtml(html,data),'Static registry snapshot drift');
    console.log(`Public registry verified: ${data.projects.length} allowlisted repositories; snapshot ${data.registry.generatedAt}`);
  }else{
    const data=await collect(config,new Date().toISOString(),query=>{
      try{return JSON.parse(execFileSync('gh',['api','graphql','--input','-'],{input:JSON.stringify({query}),encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024,stdio:['pipe','pipe','pipe']}));}
      catch {throw new Error('GitHub metadata request failed; snapshot unchanged. Check gh access or API availability.');}
    });
    assert.equal(readFileSync(jsPath,'utf8'),originalSource,'Snapshot changed during refresh; refusing overwrite');
    assert.equal(readFileSync(htmlPath,'utf8'),html,'Page changed during refresh; refusing overwrite');
    replaceArtifacts([[jsPath,serialize(data)],[htmlPath,renderHtml(html,data)]]);
    console.log(`Refreshed ${data.projects.length} public repositories at ${data.registry.generatedAt}`);
  }
}catch(error){console.error(error.message);process.exitCode=1;}
