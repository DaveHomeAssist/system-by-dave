import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyPlan,validatePlan,stageLegacy,SOURCES} from './model.mjs';
test('Shop plan validates and rejects a damaged or future document',()=>{assert.deepEqual(validatePlan(emptyPlan()),emptyPlan());assert.throws(()=>validatePlan({schema:'system-by-dave.shop.v2',items:[]}));});
test('all four maintained legacy sources stage without mutating originals',()=>{for(const [kind,spec] of Object.entries(SOURCES)){const row={id:'old-1',item:'Switcher',contents:'Rack',caseId:'VID-1',owner:'V1',notes:'keep',status:'issue'};const payload={schema:spec.schema,meta:{showName:'Example'},items:[row]};const before=JSON.stringify(payload);const staged=stageLegacy(kind,payload);assert.equal(staged.length,1);assert.equal(staged[0].original.notes,'keep');assert.equal(staged[0].status,'hold');assert.equal(staged[0].source.kind,kind);assert.equal(JSON.stringify(payload),before)}});
test('invalid import fails before any rows are staged',()=>{assert.throws(()=>stageLegacy('gear-prep',{schema:SOURCES['gear-prep'].schema,items:[{item:'Good'},{notes:'No name'}]}));});
