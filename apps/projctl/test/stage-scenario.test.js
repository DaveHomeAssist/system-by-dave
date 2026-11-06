import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { measuredStageFixture, stageFixture } from './stage-fixture.js';
import { normalizePlot } from '../public/stage-plot.js';
import { stageReference } from '../public/stage-reference.js';
import { FT, scenarioBaseline, calculateScenario } from '../public/stage-scenario.js';
const engine = createRequire(import.meta.url)('../../../ProjectorThrow/throwline-scene-state.js');
const baseline = () => scenarioBaseline(stageReference(normalizePlot(measuredStageFixture())));
const dStudy = () => ({ ...baseline().D, lens: 'dle150', min: 1.36, max: 1.98, distance: 38.5, raster: 20, aspect: 1.6, portrait: true, lensHeight: 9, centerHeight: 15, contentHeight: 20 });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
test('planner never promotes uncalibrated drawing units or unknown lens height to measured geometry', () => {
 assert.throws(() => scenarioBaseline(stageReference(normalizePlot(stageFixture()))), /dimensioned/);
 assert.equal(baseline().D.lensHeight, null);
 assert.throws(() => calculateScenario(engine, baseline().D), /height.*unknown/);
});
test('canonical Throwline optics produce the portrait D scenario without mutating its baseline', () => {
 const input = dStudy(), original = JSON.stringify(input);
 const result = calculateScenario(engine, input);
 near(result.width, 12.5); near(result.height, 20); near(result.geometry.image.requiredRatio, 1.925);
 near(result.geometry.image.horizontalShiftPercent, 30); // 6 ft above lens / 20 ft native width
 near(result.top, 25); near(result.bottom, 5);
 assert.equal(JSON.stringify(input), original);
 assert.equal(result.geometry.provenance.mode, 'verified_image_width');
});
test('a 26 ft raster adds 3 ft above unchanged centre and maps 20 ft content to the top', () => {
 const small = calculateScenario(engine, dStudy());
 const large = calculateScenario(engine, { ...dStudy(), raster: 26, contentAlign: 'top' });
 near(large.top - small.top, 3); near(large.height, 26); near(large.contentFraction, 20 / 26);
 near(Math.max(...large.content.map(p => p[1])) / FT, large.top);
 near((Math.max(...large.content.map(p => p[1])) - Math.min(...large.content.map(p => p[1]))) / FT, 20);
});
test('candidate lens limits constrain actual coverage instead of drawing an impossible requested image', () => {
 const result = calculateScenario(engine, { ...dStudy(), min: 1.8, max: 2.5, lens: 'manual', raster: 26 });
 near(result.height, 38.5 / 1.8); assert.equal(result.geometry.placement.kind, 'undershoot');
 assert.throws(() => calculateScenario(engine, { ...dStudy(), min: 3, max: 1 }), /limits/);
});

test('documented portrait horizontal shift limit is independent of throw fit', () => {
 const outside = calculateScenario(engine, dStudy());
 assert.equal(outside.geometry.placement.kind, 'safe');
 assert.equal(outside.geometry.shift.horizontal.exceeded, true);
 const maxUp = calculateScenario(engine, {...dStudy(), centerHeight: 11});
 near(maxUp.geometry.image.horizontalShiftPercent, 10);
 assert.equal(maxUp.geometry.shift.horizontal.exceeded, false);
 const wideMaxUp = calculateScenario(engine, {...dStudy(), raster:26, centerHeight:11.6});
 near(wideMaxUp.top - maxUp.top, 3.6);
 const currentWidest = calculateScenario(engine, {...dStudy(), lens:'current', min:1.8, max:2.54, raster:26});
 near(currentWidest.height, 38.5/1.8);
 near((currentWidest.height-20)/2, 0.6944444444444446);
});

test('proposal travels along a rotated target normal without changing world height', () => {
 const input = {...dStudy(), normal:[1,0,0], right:[0,0,-1], origin:[2,0,3], lensOffset:0};
 const result = calculateScenario(engine, input);
 near(result.projector[0], 2 + 38.5 * FT);
 near(result.projector[1], 9 * FT);
 near(result.projector[2], 3);
});
