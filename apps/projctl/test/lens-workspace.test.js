import test from 'node:test';import assert from 'node:assert/strict';import {lensJogCapability} from '../public/lens-workspace.js';
test('lens workspace exposes only declared supported axes and granularity',()=>{
 assert.deepEqual(lensJogCapability({driver:'pjlink'}),{axes:[],speeds:[],mode:'unsupported',stop:false,positionReadback:false});
 assert.deepEqual(lensJogCapability({capabilities:{lensJog:{axes:['h','v','bogus'],speeds:['slow','fast','custom'],mode:'native-jog',stop:false,positionReadback:false}}}),{axes:['h','v'],speeds:['slow','fast'],mode:'native-jog',stop:false,positionReadback:false});
});
