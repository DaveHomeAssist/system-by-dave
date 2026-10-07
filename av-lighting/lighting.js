(() => {
  'use strict';
  const template = document.getElementById('appTemplate');
  template.replaceWith(template.content);
  const KEY = 'sbd.avLighting.v1';
  const SCHEMA = 'system-by-dave.av-lighting.v1';
  const LEGACY = 'system-by-dave.lighting-patch.v1';
  const FIELDS = ['unit','fixture','position','mode','universe','address','channel','dimmer','color','focus','status','notes'];
  const STATUSES = ['planned','hung','addressed','patched','focused','issue','spare'];
  const $ = id => document.getElementById(id);
  const blank = () => ({ schema:SCHEMA, meta:{showName:'Untitled lighting plan',venue:'',lead:''}, items:[] });
  const fixture = raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('A fixture record is invalid.');
    const item = {id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID()};
    for (const field of FIELDS) item[field] = typeof raw[field] === 'string' ? raw[field].slice(0, field === 'notes' ? 2000 : 500) : '';
    if (!STATUSES.includes(item.status)) item.status = 'planned';
    return item;
  };
  const validate = raw => {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items) || raw.items.length > 1000) throw new Error('Expected a plan with up to 1,000 fixtures.');
    if (raw.schema && raw.schema !== SCHEMA && raw.schema !== LEGACY) throw new Error('This file uses an unsupported schema.');
    const ids = new Set();
    const items = raw.items.map(fixture);
    for (const item of items) { if (ids.has(item.id)) item.id = crypto.randomUUID(); ids.add(item.id); }
    const source = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
    return {schema:SCHEMA,meta:{showName:String(source.showName || 'Untitled lighting plan').slice(0,120),venue:String(source.venue || '').slice(0,120),lead:String(source.lead || '').slice(0,80)},items};
  };
  let plan = blank(), selected = '', dirty = false, preview = null, unreadableRaw = null, storageReadFailed = false;
  try { const saved = localStorage.getItem(KEY); if (saved !== null) { try { plan = validate(JSON.parse(saved)); } catch { unreadableRaw = saved; } } }
  catch { storageReadFailed = true; }
  function message(value) { $('message').textContent = value; }
  function changed() { dirty = true; $('saveState').textContent = 'Unsaved changes'; render(); }
  function save() {
    if (storageReadFailed || unreadableRaw !== null) { message('Save blocked: saved data could not be read or preserved.'); return; }
    try { localStorage.setItem(KEY, JSON.stringify(plan)); dirty=false; $('saveState').textContent='Saved on this device'; message('Plan saved on this device. Export JSON for a portable backup.'); }
    catch { message('Save failed. Export JSON to keep a portable copy.'); }
  }
  function conflicts() { const counts = new Map(); for (const item of plan.items) { const key = addressKey(item); if (key) counts.set(key,(counts.get(key)||0)+1); } return counts; }
  function addressKey(item) {
    if (item.status === 'spare') return '';
    const normalize = value => { const text=value.trim(); return /^\d+$/.test(text) ? String(BigInt(text)) : text; };
    const universe=normalize(item.universe), address=normalize(item.address);
    return universe && address ? `${universe}:${address}` : '';
  }
  function hasConflict(item,map) { const key=addressKey(item); return !!key && map.get(key)>1; }
  function render() {
    const map=conflicts(), query=$('search').value.trim().toLowerCase();
    $('count').textContent=plan.items.length;
    $('ready').textContent=plan.items.filter(i=>['patched','focused'].includes(i.status)).length;
    $('issues').textContent=plan.items.filter(i=>i.status==='issue').length;
    $('conflicts').textContent=plan.items.filter(i=>hasConflict(i,map)).length;
    const list=$('fixtureList'); list.replaceChildren();
    for (const item of plan.items.filter(i=>!query || FIELDS.some(f=>item[f].toLowerCase().includes(query)))) {
      const button=document.createElement('button'); button.type='button'; button.className='record'+(selected===item.id?' selected':'');
      const left=document.createElement('span'); const name=document.createElement('strong'); name.textContent=`${item.unit || 'No unit'} · ${item.fixture || 'Unnamed fixture'}`; const sub=document.createElement('small'); sub.textContent=`${item.position || 'No position'} · U${item.universe || '—'} / ${item.address || '—'}`; left.append(name,sub);
      const badge=document.createElement('span'); badge.className='badge'+(item.status==='issue'||hasConflict(item,map)?' issue':''); badge.textContent=hasConflict(item,map)?'Duplicate':item.status; button.append(left,badge); button.addEventListener('click',()=>select(item.id)); list.append(button);
    }
    if (!list.childElementCount) { const p=document.createElement('p'); p.textContent=plan.items.length?'No fixtures match the search.':'No fixtures yet. Add one or import a saved patch.'; list.append(p); }
    const focus=$('focusList'); focus.replaceChildren();
    for (const item of plan.items) {
      const row=document.createElement('div'); row.className='focus-row'; const details=document.createElement('div'); const title=document.createElement('strong'); title.textContent=`${item.unit || 'No unit'} · ${item.fixture || 'Unnamed fixture'}`; const sub=document.createElement('small'); sub.textContent=`${item.position || 'No position'} · ${item.focus || 'Focus not recorded'}`; details.append(title,sub);
      const selectStatus=document.createElement('select'); selectStatus.setAttribute('aria-label',`Status for ${item.unit || item.fixture || 'fixture'}`); for(const status of STATUSES){const option=document.createElement('option');option.value=status;option.textContent=status;selectStatus.append(option);}selectStatus.value=item.status;selectStatus.addEventListener('change',()=>{item.status=selectStatus.value;changed();}); row.append(details,selectStatus); focus.append(row);
    }
    if (!focus.childElementCount) focus.textContent='No fixtures to focus yet.';
    const current=plan.items.find(i=>i.id===selected); $('emptyEditor').hidden=!!current; $('fields').hidden=!current;
    if(current){for(const field of FIELDS) $('fixtureForm').elements[field].value=current[field]; $('fixtureWarning').textContent=hasConflict(current,map)?'Another fixture has this same universe and starting address. Review before patching.':'';}
  }
  function select(id) { selected=id; render(); }
  $('addBtn').addEventListener('click',()=>{const item=fixture({fixture:'New fixture',status:'planned'});plan.items.push(item);selected=item.id;changed();$('fixtureForm').elements.unit.focus();});
  $('fixtureForm').addEventListener('submit',event=>event.preventDefault());
  $('fixtureForm').addEventListener('input',event=>{const field=event.target.name, item=plan.items.find(i=>i.id===selected);if(item&&FIELDS.includes(field)){item[field]=event.target.value;changed();}});
  $('fixtureForm').addEventListener('change',event=>{const field=event.target.name,item=plan.items.find(i=>i.id===selected);if(item&&FIELDS.includes(field)){item[field]=event.target.value;changed();}});
  $('removeBtn').addEventListener('click',()=>{const item=plan.items.find(i=>i.id===selected);if(!item||!confirm(`Remove ${item.unit || item.fixture || 'this fixture'} from this plan?`))return;plan.items=plan.items.filter(i=>i.id!==selected);selected='';changed();});
  $('saveBtn').addEventListener('click',save); $('search').addEventListener('input',render);
  $('recoverBtn').addEventListener('click',()=>{
    if (unreadableRaw === null) return;
    if (!confirm('Preserve the unreadable original under a separate recovery key, then enable saving this plan?')) return;
    try {
      const key = `${KEY}.recovery.${Date.now()}.${crypto.randomUUID()}`;
      localStorage.setItem(key, unreadableRaw);
      if (localStorage.getItem(key) !== unreadableRaw) throw new Error('Recovery copy did not verify.');
      unreadableRaw = null; $('recoveryNotice').hidden = true;
      message(`Original preserved under ${key}. You may now save this plan.`);
    } catch { message('Could not preserve the original. Save remains blocked.'); }
  });
  window.addEventListener('beforeunload',event=>{ if (!dirty) return; event.preventDefault(); event.returnValue=''; });
  for(const field of ['showName','venue','lead']) $(field).addEventListener('input',()=>{plan.meta[field]=$(field).value;changed();});
  $('exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(plan,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='av-lighting-plan.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('JSON backup exported.');});
  $('legacyBtn').addEventListener('click',()=>{preview=null;$('confirmImport').hidden=true;try{const original=localStorage.getItem('lighting-patch.v1');if(!original)throw new Error('No saved Lighting Patch was found on this origin.');preview=validate(JSON.parse(original));$('importPreview').textContent=`Saved Lighting Patch: ${preview.items.length} fixtures from ${preview.meta.showName}. Current plan: ${plan.items.length} fixtures. Export a backup before replacement if needed.`;$('confirmImport').hidden=false;}catch(error){$('importPreview').textContent=`Could not review saved Lighting Patch: ${error.message} Current plan is unchanged.`;}});
  $('importInput').addEventListener('change',async event=>{preview=null;$('confirmImport').hidden=true;const file=event.target.files[0];if(!file)return;try{preview=validate(JSON.parse(await file.text()));$('importPreview').textContent=`Ready to import ${preview.items.length} fixtures from ${preview.meta.showName}. Current plan: ${plan.items.length} fixtures. Export a backup first if needed.`;$('confirmImport').hidden=false;}catch(error){$('importPreview').textContent=`Import rejected: ${error.message} Current plan is unchanged.`;}event.target.value='';});
  $('confirmImport').addEventListener('click',()=>{if(!preview)return;if(!confirm(`Replace this plan's ${plan.items.length} fixtures with the ${preview.items.length} previewed fixtures?`))return;plan=preview;preview=null;selected='';$('confirmImport').hidden=true;$('importPreview').textContent='Preview imported. Save the plan to keep it after reload.';syncMeta();changed();});
  const setTab=id=>{document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==id);document.querySelectorAll('.tabs button').forEach(el=>el.setAttribute('aria-current',el.dataset.tab===id?'page':'false'));};
  document.querySelectorAll('.tabs button').forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.tab)));
  $('themeBtn').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('themeBtn').textContent=dark?'Light mode':'Dark mode';try{localStorage.setItem('sbd.avLighting.theme',dark?'dark':'light');}catch{}});
  try{if(localStorage.getItem('sbd.avLighting.theme')==='dark')$('themeBtn').click();}catch{}
  function syncMeta(){for(const field of ['showName','venue','lead'])$(field).value=plan.meta[field];}
  syncMeta();render();
  if (unreadableRaw !== null || storageReadFailed) { $('recoveryNotice').hidden=false; if (storageReadFailed) { $('recoveryNotice').querySelector('p').textContent='Browser storage could not be read. Saving is blocked. Export a backup and reload after storage access is restored.'; $('recoverBtn').hidden=true; message('Saved plan could not be read. Save is blocked.'); } else message('Saved plan is unreadable. Preserve the original before saving.'); }
  $('bootFailure').hidden=true; $('app').removeAttribute('inert');
})();
