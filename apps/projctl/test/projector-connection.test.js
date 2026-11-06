import test from 'node:test';
import assert from 'node:assert/strict';
import { createConnectionMonitor } from '../public/projector-connection.js';
const now=Date.parse('2026-11-06T15:00:00Z');
const p={slot:'P4',driver:'pulse',ip:'192.0.2.23',status:{online:true,connection:{state:'online',lastSuccessAt:new Date(now).toISOString()}}};
test('freshness, saved-IP retry and recovery require actual new feedback',()=>{
 const view=createConnectionMonitor();assert.equal(view(p,true,5000,now).current,true);
 const lost={...p,status:{...p.status,online:false,connection:{...p.status.connection,state:'reconnecting',nextRetryAt:new Date(now+15000).toISOString()}}};
 let shown=view(lost,true,5000,now+1000);assert.equal(shown.current,false);assert.match(shown.detail,/Reconnecting to saved IP 192\.0\.2\.23/);assert.match(shown.retry,/10:00:15 AM EST/);assert.equal(shown.lastReply,'10:00:00 AM EST');
 assert.equal(view(p,true,5000,now+2000).recovered,false,'same old sample cannot recover');
 const recovered={...p,status:{...p.status,connection:{...p.status.connection,lastSuccessAt:new Date(now+3000).toISOString()}}};
 assert.equal(view(recovered,true,5000,now+3000).label,'Reply recovered');assert.equal(view(recovered,true,5000,now+14000).label,'Reply received');
 assert.equal(view(recovered,true,5000,now+19000).state,'stale');
});
test('relay reconnect and replacement target cannot imply projector recovery',()=>{
 const view=createConnectionMonitor();view(p,true,5000,now);assert.equal(view(p,false,5000,now+1000).state,'disconnected');assert.equal(view(p,true,5000,now+2000).recovered,false);
 const replaced={...p,ip:'192.0.2.24'};assert.equal(view(replaced,true,5000,now+2000).recovered,false);
 assert.equal(view(null,true,5000,now).state,'unassigned');
 const initial={...p,status:{online:false,connection:{state:'checking'}}};assert.equal(view(initial,true,5000,now).label,'Checking saved IP');assert.equal(view(initial,true,5000,now).lastReply,'No successful reply yet');
});
