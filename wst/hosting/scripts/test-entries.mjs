import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../worker/index.js';
const db = new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../drizzle/0000_tasks.sql', import.meta.url), 'utf8'));
db.exec("INSERT INTO tasks VALUES ('old','Existing task',1,3,'2026-11-14','2026-11-14')");
db.exec(readFileSync(new URL('../drizzle/0001_entry_kind.sql', import.meta.url), 'utf8'));
const env = { DB: { prepare(sql) {
 const stmt = db.prepare(sql); let values = [];
 return { bind(...args) { values = args; return this; },
  async all() { return { results: stmt.all(...values) }; },
  async run() { return { meta: stmt.run(...values) }; } };
} } };
const request = (path = '', data) => worker.fetch(new Request('https://wst.housevideo.app/api/tasks' + path,
 data ? { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) } : {}), env);
let rows = (await (await request()).json()).tasks;
assert.equal(rows[0].kind, 'task'); assert.equal(rows[0].done, 1);
const added = await request('', {text:'Latest update',kind:'update'});
assert.equal(added.status, 201); const {id} = await added.json();
assert.equal((await request('', {text:'Bad kind',kind:'other'})).status, 400);
assert.equal((await request('', {text:'x'.repeat(501)})).status, 400);
// Legacy clients omit kind and keep the existing category.
assert.equal((await request('/'+id,{text:'Edited update',done:false,revision:1})).status,200);
rows = (await (await request()).json()).tasks;
assert.equal(rows.find(row=>row.id===id).kind,'update');
assert.equal((await request('/'+id,{text:'Stale',done:false,revision:1,kind:'task'})).status,409);
assert.equal((await request('/'+id,{text:'Action now',done:false,revision:2,kind:'task'})).status,200);
assert.equal((await request('/'+id,{text:'Action now',done:true,revision:3,kind:'task'})).status,200);
assert.equal((await request('/'+id,{text:'Action now',done:true,revision:4,delete:true})).status,200);
assert.equal((await request()).status,200);
assert.equal((await (await request()).json()).tasks.length,1);
console.log('PASS entry migration, default kind, creation, legacy updates, conflict, move, completion and deletion');
