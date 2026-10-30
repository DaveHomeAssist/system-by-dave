
/* ================= data ================= */
const DEFAULT_BOARD={"active": 2, "days": [{"label": "Fri Jul 31", "rooms": [{"name": "Parlor A", "floor": "2", "note": "", "sessions": [{"s": "10:45", "e": "12:15", "id": "21424", "dead": false}, {"s": "12:30", "e": "14:00", "id": "14739", "dead": false}, {"s": "14:30", "e": "16:00", "id": "21395", "dead": true}, {"s": "16:15", "e": "17:45", "id": "17497", "dead": false}]}, {"name": "Parlor B", "floor": "2", "note": "", "sessions": [{"s": "09:00", "e": "12:00", "id": "22683", "dead": false}, {"s": "12:15", "e": "13:45", "id": "11621", "dead": false}, {"s": "14:00", "e": "16:00", "id": "10112", "dead": false}, {"s": "16:30", "e": "18:00", "id": "19866", "dead": false}]}, {"name": "Parlor C", "floor": "2", "note": "", "sessions": [{"s": "10:00", "e": "12:00", "id": "18784", "dead": false}]}, {"name": "Parlor D", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "22056", "dead": false}, {"s": "11:30", "e": "13:30", "id": "24326", "dead": false}]}, {"name": "Seminar A", "floor": "1", "note": "", "sessions": [{"s": "09:00", "e": "10:30", "id": "14989", "dead": false}, {"s": "10:45", "e": "12:15", "id": "15267", "dead": false}, {"s": "12:30", "e": "14:00", "id": "18814", "dead": false}, {"s": "15:30", "e": "17:30", "id": "10622", "dead": false}]}, {"name": "Seminar B", "floor": "1", "note": "", "sessions": [{"s": "08:00", "e": "10:00", "id": "14012", "dead": false}, {"s": "10:15", "e": "12:45", "id": "14939", "dead": false}, {"s": "13:00", "e": "15:30", "id": "16162", "dead": false}]}, {"name": "Seminar C", "floor": "1", "note": "Nursing room \u00b7 no AV", "sessions": []}, {"name": "Seminar D", "floor": "1", "note": "Setup day \u00b7 RENTEX short throw", "sessions": []}, {"name": "Horizons", "floor": "R", "note": "Setup day \u00b7 K8s, mixer, WL podium, PC DI", "sessions": []}]}, {"label": "Sat Aug 1", "rooms": [{"name": "Parlor A", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "16249", "dead": false}, {"s": "10:00", "e": "11:30", "id": "17589", "dead": false}, {"s": "11:45", "e": "13:45", "id": "13531", "dead": false}, {"s": "16:00", "e": "18:00", "id": "10113", "dead": false}]}, {"name": "Parlor B", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "18444", "dead": false}, {"s": "10:00", "e": "11:30", "id": "13592", "dead": false}, {"s": "13:00", "e": "14:30", "id": "22406", "dead": false}, {"s": "15:00", "e": "17:30", "id": "21278", "dead": false}]}, {"name": "Parlor C", "floor": "2", "note": "", "sessions": [{"s": "09:45", "e": "11:15", "id": "14043", "dead": false}]}, {"name": "Parlor D", "floor": "2", "note": "No sign captured", "sessions": []}, {"name": "Seminar A", "floor": "1", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "13765", "dead": false}, {"s": "09:45", "e": "11:45", "id": "13965", "dead": false}, {"s": "12:45", "e": "13:45", "id": "17298", "dead": false}, {"s": "14:00", "e": "17:00", "id": "10376", "dead": false}]}, {"name": "Seminar B", "floor": "1", "note": "", "sessions": [{"s": "08:00", "e": "10:00", "id": "18135", "dead": false}, {"s": "11:30", "e": "13:30", "id": "19157", "dead": false}, {"s": "13:45", "e": "15:15", "id": "19863", "dead": false}, {"s": "15:30", "e": "16:30", "id": "20123", "dead": false}, {"s": "16:45", "e": "18:45", "id": "13470", "dead": false}]}, {"name": "Seminar C", "floor": "1", "note": "Nursing room \u00b7 no AV", "sessions": []}, {"name": "Seminar D", "floor": "1", "note": "Dark \u00b7 sessions start Sunday", "sessions": []}, {"name": "Horizons", "floor": "R", "note": "Reception unconfirmed from signs", "sessions": []}]}, {"label": "Sun Aug 2", "rooms": [{"name": "Parlor A", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "21749", "dead": false}, {"s": "11:30", "e": "13:00", "id": "22698", "dead": false}, {"s": "13:15", "e": "15:15", "id": "17964", "dead": false}, {"s": "15:30", "e": "18:30", "id": "17450", "dead": false}]}, {"name": "Parlor B", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "23009", "dead": false}, {"s": "10:45", "e": "12:45", "id": "14249", "dead": false}, {"s": "13:00", "e": "14:30", "id": "23034", "dead": false}, {"s": "15:30", "e": "17:30", "id": "15493", "dead": false}]}, {"name": "Parlor C", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "10855", "dead": false}, {"s": "09:45", "e": "11:15", "id": "23050", "dead": false}, {"s": "11:30", "e": "13:00", "id": "23065", "dead": false}, {"s": "13:15", "e": "14:45", "id": "23066", "dead": false}, {"s": "15:00", "e": "16:30", "id": "23067", "dead": false}, {"s": "16:45", "e": "18:15", "id": "23035", "dead": false}]}, {"name": "Parlor D", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "23054", "dead": false}, {"s": "09:45", "e": "11:15", "id": "23052", "dead": false}, {"s": "11:30", "e": "13:00", "id": "14888", "dead": false}, {"s": "13:15", "e": "14:45", "id": "23051", "dead": false}]}, {"name": "Seminar A", "floor": "1", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "15378", "dead": false}, {"s": "09:45", "e": "11:45", "id": "14598", "dead": false}, {"s": "12:00", "e": "13:30", "id": "23647", "dead": false}, {"s": "14:00", "e": "16:30", "id": "15514", "dead": false}, {"s": "16:45", "e": "18:15", "id": "13474", "dead": false}]}, {"name": "Seminar B", "floor": "1", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "13214", "dead": false}, {"s": "12:00", "e": "14:30", "id": "14983", "dead": false}, {"s": "14:45", "e": "17:45", "id": "21317", "dead": false}]}, {"name": "Seminar C", "floor": "1", "note": "Nursing room \u00b7 no AV", "sessions": []}, {"name": "Seminar D", "floor": "1", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "12041", "dead": false}, {"s": "09:45", "e": "11:15", "id": "14956", "dead": false}, {"s": "11:30", "e": "13:00", "id": "14407", "dead": false}, {"s": "13:15", "e": "14:45", "id": "14259", "dead": false}, {"s": "15:00", "e": "16:30", "id": "11727", "dead": false}]}, {"name": "Horizons", "floor": "R", "note": "", "sessions": []}]}, {"label": "Mon Aug 3", "rooms": [{"name": "Parlor A", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "22986", "dead": false}, {"s": "09:45", "e": "11:15", "id": "13179", "dead": false}, {"s": "11:30", "e": "13:00", "id": "13751", "dead": false}, {"s": "13:15", "e": "14:45", "id": "11874", "dead": false}]}, {"name": "Parlor B", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "22994", "dead": false}, {"s": "09:45", "e": "11:15", "id": "22990", "dead": false}, {"s": "13:15", "e": "14:45", "id": "23013", "dead": false}, {"s": "15:00", "e": "16:30", "id": "23005", "dead": false}, {"s": "16:45", "e": "18:15", "id": "23058", "dead": false}], "issues": []}, {"name": "Parlor C", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "23012", "dead": false}, {"s": "09:45", "e": "11:15", "id": "23059", "dead": false}, {"s": "11:30", "e": "13:00", "id": "23062", "dead": true}, {"s": "13:15", "e": "14:45", "id": "22909", "dead": false}, {"s": "15:00", "e": "16:30", "id": "17333", "dead": false}, {"s": "16:45", "e": "18:15", "id": "22915", "dead": false}], "issues": []}, {"name": "Parlor D", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "23070", "dead": false}, {"s": "09:45", "e": "11:15", "id": "10336", "dead": false}, {"s": "11:30", "e": "13:00", "id": "17028", "dead": false}, {"s": "13:15", "e": "14:45", "id": "23004", "dead": false}, {"s": "15:00", "e": "16:30", "id": "22908", "dead": false}, {"s": "16:45", "e": "18:15", "id": "22962", "dead": false}]}, {"name": "Seminar A", "floor": "1", "note": "", "sessions": [{"s": "09:45", "e": "11:15", "id": "23068", "dead": false}, {"s": "11:30", "e": "13:00", "id": "22938", "dead": false}, {"s": "13:15", "e": "14:45", "id": "22937", "dead": false}, {"s": "15:00", "e": "16:30", "id": "22939", "dead": false}, {"s": "16:45", "e": "18:15", "id": "22935", "dead": false}]}, {"name": "Seminar B", "floor": "1", "note": "", "sessions": [{"s": "08:00", "e": "09:00", "id": "23667", "dead": false}, {"s": "10:00", "e": "11:30", "id": "22976", "dead": false}, {"s": "11:45", "e": "13:15", "id": "20339", "dead": false}, {"s": "13:30", "e": "15:00", "id": "19149", "dead": false}, {"s": "15:15", "e": "16:45", "id": "20740", "dead": false}, {"s": "17:00", "e": "18:30", "id": "12494", "dead": false}]}, {"name": "Seminar C", "floor": "1", "note": "Nursing room \u00b7 no AV", "sessions": []}, {"name": "Seminar D", "floor": "1", "note": "", "sessions": [{"s": "10:00", "e": "11:30", "id": "19136", "dead": false}, {"s": "11:45", "e": "13:15", "id": "10170", "dead": false}, {"s": "13:30", "e": "15:00", "id": "10362", "dead": false}, {"s": "15:15", "e": "16:45", "id": "13171", "dead": false}, {"s": "17:00", "e": "18:30", "id": "14963", "dead": false}]}, {"name": "Horizons", "floor": "R", "note": "", "sessions": []}]}, {"label": "Tue Aug 4", "rooms": [{"name": "Parlor A", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "14383", "dead": false}, {"s": "09:45", "e": "11:15", "id": "14009", "dead": false}, {"s": "11:30", "e": "13:00", "id": "14402", "dead": false}, {"s": "13:15", "e": "14:45", "id": "15575", "dead": false}, {"s": "15:00", "e": "16:30", "id": "23001", "dead": false}], "issues": []}, {"name": "Parlor B", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "14666", "dead": false}, {"s": "09:45", "e": "11:15", "id": "15482", "dead": false}, {"s": "11:30", "e": "13:00", "id": "16769", "dead": false}, {"s": "13:15", "e": "14:45", "id": "21313", "dead": false}, {"s": "15:00", "e": "16:30", "id": "19187", "dead": false}], "issues": []}, {"name": "Parlor C", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "23007", "dead": false}, {"s": "09:45", "e": "11:15", "id": "23008", "dead": false}, {"s": "11:30", "e": "13:00", "id": "23023", "dead": false}, {"s": "13:15", "e": "14:45", "id": "23032", "dead": false}, {"s": "15:00", "e": "16:30", "id": "23033", "dead": false}]}, {"name": "Parlor D", "floor": "2", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "13679", "dead": false}, {"s": "09:45", "e": "11:15", "id": "22958", "dead": false}, {"s": "11:30", "e": "13:00", "id": "22957", "dead": false}, {"s": "13:15", "e": "14:45", "id": "22967", "dead": false}, {"s": "15:00", "e": "16:30", "id": "12173", "dead": false}], "issues": []}, {"name": "Seminar A", "floor": "1", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "17872", "dead": false}, {"s": "09:45", "e": "11:15", "id": "22911", "dead": false}, {"s": "11:30", "e": "13:00", "id": "22914", "dead": false}, {"s": "13:15", "e": "14:45", "id": "22923", "dead": false}, {"s": "15:00", "e": "16:30", "id": "22924", "dead": false}], "issues": []}, {"name": "Seminar B", "floor": "1", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "22919", "dead": false}, {"s": "09:45", "e": "11:15", "id": "22925", "dead": false}, {"s": "11:30", "e": "13:00", "id": "16582", "dead": false}, {"s": "13:15", "e": "14:45", "id": "22933", "dead": false}, {"s": "15:00", "e": "16:30", "id": "22946", "dead": false}], "issues": []}, {"name": "Seminar C", "floor": "1", "note": "Nursing room \u00b7 no AV", "sessions": []}, {"name": "Seminar D", "floor": "1", "note": "", "sessions": [{"s": "08:00", "e": "09:30", "id": "22920", "dead": false}, {"s": "09:45", "e": "11:15", "id": "17521", "dead": false}, {"s": "11:30", "e": "13:00", "id": "22910", "dead": false}, {"s": "13:15", "e": "14:45", "id": "22932", "dead": false}, {"s": "15:00", "e": "16:30", "id": "22949", "dead": false}], "issues": []}, {"name": "Horizons", "floor": "R", "note": "", "sessions": []}]}], "theme": "light"};
const KEY="aom_show_board_v15";
const TURN_MAX=30;
const DARK_MAX=60;

let board=null;
let START=480,END=1080,SPAN=600;

/* ================= utils ================= */
const $=id=>document.getElementById(id);
const m=t=>{const[a,b]=t.split(":").map(Number);return a*60+b};
const clone=o=>JSON.parse(JSON.stringify(o));
const fmt=v=>{let h=Math.floor(v/60),mm=v%60;const ap=h>=12?"p":"a";h=h%12||12;return h+(mm?":"+String(mm).padStart(2,"0"):"")+ap};
const pct=x=>((x-START)/SPAN*100);
const LW=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--label-w"));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const day=()=>board.days[board.active];
const floorName=f=>f==="R"?"Rooftop":"Floor "+f;

/* ================= storage ================= */
/* Uses Claude artifact storage when present, otherwise this browser's localStorage. */
let storageBlocked=false;
let unreadSavedData=null;
function validBoard(value){
  const object=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
  const time=v=>typeof v==="string"&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
  return object(value)&&Array.isArray(value.days)&&value.days.length>0
    &&Number.isInteger(value.active)&&value.active>=0&&value.active<value.days.length
    &&value.days.every(d=>object(d)&&typeof d.label==="string"&&Array.isArray(d.rooms)
      &&d.rooms.every(r=>object(r)&&typeof r.name==="string"&&Array.isArray(r.sessions)
        &&r.sessions.every(x=>object(x)&&time(x.s)&&time(x.e)&&m(x.e)>m(x.s))));
}
async function loadBoard(){
  let raw=null;
  try{
    if(window.storage){
      const r=await window.storage.get(KEY);
      if(r!=null){
        if(typeof r.value!=="string")throw new Error("Unreadable storage response");
        raw=r.value;
      }
    }else raw=localStorage.getItem(KEY);
    if(raw!==null){
      const saved=JSON.parse(raw);
      if(!validBoard(saved))throw new Error("Unrecognized saved board");
      board=saved;
      return;
    }
  }catch(e){
    // A read error is not an empty store. Never autosave sample data over it.
    storageBlocked=true;
    unreadSavedData=raw;
    $("storage-warning").hidden=false;
  }
  board=clone(DEFAULT_BOARD);
}
function openStorageRecovery(){
  openSheet('<h2>Saved board unavailable</h2>'
    +'<p>The saved board could not be read. You are viewing sample data. Changes here are not saved, and the existing stored data has not been replaced.</p>'
    +'<p>Reload saved board retries the original storage read and discards changes made to this temporary sample. If the read still fails, saving stays blocked.</p>'
    +(unreadSavedData!==null?'<p>Download original data wraps the exact stored text in a recovery file. Its raw field preserves the original, even if it is not valid board JSON. Keep it private.</p>':'<p>The original bytes could not be read, so a recovery download is unavailable.</p>')
    +'<div class="sheet-actions"><button class="btn primary" id="storage-retry">Reload saved board</button>'
    +(unreadSavedData!==null?'<button class="btn" id="storage-original">Download original data</button>':'')
    +'<button class="btn" id="f_cancel">Close</button></div>');
  $("f_cancel").addEventListener("click",closeSheet);
  $("storage-retry").addEventListener("click",()=>location.reload());
  queueMicrotask(()=>{const title=$("sheet").querySelector("h2");title.tabIndex=-1;title.focus()});
  if($("storage-original"))$("storage-original").addEventListener("click",()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify({schema:"system-by-dave.aom-recovery.v1",storageKey:KEY,raw:unreadSavedData})],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="aom-original-saved-data.json";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
}
$("storage-details").addEventListener("click",openStorageRecovery);
function applyTheme(){
  if(!board.theme)board.theme="light";
  document.body.classList.toggle("dark",board.theme==="dark");
  const tb=$("themebtn");
  if(tb)tb.textContent=board.theme==="dark"?"Light":"Dark";
}
let saveTimer=null;
let saveStatusTimer=null;
function saveBoard(){
  clearTimeout(saveTimer);
  clearTimeout(saveStatusTimer);
  if(storageBlocked){
    $("savestate").textContent="not saved · saved board unavailable";
    $("savestate").className="show bad";
    return;
  }
  saveTimer=setTimeout(async()=>{
    const el=$("savestate");
    let saved=false;
    try{
      let ok;
      if(window.storage){
        ok=await window.storage.set(KEY,JSON.stringify(board));
      }else{
        localStorage.setItem(KEY,JSON.stringify(board));
        ok=true;
      }
      saved=!!ok;
      el.textContent=ok?"saved":"save failed";
      el.className="show "+(ok?"ok":"bad");
    }catch(e){
      el.textContent="not saved · session only";
      el.className="show bad";
    }
    if(saved)saveStatusTimer=setTimeout(()=>el.classList.remove("show"),2000);
  },250);
}

/* ================= derived ================= */
function computeWindow(){
  let lo=Infinity,hi=-Infinity;
  day().rooms.forEach(r=>r.sessions.forEach(x=>{
    lo=Math.min(lo,m(x.s));hi=Math.max(hi,m(x.e));
  }));
  if(!isFinite(lo)){lo=480;hi=1080}
  START=Math.floor(lo/60)*60;
  END=Math.ceil(hi/60)*60;
  if(END-START<120)END=START+120;
  SPAN=END-START;
}
function activeSorted(r){return r.sessions.filter(x=>!x.dead).slice().sort((a,b)=>m(a.s)-m(b.s))}
function computeTurns(){
  const out=[];
  day().rooms.forEach(r=>{
    const act=activeSorted(r);
    act.forEach((x,i)=>{
      const nxt=act[i+1];
      if(nxt){
        const gap=m(nxt.s)-m(x.e);
        if(gap>=0)out.push({room:r.name,floor:r.floor,a:m(x.e),b:m(nxt.s),gap,kind:"turn"});
      }else{
        out.push({room:r.name,floor:r.floor,a:m(x.e),b:null,gap:null,kind:"done"});
      }
    });
  });
  return out.sort((p,q)=>p.a-q.a);
}
function computePinches(turnEvents){
  const tight=turnEvents.filter(t=>t.kind==="turn"&&t.gap<=TURN_MAX);
  const clusters=[];
  tight.forEach(t=>{
    const c=clusters[clusters.length-1];
    if(c&&t.a<=c.b){c.b=Math.max(c.b,t.b);c.items.push(t)}
    else clusters.push({a:t.a,b:t.b,items:[t]});
  });
  return clusters.filter(c=>new Set(c.items.map(i=>i.room)).size>=2);
}
function isToday(){
  const n=new Date();
  const label=day().label.toLowerCase();
  const mo=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"][n.getMonth()];
  return label.includes(mo)&&label.includes(" "+n.getDate());
}

/* ================= render ================= */
function renderTabs(){
  const tabs=$("daytabs");tabs.innerHTML="";
  board.days.forEach((d,i)=>{
    const b=document.createElement("button");
    b.className="daytab"+(i===board.active?" active":"");
    b.textContent=d.label;
    b.setAttribute("aria-pressed",String(i===board.active));
    b.addEventListener("click",()=>{board.active=i;saveBoard();render();$("daytabs").children[i].focus()});
    tabs.appendChild(b);
  });
}
function render(){
  renderTabs();
  computeWindow();
  $("daylabel").textContent="· "+day().label;
  $("windowlabel").textContent=fmt(START)+" to "+fmt(END);

  const ticks=$("ticks");ticks.innerHTML="";
  for(let h=START/60;h<=END/60;h++){
    const d=document.createElement("div");
    d.className="tick";
    d.style.left=pct(h*60)+"%";
    d.textContent=(h%12||12)+(h>=12&&h<24?"p":"a");
    ticks.appendChild(d);
  }

  const rows=$("rows");rows.innerHTML="";
  day().rooms.forEach((r,ri)=>{
    const row=document.createElement("div");
    row.className="row f"+(r.floor==="R"?"R":r.floor);
    row.style.animationDelay=(ri*30)+"ms";
    const lab=document.createElement("div");
    lab.className="rlabel";
    lab.tabIndex=0;lab.setAttribute("role","button");
    lab.dataset.focusKey="room-"+ri;
    lab.setAttribute("aria-label",r.name+(editMode?" room options":" pre-check"));
    lab.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();lab.click()}});
    ensureGear(r);
    const cc=checkCount(r);
    const badge=r.sessions.length
      ?'<span class="gearbadge'+(cc.done===cc.total?" full":(cc.done?" part":""))+'">'+cc.done+'/'+cc.total+'</span>':'';
    const dot=r.issues.length?'<span class="issdot"></span>':'';
    lab.innerHTML='<span class="nm">'+esc(r.name)+'</span><span class="fl">'+floorName(r.floor)+'</span>'+badge+dot;
    lab.addEventListener("click",()=>{editMode?openRoomEditor(ri):openRoomOps(ri)});
    row.appendChild(lab);
    const lane=document.createElement("div");
    lane.className="lane";
    if(!r.sessions.length&&r.note){
      lane.innerHTML='<span class="emptyrow">'+esc(r.note)+'</span>';
    }
    r.sessions.slice().sort((a,b)=>m(a.s)-m(b.s)).forEach(x=>{
      const si=r.sessions.indexOf(x);
      const a=m(x.s),b=m(x.e);
      const el=document.createElement("div");
      el.className="blk"+(x.dead?" dead":"")+(x.chk?" chk":"");
      el.style.left=pct(a)+"%";
      el.style.width=Math.max(((b-a)/SPAN*100),0.5)+"%";
      el.textContent=fmt(a)+" to "+fmt(b)+(x.dead?"  CANCELLED":(x.id?"  #"+x.id:""));
      el.title=r.name+" · "+fmt(a)+" to "+fmt(b)+(x.id?" · #"+x.id:"");
      el.tabIndex=0;el.setAttribute("role","button");
      el.dataset.focusKey="session-"+ri+"-"+si;
      el.setAttribute("aria-label",el.title+(editMode?" edit session":x.dead?" cancelled":" mark checked"));
      if(!editMode)el.setAttribute("aria-pressed",String(!!x.chk));
      if(x.dead&&!editMode)el.setAttribute("aria-disabled","true");
      el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();el.click()}});
      el.dataset.a=a;el.dataset.b=b;el.dataset.dead=x.dead?1:0;
      el.addEventListener("click",ev=>{
        if(editMode){ev.stopPropagation();openSessionEditor(ri,si);return}
        if(x.dead)return;
        x.chk=!x.chk;
        el.classList.toggle("chk",x.chk);
        el.setAttribute("aria-pressed",String(x.chk));
        saveBoard();
      });
      lane.appendChild(el);
    });
    row.appendChild(lane);
    rows.appendChild(row);
  });

  const track=$("track");
  track.querySelectorAll(".band,.head").forEach(el=>el.remove());
  const turnEvents=computeTurns();
  const pinches=computePinches(turnEvents);
  const w=LW();
  pinches.forEach(p=>{
    const band=document.createElement("div");
    band.className="band";
    band.style.left=`calc(${w}px + (100% - ${w}px) * ${pct(p.a)/100})`;
    band.style.width=`calc((100% - ${w}px) * ${(p.b-p.a)/SPAN})`;
    band.innerHTML='<span class="tag">PINCH '+fmt(p.a).toUpperCase()+' TO '+fmt(p.b).toUpperCase()+'</span>';
    track.appendChild(band);
  });
  const head=document.createElement("div");
  head.className="head";head.id="playhead";head.style.display="none";
  track.appendChild(head);

  renderTurnStack(turnEvents,pinches);
  tick();
}

function renderTurnStack(turnEvents,pinches){
  const box=$("turns");box.innerHTML="";
  const byTime={};
  turnEvents.forEach(t=>{(byTime[t.a]=byTime[t.a]||[]).push(t)});
  const times=Object.keys(byTime).map(Number).sort((a,b)=>a-b);
  if(!times.length){box.innerHTML='<div class="none">No sessions on this day yet</div>';return}
  times.forEach(t=>{
    const g=byTime[t];
    const tight=g.filter(e=>e.kind==="turn"&&e.gap<=TURN_MAX);
    const inPinch=pinches.some(p=>t>=p.a&&t<p.b)&&tight.length>0;
    const multi=tight.length>1;
    const el=document.createElement("div");
    el.className="turn"+((multi||inPinch)?" pinch":"");
    el.dataset.t=t;
    const desc=g.map(e=>{
      if(e.kind==="done")return "<b>"+esc(e.room)+"</b> done for the day";
      if(e.gap<=TURN_MAX)return "<b>"+esc(e.room)+"</b> turn, back at "+fmt(e.b);
      if(e.gap<=DARK_MAX)return "<b>"+esc(e.room)+"</b> turn, back at "+fmt(e.b);
      return "<b>"+esc(e.room)+"</b> strike, dark until "+fmt(e.b);
    }).join("<br>");
    let meta="";
    if(multi){
      const floors=new Set(tight.map(e=>e.floor));
      meta=tight.length+" rooms turning"+(floors.size>1?" across floors":"")+" · "+Math.min(...tight.map(e=>e.gap))+" min";
    }else if(tight.length===1){meta=tight[0].gap+" min turn"}
    el.innerHTML='<span class="t">'+fmt(t)+'</span><span class="d">'+desc+(meta?'<span class="meta">'+meta+'</span>':'')+'</span>';
    box.appendChild(el);
  });
}

/* ================= live tick ================= */
function tick(){
  const now=new Date();
  const cur=now.getHours()*60+now.getMinutes();
  let h=now.getHours(),mm=String(now.getMinutes()).padStart(2,"0");
  const ap=h>=12?"PM":"AM";h=h%12||12;
  $("clock").firstChild.nodeValue=h+":"+mm;
  $("ampm").textContent=" "+ap;

  const today=isToday();
  const head=$("playhead");
  if(head){
    if(today&&cur>=START&&cur<=END){
      const w=LW();
      head.style.display="block";
      head.style.left=`calc(${w}px + (100% - ${w}px) * ${pct(cur)/100})`;
    }else head.style.display="none";
  }

  if(!today){
    $("live").innerHTML="Viewing "+esc(day().label);
    $("next").innerHTML="&mdash;";
    document.querySelectorAll(".blk").forEach(el=>{el.classList.remove("live");el.classList.remove("gone")});
    document.querySelectorAll(".turn").forEach(el=>el.classList.remove("past"));
    return;
  }

  const live=[],upcoming=[];
  day().rooms.forEach(r=>{
    r.sessions.forEach(x=>{
      if(x.dead)return;
      const a=m(x.s),b=m(x.e);
      if(cur>=a&&cur<b)live.push(esc(r.name)+"  "+fmt(a)+" to "+fmt(b));
      if(a>cur)upcoming.push({t:a,txt:esc(r.name)+" up"});
      if(b>cur)upcoming.push({t:b,txt:esc(r.name)+" out"});
    });
  });
  document.querySelectorAll(".blk").forEach(el=>{
    const a=+el.dataset.a,b=+el.dataset.b;
    el.classList.toggle("live",el.dataset.dead==="0"&&cur>=a&&cur<b);
    el.classList.toggle("gone",el.dataset.dead==="0"&&cur>=b);
  });
  $("live").innerHTML=live.length?live.join("<br>"):"Nothing running";
  upcoming.sort((p,q)=>p.t-q.t);
  const t0=upcoming.length?upcoming[0].t:null;
  if(t0===null){$("next").innerHTML="Day complete"}
  else{
    const grp=upcoming.filter(u=>u.t===t0).map(u=>u.txt);
    $("next").innerHTML="<b>"+fmt(t0)+"</b> &nbsp;"+grp.join("<br><b>"+fmt(t0)+"</b> &nbsp;");
  }
  document.querySelectorAll(".turn").forEach(el=>{
    el.classList.toggle("past",+el.dataset.t<cur);
  });
}

$("themebtn").addEventListener("click",()=>{
  board.theme=board.theme==="dark"?"light":"dark";
  applyTheme();saveBoard();
});

/* ================= edit mode ================= */
let editMode=false;
$("editbtn").addEventListener("click",()=>{
  editMode=!editMode;
  document.body.classList.toggle("edit",editMode);
  $("editbtn").textContent=editMode?"Done":"Edit";
  $("editbtn").classList.toggle("editing",editMode);
  $("scrollhint").textContent=editMode
    ?"tap a block to edit it · tap a room name for room options"
    :"tap a room for pre-check · tap a session to mark it checked";
  render();
});

function openSheet(html){
  $("sheet").innerHTML=html;
  $("sheet").classList.add("open");
  $("overlay").classList.add("open");
  window.aomDialogOpened?.();
}
function closeSheet(){
  $("sheet").classList.remove("open");
  $("overlay").classList.remove("open");
  window.aomDialogClosed?.();
}
$("overlay").addEventListener("click",closeSheet);
function showErr(msg){const e=$("err");if(e){e.textContent=msg;e.classList.add("show")}}

function openSessionEditor(ri,si){
  const r=day().rooms[ri];
  const isNew=si===null;
  const x=isNew?{s:"",e:"",id:"",dead:false}:r.sessions[si];
  openSheet(`
    <h2>${esc(r.name)} · ${isNew?"New session":"Edit session"}</h2>
    <div id="err"></div>
    <div class="field half"><label>Start</label><input type="time" id="f_s" value="${x.s}" step="300"></div><div class="field half"><label>End</label><input type="time" id="f_e" value="${x.e}" step="300"></div>
    <div class="field"><label>Session ID (optional)</label><input type="text" id="f_id" value="${esc(x.id||"")}" placeholder="e.g. 21424" inputmode="numeric"></div>
    <div class="chk"><input type="checkbox" id="f_dead" ${x.dead?"checked":""}><label for="f_dead" style="margin:0;font-family:'DM Sans';font-size:14px;text-transform:none;letter-spacing:0;color:var(--parchment)">Cancelled (stays visible, hatched out)</label></div>
    <div class="sheet-actions">
      <button class="btn primary" id="f_save">Save</button>
      ${isNew?"":'<button class="btn danger" id="f_del">Delete</button>'}
      <button class="btn" id="f_cancel">Cancel</button>
    </div>
  `);
  $("f_cancel").addEventListener("click",closeSheet);
  $("f_save").addEventListener("click",()=>{
    const s=$("f_s").value,e=$("f_e").value;
    if(!s||!e)return showErr("Both times are required");
    if(m(e)<=m(s))return showErr("End must be after start");
    const val={s,e,id:$("f_id").value.trim(),dead:$("f_dead").checked};
    if(isNew)r.sessions.push(val);else r.sessions[si]=val;
    r.sessions.sort((a,b)=>m(a.s)-m(b.s));
    closeSheet();saveBoard();render();
  });
  if(!isNew)$("f_del").addEventListener("click",()=>{
    r.sessions.splice(si,1);
    closeSheet();saveBoard();render();
  });
}

function openRoomEditor(ri){
  const r=day().rooms[ri];
  openSheet(`
    <h2>${esc(r.name)}</h2>
    <div id="err"></div>
    <div class="field"><label>Room name</label><input type="text" id="f_nm" value="${esc(r.name)}"></div>
    <div class="field half"><label>Location</label><select id="f_fl">
      <option value="1" ${r.floor==="1"?"selected":""}>Floor 1</option>
      <option value="2" ${r.floor==="2"?"selected":""}>Floor 2</option>
      <option value="R" ${r.floor==="R"?"selected":""}>Rooftop</option>
    </select></div><div class="field half"><label>&nbsp;</label><button class="btn primary" id="f_add" style="width:100%;padding:11px 8px">+ Session</button></div>
    <div class="field"><label>Note (shows when room has no sessions)</label><input type="text" id="f_note" value="${esc(r.note||"")}" placeholder="e.g. Setup only"></div>
    <div class="sheet-actions">
      <button class="btn primary" id="f_save">Save</button>
      <button class="btn" id="f_gearbtn">Gear list</button>
      <button class="btn danger" id="f_del">Delete room</button>
      <button class="btn" id="f_cancel">Cancel</button>
    </div>
  `);
  $("f_cancel").addEventListener("click",closeSheet);
  $("f_add").addEventListener("click",()=>{
    r.name=$("f_nm").value.trim()||r.name;
    r.floor=$("f_fl").value;
    r.note=$("f_note").value.trim();
    openSessionEditor(ri,null);
  });
  $("f_save").addEventListener("click",()=>{
    const nm=$("f_nm").value.trim();
    if(!nm)return showErr("Room needs a name");
    r.name=nm;r.floor=$("f_fl").value;r.note=$("f_note").value.trim();
    closeSheet();saveBoard();render();
  });
  $("f_gearbtn").addEventListener("click",()=>openGearEditor(ri));
  $("f_del").addEventListener("click",()=>{
    openSheet(`
      <h2>Delete ${esc(r.name)}?</h2>
      <p style="margin-bottom:14px;font-size:14px;color:var(--muted)">Removes the room and its ${r.sessions.length} session${r.sessions.length===1?"":"s"} from this day only.</p>
      <div class="sheet-actions">
        <button class="btn danger" id="f_yes">Delete</button>
        <button class="btn" id="f_no">Keep it</button>
      </div>
    `);
    $("f_yes").addEventListener("click",()=>{
      day().rooms.splice(ri,1);
      closeSheet();saveBoard();render();
    });
    $("f_no").addEventListener("click",closeSheet);
  });
}

$("addroom").addEventListener("click",()=>{
  day().rooms.push({name:"New Room",floor:"2",note:"",sessions:[]});
  saveBoard();render();
  openRoomEditor(day().rooms.length-1);
});

/* ---------- day settings ---------- */
$("settingsbtn").addEventListener("click",()=>{
  openSheet(`
    <h2>Days</h2>
    <div id="err"></div>
    <div class="field"><label>Rename current day</label><input type="text" id="f_day" value="${esc(day().label)}" placeholder="e.g. Mon Aug 3"></div>
    <div class="sheet-actions">
      <button class="btn primary" id="f_save">Save</button>
      <button class="btn" id="f_new">+ New day (same rooms, empty)</button>
    </div>
    <div class="sheet-actions" style="margin-top:10px">
      <button class="btn danger" id="f_reset">Reset current day to sign data</button>
      <button class="btn" id="f_cancel">Close</button>
    </div>
  `);
  $("f_cancel").addEventListener("click",closeSheet);
  $("f_save").addEventListener("click",()=>{
    day().label=$("f_day").value.trim()||day().label;
    closeSheet();saveBoard();render();
  });
  $("f_new").addEventListener("click",()=>{
    const rooms=day().rooms.map(r=>({name:r.name,floor:r.floor,note:"",sessions:[]}));
    board.days.push({label:"New Day",rooms});
    board.active=board.days.length-1;
    closeSheet();saveBoard();render();
    $("settingsbtn").click();
  });
  $("f_reset").addEventListener("click",()=>{
    const i=board.active;
    const hasDefault=i<DEFAULT_BOARD.days.length;
    openSheet(`
      <h2>Reset ${esc(day().label)}?</h2>
      <p style="margin-bottom:14px;font-size:14px;color:var(--muted)">${hasDefault?"Throws away edits on this day and restores what was read from the door signs.":"This day has no sign data. Resetting clears all its sessions."}</p>
      <div class="sheet-actions">
        <button class="btn danger" id="f_yes">Reset</button>
        <button class="btn" id="f_no">Keep my edits</button>
      </div>
    `);
    $("f_yes").addEventListener("click",()=>{
      if(hasDefault)board.days[i]=clone(DEFAULT_BOARD.days[i]);
      else board.days[i].rooms.forEach(r=>r.sessions=[]);
      closeSheet();saveBoard();render();
    });
    $("f_no").addEventListener("click",closeSheet);
  });
});


/* ---------- copy board as text ---------- */
function boardText(){
  const d=day();
  let out="AOM "+d.label.toUpperCase()+"\n";
  d.rooms.forEach(r=>{
    out+="\n"+r.name.toUpperCase()+"\n";
    const ss=r.sessions.slice().sort((a,b)=>m(a.s)-m(b.s));
    if(!ss.length){out+=(r.note||"No sessions")+"\n";return}
    ss.forEach(x=>{out+=fmt(m(x.s))+" to "+fmt(m(x.e))+(x.dead?" CANCELLED":"")+"\n"});
  });
  const pin=computePinches(computeTurns());
  if(pin.length){
    const big=pin.reduce((a,b)=>b.items.length>a.items.length?b:a);
    out+="\nWorst window: "+fmt(big.a)+" to "+fmt(big.b)+", "+new Set(big.items.map(i=>i.room)).size+" rooms turn";
  }
  let last=0,lr="";
  d.rooms.forEach(r=>r.sessions.forEach(x=>{if(!x.dead&&m(x.e)>last){last=m(x.e);lr=r.name}}));
  if(last)out+="\nLast out: "+lr+" "+fmt(last);
  return out;
}
let copyStatusTimer=null;
$("copybtn").setAttribute("aria-live","polite");
$("copybtn").addEventListener("click",async()=>{
  const t=boardText(),b=$("copybtn");
  clearTimeout(copyStatusTimer);
  b.disabled=true;b.textContent="Copying";
  let copied=false;
  try{
    await navigator.clipboard.writeText(t);
    copied=true;
  }catch(e){
    // Do not steal selection from an editor opened while permission was pending.
    if(!$("sheet").classList.contains("open")){
      const ta=document.createElement("textarea");ta.value=t;
      ta.style.cssText="position:fixed;top:0;left:0;opacity:0;pointer-events:none";
      document.body.appendChild(ta);ta.select();
      try{copied=document.execCommand("copy")===true}catch(_){}
      finally{ta.remove()}
    }
  }
  b.disabled=false;
  if(document.activeElement===document.body&&!$("sheet").classList.contains("open"))b.focus();
  if(copied){
    b.textContent="Copied snapshot";
    copyStatusTimer=setTimeout(()=>b.textContent="Copy text",1500);
  }else{
    b.textContent="Copy failed";
    if(!$("sheet").classList.contains("open")){
      b.focus();
      openSheet('<h2>Copy board text</h2>'
        +'<p>Automatic copy failed. Select and copy the text below using your device copy command. This is the board snapshot from when you pressed Copy.</p>'
        +'<div class="field"><label for="copy-manual">Board text</label><textarea id="copy-manual" rows="8" readonly></textarea></div>'
        +'<div class="sheet-actions"><button class="btn" id="f_cancel">Close</button></div>');
      const text=$("copy-manual");text.value=t;
      $("f_cancel").addEventListener("click",closeSheet);
      queueMicrotask(()=>{if(text.isConnected){text.focus();text.select()}});
    }
  }
});

/* ---------- scan a door sign ---------- */
$("scanbtn").addEventListener("click",()=>$("scanfile").click());
$("scanfile").addEventListener("change",e=>{
  const f=e.target.files[0];e.target.value="";
  if(f)scanSign(f);
});
function fileToJpeg(file){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      const MAX=1400;
      let w=img.width,h=img.height;
      const sc=Math.min(1,MAX/Math.max(w,h));
      w=Math.round(w*sc);h=Math.round(h*sc);
      const c=document.createElement("canvas");c.width=w;c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg",0.85).split(",")[1]);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("Could not decode that image"))};
    img.src=url;
  });
}
async function scanSign(file){
  openSheet('<h2>Reading sign&hellip;</h2><p style="font-size:14px;color:var(--muted)">Transcribing the photo. A few seconds.</p>');
  let data;
  try{
    const b64=await fileToJpeg(file);
    const resp=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"claude-sonnet-4-6",
        max_tokens:1000,
        messages:[{role:"user",content:[
          {type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}},
          {type:"text",text:'This is a photo of a conference room door sign listing timed sessions. Respond with ONLY raw JSON, no markdown fences, exactly this shape: {"room":string|null,"date":string|null,"sessions":[{"s":"HH:MM","e":"HH:MM","id":string}]} . Times must be 24-hour (1:15PM becomes 13:15). id is the numeric code printed before the session title, or "" if none. room is the name after "Room:" if visible. date is the printed date line if visible. Ignore small paper lists printed under sessions, and ignore any faint text bleeding through from a page behind the top sheet. If a session is marked CANCELLED, include it and append "!" to its id.'}
        ]}]
      })
    });
    const j=await resp.json();
    const txt=(j.content||[]).filter(c=>c.type==="text").map(c=>c.text).join("\n");
    data=JSON.parse(txt.replace(/```json|```/g,"").trim());
    if(!data||!Array.isArray(data.sessions)||!data.sessions.length)throw new Error("No sessions found on that sign");
  }catch(err){
    scanError(err.message||"Transcription failed");
    return;
  }
  previewScan(data);
}
function scanError(msg){
  openSheet('<h2>Could not read it</h2><p style="font-size:14px;color:var(--muted);margin-bottom:14px">'+esc(msg)+'. Try a straighter, closer shot with less glare.</p><div class="sheet-actions"><button class="btn primary" id="f_retry">Try another photo</button><button class="btn" id="f_cancel">Close</button></div>');
  $("f_cancel").addEventListener("click",closeSheet);
  $("f_retry").addEventListener("click",()=>{closeSheet();$("scanfile").click()});
}
function labelMatchesDate(str){
  const l=day().label.toLowerCase();
  const s=String(str).toLowerCase();
  const mo=l.match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/);
  const dnum=l.match(/\d+/);
  if(!mo||!dnum)return true;
  const months={jan:"january",feb:"february",mar:"march",apr:"april",may:"may",jun:"june",jul:"july",aug:"august",sep:"september",oct:"october",nov:"november",dec:"december"};
  return s.includes(months[mo[0]])&&new RegExp("\\b"+dnum[0]+"\\b").test(s);
}
function previewScan(data){
  const rooms=day().rooms;
  let sel=0;
  if(data.room){
    const norm=v=>String(v).toLowerCase().replace(/[^a-z0-9]/g,"");
    const n=norm(data.room);
    const hit=rooms.findIndex(r=>norm(r.name)===n||n.includes(norm(r.name))||norm(r.name).includes(n));
    if(hit>=0)sel=hit;
  }
  const clean=data.sessions.map(x=>({
    s:String(x.s||""),e:String(x.e||""),
    id:String(x.id||"").replace(/!+$/,""),
    dead:/!$/.test(String(x.id||""))
  })).filter(x=>/^\d{2}:\d{2}$/.test(x.s)&&/^\d{2}:\d{2}$/.test(x.e)&&m(x.e)>m(x.s));
  if(!clean.length){scanError("Sessions came back malformed");return}
  const dateWarn=(data.date&&!labelMatchesDate(data.date))
    ?'<p style="color:var(--txdead);font-family:\'DM Mono\',monospace;font-size:11px;margin-bottom:10px;letter-spacing:0.04em">SIGN READS &ldquo;'+esc(data.date)+'&rdquo; BUT YOU ARE ON '+esc(day().label.toUpperCase())+'. Check the tab before applying.</p>':"";
  const list=clean.map(x=>fmt(m(x.s))+" to "+fmt(m(x.e))+(x.dead?" CANCELLED":(x.id?" &middot; #"+esc(x.id):""))).join("<br>");
  openSheet('<h2>Sign read'+(data.room?' &middot; '+esc(data.room):'')+'</h2>'
    +dateWarn
    +'<div class="field"><label>Apply to room ('+esc(day().label)+')</label><select id="f_room">'
    +rooms.map((r,i)=>'<option value="'+i+'"'+(i===sel?' selected':'')+'>'+esc(r.name)+'</option>').join("")
    +'</select></div>'
    +'<p style="font-family:\'DM Mono\',monospace;font-size:12px;line-height:1.8;margin-bottom:14px">'+list+'</p>'
    +'<div class="sheet-actions"><button class="btn primary" id="f_apply">Replace room sessions</button><button class="btn" id="f_cancel">Cancel</button></div>');
  $("f_cancel").addEventListener("click",closeSheet);
  $("f_apply").addEventListener("click",()=>{
    const r=day().rooms[+$("f_room").value];
    r.sessions=clean.map(x=>({s:x.s,e:x.e,id:x.id,dead:x.dead}));
    r.note="";
    closeSheet();saveBoard();render();
  });
}


/* ---------- paste a sign as text ----------
   Uses the phone's own text recognition (iOS Live Text, Android Lens): select
   the text on the photo, copy, paste here. No network, and the recognizer is
   better than anything we could ship. Feeds the same preview as Scan sign. */
const MERID=/[AaPp]/;
function pickStart(cand,end){
  /* choose the reading that lands before the end time, nearest to it, so
     "11:30 - 1:00PM" reads as 11:30a and not 11:30p */
  const fits=cand.filter(v=>v<end);
  return fits.length?Math.max(...fits):cand[0];
}
function parseSignText(raw){
  const lines=String(raw).split(/\r?\n/);
  const T=String.raw`(\d{1,2})[:.](\d{2})\s*([AaPp])?\.?[Mm]?\.?`;
  const re=new RegExp(T+String.raw`\s*(?:-|–|—|to|until|thru)\s*`+T,"i");
  const hm=(h,mm,pm)=>((+h%12)+(pm?12:0))*60+ +mm;
  const pad=v=>String(Math.floor(v/60)).padStart(2,"0")+":"+String(v%60).padStart(2,"0");
  const sessions=[];
  /* On a real sign the title wraps, so "(Cancelled)" usually lands a line or
     two below the time. Read the whole heading: the time line down to the
     paper list or the next session. Papers marked WITHDRAWN are a
     paper-level note and deliberately do not cancel the session. */
  const headingOf=i=>{
    const buf=[lines[i]];
    for(let j=i+1;j<lines.length;j++){
      if(/\d+\s*paper\(s\)/i.test(lines[j])||re.test(lines[j]))break;
      buf.push(lines[j]);
    }
    return buf.join(" ");
  };
  lines.forEach((line,i)=>{
    const g=re.exec(line);
    if(!g)return;
    const[,h1,m1,a1,h2,m2,a2]=g;
    let end;
    if(a2)end=hm(h2,m2,/p/i.test(a2));
    else if(a1){
      end=hm(h2,m2,/p/i.test(a1));
      /* "11:30AM - 1:00" — end inherited AM, so push it past the start */
      if(end<=hm(h1,m1,/p/i.test(a1)))end+=720;
    }else end=hm(h2,m2,+h2>=1&&+h2<=7);
    const start=a1?hm(h1,m1,/p/i.test(a1))
                  :pickStart([hm(h1,m1,false),hm(h1,m1,true)],end);
    if(!(end>start))return;
    const after=line.slice(g.index+g[0].length);
    const id=((after.match(/\b(\d{5})\b/)||line.match(/\b(\d{5})\b/)||[])[1])||"";
    sessions.push({s:pad(start),e:pad(end),id:id+(/cancel/i.test(headingOf(i))?"!":"")});
  });
  const roomHit=raw.match(/room\s*[:\-]\s*([^\n]+)/i);
  const dateHit=raw.match(/\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\b/i);
  return{
    room:roomHit?roomHit[1].trim():null,
    date:dateHit?dateHit[0].trim():null,
    sessions
  };
}
function openPasteSheet(prefill,msg){
  openSheet('<h2>Paste sign text</h2>'
    +'<p style="font-size:13px;color:var(--muted);margin-bottom:10px">'
    +'On the photo in your camera roll, long-press the text, Select All, Copy &mdash; then paste it here. '
    +'Times and the 5-digit codes are read out of whatever you paste; everything else is ignored.</p>'
    +(msg?'<div id="err" class="show">'+esc(msg)+'</div>':'<div id="err"></div>')
    +'<div class="field"><textarea id="f_paste" rows="9" placeholder="8:00AM - 9:30AM   22986   Opening remarks&#10;9:45AM - 11:15AM  13179   ..."></textarea></div>'
    +'<div class="sheet-actions"><button class="btn primary" id="f_read">Read it</button>'
    +'<button class="btn" id="f_cancel">Cancel</button></div>');
  if(prefill)$("f_paste").value=prefill;
  $("f_cancel").addEventListener("click",closeSheet);
  $("f_read").addEventListener("click",()=>{
    const raw=$("f_paste").value;
    if(!raw.trim())return showErr("Nothing pasted yet");
    const data=parseSignText(raw);
    if(!data.sessions.length)
      return openPasteSheet(raw,"No time ranges found in that. Times need to look like 8:00AM - 9:30AM.");
    previewScan(data);
  });
  setTimeout(()=>{const t=$("f_paste");if(t)t.focus()},50);
}
$("pastebtn").addEventListener("click",()=>openPasteSheet());

/* ---------- gear + checks + issues ---------- */
const DEFAULT_GEAR=["Projector on / lamp warm","Screen down & framed","HDMI to presenter laptop","Dongle (USB-C + Mini DP)","Slide advancer paired, batteries ok","Podium mic / audio check","Confidence monitor","Room lights & house set"];

function ensureGear(r){
  if(!Array.isArray(r.gear)||!r.gear.length)r.gear=DEFAULT_GEAR.slice();
  if(!r.checks||typeof r.checks!=="object")r.checks={};
  if(!Array.isArray(r.issues))r.issues=[];
  return r;
}
function todayKey(){const n=new Date();return n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0")}
function checkState(r){
  ensureGear(r);
  const k=todayKey();
  if(!r.checks[k])r.checks[k]={};
  /* drop any day that is not today so old ticks never linger */
  Object.keys(r.checks).forEach(d=>{if(d!==k)delete r.checks[d]});
  return r.checks[k];
}
function checkCount(r){
  const st=checkState(r);
  return {done:r.gear.filter(g=>st[g]).length,total:r.gear.length};
}

function openRoomOps(ri){
  const r=ensureGear(day().rooms[ri]);
  const st=checkState(r);
  const rows=r.gear.map((g,i)=>
    '<label class="gearrow'+(st[g]?" on":"")+'" data-g="'+i+'">'
    +'<input type="checkbox" '+(st[g]?"checked":"")+' data-g="'+i+'"><span>'+esc(g)+'</span></label>').join("");
  const iss=r.issues.length
    ? r.issues.map((x,i)=>'<div class="issrow"><span>'+esc(x.t)+'<em>'+esc(x.when)+'</em></span><button class="btn danger xs" data-x="'+i+'">Clear</button></div>').join("")
    : '<p style="font-size:13px;color:var(--muted)">Nothing logged.</p>';
  openSheet('<h2>'+esc(r.name)+' &middot; pre-check</h2>'
    +'<p style="font-family:\'DM Mono\',monospace;font-size:10.5px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Resets each day &middot; '+esc(day().label)+'</p>'
    +'<div id="gearlist">'+rows+'</div>'
    +'<div class="sheet-actions" style="margin-bottom:16px"><button class="btn" id="f_all">Check all</button><button class="btn" id="f_none">Clear all</button><button class="btn" id="f_edit">Edit gear</button></div>'
    +'<h2 style="font-size:15px;margin-top:4px">Issues</h2><div id="isslist">'+iss+'</div>'
    +'<div class="field" style="margin-top:8px"><input type="text" id="f_iss" placeholder="e.g. podium mic battery low"></div>'
    +'<div class="sheet-actions"><button class="btn primary" id="f_add">Log issue</button><button class="btn" id="f_cancel">Done</button></div>');
  $("f_cancel").addEventListener("click",()=>{closeSheet();render()});
  $("gearlist").addEventListener("change",e=>{
    const i=e.target.dataset.g;if(i===undefined)return;
    const g=r.gear[+i];
    st[g]=e.target.checked;
    e.target.closest(".gearrow").classList.toggle("on",e.target.checked);
    saveBoard();
  });
  $("f_all").addEventListener("click",()=>{r.gear.forEach(g=>st[g]=true);saveBoard();openRoomOps(ri)});
  $("f_none").addEventListener("click",()=>{r.gear.forEach(g=>delete st[g]);saveBoard();openRoomOps(ri)});
  $("f_edit").addEventListener("click",()=>openGearEditor(ri));
  $("f_add").addEventListener("click",()=>{
    const v=$("f_iss").value.trim();if(!v)return;
    const n=new Date();let h=n.getHours();const ap=h>=12?"p":"a";h=h%12||12;
    r.issues.unshift({t:v,when:" "+h+":"+String(n.getMinutes()).padStart(2,"0")+ap+" "+day().label});
    saveBoard();openRoomOps(ri);
  });
  $("f_iss").addEventListener("keydown",e=>{if(e.key==="Enter")$("f_add").click()});
  $("isslist").addEventListener("click",e=>{
    const i=e.target.dataset.x;if(i===undefined)return;
    r.issues.splice(+i,1);saveBoard();openRoomOps(ri);
  });
}

function openGearEditor(ri){
  const r=ensureGear(day().rooms[ri]);
  openSheet('<h2>'+esc(r.name)+' &middot; gear list</h2>'
    +'<p style="font-size:13px;color:var(--muted);margin-bottom:10px">One item per line. This is what the pre-check asks for in this room.</p>'
    +'<div class="field"><textarea id="f_gear" rows="9">'+esc(r.gear.join("\n"))+'</textarea></div>'
    +'<div class="sheet-actions"><button class="btn primary" id="f_save">Save</button><button class="btn" id="f_copy">Copy to all rooms</button><button class="btn" id="f_back">Back</button></div>');
  $("f_back").addEventListener("click",()=>openRoomOps(ri));
  const read=()=>$("f_gear").value.split("\n").map(s=>s.trim()).filter(Boolean);
  $("f_save").addEventListener("click",()=>{
    const g=read();if(g.length)r.gear=g;
    saveBoard();openRoomOps(ri);
  });
  $("f_copy").addEventListener("click",()=>{
    const g=read();if(!g.length)return;
    r.gear=g;
    day().rooms.forEach(o=>{ensureGear(o);o.gear=g.slice()});
    saveBoard();openRoomOps(ri);
  });
}

/* ================= boot ================= */
(async function(){
  await loadBoard();
  applyTheme();
  /* jump to today's tab if one matches */
  const n=new Date();
  const mo=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"][n.getMonth()];
  const idx=board.days.findIndex(d=>{
    const l=d.label.toLowerCase();
    return l.includes(mo)&&l.includes(" "+n.getDate());
  });
  if(idx>=0)board.active=idx;
  render();
  setInterval(tick,30000);
  window.addEventListener("resize",render);
  if(window.innerWidth>1320)$("scrollhint").textContent="tap a session to check it off · Edit for changes";
})();
