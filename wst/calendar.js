const monthFormat = new Intl.DateTimeFormat('en-US', {timeZone:'UTC', month:'long'});
const dayFormat = new Intl.DateTimeFormat('en-US', {timeZone:'UTC', weekday:'long', month:'long', day:'numeric', year:'numeric'});
const asDate = date => new Date(date + 'T12:00:00Z');

export function eventKind(label){
 if(/Preview/i.test(label))return 'preview';
 if(/Performance|Opening Night/i.test(label))return 'show';
 if(/Tech|Final Dress/i.test(label))return 'tech';
 if(/reh|Sitzprobe|Designer run|Wigs/i.test(label))return 'rehearsal';
 if(/Work Call|Changeover|Strike/i.test(label))return 'work';
 if(/OFF|No shows|THANKSGIVING/i.test(label))return 'off';
 return 'other';
}

export function calendarMonths(data){
 const months = new Map();
 for(const [index, item] of data.entries()){
  const key = item.date.slice(0,7);
  if(!months.has(key)){
   const name = monthFormat.format(asDate(item.date));
   months.set(key, {name, title:name+' '+key.slice(0,4), entries:[]});
  }
  months.get(key).entries.push({index, item});
 }
 return [...months.values()];
}

export function adjacentMonthIndex(months, current, direction){
 const target = months[current + direction];
 return target ? target.entries[0].index : null;
}

export function mountCalendar(root,data,onSelect,today){
 const months = calendarMonths(data);
 const monthByIndex = months.flatMap((month, index)=>month.entries.map(()=>index));
 const toolbar = document.createElement('div');
 toolbar.className = 'schedule-month-navigation';
 const heading = document.createElement('h3');
 heading.id = 'schedule-month-name';
 heading.setAttribute('aria-live','polite');
 const previous = monthButton('schedule-prev-month', 'Previous', 'Previous month', -1);
 const next = monthButton('schedule-next-month', 'Next', 'Next month', 1);
 toolbar.append(previous, heading, next);

 const table = document.createElement('table');
 table.className = 'month-table';
 table.setAttribute('aria-labelledby',heading.id);
 const head = document.createElement('thead'), headRow = document.createElement('tr');
 for(const name of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']){
  const th = document.createElement('th');
  th.scope = 'col';
  th.textContent = name;
  headRow.append(th);
 }
 head.append(headRow);
 const body = document.createElement('tbody');
 table.append(head,body);
 root.replaceChildren(toolbar,table);

 let shown = -1;
 const buttons = new Map();

 function monthButton(id,text,label,direction){
  const button = document.createElement('button');
  button.id = id;
  button.type = 'button';
  button.textContent = text;
  button.setAttribute('aria-label',label);
  button.onclick = ()=>{
   const target = adjacentMonthIndex(months,shown,direction);
   if(target !== null)onSelect(target);
  };
  return button;
 }

 function dayButton(index,item){
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'month-day';
  button.dataset.date = item.date;

  const date = document.createElement('span');
  date.className = 'month-date';
  date.textContent = String(asDate(item.date).getUTCDate());
  if(item.date===today){
   button.setAttribute('aria-current','date');
   date.textContent += ' · Today';
  }
  button.append(date);

  const main = item.events.filter(event=>!/(Lunch|dinner|break|Meeting|Pizza notes)/i.test(event.label));
  for(const event of (main.length ? main : item.events).slice(0,2)){
   const line = document.createElement('span');
   line.className = 'month-event';
   line.dataset.kind = eventKind(event.label);
   line.textContent = event.label + (/Preview|Performance/.test(event.label)&&event.time ? ' '+event.time : '');
   button.append(line);
  }
  const total = document.createElement('small');
  total.className = 'month-count';
  total.textContent = item.events.length+' '+(item.events.length===1 ? 'entry' : 'entries');
  button.append(total);

  button.setAttribute('aria-label', dayFormat.format(asDate(item.date))+'. '+item.events.map(event=>event.label+(event.time ? ' '+event.time : '')).join('; '));
  button.onclick = ()=>onSelect(index);
  button.onkeydown = event=>{
   const weekday = asDate(item.date).getUTCDay();
   let target;
   switch(event.key){
    case 'ArrowRight':target=index+1;break;
    case 'ArrowLeft':target=index-1;break;
    case 'ArrowDown':target=index+7;break;
    case 'ArrowUp':target=index-7;break;
    case 'Home':target=index-weekday;break;
    case 'End':target=index+6-weekday;break;
    default:return;
   }
   event.preventDefault();
   target = Math.max(0, Math.min(data.length-1,target));
   onSelect(target);
   buttons.get(target).focus();
  };
  buttons.set(index,button);
  return button;
 }

 function renderMonth(index){
  shown = index;
  const month = months[shown];
  heading.textContent = month.title;
  previous.setAttribute('aria-disabled',String(adjacentMonthIndex(months,shown,-1)===null));
  next.setAttribute('aria-disabled',String(adjacentMonthIndex(months,shown,1)===null));
  buttons.clear();
  body.replaceChildren();

  const offset = asDate(month.entries[0].item.date).getUTCDay();
  const weeks = Math.ceil((offset + month.entries.length)/7);
  body.style.setProperty('--month-weeks',weeks);
  for(let week=0;week<weeks;week++){
   const row = document.createElement('tr');
   for(let weekday=0;weekday<7;weekday++){
    const entry = month.entries[week*7 + weekday - offset];
    const cell = document.createElement('td');
    if(entry)cell.append(dayButton(entry.index,entry.item));
    else{
     cell.className = 'month-empty';
     cell.setAttribute('aria-hidden','true');
    }
    row.append(cell);
   }
   body.append(row);
  }
 }

 return {
  select(index){
   const month = monthByIndex[index];
   if(month!==shown)renderMonth(month);
   for(const [key,button] of buttons)button.setAttribute('aria-pressed',String(key===index));
   return months[month];
  }
 };
}
