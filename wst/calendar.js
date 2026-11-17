export function eventKind(label){
 if(/Preview/i.test(label))return 'preview';
 if(/Performance|Opening Night/i.test(label))return 'show';
 if(/Tech|Final Dress/i.test(label))return 'tech';
 if(/reh|Sitzprobe|Designer run|Wigs/i.test(label))return 'rehearsal';
 if(/Work Call|Changeover|Strike/i.test(label))return 'work';
 if(/OFF|No shows|THANKSGIVING/i.test(label))return 'off';
 return 'other';
}
export function mountCalendar(root,data,onSelect,today){
 root.replaceChildren();const table=document.createElement('table');table.className='month-table';
 const caption=document.createElement('caption');caption.textContent='November 2026';table.append(caption);
 const head=document.createElement('thead'),headRow=document.createElement('tr');for(const name of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']){const th=document.createElement('th');th.scope='col';th.textContent=name;headRow.append(th);}head.append(headRow);table.append(head);
 const body=document.createElement('tbody'),buttons=[];
 for(let week=0;week<5;week++){const row=document.createElement('tr');for(let weekday=0;weekday<7;weekday++){
 const day=week*7+weekday+1,cell=document.createElement('td');
 if(day>30){cell.className='month-empty';cell.setAttribute('aria-hidden','true');row.append(cell);continue;}
 if(day===30){cell.className='month-unsupplied';const date=document.createElement('span'),note=document.createElement('small');date.textContent='30';note.textContent='Not supplied';cell.append(date,note);row.append(cell);continue;}
 const index=day-1,item=data[index],button=document.createElement('button');button.type='button';button.className='month-day';button.dataset.index=String(index);
 const date=document.createElement('span');date.className='month-date';date.textContent=String(day);if(item.date===today){button.setAttribute('aria-current','date');date.textContent+=' · Today';}button.append(date);
 const main=item.events.filter(event=>!/(Lunch|dinner|break|Meeting|Pizza notes)/i.test(event.label));const displayed=(main.length?main:item.events).slice(0,2);
 for(const event of displayed){const line=document.createElement('span');line.className='month-event';line.dataset.kind=eventKind(event.label);line.textContent=event.label+(/Preview|Performance/.test(event.label)&&event.time?' '+event.time:'');button.append(line);}
 const total=document.createElement('small');total.className='month-count';total.textContent=item.events.length+' '+(item.events.length===1?'entry':'entries');button.append(total);
 button.setAttribute('aria-label',new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'long',day:'numeric'}).format(new Date(item.date+'T12:00:00Z'))+'. '+item.events.map(event=>event.label+(event.time?' '+event.time:'')).join('; '));
 button.onclick=()=>onSelect(index);button.onkeydown=event=>{let next;switch(event.key){case 'ArrowRight':next=index+1;break;case 'ArrowLeft':next=index-1;break;case 'ArrowDown':next=index+7;break;case 'ArrowUp':next=index-7;break;case 'Home':next=index-index%7;break;case 'End':next=index+6-index%7;break;default:return;}event.preventDefault();next=Math.max(0,Math.min(data.length-1,next));onSelect(next);buttons[next].focus();};buttons.push(button);cell.append(button);row.append(cell);
 }body.append(row);}table.append(body);root.append(table);
 return {select(index){buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));}};
}
