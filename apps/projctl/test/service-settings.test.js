import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { snapshotSettingsAfterStop } from '../deploy/service-tools.js';
test('migration and managed backup capture the last save flushed by a stopping writer', { skip: process.platform === 'win32' ? 'Windows does not deliver catchable SIGTERM' : false }, async t => {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'projctl-stop-snapshot-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const old=path.join(root,'old'),data=path.join(root,'data'),backup=path.join(root,'backup');fs.mkdirSync(old);fs.mkdirSync(backup);
 const file=path.join(old,'rig.json');const initial={projectors:[],presets:[],events:[],show:'before'};fs.writeFileSync(file,JSON.stringify(initial));fs.writeFileSync(path.join(old,'stage-plot.json'),'stage bytes');
 const child=spawn(process.execPath,['-e',`const fs=require('fs');process.on('SIGTERM',()=>{fs.writeFileSync(process.argv[1],JSON.stringify({...JSON.parse(fs.readFileSync(process.argv[1])),show:'last pending save'}));process.exit(0)});console.log('ready');setInterval(()=>{},1000)`,file],{stdio:['ignore','pipe','pipe']});
 t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL')});await once(child.stdout,'data');
 const bytes=await snapshotSettingsAfterStop({sourceData:old,data,backup,stop:async()=>{const exited=once(child,'exit');child.kill('SIGTERM');await exited}});
 assert.equal(JSON.parse(bytes).show,'last pending save');assert.deepEqual(fs.readFileSync(path.join(data,'rig.json')),bytes);assert.deepEqual(fs.readFileSync(path.join(backup,'rig.json')),bytes);assert.equal(fs.readFileSync(path.join(data,'stage-plot.json'),'utf8'),'stage bytes');
 const backup2=path.join(root,'backup2');fs.mkdirSync(backup2);
 const current=await snapshotSettingsAfterStop({sourceData:data,data,backup:backup2,stop:async()=>{fs.writeFileSync(path.join(data,'rig.json'),JSON.stringify({...initial,show:'new managed save'}))}});
 assert.equal(JSON.parse(current).show,'new managed save');assert.deepEqual(fs.readFileSync(path.join(backup2,'rig.json')),current);
});

test('schedule flags and occurrence claims survive migration and managed backup bytewise', async t => {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'projctl-schedule-snapshot-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const source=path.join(root,'source'),data=path.join(root,'data'),backup=path.join(root,'backup');fs.mkdirSync(source);fs.mkdirSync(backup);
 fs.writeFileSync(path.join(source,'rig.json'),JSON.stringify({projectors:[],presets:[],events:[]}));
 const settings=Buffer.from('{"schedules":[{"id":"fixture","enabled":true}]}\n'),claim=Buffer.from('{"fixture":"already claimed"}\n');
 fs.writeFileSync(path.join(source,'power-schedules.json'),settings);fs.mkdirSync(path.join(source,'power-schedules.json.claims'));fs.writeFileSync(path.join(source,'power-schedules.json.claims/fixture.json'),claim);
 await snapshotSettingsAfterStop({sourceData:source,data,backup,stop:async()=>{}});
 for(const dir of [data,backup]){assert.deepEqual(fs.readFileSync(path.join(dir,'power-schedules.json')),settings);assert.deepEqual(fs.readFileSync(path.join(dir,'power-schedules.json.claims/fixture.json')),claim);}
 const second=path.join(root,'second');fs.mkdirSync(second);await snapshotSettingsAfterStop({sourceData:data,data,backup:second,stop:async()=>{}});assert.deepEqual(fs.readFileSync(path.join(second,'power-schedules.json')),settings);
});
