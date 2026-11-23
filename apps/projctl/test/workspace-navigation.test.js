import test from 'node:test';import assert from 'node:assert/strict';
import {panelNavigation} from '../public/workspace-navigation.js';
test('workspace bridge messages contain only allowlisted view navigation and physical lane letters',()=>{
 assert.deepEqual(panelNavigation({type:'wst:show-panel',panel:'rig',projector:'D',cmd:'power',arg:1}),{panel:'rig',projector:'D'});
 for(const panel of ['rig','all','stage','presets','log','setup','throw'])assert.deepEqual(panelNavigation({type:'wst:show-panel',panel}),{panel});
 assert.equal(panelNavigation({type:'wst:show-panel',panel:'command',projector:'D'}),null);
 assert.equal(panelNavigation({type:'wst:show-panel',panel:'rig',projector:'P4'}),null);
 assert.equal(panelNavigation({type:'command',panel:'rig'}),null);
});
