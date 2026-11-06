import test from 'node:test';
import assert from 'node:assert/strict';
import { roofCutaway } from '../public/stage-visibility.js';
test('roof cutaway hides named overhead pieces while retaining the room and technical recess', () => {
 const nodes = ['Room', 'Roof.001', 'V3_shallow_pale_ceiling_recess', 'Rear_technical_recess', 'Balcony_rail', 'Special shell'].map(name => ({name,userData:{},visible:true}));
 const model={traverse:visit=>nodes.forEach(visit)};
 const cutaway=roofCutaway(model,['Special shell']);
 assert.equal(cutaway.count,3);
 cutaway.set(false);
 assert.deepEqual(nodes.map(node=>node.visible),[true,false,false,true,true,false]);
 cutaway.set(true);assert.equal(nodes.every(node=>node.visible),true);
});
