import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = process.env.APP_ROOT || fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const {pjlinkDriver} = await import(pathToFileURL(root+'/server/drivers/pjlink.js'));
const {panasonicDriver} = await import(pathToFileURL(root+'/server/drivers/panasonic.js'));
const {pulseDriver} = await import(pathToFileURL(root+'/server/drivers/pulse.js'));
const {createPoller} = await import(pathToFileURL(root+'/server/polling.js'));
async function fixture(t,kind,initialMode) {
  let mode=initialMode; const sockets=new Set(), requests=[], servers=[];
  async function server(native=false) {
    const srv=net.createServer(sock=>{
      sockets.add(sock);sock.on('close',()=>sockets.delete(sock));sock.on('error',()=>{});
      if(kind!=='pulse') sock.write(native?'NTCONTROL 0\r':'PJLINK 0\r');
      let buf='';sock.on('data',data=>{
        buf+=data;const delimiter=kind==='pulse'?'\n':'\r';let index;
        while((index=buf.indexOf(delimiter))>=0) {
          const line=buf.slice(0,index);buf=buf.slice(index+1);requests.push(line);
          const req=kind==='pulse'?JSON.parse(line):null;
          const property=req?.params?.property;
          const core=kind==='pulse'?property==='system.state':line==='%1POWR ?';
          if(mode==='core-timeout'&&core)continue;
          if(!core&&(mode==='optional-close'||mode==='optional-timeout')){if(mode==='optional-close')sock.destroy();continue;}
          if(!core&&mode==='late-timeout'&&(kind==='pulse'?property==='image.window.main.source':line==='%1INPT ?'))continue;
          if(mode==='native-timeout'&&native)continue;
          if(kind==='pulse') {
            const values={'system.state':mode==='invalid-core'?'garbage':mode==='standby'?'ready':'on','optics.shutter.target':'Open','image.window.main.source':'L1 HDMI','statistics.laserruntime.value':3600,'system.name':'fixture','image.testpattern.show':false,'image.window.main.activesignal':true};
            const reply=Object.hasOwn(values,property)?{result:values[property]}:{error:{code:-32601,message:'unsupported fixture property'}};
            sock.end(JSON.stringify({jsonrpc:'2.0',id:req.id,...reply}));
          } else if(native) sock.end('0000\r');
          else {
            assert.match(line,/^%1[A-Z]{4} \?$/,'independent checks issue queries only');
            const values={POWR:mode==='invalid-core'?'garbage':mode==='standby'?'0':'1',AVMT:'30',INPT:'31',ERST:'000000',LAMP:'10 1',NAME:'fixture'};
            const name=line.slice(2,6);sock.write('%1'+name+'='+values[name]+'\r');
          }
        }
      });
    });
    srv.listen(kind==='panasonic'&&!native?4352:0,'127.0.0.1');await once(srv,'listening');servers.push(srv);return srv.address().port;
  }
  const pjPort=await server(); const port=kind==='panasonic'?await server(true):pjPort;
  const driver=({pjlink:pjlinkDriver,panasonic:panasonicDriver,pulse:pulseDriver})[kind]({host:'127.0.0.1',port,timeoutMs:100});
  t.after(async()=>{driver.close?.();for(const sock of sockets)sock.destroy();await Promise.all(servers.map(s=>new Promise(r=>s.close(r))))});
  return {driver,requests,setMode:m=>mode=m};
}
for(const kind of ['pjlink','panasonic','pulse']) {
  for(const mode of ['optional-close','optional-timeout']) test(kind+' keeps fresh power after '+mode,async t=>{
    const f=await fixture(t,kind,mode);const s=await f.driver.getStatus();
    assert.equal(s.power,'on');assert.equal(s.shutter,'unknown');assert.ok(s.stale.includes('shutter'));
    f.setMode('normal');assert.equal((await f.driver.getStatus()).power,'on','fresh poll recovers');
  });
  test(kind+' retains completed fields at poll deadline',async t=>{
    const f=await fixture(t,kind,'late-timeout');const success=[],fail=[];
    const poller=createPoller({target:()=>({slot:'P1',ip:'127.0.0.1'}),read:(_,o)=>f.driver.getStatus(o),timeoutMs:60,intervalMs:1000,
      succeeded:(_,s)=>success.push(s),failed:(_,e)=>fail.push(e)});t.after(()=>poller.close());
    await poller.poll('P1');assert.equal(fail.length,0);assert.equal(success[0]?.power,'on');
    assert.equal(success[0]?.shutter,'open','completed shutter reply must survive later timeout');
    assert.ok(!success[0]?.stale.includes('shutter'));assert.ok(success[0]?.stale.includes('input'));
  });
  for(const mode of ['invalid-core','core-timeout']) test(kind+' rejects '+mode,async t=>{
    const f=await fixture(t,kind,mode);await assert.rejects(f.driver.getStatus());
  });
  test(kind+' skips optional telemetry in standby',async t=>{
    const f=await fixture(t,kind,'standby');assert.equal((await f.driver.getStatus()).power,'off');assert.equal(f.requests.length,1);
  });
}
