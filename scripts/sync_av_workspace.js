#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const check=process.argv.includes('--check');
const tokens=JSON.parse(fs.readFileSync(path.join(root,'design/av-workspace.tokens.json'),'utf8'));
const css='/* Generated from design/av-workspace.tokens.json and css/av-workspace.css. */\n:root{'+Object.entries(tokens).map(([key,value])=>`--av-${key}:${value};`).join('')+'}\n'+fs.readFileSync(path.join(root,'css/av-workspace.css'),'utf8');
const version=require('../js/sbd-registry.js').SBD_REGISTRY.version;
if(typeof version!=='string'||!version)throw new Error('Missing AV registry version');
const js=`window.AVWorkspaceVersion=${JSON.stringify(version)};\n`+fs.readFileSync(path.join(root,'js/av-workspace.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'js/av-offline.js'),'utf8');
let stale=false;
for(const file of ['ProjectorThrow/index.html','ProjectorThrow/Stage3D.html','led-wall-calculator.html']){
 const target=path.join(root,file);let old=fs.readFileSync(target,'utf8');let next=old;
 for(const [name,text,tag] of [['styles',css,'style'],['runtime',js,'script']]){
  const block=`<!-- AV workspace ${name}:start -->\n<${tag}>\n${text}\n</${tag}>\n<!-- AV workspace ${name}:end -->`;
  const rx=new RegExp(`<!-- AV workspace ${name}:start -->[\\s\\S]*?<!-- AV workspace ${name}:end -->`);
  if(rx.test(next))next=next.replace(rx,()=>block);
  else {const at=next.indexOf('</head>');next=next.slice(0,at)+block+'\n'+next.slice(at);}
 }
 if(next!==old){if(check){console.error(`Stale workspace output: ${file}`);stale=true;}else fs.writeFileSync(target,next);}
}
if(stale)process.exitCode=1;
