import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeEdid, parseRegistryEdids, attachEdids } from '../server/edid.js';
import { displaySignature, compareBaseline } from '../public/display-readout.js';
function fixture() {
  const b = Buffer.alloc(128); Buffer.from('00ffffffffffff00', 'hex').copy(b);
  b.writeUInt16BE(0x4c2d,8); b.writeUInt16LE(123,10); b[18]=1;b[19]=4;b[24]=2;
  // 148.5 MHz, 1920+280 by 1080+45 = 60 Hz.
  b.writeUInt16LE(14850,54); b[56]=128;b[57]=24;b[58]=0x71;b[59]=56;b[60]=45;b[61]=0x40;
  b[75]=0xfc; b.write('Test display\n',77,'ascii');
  b[127]=(256-b.reduce((a,v)=>a+v,0)%256)%256;
  return b;
}
test('decodes known 1080p60 and validates every block',()=>{
 const b=fixture(),e=decodeEdid(b.toString('hex'));
 assert.equal(e.state,'reported');assert.equal(e.manufacturer,'SAM');assert.equal(e.name,'Test display');
 assert.deepEqual(e.detailedTimings,[{width:1920,height:1080,refreshHz:60,preferred:true}]);
 assert.equal(e.fingerprint.length,64);assert.equal(e.rawHex,b.toString('hex'));
 b[126]=1;assert.equal(decodeEdid(b.toString('hex')).state,'invalid');
 const bad=fixture();bad[10]++;assert.match(decodeEdid(bad.toString('hex')).reason,/checksum/);
 assert.equal(decodeEdid('bad').state,'invalid');
});
test('preserves extension bytes and rejects corrupt extensions',()=>{
 const b=Buffer.concat([fixture(),Buffer.alloc(128)]);b[126]=1;b[127]--;b[128]=2;b[255]=254;
 assert.equal(decodeEdid(b.toString('hex')).extensionCount,1);
 b[140]=1;assert.equal(decodeEdid(b.toString('hex')).state,'invalid');
});
test('registry association never assigns identical products by order',()=>{
 const records=parseRegistryEdids(`+-o display <class IODisplayConnect>\n "IODisplayEDID" = <${fixture().toString('hex')}>`);
 const d={manufacturerId:'0x4c2d',productId:'123'};
 assert.equal(attachEdids([d],records)[0].edid.state,'reported');
 assert.equal(attachEdids([d,d],records)[0].edid.state,'ambiguous');
 assert.equal(attachEdids([d],[...records,...records])[0].edid.state,'ambiguous');
 assert.equal(attachEdids([{manufacturerId:null,productId:null}],records)[0].edid.state,'unavailable');
 assert.deepEqual(parseRegistryEdids('no EDID'),[]);
});
test('baseline ignores enumeration order but detects missing displays, modes and EDID changes',()=>{
 const r={host:'fixture',displays:[{name:'A',resolution:'1080p',edid:{fingerprint:'one'}},{name:'B'}]};
 const baseline={schema:1,host:'fixture',signature:displaySignature(r)};
 assert.match(compareBaseline({...r,displays:[...r.displays].reverse()},baseline),/^Matches/);
 assert.match(compareBaseline({...r,displays:r.displays.slice(1)},baseline),/changed/);
 assert.match(compareBaseline({...r,displays:[{...r.displays[0],resolution:'720p'},r.displays[1]]},baseline),/changed/);
 assert.match(compareBaseline({...r,host:'other'},baseline),/No baseline/);
});
