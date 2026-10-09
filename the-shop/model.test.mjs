import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyPlan,validatePlan,stageLegacy,SOURCES,countPair,assertFreshSourceRows} from './model.mjs';
test('Shop plan validates and rejects a damaged or future document',()=>{assert.deepEqual(validatePlan(emptyPlan()),emptyPlan());assert.throws(()=>validatePlan({schema:'system-by-dave.shop.v2',items:[]}));});
test('all four maintained legacy sources stage without mutating originals',()=>{for(const [kind,spec] of Object.entries(SOURCES)){const row={id:'old-1',item:'Switcher',contents:'Rack',caseId:'VID-1',owner:'V1',notes:'keep',status:'issue'};const payload={schema:spec.schema,meta:{showName:'Example'},items:[row]};const before=JSON.stringify(payload);const staged=stageLegacy(kind,payload);assert.equal(staged.length,1);assert.equal(staged[0].original.notes,'keep');assert.equal(staged[0].status,'hold');assert.equal(staged[0].source.kind,kind);assert.equal(JSON.stringify(payload),before)}});
test('invalid import fails before any rows are staged',()=>{assert.throws(()=>stageLegacy('gear-prep',{schema:SOURCES['gear-prep'].schema,items:[{item:'Good'},{notes:'No name'}]}));});

test('Truck Pack strapped is operationally ready',()=>{const rows=stageLegacy('truck-pack',{schema:SOURCES['truck-pack'].schema,items:[{caseId:'V-RACK',contents:'Video rack',status:'strapped'}]});assert.equal(rows[0].status,'ready');assert.equal(rows[0].original.status,'strapped');});

test('blank backup item titles are rejected',()=>{assert.throws(()=>validatePlan({schema:'system-by-dave.shop.v1',name:'Bad',items:[{id:'x',title:'   ',phase:'prep',status:'queued'}]}));});

test('producer-shaped Gear Prep quantity stages as requested while packed stays unknown',()=>{
  const source={schema:SOURCES['gear-prep'].schema,meta:{showName:'A'},items:[{id:'gear-1',item:'Camera kit',qty:'3',status:'loaded'}]};
  const bytes=JSON.stringify(source);
  const [row]=stageLegacy('gear-prep',source);
  assert.equal(row.requestedQty,3);
  assert.equal(row.packedQty,null);
  assert.equal(row.status,'ready');
  assert.deepEqual(row.original,source.items[0]);
  assert.equal(JSON.stringify(source),bytes);
  assert.deepEqual(countPair('3','1'),{requestedQty:3,packedQty:1});
  const restored=validatePlan({schema:'system-by-dave.shop.v1',name:'Test',items:[{...row,packedQty:1}]});
  assert.equal(restored.items[0].packedQty,1);
  assert.equal(restored.items[0].requestedQty,3);
});

test('unknown and zero quantities are distinct and old Shop backups remain valid',()=>{
  const legacy={schema:'system-by-dave.shop.v1',name:'Old',items:[{id:'x',title:'Case',phase:'pack',status:'ready'}]};
  assert.deepEqual(validatePlan(legacy).items[0].requestedQty,null);
  assert.deepEqual(validatePlan(legacy).items[0].packedQty,null);
  for(const [qty,expected] of [['',null],['  ',null],['0',0]]){
    const [row]=stageLegacy('gear-prep',{schema:SOURCES['gear-prep'].schema,items:[{id:'gear-1',item:'Case',qty}]});
    assert.equal(row.requestedQty,expected);
  }
});

test('malformed quantities, overpacking and duplicate Gear Prep ids reject without source mutation',()=>{
  for(const qty of ['three','1.5','100000',-1]){
    const source={schema:SOURCES['gear-prep'].schema,items:[{id:'good',item:'Good',qty:'3'},{id:'bad',item:'Bad',qty}]};
    const bytes=JSON.stringify(source);
    assert.throws(()=>stageLegacy('gear-prep',source),/quantity/);
    assert.equal(JSON.stringify(source),bytes);
  }
  assert.throws(()=>countPair(3,4),/cannot exceed/);
  assert.throws(()=>validatePlan({schema:'system-by-dave.shop.v1',name:'Bad',items:[{id:'x',title:'Case',phase:'pack',status:'ready',requestedQty:3,packedQty:4}]}),/cannot exceed/);
  assert.throws(()=>stageLegacy('gear-prep',{schema:SOURCES['gear-prep'].schema,items:[{id:'same',item:'A'},{id:'same',item:'B'}]}),/repeated source id/);
  const [row]=stageLegacy('gear-prep',{schema:SOURCES['gear-prep'].schema,items:[{id:'same',item:'A'}]});
  assert.throws(()=>assertFreshSourceRows([row],[row]),/already in/);
});
