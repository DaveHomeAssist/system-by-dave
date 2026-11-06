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

test('room groups preserve stage floor and can be restored without affecting projectors', async () => {
 const {createRoomLayers,roomLayerNames}=await import('../public/stage-visibility.js');
 assert.deepEqual(roomLayerNames('Stage deck'),[]);
 assert.deepEqual(roomLayerNames('Proscenium pier'),[]);
 assert.deepEqual(roomLayerNames('V3 shallow pale ceiling recess'),['roof']);
 assert.deepEqual(roomLayerNames('V3 rear technical recess'),['balcony']);
 const nodes=['Room','Rear orchestra wall','V3 mezzanine terrace 3','Orchestra center row 1','Upper mezzanine center row 1','Stage deck'].map(name=>({name,userData:{},visible:true,parent:null}));
 const root=nodes[0];root.traverse=visit=>nodes.forEach(visit);nodes.slice(1).forEach(node=>node.parent=root);
 const layers=createRoomLayers(root);
 layers.set('walls',false);assert.equal(nodes[1].visible,false);assert.equal(nodes[5].visible,true);
 layers.set('balcony',false);assert.equal(nodes[2].visible,false);assert.equal(nodes[4].visible,false);assert.equal(nodes[3].visible,true);
 layers.show(false);assert.equal(root.visible,false);layers.restore();assert.equal(nodes.every(node=>node.visible),true);
});

test('Coverage cutaway hides every seat family without changing retained layer choices', async () => {
 const {createRoomLayers,roomLayerNames}=await import('../public/stage-visibility.js');
 assert.deepEqual(roomLayerNames('Lower_mezzanine_center_A_1'),['seats','balcony']);
 const nodes=['Room','Orchestra center A 101','Lower mezzanine center A 1','Stage deck'].map(name=>({name,userData:{},visible:true,parent:null}));
 const root=nodes[0];root.traverse=visit=>nodes.forEach(visit);nodes.slice(1).forEach(node=>node.parent=root);
 const layers=createRoomLayers(root);layers.cutawayForCamera(['seats']);
 assert.equal(layers.enabled.seats,true);assert.equal(nodes[1].visible,false);assert.equal(nodes[2].visible,false);assert.equal(nodes[3].visible,true);
 layers.cutawayForCamera([]);assert.equal(nodes.every(node=>node.visible),true);
 layers.set('seats',false);layers.cutawayForCamera(['seats']);layers.cutawayForCamera([]);assert.equal(nodes[1].visible,false);
});
