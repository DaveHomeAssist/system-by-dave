import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import worker from '../worker/index.js';

const request = path => worker.fetch(new Request('https://wst.housevideo.app'+path),{});
const html = await (await request('/')).text();
new vm.SourceTextModule(await (await request('/workspace.js')).text());
const calendar = new vm.SourceTextModule(await (await request('/calendar.js')).text());
await calendar.link(()=>{ throw new Error('Unexpected calendar dependency'); });
await calendar.evaluate();

const days = await (await request('/tech-schedule.json')).json();
const start = Date.UTC(2026,10,1);
assert.equal(days.length,64);
assert.deepEqual(days.map(day=>day.date),Array.from({length:64},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10)));
assert.equal(days[8].events[0].label,'OFF');
assert.equal(days[8].events[1].time,'10am-5pm');
assert.equal(days[24].events[1].label,'Opening Night');
assert.deepEqual(days[28].events[1],{label:'Performance (open captioning)',time:'7:00pm'});

const byDate = new Map(days.map(day=>[day.date,day.events]));
for(const date of ['2026-11-30','2026-12-07','2026-12-08','2026-12-14','2026-12-24','2026-12-25','2027-01-01']){
 assert.deepEqual(byDate.get(date),[{label:'No shows',time:''}]);
}
assert.deepEqual(byDate.get('2026-12-10')[0],{label:'Performance (audio described)',time:'2:00pm'});
assert.deepEqual(byDate.get('2026-12-31'),[{label:'Performance',time:'2:00pm'}]);
assert.deepEqual(byDate.get('2027-01-02')[1],{label:'Performance (ASL interpreted)',time:'7:00pm'});
assert.deepEqual(byDate.get('2027-01-03'),[{label:'Performance (closing)',time:'2:00pm'}]);

const {calendarMonths,adjacentMonthIndex} = calendar.namespace;
const months = calendarMonths(days);
assert.deepEqual(Array.from(months,month=>month.title),['November 2026','December 2026','January 2027']);
assert.deepEqual(Array.from(months,month=>month.entries.length),[30,31,3]);
assert.equal(adjacentMonthIndex(months,0,-1),null);
assert.equal(adjacentMonthIndex(months,0,1),30);
assert.equal(adjacentMonthIndex(months,1,1),61);
assert.equal(adjacentMonthIndex(months,2,1),null);
assert.equal(adjacentMonthIndex(months,2,-1),30);
assert.equal(adjacentMonthIndex(months,1,-1),0);

assert.match(html,/id="nav-more"/);
assert.match(html,/id="schedule-panel"/);
assert.match(html,/draft October 30, 2026/i);
assert.match(html,/All shows, schedules, classes, and events are subject to change/);
const pdf = await request('/frozen-tech-schedule.pdf');
assert.equal(pdf.headers.get('content-type'),'application/pdf');
const bytes = Buffer.from(await pdf.arrayBuffer());
assert.equal(createHash('sha256').update(bytes).digest('hex'),'ee4f3b4041c0c27e237d1b6b9f2144fa4832d4a2519d7157d0da84792400c993');
assert.equal((await worker.fetch(new Request('https://wst.housevideo.app/frozen-tech-schedule.pdf',{method:'HEAD'}),{})).status,200);
assert.equal((await worker.fetch(new Request('https://wst.housevideo.app/frozen-tech-schedule.pdf',{method:'POST'}),{})).status,405);
console.log('PASS: 64 contiguous dates, special shows and dark days, month navigation, JS syntax and original PDF');
