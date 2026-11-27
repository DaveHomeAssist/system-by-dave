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
const request = (path = '', data, headers = {}) => worker.fetch(new Request('https://wst.housevideo.app/api/tasks' + path,
 data ? { method:'POST', headers:{'Content-Type':'application/json',...headers}, body:JSON.stringify(data) } : {headers}), env);
let rows = (await (await request()).json()).tasks;
assert.equal(rows[0].kind, 'task'); assert.equal(rows[0].done, 1);
const locked = await request('', {text:'No write without the Site secret',kind:'task'});
assert.equal(locked.status, 403);
assert.deepEqual(await locked.json(), {error:'Task editing is locked'});
const wrongHeader = await request('', {text:'Still locked',kind:'task'}, {'X-Frozen-Task-Passcode':'not-a-credential'});
assert.equal(wrongHeader.status, 403);
assert.deepEqual(await wrongHeader.json(), {error:'Task editing is locked'});
const options = await worker.fetch(new Request('https://wst.housevideo.app/api/tasks', {method:'OPTIONS'}), env);
assert.equal(options.status, 204);
assert.equal(options.headers.get('access-control-allow-origin'), null);
assert.equal((await request()).status,200);
assert.equal((await (await request()).json()).tasks.length,1);
console.log('PASS public task reads, fail-closed writes, unchanged D1 rows and no wildcard CORS');
