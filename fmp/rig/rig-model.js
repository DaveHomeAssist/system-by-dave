import * as T from './vendor/three/three.module.js';
import { photos, catalog } from './fmp-guide-data.js?v=cd103fa126450197';
const root=document.getElementById('fmp-rig-3d');
root.dataset.ready='true';
const themeButton=document.getElementById('themeBtn');
function applyTheme(theme) {
  document.documentElement.dataset.theme=theme;
  themeButton.textContent=theme==='dark'?'Light theme':'Dark theme';
  themeButton.setAttribute('aria-label',`Use ${theme==='dark'?'light':'dark'} theme`);
  document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#1c1917':'#f4eee3';
  root.querySelector('[data-scene]').dataset.surfaceTheme=theme==='dark'?'medium-slate':'light-neutral';
}
// ../theme.js resolves and stores the shared FMP preference; without it the rig starts light.
applyTheme(globalThis.fmpTheme?.theme||'light');
themeButton.addEventListener('click',()=>{
  const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
  globalThis.fmpTheme?.set(next);applyTheme(next);
});
// BEGIN SHARED VIEWER
const $=selector=>root.querySelector(selector);
const canvas=$('[data-scene]'), stage=$('[data-stage]');
const partSelect=$('[data-part-select]');
const models={}, parts=new Map(), pickables=[], surfaceStates=[];
let equipment='rig', selected='', hovered='', renderer, scene, camera, frame=0;
let destroyed=false, suspended=false, animation;
let touchRotation=false, viewScale=1;
let fiberPivot, fiberCable, fiberAngle=15;
let lcdHinge, lcdScreen, lcdOpening=90;
let ndPosition=1;
const ndSettings=[{position:1,stops:0,density:'Clear',fraction:'1',percent:'100%'},{position:2,stops:2,density:'0.6',fraction:'1/4',percent:'25%'},{position:3,stops:4,density:'1.2',fraction:'1/16',percent:'6.25%'},{position:4,stops:6,density:'1.8',fraction:'1/64',percent:'1.5625%'}];
const supportControlIds=['pan-lock','tilt-lock','pan-drag','tilt-drag','counterbalance','plate-clamp','plate-release','plate-safety'];
const lessonSteps={locks:supportControlIds.slice(0,2),drag:supportControlIds.slice(2,5),plate:supportControlIds.slice(5),practice:supportControlIds};
let lesson=null;
let activePanel='component', readingExpanded=false;
const viewMenu=$('[data-view-menu]');
function closeViews(restoreFocus=false){
  viewMenu.open=false;
  if(restoreFocus)$('[data-view-toggle]').focus();
}
function showPanel(name,focus=false){
  activePanel=['component','lessons','help'].includes(name)?name:'component';
  root.dataset.panel=activePanel;
  root.querySelectorAll('[data-panel]').forEach(panel=>{panel.hidden=panel.dataset.panel!==activePanel;});
  root.querySelectorAll('[data-tab]').forEach(tab=>{
    const active=tab.dataset.tab===activePanel;
    tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
  });
  if(focus)$(`[data-panel="${activePanel}"]`).focus({preventScroll:true});
}
function expandReading(expanded){
  readingExpanded=Boolean(expanded);root.dataset.expanded=String(readingExpanded);
  $('[data-expand]').setAttribute('aria-expanded',String(readingExpanded));
  $('[data-expand]').textContent=readingExpanded?'Show model':'Expand reading';
  resize();
  $('[data-expand]').scrollIntoView?.({block:'nearest'});
}
function selectionURL(){
  const url=new URL(window.location.href);
  url.searchParams.set('equipment',equipment);
  if(selected)url.searchParams.set('part',selected);else url.searchParams.delete('part');
  return url;
}
function writeSelection(mode='push'){
  const url=selectionURL();
  if(url.href!==window.location.href)window.history[mode==='replace'?'replaceState':'pushState'](null,'',url.href);
}
function restoreSelection(){
  const url=new URL(window.location.href),id=url.searchParams.get('part');
  const item=Object.hasOwn(catalog,id)?catalog[id]:null;
  const requested=url.searchParams.get('equipment');
  const hasSelection=url.searchParams.has('equipment')||url.searchParams.has('part');
  const next=item?.equipment||(requested==='studio'?'studio':'rig');
  switchEquipment(next);
  const target=item?id:hasSelection?'':'nd-filter';
  selectPart(target,true);
  setPose(target?catalog[target].pose:next==='rig'?'beauty':'studio-beauty',true);
  showPanel('component');$('[data-detail]').scrollTop=0;
  if(hasSelection){
    writeSelection('replace');
    if((id&&!item)||(requested&&!['rig','studio'].includes(requested)))$('[data-announcement]').textContent='That component link was not recognized. Choose a component from the menu.';
  }
}
function focusInstructions(){
  closeViews();showPanel('component',true);$('[data-detail]').scrollTop=0;
}
async function copySelectionLink(){
  const url=selectionURL();url.hash='';
  try{
    await navigator.clipboard.writeText(url.href);
    $('[data-link-fallback]').hidden=true;
    $('[data-announcement]').textContent='Component link copied.';
  }catch{
    $('[data-link-fallback]').hidden=false;
    $('[data-share-url]').value=url.href;
    $('[data-copy-status]').textContent='Automatic copy is unavailable. Select and copy the link above.';
    $('[data-share-url]').focus();$('[data-share-url]').select();
  }
}
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const state={az:-0.62,el:0.15,radius:27.5,target:new T.Vector3(0,-1.55,0)};
const poses={
  beauty:{az:-0.62,el:0.15,radius:27.5,target:[0,-1.55,0]},
  viewfinder:{az:Math.PI/2,el:.09,radius:7.8,target:[2.37,4.90,0]},
  'viewfinder-back':{az:-1.34,el:.20,radius:7.6,target:[2.20,4.83,0]},
  'viewfinder-mount':{az:-.38,el:.17,radius:6.9,target:[2.26,4.20,0]},
  'rig-top':{az:1.12,el:.22,radius:13.9,target:[.1,2.75,0]},
  operator:{az:-0.12,el:0.16,radius:10.4,target:[-0.40,1.72,0]},
  'body-controls':{az:-.07,el:.15,radius:5.6,target:[.42,2.03,.54]},
  'body-forward':{az:0,el:.025,radius:2.55,target:[-.48,2.02,.69]},
  'body-nd':{az:-1.08,el:.35,radius:3.05,target:[-.70,2.32,.51]},
  'body-power':{az:-.25,el:.48,radius:3.35,target:[.10,2.68,.52]},
  'body-door':{az:0,el:.03,radius:3.45,target:[.73,2.06,.83]},
  lcd:{az:.88,el:.20,radius:6.0,target:[.36,2.05,1.20]},
  connections:{az:2.35,el:0.24,radius:9.4,target:[0.55,1.75,-0.15]},
  support:{az:1.05,el:0.30,radius:10.3,target:[1.28,-.42,0]},
  'head-locks':{az:-.42,el:.15,radius:4.8,target:[.35,.02,.55]},
  'head-drag':{az:-2.88,el:.15,radius:4.8,target:[.32,.10,-.48]},
  'head-rear':{az:1.66,el:.05,radius:4.7,target:[1.0,.01,0]},
  'head-plate':{az:.12,el:.27,radius:5.9,target:[.70,.67,.53]},
  tripod:{az:-0.53,el:0.18,radius:16.7,target:[.43,-4.95,0]},
  ground:{az:-0.53,el:0.62,radius:10.1,target:[.43,-8.78,0]},
  'zoom-demand':{az:2.20,el:0.48,radius:5.5,target:[3.19,-.48,-1.28]},
  'focus-demand':{az:1.00,el:0.32,radius:5.5,target:[3.46,-.18,1.48]},
  lens:{az:-0.24,el:0.19,radius:5.6,target:[-2.3,1.98,0]},
  grip:{az:-2.25,el:0.40,radius:5.7,target:[-2.02,1.92,-0.43]},
  underside:{az:-2.92,el:-0.65,radius:3.1,target:[-2.19,1.51,-0.74]},
  front:{az:-2.57,el:0.19,radius:4.6,target:[-0.39,1.94,-0.60]},
  rear:{az:2.71,el:0.19,radius:5.1,target:[1.71,1.95,-0.51]},
  'fiber-rear':{az:1.76,el:0.19,radius:4.85,target:[2.98,2.12,-.05]},
  'fiber-side':{az:2.62,el:0.19,radius:4.45,target:[2.48,2.05,-.66]},
  'fiber-operator':{az:.20,el:.14,radius:4.45,target:[2.45,2.08,.52]},
  'studio-rear':{az:0.45,el:0.29,radius:8.6,target:[0,1.25,0.45]},
  'studio-operator':{az:0,el:0.04,radius:7.5,target:[0,1.26,0.5]},
  'studio-beauty':{az:-2.40,el:0.29,radius:17.5,target:[0,1.15,-3.0]},
  'studio-front':{az:Math.PI,el:0.08,radius:9.3,target:[0,1.23,-7.3]}
};
function themeColor(token){
  const probe=document.createElement('span');probe.style.color=`var(${token})`;root.appendChild(probe);
  const color=getComputedStyle(probe).color;probe.remove();return new T.Color(color);
}
let highlight=themeColor('--blue');
function material(color,metalness=.3,roughness=.5){return new T.MeshStandardMaterial({color,metalness,roughness});}
const mats={
  body:material(0x292d32,.46,.45), edge:material(0x495057,.64,.35), dark:material(0x111518,.15,.65),
  rubber:material(0x15181b,.03,.92), silver:material(0xb5bdc6,.87,.22), gold:material(0xc4a46a,.8,.24),
  glass:new T.MeshPhysicalMaterial({color:0x142c39,metalness:.35,roughness:.09,clearcoat:1,clearcoatRoughness:.06}),
  red:material(0xa32c2c,.12,.43), blue:material(0x1684ad,.35,.45), pin:material(0xbda66d,.78,.3)
};
function part(id,parent){const g=new T.Group();g.name=catalog[id].title;g.userData.cid=id;parent.add(g);parts.set(id,g);return g;}
function subgroup(parent,pos=[0,0,0],rot=[0,0,0]){const g=new T.Group();g.position.set(...pos);g.rotation.set(...rot);parent.add(g);return g;}
function add(parent,geometry,mat,pos=[0,0,0],rot=[0,0,0]){
  const m=new T.Mesh(geometry,mat);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function roundedGeometry(w,h,d,r=.04){
  r=Math.min(r,w/4,h/4,d/3);
  const s=new T.Shape();s.moveTo(-w/2+r,-h/2+r);s.lineTo(w/2-r,-h/2+r);s.lineTo(w/2-r,h/2-r);s.lineTo(-w/2+r,h/2-r);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,steps:1,curveSegments:3});g.translate(0,0,-d/2+r);return g;
}
function box(parent,w,h,d,pos,mat=mats.body,r=.025,rot=[0,0,0]){return add(parent,roundedGeometry(w,h,d,r),mat,pos,rot);}
function cyl(parent,r,length,pos,mat=mats.body,axis='x',segments=48){
  return add(parent,new T.CylinderGeometry(r,r,length,segments),mat,pos,axis==='x'?[0,0,Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0]);
}
function rod(parent,a,b,r,mat=mats.edge,segments=24){
  const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
  const mesh=add(parent,new T.CylinderGeometry(r,r,delta.length(),segments),mat,start.clone().add(end).multiplyScalar(.5).toArray());
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return mesh;
}
function torus(parent,r,t,pos,mat=mats.edge,axis='x'){
  return add(parent,new T.TorusGeometry(r,t,8,64),mat,pos,axis==='x'?[0,Math.PI/2,0]:axis==='y'?[Math.PI/2,0,0]:[0,0,0]);
}
function tube(parent,points,r=.035,mat=mats.rubber){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  return add(parent,new T.TubeGeometry(curve,48,r,8,false),mat);
}
function canvasTexture(width,height,draw){
  const c=document.createElement('canvas');c.width=width;c.height=height;draw(c.getContext('2d'),width,height);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}
function textPlane(parent,text,w,h,pos,rot=[0,0,0],color='#e4e8ec',background=null){
  const tex=canvasTexture(768,128,(ctx,cw,ch)=>{
    if(background){ctx.fillStyle=background;ctx.fillRect(0,0,cw,ch);}
    ctx.fillStyle=color;ctx.font='500 55px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,cw/2,ch/2,cw-30);
  });
  const mat=new T.MeshBasicMaterial({map:tex,transparent:true,side:T.FrontSide,depthWrite:false});
  const mesh=add(parent,new T.PlaneGeometry(w,h),mat,pos,rot);mesh.userData.noHighlight=true;mesh.castShadow=false;return mesh;
}
function screw(parent,pos,axis='z'){
  cyl(parent,.037,.018,pos,mats.silver,axis,12);
  const g=subgroup(parent,pos,axis==='x'?[0,Math.PI/2,0]:axis==='y'?[-Math.PI/2,0,0]:[0,0,0]);
  box(g,.043,.009,.005,[0,0,.012],mats.dark,.001);
}
function ribbedRing(parent,x,r,length,mat=mats.rubber){
  cyl(parent,r,length,[x,2.1,0],mat);
  const geometry=new T.BoxGeometry(length*.88,.025,.034);
  const instances=new T.InstancedMesh(geometry,mat,56),dummy=new T.Object3D();
  for(let i=0;i<56;i++){const a=i/56*Math.PI*2;dummy.position.set(x,2.1+Math.cos(a)*(r+.006),Math.sin(a)*(r+.006));dummy.rotation.set(a,0,0);dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix);}
  instances.castShadow=true;instances.receiveShadow=true;parent.add(instances);
  torus(parent,r,.009,[x-length/2,2.1,0]);torus(parent,r,.009,[x+length/2,2.1,0]);
}
function scaleBand(parent,x,r,length,labels){
  const tex=canvasTexture(1024,128,(ctx,w,h)=>{
    ctx.fillStyle='#20262b';ctx.fillRect(0,0,w,h);ctx.fillStyle='#d9dfd8';ctx.font='33px Arial';ctx.textAlign='center';
    for(let i=0;i<64;i++){ctx.fillRect(i*w/64,0,2,i%8===0?33:16);}
    labels.forEach((label,i)=>ctx.fillText(label,(i+.5)*w/labels.length,89));
  });
  const mat=new T.MeshStandardMaterial({map:tex,roughness:.7,metalness:.15});cyl(parent,r,length,[x,2.1,0],mat);
}
function bnc(parent,pos,rot=[0,0,0],plug=false){
  const g=subgroup(parent,pos,rot);
  cyl(g,.115,.075,[0,0,0],mats.silver,'z');cyl(g,.083,.16,[0,0,.092],mats.gold,'z');
  torus(g,.081,.012,[0,0,.177],mats.silver,'z');
  cyl(g,.055,.007,[0,0,.174],mats.dark,'z');cyl(g,.012,.023,[0,0,.182],mats.gold,'z',16);
  box(g,.029,.05,.03,[.086,0,.10],mats.silver,.004);box(g,.029,.05,.03,[-.086,0,.10],mats.silver,.004);
  if(plug){cyl(g,.089,.17,[0,0,.205],mats.silver,'z');cyl(g,.065,.14,[0,0,.35],mats.rubber,'z');for(let i=0;i<4;i++)torus(g,.065,.008,[0,0,.315+i*.02],mats.rubber,'z');}
  return g;
}
function xlr(parent,pos,rot=[0,0,0],pins=4,male=false,r=.17){
  const g=subgroup(parent,pos,rot);box(g,r*2.45,r*2.45,.035,[0,0,0],mats.dark,.035);
  cyl(g,r,.055,[0,0,.031],mats.silver,'z');cyl(g,r*.82,.059,[0,0,.048],mats.dark,'z');
  for(let i=0;i<pins;i++){const a=i/pins*Math.PI*2+Math.PI/4;cyl(g,r*.115,male?.075:.006,[Math.cos(a)*r*.47,Math.sin(a)*r*.47,.088],male?mats.pin:mats.rubber,'z',12);}
  box(g,.07,.027,.055,[0,r*.92,.075],mats.edge,.004);return g;
}
function jack(parent,pos,r=.058,rot=[0,0,0]){const g=subgroup(parent,pos,rot);cyl(g,r,.038,[0,0,0],mats.edge,'z');cyl(g,r*.6,.007,[0,0,.026],mats.dark,'z');return g;}
function cameraLabel(parent,text,w,h,pos,rot=[0,0,0],color='#e4e8ec'){
  const height=Math.max(96,Math.round(768*h/w));
  const tex=canvasTexture(768,height,(ctx,cw,ch)=>{
    let size=ch*.75;ctx.font=`600 ${size}px Arial`;
    const measure=ctx.measureText(text).width;if(measure>cw-32)size*=((cw-32)/measure);
    ctx.font=`600 ${size}px Arial`;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,cw/2,ch/2);
  });
  const mesh=add(parent,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.FrontSide,depthWrite:false}),pos,rot);
  mesh.userData.noHighlight=true;mesh.castShadow=false;return mesh;
}
function cameraKey(parent,id,label,x,y,w=.115,h=.070,z=.756,mat=mats.edge){
  const p=part(id,parent);box(p,w,h,.036,[x,y,z],mat,.010);
  if(label)cameraLabel(p,label,w*.86,h*.64,[x,y,z+.020]);return p;
}
function cameraSwitch(parent,id,x,y,z=.754,color=mats.dark){
  const p=part(id,parent);box(p,.063,.112,.032,[x,y,z],color,.012);
  box(p,.052,.024,.036,[x,y+.019,z+.025],mats.silver,.006);return p;
}
function makeForwardControls(body){
  // ND is the front-edge thumbwheel, distinct from the settings wheel on the side.
  const nd=part('nd-filter',body),wheel=subgroup(nd,[-.686,2.46,.455]);
  cyl(wheel,.145,.17,[0,0,0],mats.dark,'z');
  for(let i=0;i<28;i++){const a=i*Math.PI/14;box(wheel,.021,.017,.173,[Math.cos(a)*.146,Math.sin(a)*.146,0],mats.edge,.002,[0,0,a]);}
  for(const [i,label] of ['1  CLEAR','2  2 STOPS','3  4 STOPS','4  6 STOPS'].entries())cameraLabel(body,label,.31,.040,[-.36,2.800-i*.045,.652]);
  const power=part('body-power',body);box(power,.25,.075,.04,[.11,2.88,.55],mats.dark,.012);
  rod(power,[.11,2.88,.58],[.085,2.99,.59],.018,mats.silver,12);
  cameraLabel(power,'ON  OFF',.22,.046,[.11,2.79,.654]);
  cameraSwitch(body,'settings-selector',-.408,2.43,.755,mats.gold);
  cameraLabel(body,'H PHONE',.18,.033,[-.58,2.47,.734]);cameraLabel(body,'MONITOR',.18,.033,[-.58,2.42,.734]);cameraLabel(body,'IRIS',.14,.033,[-.58,2.37,.734]);
  const sw=part('settings-wheel',body);box(sw,.071,.214,.079,[-.29,2.43,.769],mats.edge,.012);
  for(let i=0;i<11;i++)box(sw,.073,.009,.023,[-.29,2.333+i*.019,.814],mats.dark,.002);
  const menu=part('body-menu',body);cyl(menu,.095,.050,[-.615,2.21,.762],mats.edge,'z');torus(menu,.086,.012,[-.615,2.21,.793],mats.rubber,'z');cameraLabel(menu,'MENU',.15,.038,[-.615,2.083,.746]);
  cameraKey(body,'body-back','BACK',-.424,2.14,.105,.059);
  cameraSwitch(body,'forward-lock',-.29,2.15);cameraLabel(body,'LOCK',.11,.034,[-.29,2.049,.744]);
  for(const [id,x,label] of [['body-gain',-.663,'ISO/GAIN'],['body-shutter',-.483,'SHUTTER'],['body-wb',-.303,'WHITE BAL']]){
    const p=part(id,body);box(p,.13,.056,.036,[x,1.90,.750],mats.body,.008);rod(p,[x,1.90,.775],[x,1.944,.802],.017,mats.silver,12);cameraLabel(p,label,.16,.031,[x,1.810,.739]);
  }
  for(const [id,x,label] of [['body-f1',-.663,'F1'],['body-f2',-.483,'F2'],['body-hfr',-.303,'HFR']])cameraKey(body,id,label,x,1.647,.13,.092);
  cameraKey(body,'body-rec','REC',-.35,1.443,.174,.115,.758,mats.red);
  const awb=part('body-auto-wb',body);box(awb,.06,.090,.10,[-.750,1.62,.57],mats.dark,.012);cameraLabel(awb,'W/B',.095,.040,[-.783,1.62,.57],[0,-Math.PI/2,0]);
}
function makeDoorControls(lcd){
  const sp=part('door-speaker',lcd);box(sp,.18,.092,.021,[.393,2.56,.854],mats.dark,.007);
  for(let row=0;row<4;row++)for(let col=0;col<7;col++)cyl(sp,.004,.008,[.319+col*.024,2.529+row*.020,.868],mats.edge,'z',6);
  cameraSwitch(lcd,'door-channel',.70,2.56,.861,mats.gold);
  cameraLabel(lcd,'CH1/2',.13,.030,[.57,2.58,.860]);cameraLabel(lcd,'CH3/4',.13,.030,[.57,2.54,.860]);
  cameraSwitch(lcd,'door-lock',.94,2.56,.861);cameraLabel(lcd,'LOCK',.10,.03,[.94,2.461,.861]);
  for(const [i,id,label] of [[0,'door-still','STILL'],[1,'door-hold','HOLD'],[2,'door-reset','RESET'],[3,'door-timecode','TIMECODE'],[4,'door-bright','BRIGHT']]){
    const p=cameraKey(lcd,id,'',.06+i*.23,1.87,.15,.085,.856,mats.dark);cameraLabel(p,label,.196,.034,[.06+i*.23,1.95,.864]);
  }
  for(const [id,label,x,y] of [['door-iris','IRIS',.16,1.63],['door-focus','FOCUS',.38,1.63],['door-pgm','PGM',.60,1.63],['door-prev','|<',.16,1.50],['door-play','>',.38,1.50],['door-next','>|',.60,1.50]])cameraKey(lcd,id,label,x,y,.16,.090,.855,mats.dark);
  for(const [id,x,label] of [['door-audio1',.94,'CH1/3'],['door-audio2',1.24,'CH2/4']]){
    const p=part(id,lcd);cyl(p,.105,.061,[x,1.59,.869],mats.edge,'z');torus(p,.093,.012,[x,1.59,.902],mats.rubber,'z');cameraLabel(p,label,.18,.035,[x,1.429,.864]);
  }
}
function makeRig(){
  const rig=new T.Group();rig.name='Camera rig';scene.add(rig);models.rig=rig;
  const body=part('body',rig);
  box(body,2.38,1.76,1.27,[.48,1.96,0],mats.body,.095);
  box(body,2.1,.24,1.36,[.55,1.09,0],mats.edge,.045);
  box(body,1.73,.25,1.14,[.59,2.87,0],mats.dark,.045);
  cyl(body,.555,.24,[-.78,2.1,0],mats.edge,'x');torus(body,.505,.02,[-.913,2.1,0]);
  box(body,.59,1.27,.085,[-.46,2.0,.68],mats.dark,.025);
  makeForwardControls(body);
  for(let i=0;i<7;i++)box(body,.043,.38,.012,[.58+i*.095,2.39,-.645],mats.dark,.003);
  const rosette=subgroup(body,[.57,1.7,-.659],[0,Math.PI,0]);cyl(rosette,.235,.065,[0,0,0],mats.edge,'z');cyl(rosette,.17,.08,[0,0,.01],mats.dark,'z');cyl(rosette,.05,.086,[0,0,.02],mats.silver,'z');
  for(const [x,y] of [[-.53,1.3],[-.53,2.72],[1.48,1.3],[1.48,2.72]])screw(body,[x,y,-.665]);
  const handle=part('handle',rig), hs=new T.Shape();
  hs.moveTo(-.55,2.94);hs.lineTo(-.73,3.26);hs.lineTo(-.51,3.83);hs.lineTo(1.19,3.83);hs.lineTo(1.53,3.23);hs.lineTo(1.45,2.94);hs.lineTo(1.12,2.94);hs.lineTo(.92,3.51);hs.lineTo(-.25,3.51);hs.lineTo(-.36,3.25);hs.lineTo(-.19,2.94);hs.closePath();
  const hg=new T.ExtrudeGeometry(hs,{depth:.30,bevelEnabled:true,bevelThickness:.045,bevelSize:.04,bevelSegments:3,steps:1});hg.translate(0,0,-.15);add(handle,hg,mats.body);
  box(handle,1.13,.13,.31,[.31,3.74,0],mats.rubber,.035);
  box(handle,.49,.10,.57,[-.34,2.95,0],mats.edge,.02);box(handle,.48,.1,.57,[1.22,2.95,0],mats.edge,.02);
  for(let i=0;i<3;i++)screw(handle,[-.01+i*.35,3.843,0],'y');
  const lcdAssembly=part('lcd',rig);
  for(const y of [1.61,2.47]){
    box(lcdAssembly,.17,.19,.17,[-.18,y,.698],mats.body,.024);
    cyl(lcdAssembly,.075,.23,[-.15,y,.770],mats.edge,'y');
  }
  lcdHinge=subgroup(lcdAssembly,[-.15,2.04,.770]);
  cyl(lcdHinge,.071,.61,[0,0,0],mats.dark,'y');
  // Preserve the closed-door coordinates; all faces and buttons share one hinge.
  const lcd=subgroup(lcdHinge,[.15,-2.04,-.770]);
  box(lcd,1.68,1.35,.17,[.73,2.04,.744],mats.body,.07);
  textPlane(lcd,'G2',.13,.06,[.11,2.56,.85],undefined,'#d1a03d');
  textPlane(lcd,'Blackmagic Design',.47,.046,[1.23,2.56,.853]);
  const status=part('door-status',lcd);
  box(status,1.02,.49,.025,[.63,2.22,.851],mats.dark,.006);
  const statusTexture=canvasTexture(512,256,(ctx,w,h)=>{ctx.fillStyle='#a3ac88';ctx.fillRect(0,0,w,h);ctx.fillStyle='#333e30';ctx.font='25px monospace';ctx.fillText('STATUS / TIMECODE',23,49);ctx.font='60px monospace';ctx.fillText('00:00:00:00',21,125);ctx.font='24px monospace';ctx.fillText('LCD STATUS DISPLAY',23,194);ctx.strokeStyle='#55604a';ctx.strokeRect(10,10,w-20,h-20);});
  const stat=add(status,new T.PlaneGeometry(.96,.435),new T.MeshBasicMaterial({map:statusTexture}),[.63,2.22,.868]);stat.castShadow=false;
  makeDoorControls(lcd);
  box(lcd,1.51,1.04,.012,[.73,2.105,.650],mats.dark,.015);
  lcdScreen=add(lcd,new T.PlaneGeometry(1.39,.88),mats.glass,[.73,2.105,.642],[0,Math.PI,0]);
  textPlane(lcd,'Blackmagic Design',.78,.071,[.73,1.455,.641],[0,Math.PI,0]);
  for(const [x,y] of [[.025,1.48],[1.435,1.48],[.025,2.61],[1.435,2.61]]){
    const fastener=subgroup(lcd,[x,y,.652],[0,Math.PI,0]);screw(fastener,[0,0,0]);
  }
  setLcdOpening(lcdOpening);
  const mounting=part('mount',rig);
  box(mounting,3.91,.18,1.47,[.50,.80,0],mats.edge,.025);box(mounting,3.29,.16,1.14,[.38,.965,0],mats.dark,.025);
  box(mounting,2.89,.20,1.23,[.55,.61,0],mats.body,.035);
  textPlane(mounting,'CAMERA RIG',1.36,.12,[.45,.78,.748]);
  for(const x of [-1.13,2.10])screw(mounting,[x,.798,.754]);
  makeSupport(rig);
  const barrel=part('lens-barrel',rig);
  cyl(barrel,.445,.43,[-1.105,2.1,0],mats.dark);cyl(barrel,.49,.51,[-1.49,2.1,0],mats.body);
  ribbedRing(barrel,-1.005,.475,.12,mats.edge);box(barrel,.49,.13,.018,[-1.27,2.10,.465],mats.dark,.006);textPlane(barrel,'4K',.27,.12,[-1.27,2.10,.48]);
  const iris=part('iris',rig);ribbedRing(iris,-1.795,.509,.15);scaleBand(iris,-1.86,.516,.12,['1.9','2.8','4','5.6','8','11','16']);
  const zoom=part('zoom',rig);ribbedRing(zoom,-2.21,.535,.51);scaleBand(zoom,-2.02,.542,.16,['8','15','30','60','85','128']);
  cyl(zoom,.043,.16,[-2.19,2.71,0],mats.edge,'y',16);box(zoom,.10,.18,.08,[-2.19,2.85,0],mats.dark,.012);
  const focus=part('focus',rig);ribbedRing(focus,-2.87,.59,.64);scaleBand(focus,-2.59,.598,.17,['0.8','1','1.5','3','5','10','∞']);
  const hood=part('hood',rig);cyl(hood,.604,.22,[-3.29,2.1,0],mats.rubber);torus(hood,.61,.035,[-3.39,2.1,0],mats.dark);
  const sh=new T.Shape();sh.moveTo(-.82,-.66);sh.lineTo(.82,-.66);sh.lineTo(.82,.66);sh.lineTo(-.82,.66);sh.closePath();
  const hole=new T.Path();hole.moveTo(-.66,-.51);hole.lineTo(-.66,.51);hole.lineTo(.66,.51);hole.lineTo(.66,-.51);hole.closePath();sh.holes.push(hole);
  const hoodGeo=new T.ExtrudeGeometry(sh,{depth:.63,bevelEnabled:true,bevelThickness:.04,bevelSize:.04,bevelSegments:3,steps:1});
  add(hood,hoodGeo,mats.rubber,[-4.03,2.1,0],[0,Math.PI/2,0]);
  cyl(hood,.57,.05,[-3.46,2.1,0],mats.dark);cyl(hood,.50,.016,[-3.66,2.1,0],mats.glass);torus(hood,.515,.025,[-3.67,2.1,0],mats.edge);
  const grip=part('grip',rig);
  box(grip,1.44,.67,.68,[-2.08,1.91,-.63],mats.body,.12,[.13,0,.08]);
  box(grip,.43,.76,.31,[-1.61,1.45,-.67],mats.rubber,.08,[0,0,-.35]);
  tube(grip,[[-2.68,1.86,-.77],[-2.72,1.17,-1.12],[-2.23,.93,-1.16],[-1.64,1.16,-1.05],[-1.53,1.50,-.82]],.065,mats.rubber);
  textPlane(grip,'FUJINON   LA16×8',1.12,.12,[-2.05,2.07,-.993],[0,Math.PI,0]);
  function gripButton(id,x,w,label,mat=mats.dark){const p=part(id,rig);box(p,w,.08,.23,[x,2.306,-.81],mat,.014,[0,0,-.035]);textPlane(p,label,w*.85,.15,[x,2.354,-.811],[-Math.PI/2,0,0]);return p;}
  gripButton('rocker',-2.09,.69,'T         W');gripButton('iris-mode',-2.76,.14,'A/M',mats.edge);gripButton('push-auto',-2.54,.16,'AUTO',mats.edge);gripButton('ret',-1.52,.19,'RET',mats.edge);
  const zoomMode=part('zoom-mode',rig);cyl(zoomMode,.13,.047,[-1.97,1.558,-.89],mats.dark,'y');box(zoomMode,.23,.056,.054,[-1.97,1.53,-.89],mats.edge,.01,[0,.5,0]);textPlane(zoomMode,'MANUAL / SERVO',.60,.085,[-1.99,1.501,-.78],[Math.PI/2,0,Math.PI]);
  const backFocus=part('back-focus',rig);
  cyl(backFocus,.128,.045,[-2.42,1.547,-.89],mats.dark,'y');
  torus(backFocus,.103,.015,[-2.42,1.514,-.89],mats.silver,'y');
  cyl(backFocus,.080,.018,[-2.42,1.51,-.89],mats.edge,'y');
  textPlane(backFocus,'F.f.',.22,.093,[-2.42,1.485,-.73],[Math.PI/2,0,Math.PI]);
  const fm=part('focus-module',rig);box(fm,.33,.37,.38,[-2.69,1.30,.17],mats.dark,.03);cyl(fm,.17,.13,[-2.69,1.47,.34],mats.edge,'z');textPlane(fm,'FMM-X1',.30,.08,[-2.69,1.28,.367]);
  const fc=part('focus-cable',rig);cyl(fc,.067,.24,[-2.69,1.015,.18],mats.silver,'y');
  tube(fc,[[-2.69,.90,.18],[-2.60,.28,.48],[-1.82,-.04,1.08],[.04,-.55,1.58],[1.80,-1.12,1.97],[2.48,-.62,1.94],[2.77,.055,1.70]],.045);
  rod(fc,[2.74,.06,1.70],[2.94,.03,1.70],.067,mats.silver);
  const frontSdi=part('front-sdi',rig);bnc(frontSdi,[-.54,2.43,-.69],[0,Math.PI,0],true);
  const ap=part('accessory-power',rig);xlr(ap,[-.54,1.98,-.697],[0,Math.PI,0],4,false,.145);
  const lanc=part('lanc',rig);jack(lanc,[-.54,1.58,-.70],.065,[0,Math.PI,0]);
  const lc=part('lens-control',rig), lcp=subgroup(lc,[-.37,1.77,-.695],[0,Math.PI,0]);
  cyl(lcp,.101,.22,[0,0,.12],mats.silver,'z');cyl(lcp,.07,.10,[0,0,.28],mats.rubber,'z');
  tube(lc,[[-.37,1.77,-1.04],[-.55,1.3,-1.14],[-1.37,1.12,-1.14],[-1.57,1.64,-.94]],.030);
  textPlane(body,'SDI OUT',.32,.07,[-.54,2.61,-.652],[0,Math.PI,0]);textPlane(body,'+12V OUT',.35,.065,[-.54,2.16,-.654],[0,Math.PI,0]);
  makeCameraFiber(rig);
  makeStudioViewfinder(rig);
  const rearIds=['rear-sdi-out','rear-sdi-in','reference'];
  rearIds.forEach((id,i)=>{const g=part(id,rig),y=2.47-i*.33;bnc(g,[1.40,y,-.68],[0,Math.PI,0],true);tube(g,[[1.40,y,-1.085],[1.47,y-.10,-1.33],[1.72,2.10-i*.32,-1.41],[1.98,1.95-i*.32,-1.18]],.027);});
  const dc=part('dc-in',rig);xlr(dc,[1.39,1.28,-.679],[0,Math.PI,0],4,true,.16);
  const headset=part('headset',rig);jack(headset,[1.4,2.78,-.676],.06,[0,Math.PI,0]);
  const usb=part('usb',rig);box(usb,.18,.065,.038,[1.39,1.01,-.692],mats.silver,.011);box(usb,.137,.033,.01,[1.39,1.01,-.716],mats.dark,.005);
  ['SDI OUT','SDI IN','REF / TC'].forEach((label,i)=>textPlane(body,label,.26,.058,[1.14,2.48-i*.33,-.655],[0,Math.PI,0]));
  return rig;
}
function setLcdOpening(degrees){
  lcdOpening=T.MathUtils.clamp(Number(degrees)||0,0,90);
  $('[data-lcd-opening]').value=String(lcdOpening);
  $('[data-lcd-opening-value]').textContent=lcdOpening===0?'Closed':lcdOpening+'°';
  $('[data-lcd-opening]').setAttribute('aria-valuetext',lcdOpening===0?'Closed':`${lcdOpening} degrees open`);
  if(lcdHinge)lcdHinge.rotation.y=-T.MathUtils.degToRad(lcdOpening);
  requestDraw();
}
function makeStudioViewfinder(rig){
  // Operator face points rearward (+X); its V-lock foot sits on the fiber converter.
  function frame(id){return subgroup(part(id,rig),[2.37,5.03,0],[0,Math.PI/2,0]);}
  const housing=frame('viewfinder');
  box(housing,3.22,2.14,.29,[0,0,0],mats.body,.075);
  box(housing,2.47,1.92,.074,[0,.025,.178],mats.dark,.023);
  box(housing,2.23,1.255,.018,[0,.06,.224],mats.glass,.006);
  box(housing,1.20,.68,.17,[0,-.04,-.228],mats.dark,.05);
  textPlane(housing,'Blackmagic Design',.94,.105,[0,-.04,-.319],[0,Math.PI,0]);
  textPlane(housing,'URSA STUDIO VIEWFINDER G2',1.74,.068,[0,-.90,.221]);
  for(let i=0;i<10;i++)box(housing,.061,.064,.018,[-.45+i*.10,.337,-.315],mats.dark,.009);
  for(const [x,y] of [[-1.48,.94],[1.48,.94],[-1.48,-.91],[1.48,-.91]]){
    screw(housing,[x,y,.162]);const rear=subgroup(housing,[x,y,-.161],[0,Math.PI,0]);screw(rear,[0,0,0]);
  }
  const shade=frame('vf-sunshade');
  for(const x of [-1.185,1.185])box(shade,.043,1.82,.51,[x,.025,.474],mats.dark,.012);
  box(shade,2.42,.045,.60,[0,.953,.483],mats.dark,.012,[-.055,0,0]);
  box(shade,2.40,.040,.26,[0,-.883,.353],mats.dark,.008);
  const handles=frame('vf-handles');
  for(const side of [-1,1]){
    for(const y of [-.89,.89])cyl(handles,.135,.095,[side*1.51,y,.18],mats.edge,'z');
    tube(handles,[[side*1.53,.89,.19],[side*1.85,.885,.28],[side*1.94,.65,.32],[side*1.94,-.64,.32],[side*1.84,-.89,.28],[side*1.53,-.89,.19]],.065,mats.rubber);
  }
  const mount=frame('vf-mount');
  function beam(a,b,width,depth){
    const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
    const m=box(mount,width,delta.length(),depth,start.clone().add(end).multiplyScalar(.5).toArray(),mats.body,.016);
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
  }
  for(const side of [-1,1]){
    cyl(mount,.20,.15,[side*1.675,-.08,-.065],mats.dark,'x');
    torus(mount,.182,.012,[side*1.756,-.08,-.065],mats.edge,'x');
    beam([side*1.55,-.08,-.11],[side*1.33,-.82,-.62],.13,.17);
    beam([side*1.33,-.82,-.62],[side*.85,-1.12,-.31],.14,.17);
    cyl(mount,.193,.16,[side*.90,-1.17,-.19],mats.dark,'x');
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12;
      rod(mount,[side*1.61,-.08+Math.cos(a)*.199,-.065+Math.sin(a)*.199],[side*1.74,-.08+Math.cos(a)*.199,-.065+Math.sin(a)*.199],.007,mats.edge,6);
    }
  }
  box(mount,1.73,.18,.40,[0,-1.23,-.18],mats.body,.03);
  cyl(mount,.30,.12,[0,-1.325,-.03],mats.edge,'y');
  cyl(mount,.265,.11,[0,-1.20,-.12],mats.dark,'y');
  box(mount,.65,.08,.65,[0,-1.42,0],mats.dark,.018);
  box(mount,.13,.10,.17,[-.39,-1.405,.04],mats.edge,.012);
  textPlane(mount,'V-LOCK',.48,.075,[0,-1.258,.037]);
  const tally=frame('vf-tally');
  box(tally,.63,.61,.085,[0,1.015,-.196],mats.silver,.053);
  box(tally,.48,.47,.015,[0,1.025,-.244],mats.edge,.035);
  box(tally,.41,.044,.025,[0,.842,.226],mats.dark,.009);
  function knob(id,x,y,label){
    const p=frame(id);cyl(p,.141,.067,[x,y,.176],mats.dark,'z');cyl(p,.106,.091,[x,y,.196],mats.edge,'z');
    for(let i=0;i<24;i++){const a=i*Math.PI/12;rod(p,[x+.139*Math.cos(a),y+.139*Math.sin(a),.16],[x+.139*Math.cos(a),y+.139*Math.sin(a),.223],.007,mats.rubber,6);}
    box(p,.013,.06,.009,[x,y+.076,.243],mats.silver,.002);
    textPlane(p,label,.30,.061,[x,y+.197,.169]);return p;
  }
  knob('vf-brightness',1.395,.55,'BRIGHT');
  knob('vf-contrast',1.395,.055,'CONTRAST');
  knob('vf-peaking',1.395,-.44,'PEAKING');
  const menu=knob('vf-menu',-1.395,.55,'MENU');
  box(menu,.205,.15,.047,[-1.395,.225,.187],mats.edge,.019);textPlane(menu,'BACK',.178,.063,[-1.395,.225,.214]);
  const functions=frame('vf-functions');
  for(let i=0;i<3;i++){box(functions,.20,.145,.047,[-1.395,.026-i*.195,.187],mats.edge,.019);textPlane(functions,'F'+(i+1),.11,.071,[-1.395,.026-i*.195,.214]);}
  const power=frame('vf-power');box(power,.20,.23,.041,[-1.395,-.68,.183],mats.dark,.025);
  rod(power,[-1.395,-.72,.205],[-1.395,-.665,.248],.027,mats.silver,16);
  textPlane(power,'ON',.12,.052,[-1.395,-.504,.168]);textPlane(power,'OFF',.15,.052,[-1.395,-.855,.168]);
  const cables=part('vf-cables',rig);
  const rear=subgroup(cables,[2.37,5.03,0],[0,Math.PI/2,0]);
  for(const y of [-.045,-.19]){
    cyl(rear,.045,.095,[.61,y,-.255],mats.rubber,'x');
  }
  // Standard manual hookup is illustrative; field return-feed patches need tracing.
  tube(cables,[[2.115,4.985,-.66],[1.83,4.43,-.78],[1.18,4.05,-.85],[-.13,3.94,-.83],[-.58,2.60,-1.22],[-.54,2.43,-1.10]],.029);
  tube(cables,[[2.115,4.84,-.66],[1.77,4.30,-.91],[1.10,4.01,-.95],[-.19,3.87,-.93],[-.66,2.31,-1.27],[-.54,1.98,-1.075]],.034);
  const plug=subgroup(cables,[-.54,1.98,-.775],[0,Math.PI,0]);
  cyl(plug,.117,.16,[0,0,.045],mats.silver,'z');cyl(plug,.090,.16,[0,0,.205],mats.rubber,'z');
  box(plug,.055,.041,.17,[0,.10,.05],mats.edge,.008);
}
function makeCameraFiber(rig){
  const housing=part('camera-fiber',rig);
  box(housing,1.34,2.30,1.48,[2.39,2.12,0],mats.body,.065);
  box(housing,.13,2.14,1.36,[1.69,2.09,0],mats.edge,.022);
  for(let i=0;i<12;i++)box(housing,.13,.045,1.25,[1.715,1.23+i*.125,0],mats.dark,.007);
  box(housing,1.09,.13,1.10,[2.34,3.335,0],mats.dark,.025);
  box(housing,.82,.14,.91,[2.37,3.455,0],mats.body,.025);
  for(const side of [-1,1])box(housing,.89,.19,.13,[2.37,3.48,side*.48],mats.edge,.017);
  box(housing,.13,.17,.90,[1.98,3.47,0],mats.body,.020);
  const rail=new T.Shape();
  rail.moveTo(2.98,.95);rail.lineTo(3.16,.95);rail.lineTo(3.16,1.85);rail.bezierCurveTo(3.16,2.10,3.42,2.29,3.42,2.54);rail.lineTo(3.42,3.05);rail.quadraticCurveTo(3.42,3.32,3.20,3.34);rail.lineTo(3.01,3.34);rail.lineTo(3.20,3.09);rail.lineTo(3.20,2.55);rail.bezierCurveTo(3.20,2.35,2.98,2.10,2.98,1.89);rail.closePath();
  for(const z of [-.84,.74])add(housing,new T.ExtrudeGeometry(rail,{depth:.10,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3,steps:1}),mats.edge,[0,0,z]);
  function rearPart(id){return subgroup(part(id,rig),[3.077,2.12,0],[0,Math.PI/2,0]);}
  const rear=subgroup(housing,[3.077,2.12,0],[0,Math.PI/2,0]);
  box(rear,1.43,2.24,.026,[0,0,0],mats.dark,.035);
  for(const [x,y] of [[-.65,1.04],[.65,1.04],[-.65,-1.04],[.65,-1.04]])screw(rear,[x,y,.027]);
  for(const [x,label] of [[-.43,'POWER'],[-.08,'TALLY'],[.31,'FIBER']]){textPlane(rear,label,.26,.051,[x,1.05,.035]);box(rear,.18,.029,.02,[x,.98,.04],mats.glass,.008);}
  function dial(g,x,y,r=.080){cyl(g,r,.081,[x,y,.067],mats.dark,'z');cyl(g,r*.82,.086,[x,y,.071],mats.edge,'z');for(let i=0;i<20;i++){const a=i/20*Math.PI*2;rod(g,[x+Math.cos(a)*r,y+Math.sin(a)*r,.036],[x+Math.cos(a)*r,y+Math.sin(a)*r,.118],.007,mats.rubber,6);}box(g,.012,.041,.006,[x,y+r*.39,.118],mats.silver,.001);}
  function cap(g,x,y,r,label){cyl(g,r,.065,[x,y,.044],mats.edge,'z');cyl(g,r*.89,.095,[x,y,.095],mats.rubber,'z');box(g,r*.63,.047,.04,[x,y-r,.080],mats.rubber,.009);if(label)textPlane(g,label,r*2.05,.049,[x,y+r+.047,.033]);}
  const ret=rearPart('fiber-return-controls');
  for(let i=0;i<2;i++){const x=-.50+i*.51;cyl(ret,.068,.045,[x,.80,.053],mats.dark,'z');torus(ret,.055,.009,[x,.80,.083],mats.edge,'z');dial(ret,x+.18,.80,.080);textPlane(ret,'RET '+(i+1),.18,.050,[x,.911,.034]);textPlane(ret,'1   2   3',.21,.049,[x+.18,.915,.034]);}
  const controls=rearPart('fiber-camera-controls');
  textPlane(controls,'LIGHT',.15,.043,[.55,.91,.034]);rod(controls,[.55,.83,.045],[.55,.85,.10],.016,mats.silver,12);
  for(const [y,label,mat] of [[.68,'FOCUS',mats.dark],[.52,'REC',mats.red]]){box(controls,.15,.074,.044,[.55,y,.062],mat,.013);textPlane(controls,label,.13,.043,[.55,y+.07,.035]);}
  box(controls,.105,.20,.025,[.55,.27,.056],mats.dark,.009);for(let i=0;i<8;i++)box(controls,.095,.01,.019,[.55,.185+i*.023,.083],mats.edge,.002);textPlane(controls,'IRIS',.13,.042,[.55,.41,.035]);
  const intercom=rearPart('fiber-intercom');
  for(let i=0;i<2;i++){const x=-.38+i*.49;
    box(intercom,.47,.50,.012,[x,.38,.024],mats.body,.014);
    for(const [dx,label] of [[-.12,'PGM1'],[.12,'PGM2']]){dial(intercom,x+dx,.52,.064);textPlane(intercom,label,.15,.045,[x+dx,.625,.041]);}
    dial(intercom,x-.052,.30,.072);textPlane(intercom,'INCOM',.17,.043,[x-.052,.397,.041]);
    for(const dx of [-.19,.18])rod(intercom,[x+dx,.285,.044],[x+dx,.30,.09],.012,mats.silver,10);
    textPlane(intercom,'MIC',.085,.041,[x-.19,.37,.041]);textPlane(intercom,'ENG / PROD',.27,.043,[x+.01,.166,.041]);
    textPlane(intercom,'INTERCOM '+(i+1),.40,.053,[x,.061,.033]);
    xlr(intercom,[x,-.18,.041],[0,0,0],5,false,.127);textPlane(intercom,String(i+1),.08,.045,[x,-.015,.04]);
  }
  const audio=rearPart('fiber-audio');
  for(let i=0;i<2;i++){const x=-.41+i*.49;cap(audio,x,-.91,.166,String(i+1));
    box(audio,.15,.059,.020,[x,-.67,.052],mats.gold,.009);box(audio,.035,.052,.025,[x+.015,-.67,.067],mats.dark,.004);
    textPlane(audio,'AES / LINE / MIC',.31,.042,[x,-.607,.035]);
    rod(audio,[x+.16,-.66,.04],[x+.16,-.65,.083],.012,mats.silver,10);
  }
  const loops=rearPart('fiber-loop-outs');for(let i=0;i<3;i++)cap(loops,.54,-.53-i*.24,.090,String(i+1));textPlane(loops,'SDI OUT',.22,.05,[.54,-1.125,.036]);
  const aux=rearPart('fiber-utility');cap(aux,-.46,-.46,.087,'TRACKER');cap(aux,-.04,-.46,.087,'DC OUT');
  cyl(aux,.028,.015,[-.245,-.46,.045],mats.edge,'z');
  const service=subgroup(parts.get('fiber-utility'),[0,0,0]);
  for(const [x,y,label,w,h] of [[1.98,2.25,'USB-C',.31,.16],[2.01,1.055,'ETHERNET',.41,.29]]){
    box(service,w,h,.038,[x,y,-.779],mats.rubber,.039);textPlane(service,label,w*.84,.049,[x,y,-.803],[0,Math.PI,0]);
  }
  box(service,.43,.29,.039,[2.00,1.24,.776],mats.rubber,.032);textPlane(service,'PTZ',.30,.063,[2.00,1.24,.801]);
  box(service,.43,.19,.039,[2.30,2.92,.776],mats.rubber,.030);textPlane(service,'+12V OUT',.35,.051,[2.30,2.92,.801]);
  const sideControls=part('fiber-side-controls',rig);
  for(const [i,label] of ['RET 1','RET 2','CALL'].entries()){
    const x=2.03+i*.29;
    cyl(sideControls,.081,.026,[x,2.53,.785],mats.dark,'z');
    torus(sideControls,.068,.011,[x,2.53,.805],mats.edge,'z');
    cyl(sideControls,.043,.031,[x,2.53,.807],mats.rubber,'z');
    textPlane(sideControls,label,.20,.052,[x,2.38,.788]);
  }
  const links=part('fiber-camera-links',rig);
  for(let i=0;i<3;i++){const y=1.95-i*.32;bnc(links,[1.98,y,-.775],[0,Math.PI,0],true);textPlane(links,['SDI IN','SDI OUT','REF OUT'][i],.29,.047,[1.98,y+.132,-.778],[0,Math.PI,0]);}
  const hybrid=part('fiber-hybrid',rig);
  cyl(hybrid,.265,.12,[2.66,2.90,-.785],mats.edge,'z');
  fiberPivot=subgroup(hybrid,[2.66,2.90,-.96]);
  const port=subgroup(fiberPivot,[0,-.19,0]);
  box(port,.51,.54,.41,[0,.015,0],mats.dark,.105);cyl(port,.255,.36,[0,.19,0],mats.body,'z');
  torus(port,.206,.019,[0,.19,-.195],mats.edge,'z');
  cyl(port,.229,.37,[0,-.40,0],mats.silver,'y');torus(port,.238,.025,[0,-.23,0],mats.silver,'y');
  // Mated cable plug and strain relief, rather than a cable through a closed dust cap.
  cyl(port,.249,.15,[0,-.64,0],mats.edge,'y');cyl(port,.216,.17,[0,-.78,0],mats.rubber,'y');
  cyl(port,.123,.19,[0,-.95,0],mats.rubber,'y');
  for(let i=0;i<4;i++)torus(port,.122-i*.010,.015,[0,-.89-i*.039,0],mats.dark,'y');
  for(const x of [-.225,.225])cyl(port,.024,.07,[x,-.215,-.10],mats.silver,'y',12);
  fiberCable=tube(hybrid,[[2.66,1.67,-.96],[2.8,.80,-1.36],[3.85,-1.5,-2.20],[3.78,-4.8,-2.28],[3.88,-8.98,-2.38],[4.45,-9.28,-2.50]],.068);
  setFiberAngle(fiberAngle);
}
function setFiberAngle(degrees){
  fiberAngle=T.MathUtils.clamp(Number(degrees)||0,0,60);
  $('[data-fiber-angle]').value=String(fiberAngle);
  $('[data-fiber-angle-value]').textContent=fiberAngle+'°';
  $('[data-fiber-angle]').setAttribute('aria-valuetext',`${fiberAngle} degrees`);
  if(!fiberPivot||!fiberCable)return;
  fiberPivot.rotation.z=T.MathUtils.degToRad(fiberAngle);
  const rotation=new T.Quaternion().setFromEuler(fiberPivot.rotation);
  const exit=new T.Vector3(0,-1.225,0).applyQuaternion(rotation).add(fiberPivot.position);
  const tangent=new T.Vector3(0,-.50,0).applyQuaternion(rotation);
  const points=[exit,exit.clone().add(tangent),new T.Vector3(4.05,.23,-1.77),new T.Vector3(3.95,-2.0,-2.20),new T.Vector3(3.80,-6.3,-2.28),new T.Vector3(3.90,-8.98,-2.38),new T.Vector3(4.45,-9.28,-2.50)];
  const curve=new T.CatmullRomCurve3(points);
  fiberCable.geometry.dispose();
  fiberCable.geometry=new T.TubeGeometry(curve,96,.068,10,false);
  requestDraw();
}
function makeSupport(rig){
  // Vinten-style support; exact head, legs and demand models were not identified.
  const head=part('fluid-head',rig);
  box(head,1.49,.38,1.21,[.43,.35,0],mats.body,.085);
  box(head,1.13,.45,1.12,[.43,.03,0],mats.body,.10);
  cyl(head,.67,.23,[.43,-.30,0],mats.edge,'y');
  cyl(head,.62,.15,[.43,-.47,0],mats.dark,'y');
  add(head,new T.SphereGeometry(.53,40,24,0,Math.PI*2,Math.PI/2,Math.PI/2),mats.edge,[.43,-.44,0]);
  for(const side of [-1,1]){
    cyl(head,.29,.12,[.41,.23,side*.65],mats.body,'z');
  }
  // Eight independently selectable teaching controls. Positions are illustrative.
  const pl=part('pan-lock',rig);
  cyl(pl,.085,.15,[-.03,-.31,.67],mats.edge,'z');
  box(pl,.40,.10,.12,[-.17,-.30,.79],mats.dark,.022,[0,0,.16]);
  const tl=part('tilt-lock',rig);
  cyl(tl,.15,.21,[.41,.23,.78],mats.edge,'z');
  box(tl,.37,.105,.13,[.29,.15,.90],mats.dark,.022,[0,0,.55]);
  const td=part('tilt-drag',rig);
  cyl(td,.22,.23,[.41,.23,-.80],mats.edge,'z');
  torus(td,.205,.024,[.41,.23,-.92],mats.rubber,'z');
  box(td,.06,.17,.016,[.41,.26,-.941],mats.silver,.004);
  const pd=part('pan-drag',rig);
  cyl(pd,.17,.22,[1.11,-.31,0],mats.edge,'x');
  torus(pd,.155,.023,[1.23,-.31,0],mats.rubber,'x');
  box(pd,.018,.13,.05,[1.232,-.28,0],mats.silver,.004);
  const cb=part('counterbalance',rig);
  cyl(cb,.16,.26,[1.20,.22,0],mats.edge,'x');
  torus(cb,.143,.023,[1.34,.22,0],mats.rubber,'x');
  box(cb,.018,.12,.045,[1.338,.25,0],mats.silver,.004);
  const pc=part('plate-clamp',rig);
  cyl(pc,.075,.16,[-.10,.54,.67],mats.edge,'z');
  box(pc,.42,.095,.12,[-.21,.56,.79],mats.dark,.018,[0,0,-.14]);
  const pr=part('plate-release',rig);
  cyl(pr,.075,.08,[1.05,.87,.81],mats.edge,'z');
  box(pr,.42,.11,.14,[1.18,.87,.88],mats.dark,.022,[0,0,-.16]);
  const ps=part('plate-safety',rig);
  box(ps,.15,.115,.12,[1.59,.86,.81],mats.red,.024);
  cyl(head,.088,.02,[-.02,.56,.32],mats.silver,'y',32);
  cyl(head,.065,.023,[-.02,.572,.32],mats.glass,'y',32);
  textPlane(head,'VINTEN',.62,.135,[.42,.12,.70]);
  const tripod=part('tripod',rig);
  cyl(tripod,.79,.23,[.43,-.73,0],mats.body,'y');
  torus(tripod,.66,.075,[.43,-.61,0],mats.edge,'y');
  rod(tripod,[.43,-.79,0],[.43,-1.25,0],.062,mats.silver);
  cyl(tripod,.25,.13,[.43,-1.29,0],mats.dark,'y');
  const spreader=part('spreader',rig);
  cyl(spreader,.31,.14,[.43,-9.28,0],mats.body,'y');
  cyl(spreader,.12,.065,[.43,-9.18,0],mats.edge,'y');
  for(let i=0;i<3;i++){
    const a=Math.PI+i*Math.PI*2/3,radial=new T.Vector3(Math.cos(a),0,Math.sin(a)),across=new T.Vector3(-Math.sin(a),0,Math.cos(a));
    const point=(r,y,offset=0)=>new T.Vector3(.43,0,0).addScaledVector(radial,r).addScaledVector(across,offset).add(new T.Vector3(0,y,0)).toArray();
    const upper=point(.72,-.85),join=point(2.15,-5.35),foot=point(3.40,-9.29);
    const hinge=subgroup(tripod,upper,[0,-a,0]);box(hinge,.37,.36,.70,[0,-.04,0],mats.body,.06);cyl(hinge,.115,.73,[0,0,0],mats.silver,'z');
    for(const offset of [-.235,.235]){
      rod(tripod,point(.77,-1.05,offset),point(2.17,-5.40,offset),.105,mats.edge);
      rod(tripod,point(1.96,-4.73,offset*.67),point(3.40,-9.23,offset*.67),.077,mats.silver);
    }
    const clamp=subgroup(tripod,join,[0,-a,0]);box(clamp,.38,.34,.81,[0,0,0],mats.body,.045);
    box(clamp,.15,.30,.13,[.23,.01,.08],mats.dark,.028,[0,0,-.19]);screw(clamp,[.25,.03,.17]);
    const shoe=subgroup(tripod,foot,[0,-a,0]);box(shoe,.56,.20,.68,[0,0,0],mats.rubber,.068);
    cyl(shoe,.10,.23,[0,.13,0],mats.dark,'y');
    const arm=subgroup(spreader,[.43,-9.28,0],[0,-a,0]);
    box(arm,1.84,.10,.24,[1.02,0,0],mats.body,.018);
    box(arm,1.85,.09,.17,[2.29,.012,0],mats.edge,.014);
    box(arm,.33,.14,.40,[3.25,.025,0],mats.body,.028);
    box(arm,.20,.045,.61,[3.40,.11,0],mats.rubber,.008);
    cyl(arm,.078,.064,[1.77,.075,0],mats.dark,'y');
    if(i===1){const label=subgroup(tripod,point(1.06,-2.04,.26),[0,Math.PI/2-a,0]);textPlane(label,'VINTEN',.67,.16,[0,0,.06]);}
  }
  const bars=part('pan-bars',rig);
  for(const side of [-1,1]){
    const z=side*.77;
    cyl(bars,.205,.20,[.88,.28,z],mats.dark,'z');
    cyl(bars,.10,.26,[.88,.28,z+side*.11],mats.silver,'z');
    box(bars,.27,.075,.11,[1.02,.32,z+side*.22],mats.edge,.015,[0,0,.33]);
    tube(bars,[[.94,.23,z],[1.29,.03,side*1.08],[2.02,-.24,side*1.25],[2.94,-.42,side*1.25]],.069,mats.edge);
    rod(bars,[1.54,-.12,side*1.17],[2.06,-.25,side*1.25],.084,mats.dark);
    if(side===1){
      const handle=subgroup(bars,[3.59,-.52,1.25],[0,0,-.15]);
      cyl(handle,.073,1.55,[-.10,0,0],mats.edge,'x');
      cyl(handle,.125,1.05,[.10,0,0],mats.rubber,'x');
      for(let j=0;j<12;j++)torus(handle,.125,.008,[-.37+j*.086,0,0],mats.dark,'x');
      cyl(handle,.135,.065,[.66,0,0],mats.dark,'x');
    }
  }
  const zd=part('zoom-demand',rig),zg=subgroup(zd,[3.15,-.43,-1.25],[0,0,-.15]);
  cyl(zg,.16,.94,[.13,0,0],mats.rubber,'x');
  box(zg,.86,.31,.51,[.04,.12,0],mats.body,.074);
  box(zg,.58,.075,.25,[.04,.315,0],mats.dark,.022,[0,0,.07]);
  textPlane(zg,'W         T',.56,.13,[.04,.36,0],[-Math.PI/2,0,0]);
  cyl(zg,.066,.035,[-.24,.34,.17],mats.edge,'y',24);
  torus(zg,.162,.032,[-.38,0,0],mats.silver,'x');
  textPlane(zg,'ZOOM',.53,.10,[.04,.13,-.268],[0,Math.PI,0]);
  tube(zd,[[2.78,-.30,-1.38],[2.35,-.82,-1.61],[.80,-.89,-1.63],[-.69,-.52,-1.53],[-1.52,.40,-1.31],[-1.76,1.47,-.97]],.027);
  cyl(zd,.056,.13,[-1.76,1.46,-.97],mats.silver,'y');
  const fc=part('focus-clamp',rig),clamp=subgroup(fc,[2.86,-.40,1.25],[0,0,-.15]);
  for(const x of [-.057,.057])torus(clamp,.101,.036,[x,0,0],mats.edge,'x');
  box(clamp,.22,.19,.18,[0,.13,.015],mats.body,.022);
  box(clamp,.18,.27,.12,[0,.30,.065],mats.edge,.021);
  box(clamp,.19,.11,.50,[.035,.41,.25],mats.edge,.020);
  cyl(clamp,.24,.12,[.035,.44,.45],mats.body,'x');
  cyl(clamp,.078,.14,[0,.14,-.13],mats.silver,'z');
  box(clamp,.25,.055,.067,[0,.14,-.22],mats.dark,.01,[0,0,.22]);
  const fd=part('focus-demand',rig),fg=subgroup(fd,[3.19,-.01,1.70],[0,0,-.15]);
  cyl(fg,.175,.79,[.20,0,0],mats.rubber,'x');
  cyl(fg,.225,.18,[-.26,0,0],mats.body,'x');
  torus(fg,.19,.031,[-.20,0,0],mats.silver,'x');
  cyl(fg,.20,.65,[.17,0,0],mats.dark,'x');
  for(let i=0;i<20;i++){const a=i/20*Math.PI*2;box(fg,.57,.034,.031,[.17,Math.cos(a)*.202,Math.sin(a)*.202],mats.rubber,.007,[a,0,0]);}
  cyl(fg,.233,.12,[.55,0,0],mats.body,'x');
  cyl(fg,.168,.015,[.62,0,0],mats.edge,'x');
  textPlane(fg,'FOCUS',.53,.095,[.16,.226,0],[-Math.PI/2,0,0]);
}
function makeStudio(){
  const studio=new T.Group();studio.name='Studio Fiber Converter';scene.add(studio);models.studio=studio;
  const body=part('studio-body',studio);
  box(body,5.6,2.36,9.0,[0,1.21,-3.0],mats.body,.075);
  box(body,5.47,2.20,.06,[0,1.22,1.52],mats.dark,.026);
  for(let i=0;i<4;i++)cyl(body,.18,.12,[i<2?-2.1:2.1,-.028,i%2===0?-6.8:.96],mats.rubber,'y');
  for(const side of [-1,1]){
    const ventGeo=new T.CircleGeometry(.021,7),vents=new T.InstancedMesh(ventGeo,mats.dark,480),dummy=new T.Object3D();
    let n=0;for(const z of [-5.35,-1.85])for(let row=0;row<12;row++)for(let col=0;col<20;col++){
      dummy.position.set(side*2.804,.50+row*.116,z+(col-9.5)*.104);dummy.rotation.set(0,side*Math.PI/2,0);dummy.updateMatrix();vents.setMatrixAt(n++,dummy.matrix);
    }body.add(vents);
    for(const z of [-7.12,.93])for(const y of [.27,2.12])screw(body,[side*2.81,y,z],'x');
  }
  const panelTexture=canvasTexture(1680,710,(ctx,w,h)=>{
    ctx.fillStyle='#12171b';ctx.fillRect(0,0,w,h);
    const px=x=>(x+2.8)/5.6*w,py=y=>(2.39-y)/2.36*h;
    const rect=(x,y,rw,rh,color)=>{ctx.fillStyle=color;ctx.fillRect(px(x),py(y),rw/5.6*w,rh/2.36*h);};
    const label=(str,x,y,size=22,color='#cfd4d5')=>{ctx.fillStyle=color;ctx.font=`${size}px Arial`;ctx.textAlign='center';ctx.fillText(str,px(x),py(y));};
    const cell=(x,y,rw,rh,title,color='#a8b3b7')=>{ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(px(x),py(y),rw/5.6*w,rh/2.36*h);rect(x,y,rw,.17,color);label(title,x+rw/2,y-.12,23,'#14202a');};
    label('STUDIO FIBER CONVERTER',-1.63,2.06,31);label('Blackmagic Design',-1.63,1.82,22);
    cell(-.44,2.36,3.16,.66,'AUDIO ANALOG OUT');
    cell(-2.72,1.55,.78,1.44,'AC IN');cell(-1.90,1.55,1.45,.73,'INTERCOM / TALLY');cell(-1.90,.77,1.45,.66,'PTZ');
    cell(-.41,1.55,.69,.73,'OPTICAL I/O','#2091bd');cell(-.41,.77,.69,.66,'ETHERNET');
    cell(.32,1.55,1.64,1.44,'12G DIGITAL I/O','#2091bd');label('OUT',1.14,1.22);label('RETURN IN',1.14,.66);
    cell(2.00,1.55,.73,1.44,'REF');label('OUT',2.365,1.20);label('IN',2.365,.60);
    for(let i=0;i<4;i++)label(String(i+1),-.05+i*.72,2.08,20);
  });
  const panelMat=new T.MeshBasicMaterial({map:panelTexture});const panel=add(body,new T.PlaneGeometry(5.6,2.36),panelMat,[0,1.21,1.558]);panel.userData.noHighlight=true;panel.castShadow=false;
  const audio=part('studio-audio',studio);for(let i=0;i<4;i++)xlr(audio,[-.06+i*.72,1.93,1.578],[0,0,0],3,true,.237);
  const ac=part('studio-ac',studio);box(ac,.52,.48,.095,[-2.33,.93,1.612],mats.edge,.045);box(ac,.41,.33,.015,[-2.33,.93,1.670],mats.dark,.025);
  for(const [x,y] of [[-.10,-.035],[.10,-.035],[0,.075]])box(ac,.047,.074,.06,[-2.33+x,.93+y,1.707],mats.silver,.006);
  function dsub(id,pos,w,pins){const p=part(id,studio),g=subgroup(p,pos);box(g,w,.31,.09,[0,0,0],mats.silver,.027);box(g,w-.12,.205,.022,[0,0,.06],mats.dark,.02);
    const upper=Math.ceil(pins/2),lower=pins-upper;
    for(let row=0;row<2;row++){const n=row===0?upper:lower;for(let i=0;i<n;i++)cyl(g,.012,.03,[(i-(n-1)/2)*(w-.2)/(upper-1),row===0?.045:-.045,.082],mats.gold,'z',8);}
    screw(g,[-w/2-.095,0,.024]);screw(g,[w/2+.095,0,.024]);return p;}
  dsub('studio-intercom',[-1.17,1.14,1.63],1.1,25);dsub('studio-ptz',[-1.17,.39,1.63],.67,9);
  const optical=part('studio-optical',studio);box(optical,.42,.36,.19,[-.065,1.10,1.67],mats.dark,.016);box(optical,.34,.16,.016,[-.065,1.10,1.775],mats.edge,.006);box(optical,.27,.08,.018,[-.065,1.10,1.787],mats.dark,.004);
  const ethernet=part('studio-ethernet',studio);box(ethernet,.44,.37,.095,[-.065,.39,1.622],mats.silver,.018);box(ethernet,.33,.26,.017,[-.065,.395,1.681],mats.dark,.006);
  for(let i=0;i<8;i++)box(ethernet,.011,.077,.012,[-.18+i*.033,.465,1.697],mats.gold,.002);
  const out=part('studio-out',studio);for(const x of [.76,1.48])bnc(out,[x,.98,1.59]);
  const returns=part('studio-returns',studio);for(const x of [.60,1.14,1.68])bnc(returns,[x,.34,1.59]);
  const reference=part('studio-ref',studio);bnc(reference,[2.365,.94,1.59]);bnc(reference,[2.365,.31,1.59]);
  for(const [x,y] of [[-2.72,.15],[-2.72,2.28],[2.72,.15],[2.72,2.28]])screw(body,[x,y,1.58]);
  const frontZ=-7.535;
  box(body,5.58,2.32,.065,[0,1.21,frontZ],mats.dark,.025);
  textPlane(body,'Blackmagic Design',.90,.088,[-1.93,.19,frontZ-.042],[0,Math.PI,0]);
  function frontPart(id,x,y){return subgroup(part(id,studio),[x,y,frontZ-.05],[0,Math.PI,0]);}
  const lcd=frontPart('studio-lcd',-.52,1.23);
  box(lcd,3.02,1.85,.06,[0,0,0],mats.edge,.036);
  box(lcd,2.88,1.70,.045,[0,0,.045],mats.glass,.017);
  const buttons=frontPart('studio-menu',-2.31,1.24);
  for(const [i,label] of ['MENU','SET','△','▽'].entries()){
    box(buttons,.25,.23,.062,[0,.70-i*.455,.015],mats.body,.028);
    textPlane(buttons,label,.21,.10,[0,.70-i*.455,.052]);
  }
  const power=frontPart('studio-power',2.41,1.58);
  box(power,.31,.64,.052,[0,0,0],mats.edge,.045);
  box(power,.23,.54,.069,[0,0,.026],mats.dark,.025);
  textPlane(power,'I',.08,.13,[0,.145,.065]);textPlane(power,'O',.10,.11,[0,-.125,.065]);
  const usb=frontPart('studio-usb',2.35,.46);
  box(usb,.46,.42,.065,[0,0,0],mats.rubber,.037);textPlane(usb,'USB',.25,.08,[0,0,.036],[0,0,0],'#8b9397');
  const socket=frontPart('studio-hybrid',1.53,1.51);
  box(socket,.87,.89,.059,[0,0,0],mats.body,.10);
  cyl(socket,.445,.10,[0,0,.07],mats.silver,'z');cyl(socket,.335,.31,[0,0,.23],mats.silver,'z');
  torus(socket,.326,.029,[0,0,.389],mats.edge,'z');cyl(socket,.283,.015,[0,0,.39],mats.dark,'z');
  for(const [x,y,r] of [[-.125,.105,.061],[.125,.105,.061],[-.14,-.093,.045],[.14,-.093,.045],[0,-.17,.036],[0,.015,.044]]){
    torus(socket,r,.010,[x,y,.405],mats.gold,'z');cyl(socket,r*.58,.006,[x,y,.409],mats.dark,'z',16);
  }
  for(const [x,y] of [[-.32,.32],[.32,-.32]])screw(socket,[x,y,.14]);
  box(socket,.033,.099,.012,[0,.383,.123],mats.red,.003);
  const cap=subgroup(socket,[-.37,-.88,.21],[.80,-.25,.20]);
  cyl(cap,.32,.30,[0,0,0],mats.rubber,'z');cyl(cap,.25,.013,[0,0,.156],mats.dark,'z');torus(cap,.27,.042,[0,0,.16],mats.edge,'z');
  tube(socket,[[.28,-.26,.02],[.46,-.78,.12],[.14,-1.00,.19],[-.37,-.92,.21]],.025);
  return studio;
}
function registerSurfaces(){
  scene.traverse(object=>{
    if(!object.isMesh) return;
    const ids=[];
    for(let parent=object.parent;parent;parent=parent.parent){if(parent.userData.cid)ids.push(parent.userData.cid);}
    const id=ids[0];if(!id)return;
    object.userData.cid=id;pickables.push(object);
    object.material=object.material.clone();
    if(!object.userData.noHighlight){surfaceStates.push({mesh:object,id,ids,color:object.material.color.clone(),emissive:object.material.emissive?.clone(),emissiveIntensity:object.material.emissiveIntensity});}
  });
}
function updateHighlight(){
  for(const s of surfaceStates){const chosen=s.ids.includes(selected),over=s.ids.includes(hovered),factor=chosen?.64:over?.23:0;
    s.mesh.material.color.copy(s.color).lerp(highlight,factor);
    if(s.emissive){s.mesh.material.emissive.copy(chosen||over?highlight:s.emissive);s.mesh.material.emissiveIntensity=chosen?.16:over?.05:s.emissiveIntensity;}
  }
  requestDraw();
}
function updateCamera(){
  const radius=state.radius;
  camera.position.set(state.target.x+radius*Math.sin(state.az)*Math.cos(state.el),state.target.y+radius*Math.sin(state.el),state.target.z+radius*Math.cos(state.az)*Math.cos(state.el));
  camera.lookAt(state.target);camera.updateMatrixWorld();
}
function draw(time){
  frame=0;if(destroyed||suspended||!renderer) return;
  if(animation){
    const fraction=Math.min(1,(time-animation.start)/animation.duration),p=1-Math.pow(1-fraction,3);
    state.az=animation.from.az+(animation.to.az-animation.from.az)*p;
    state.el=animation.from.el+(animation.to.el-animation.from.el)*p;
    state.radius=animation.from.radius+(animation.to.radius-animation.from.radius)*p;
    state.target.copy(animation.from.target).lerp(animation.to.target,p);
    if(fraction===1) animation=undefined;
  }
  updateCamera();renderer.render(scene,camera);if(animation) requestDraw();
}
function requestDraw(){if(!frame&&!destroyed&&!suspended&&renderer)frame=requestAnimationFrame(draw);}
function setPose(key,instant=false){
  const p=poses[key]||poses.beauty;let az=p.az;
  while(az-state.az>Math.PI)az-=Math.PI*2;while(az-state.az<-Math.PI)az+=Math.PI*2;
  const target=new T.Vector3(...p.target);
  viewScale=viewportScale();const radius=p.radius*viewScale;
  if(instant||reduceMotion.matches){state.az=az;state.el=p.el;state.radius=radius;state.target.copy(target);animation=undefined;}
  else animation={start:performance.now(),duration:430,from:{az:state.az,el:state.el,radius:state.radius,target:state.target.clone()},to:{az,el:p.el,radius,target}};
  requestDraw();
}
function populateParts(){
  partSelect.replaceChildren();const first=document.createElement('option');first.value='';first.textContent=equipment==='rig'?'Entire camera rig':'Entire studio converter';partSelect.appendChild(first);
  const groups=new Map();
  for(const [id,item] of Object.entries(catalog)){
    if(item.equipment!==equipment)continue;
    if(!groups.has(item.category)){const g=document.createElement('optgroup');g.label=item.category;partSelect.appendChild(g);groups.set(item.category,g);}
    const option=document.createElement('option');option.value=id;option.textContent=item.title;groups.get(item.category).appendChild(option);
  }
}
function selectPart(id,focus=false){
  $('[data-link-fallback]').hidden=true;
  selected=id;partSelect.value=id;const item=catalog[id];
  $('[data-usage]').hidden=!item;$('[data-reference]').hidden=!item;
  $('[data-fiber-adjust]').hidden=id!=='fiber-hybrid';
  $('[data-lcd-adjust]').hidden=id!=='lcd';
  $('[data-nd-guide]').hidden=id!=='nd-filter';
  $('[data-fit-part]').disabled=!item;
  $('[data-locate-hint]').hidden=Boolean(item);
  $('[data-locate-status]').textContent=item?'Tap a part to explore.':'Select a component to locate it.';
  if(item){
    for(const key of ['title','direction','purpose','use','check','tip'])$(`[data-${key}]`).textContent=item[key];
    $('[data-photo-reference]').hidden=!photos[item.photo];
    if(photos[item.photo])$('[data-photo]').src=photos[item.photo];$('[data-photo]').alt=`Reference photograph for ${item.title}`;
    $('[data-photo-note]').textContent=item.photoNote||'Supplied photo · model proportions and cable curves are approximate.';
    $('[data-source]').href=item.source||'';$('[data-source]').textContent=item.sourceLabel||'';$('[data-source]').hidden=!item.source;
    $('[data-equipment-source]').href=item.equipmentSource||'';$('[data-equipment-source]').textContent=item.equipmentSourceLabel||'FMP gear record';$('[data-equipment-source]').hidden=!item.equipmentSource;
    $('[data-evidence]').textContent=item.evidence||'';$('[data-evidence]').hidden=!item.evidence;
    if(focus){if(item.lcdOpening!==undefined)setLcdOpening(item.lcdOpening);setPose(item.pose);}
  }else{
    $('[data-title]').textContent=equipment==='rig'?'Explore the camera rig':'Explore the studio converter';
    $('[data-direction]').textContent=equipment==='rig'?'URSA G2 · Fujinon LA16 · Vinten support · zoom and twist-focus handles':'Separate control-room unit · front controls and rear connections';
    $('[data-purpose]').textContent='Click the physical part to highlight its full shape, or choose it from the component menu.';
  }
  root.dataset.selected=id;
  $('[data-announcement]').textContent=item?`${item.title}. ${item.purpose}`:`${equipment==='rig'?'Camera rig':'Studio converter'} selected. Choose a component for instructions.`;
  $('[data-support-note]').hidden=equipment!=='rig'||!(['mount','fluid-head',...supportControlIds].includes(id)||lesson);
  updateHighlight();
}
function setNdPosition(position){
  const setting=ndSettings.find(s=>s.position===Number(position));if(!setting)return;
  ndPosition=setting.position;
  root.querySelectorAll('[data-nd-position]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.ndPosition)===ndPosition)));
  $('[data-nd-summary]').textContent=`Position ${setting.position} · ${setting.stops?`${setting.stops} stops · ND ${setting.density}`:'Clear · 0 stops'} · ${setting.fraction} of the light (${setting.percent})`;
  $('[data-nd-effect]').textContent=setting.stops?`With iris, gain and shutter unchanged, ${setting.stops}-stop ND passes ${setting.fraction} as much light as Clear.`:'Clear adds no ND filtration. Check the physical camera’s ND indication before an exposure adjustment.';
}
function startLesson(mode){
  if(equipment!=='rig')switchEquipment('rig');
  showPanel('lessons');
  lesson={mode,index:0,results:new Map(),done:false};
  $('[data-training-step]').hidden=false;
  root.querySelectorAll('[data-lesson]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lesson===mode)));
  showLessonStep();
}
function showLessonStep(){
  const ids=lessonSteps[lesson.mode],id=ids[lesson.index],item=catalog[id];
  const practice=lesson.mode==='practice';
  $('[data-training-progress]').textContent=`${practice?'Find the control':'Learn'} · ${lesson.index+1} of ${ids.length}`;
  $('[data-training-title]').textContent=practice?`Find: ${item.title}`:item.title;
  $('[data-training-action]').textContent=practice?'Select its shape in the model or use the Component menu. Choose Show me for a reveal.':`${item.purpose} ${item.use}`;
  $('[data-training-result]').textContent=practice?(lesson.results.get(id)==='found'?'Found without a reveal.':lesson.results.has(id)?'Reviewed with a reveal.':''):item.check;
  $('[data-training-prev]').disabled=lesson.index===0;
  $('[data-training-show]').hidden=!practice;
  $('[data-training-next]').disabled=practice&&!lesson.results.has(id);
  $('[data-training-next]').textContent=lesson.index===ids.length-1?(practice?'Finish practice':lesson.mode==='plate'?'Try practice':'Next topic'):'Next';
  selectPart(practice&&!lesson.results.has(id)?'':id);
  setPose(item.pose);
  writeSelection('replace');
  $('[data-training-title]').focus();
}
function choosePart(id,focus=false){
  selectPart(id,focus);
  writeSelection(lesson?'replace':'push');
  if(!lesson){showPanel('component');$('[data-detail]').scrollTop=0;}
  if(!lesson||lesson.mode!=='practice'||lesson.done||!id)return;
  const expected=lessonSteps.practice[lesson.index];
  if(id===expected){
    if(!lesson.results.has(id))lesson.results.set(id,'found');
    $('[data-training-result]').textContent=`${lesson.results.get(id)==='found'?'Found.':'Reviewed.'} ${catalog[id].purpose}`;
    $('[data-training-next]').disabled=false;
  }else{
    $('[data-training-result]').textContent=`That is ${catalog[id].title.toLowerCase()}. Try ${catalog[expected].title.toLowerCase()}, or choose Show me.`;
  }
}
function revealLessonPart(){
  if(!lesson||lesson.done)return;
  const id=lessonSteps[lesson.mode][lesson.index];
  if(!lesson.results.has(id))lesson.results.set(id,'reviewed');
  selectPart(id,true);
  writeSelection('replace');
  $('[data-training-result]').textContent=`${lesson.results.get(id)==='found'?'Found earlier.':'Revealed for review.'} ${catalog[id].purpose}`;
  $('[data-training-next]').disabled=false;
}
function advanceLesson(){
  if(!lesson)return;
  if(lesson.done){startLesson('practice');return;}
  const ids=lessonSteps[lesson.mode];
  if(lesson.mode==='practice'&&!lesson.results.has(ids[lesson.index]))return;
  if(lesson.index<ids.length-1){lesson.index++;showLessonStep();return;}
  if(lesson.mode!=='practice'){startLesson({locks:'drag',drag:'plate',plate:'practice'}[lesson.mode]);return;}
  lesson.done=true;
  const found=[...lesson.results.values()].filter(value=>value==='found').length;
  $('[data-training-progress]').textContent='Practice review';
  $('[data-training-title]').textContent=`${found} found · ${ids.length-found} reviewed with a reveal`;
  $('[data-training-action]').textContent='Next, have the house lead identify the matching controls on the actual rig. This session is not a physical equipment check.';
  $('[data-training-result]').textContent='Exact head and plate identification is still needed for field-specific labels and release directions.';
  $('[data-training-next]').textContent='Restart practice';
  $('[data-training-prev]').disabled=true;$('[data-training-show]').hidden=true;
}
function closeLesson(restoreFocus=false){
  lesson=null;$('[data-training-step]').hidden=true;
  root.querySelectorAll('[data-lesson]').forEach(b=>b.setAttribute('aria-pressed','false'));
  $('[data-support-note]').hidden=equipment!=='rig'||!['mount','fluid-head',...supportControlIds].includes(selected);
  if(restoreFocus)$('[data-training-toggle]').focus();
}
function switchEquipment(next){
  if(lesson)closeLesson();
  equipment=next;hovered='';$('[data-hover]').textContent='';
  for(const [id,model] of Object.entries(models))model.visible=id===equipment;
  root.querySelectorAll('[data-equipment]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.equipment===equipment)));
  $('[data-stage-label]').textContent=equipment==='rig'?'URSA G2 · Fujinon LA16 · Vinten support':'Studio Fiber Converter · front and rear';
  $('[data-guide-title]').textContent=equipment==='rig'?'Camera rig · 3D explorer':'Studio converter · 3D explorer';
  $('[data-guide-caption]').textContent=equipment==='rig'?'Camera body & ND · tripod controls · complete rig':'Control room · front controls · rear connections';
  document.title=`FMP ${equipment==='rig'?'Camera Rig':'Studio Converter'} | System by Dave`;
  $('[data-fit]').textContent=equipment==='rig'?'Fit rig':'Fit converter';
  $('[data-pose="operator"]').textContent=equipment==='rig'?'Operator side':'Rear panel';
  $('[data-pose="connections"]').textContent=equipment==='rig'?'Connections':'Front panel';
  $('[data-pose="support"]').hidden=equipment!=='rig';
  $('[data-training]').hidden=equipment!=='rig';
  $('[data-no-lessons]').hidden=equipment==='rig';
  $('[data-body-shortcuts]').hidden=equipment!=='rig';
  canvas.setAttribute('aria-label',`Interactive 3D ${equipment==='rig'?'camera rig':'studio converter'}. Use the Component menu to select any part.`);
  populateParts();selectPart('');setPose(equipment==='rig'?'beauty':'studio-beauty');
}
function setupScene(){
  scene=new T.Scene();camera=new T.PerspectiveCamera(37,1,.05,70);
  renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.setClearColor(0,0);
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const hemi=new T.HemisphereLight(0xdbe7f3,0x72767b,2.05);scene.add(hemi);
  const key=new T.DirectionalLight(0xfff2dc,4.2);key.position.set(-3,8,6);key.castShadow=true;key.shadow.mapSize.set(1536,1536);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=6;key.shadow.camera.bottom=-13;key.shadow.normalBias=.025;key.shadow.bias=-.0001;scene.add(key);
  const fill=new T.DirectionalLight(0xd6e8ff,2.15);fill.position.set(1,4,-6);scene.add(fill);
  const rim=new T.DirectionalLight(0xffffff,2.8);rim.position.set(5,6,2);scene.add(rim);
  const envScene=new T.Scene();envScene.background=new T.Color(0x555b66);
  for(const [pos,size,intensity] of [[[0,5,0],[8,5],4],[[5,0,1],[5,7],2.5],[[-5,2,0],[4,8],3.0]]){
    const card=new T.Mesh(new T.PlaneGeometry(...size),new T.MeshBasicMaterial({color:new T.Color(intensity,intensity,intensity),side:T.DoubleSide}));card.position.set(...pos);card.lookAt(0,0,0);envScene.add(card);
  }
  const pmrem=new T.PMREMGenerator(renderer);const env=pmrem.fromScene(envScene,.05);scene.environment=env.texture;pmrem.dispose();
  makeRig();makeStudio();registerSurfaces();models.studio.visible=false;
  const contactTex=canvasTexture(256,256,(ctx,w,h)=>{const grad=ctx.createRadialGradient(w/2,h/2,10,w/2,h/2,w/2);grad.addColorStop(0,'rgba(0,0,0,.25)');grad.addColorStop(.5,'rgba(0,0,0,.12)');grad.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);});
  for(const [id,y,w,d] of [['rig',-9.40,9,8],['studio',-.11,6,3.4]]){
    const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.ShadowMaterial({opacity:.17}));floor.rotation.x=-Math.PI/2;floor.position.y=y;floor.receiveShadow=true;models[id].add(floor);
    const contact=new T.Mesh(new T.PlaneGeometry(w,id==='studio'?9.6:d),new T.MeshBasicMaterial({map:contactTex,transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.set(.2,y+.006,id==='studio'?-3:0);models[id].add(contact);
  }
  root.dataset.renderReady='true';
}
let resizeObserver,themeObserver,visibilityObserver;
try{setupScene();}catch(error){
  $('[data-failure]').hidden=false;root.dataset.renderReady='false';renderer=undefined;
  console.error('3D renderer could not start:',error);
}
function viewportScale(){return Math.max(1,1.35/Math.max(.2,stage.clientWidth/Math.max(1,stage.clientHeight)));}
function resize(){
  if(!renderer)return;const width=stage.clientWidth,height=stage.clientHeight;if(!width||!height)return;
  const nextScale=viewportScale(),ratio=nextScale/viewScale;
  state.radius*=ratio;if(animation){animation.from.radius*=ratio;animation.to.radius*=ratio;}viewScale=nextScale;
  camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);requestDraw();
}
function zoomView(multiplier){animation=undefined;state.radius=T.MathUtils.clamp(state.radius*multiplier,2,80);requestDraw();}
function rotateView(horizontal=0,vertical=0){animation=undefined;state.az+=horizontal;state.el=T.MathUtils.clamp(state.el+vertical,-1.15,1.30);requestDraw();}
function fitSelected(){if(selected)selectPart(selected,true);}
function setTouchRotation(active,announce=true){
  touchRotation=Boolean(active);root.dataset.gestures=String(touchRotation);
  const toggle=$('[data-gesture-toggle]');toggle.setAttribute('aria-pressed',String(touchRotation));toggle.textContent=`Touch rotation: ${touchRotation?'on':'off'}`;
  $('[data-touch-help]').textContent=touchRotation?'Touch rotation is on. Drag or pinch the model. Turn it off to restore browser gestures over the model.':'Touch: tap a part. Turn on touch rotation in Views to drag or pinch the model. Browser gestures remain available while it is off.';
  if(announce)$('[data-announcement]').textContent=touchRotation?'Touch rotation on. Drag or pinch the model.':'Touch rotation off. Swipe to scroll the page.';
}
setNdPosition(1);restoreSelection();resize();
setTouchRotation(false,false);
resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
themeObserver=new MutationObserver(()=>{highlight=themeColor('--blue');updateHighlight();});themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});
visibilityObserver=new IntersectionObserver(entries=>{suspended=!entries[0].isIntersecting;if(!suspended)requestDraw();});visibilityObserver.observe(stage);
partSelect.addEventListener('change',()=>choosePart(partSelect.value,true));
root.querySelectorAll('[data-quick-part]').forEach(button=>button.addEventListener('click',()=>{closeLesson();choosePart(button.dataset.quickPart,true);closeViews(true);}));
root.querySelectorAll('[data-nd-position]').forEach(button=>button.addEventListener('click',()=>setNdPosition(button.dataset.ndPosition)));
root.querySelectorAll('[data-lesson]').forEach(b=>b.addEventListener('click',()=>startLesson(b.dataset.lesson)));
$('[data-training-prev]').addEventListener('click',()=>{if(lesson&&!lesson.done&&lesson.index>0){lesson.index--;showLessonStep();}});
$('[data-training-next]').addEventListener('click',advanceLesson);
$('[data-training-show]').addEventListener('click',revealLessonPart);
$('[data-training-close]').addEventListener('click',()=>closeLesson(true));
$('[data-fiber-angle]').addEventListener('input',event=>setFiberAngle(event.target.value));
$('[data-lcd-opening]').addEventListener('input',event=>setLcdOpening(event.target.value));
root.querySelectorAll('[data-equipment]').forEach(b=>b.addEventListener('click',()=>{switchEquipment(b.dataset.equipment);showPanel('component');$('[data-detail]').scrollTop=0;writeSelection();closeViews();}));
root.querySelectorAll('[data-pose]').forEach(b=>b.addEventListener('click',()=>{
  const key=equipment==='rig'?b.dataset.pose:({beauty:'studio-beauty',operator:'studio-operator',connections:'studio-front'}[b.dataset.pose]);
  setPose(key);closeViews(true);
}));
root.querySelectorAll('[data-zoom]').forEach(b=>b.addEventListener('click',()=>zoomView(Number(b.dataset.zoom))));
root.querySelectorAll('[data-orbit]').forEach(b=>b.addEventListener('click',()=>rotateView(Number(b.dataset.orbit)*Math.PI/8)));
root.querySelectorAll('[data-tilt]').forEach(b=>b.addEventListener('click',()=>rotateView(0,Number(b.dataset.tilt)*Math.PI/12)));
$('[data-fit-part]').addEventListener('click',fitSelected);
$('[data-gesture-toggle]').addEventListener('click',()=>setTouchRotation(!touchRotation));
$('[data-fit]').addEventListener('click',()=>setPose(equipment==='rig'?'beauty':'studio-beauty'));
root.querySelectorAll('[data-tab]').forEach(tab=>{
  tab.addEventListener('click',()=>{closeViews();showPanel(tab.dataset.tab);});
  tab.addEventListener('keydown',event=>{
    const tabs=[...root.querySelectorAll('[data-tab]')],index=tabs.indexOf(tab);
    const next={ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
    if(next===undefined)return;
    event.preventDefault();showPanel(tabs[next].dataset.tab);tabs[next].focus();
  });
});
$('[data-expand]').addEventListener('click',()=>expandReading(!readingExpanded));
$('[data-copy-link]').addEventListener('click',copySelectionLink);
$('[data-view-close]').addEventListener('click',()=>closeViews(true));
viewMenu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeViews(true);}});
viewMenu.addEventListener('focusout',event=>{if(event.relatedTarget&&!viewMenu.contains(event.relatedTarget))closeViews();});
document.addEventListener('pointerdown',event=>{if(!viewMenu.contains(event.target))closeViews();});
root.querySelectorAll('a[href="#fmp-part-details"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();focusInstructions();}));
window.addEventListener('popstate',restoreSelection);
window.addEventListener('hashchange',()=>{if(window.location.hash==='#fmp-part-details')focusInstructions();});
if(window.location.hash==='#fmp-part-details')focusInstructions();
const raycaster=new T.Raycaster(),pointer=new T.Vector2(),touches=new Map();
let pointerStart,previous,dragged=false,pinchDistance;
function pick(clientX,clientY){
  if(!renderer)return '';const bounds=canvas.getBoundingClientRect();pointer.set((clientX-bounds.left)/bounds.width*2-1,-(clientY-bounds.top)/bounds.height*2+1);
  updateCamera();scene.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(pickables.filter(m=>catalog[m.userData.cid]?.equipment===equipment),false);
  return hits[0]?.object.userData.cid||'';
}
function clearHover(){if(hovered){hovered='';$('[data-hover]').textContent='';updateHighlight();}}
canvas.addEventListener('pointerdown',event=>{
  animation=undefined;
  if(event.pointerType!=='touch'||touchRotation)canvas.setPointerCapture(event.pointerId);
  touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
  pointerStart={x:event.clientX,y:event.clientY};previous={...pointerStart};dragged=false;clearHover();
  if(touches.size===2){const [a,b]=[...touches.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);dragged=true;}
});
canvas.addEventListener('pointermove',event=>{
  if(touches.has(event.pointerId)){
    const old=touches.get(event.pointerId);touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(event.pointerType==='touch'&&!touchRotation){
      if(pointerStart&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>4)dragged=true;
      return;
    }
    if(touches.size===2){
      const [a,b]=[...touches.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);
      if(pinchDistance&&distance>0)state.radius=T.MathUtils.clamp(state.radius*pinchDistance/distance,2,80);
      pinchDistance=distance;dragged=true;
    }else{
      const dx=event.clientX-old.x,dy=event.clientY-old.y;
      state.az-=dx*.007;state.el=T.MathUtils.clamp(state.el+dy*.006,-1.15,1.30);
      if(pointerStart&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>4)dragged=true;
    }
    previous={x:event.clientX,y:event.clientY};requestDraw();
  }else if(event.pointerType==='mouse'){
    const id=pick(event.clientX,event.clientY);
    if(id!==hovered){hovered=id;canvas.style.cursor=id?'pointer':'grab';$('[data-hover]').textContent=id?catalog[id].title:'';updateHighlight();}
  }
});
canvas.addEventListener('pointerup',event=>{
  const wasSingle=touches.size===1;touches.delete(event.pointerId);
  if(!dragged&&wasSingle)choosePart(pick(event.clientX,event.clientY));
  if(!touches.size){pointerStart=undefined;previous=undefined;pinchDistance=undefined;}
  else dragged=true;
  if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener('pointercancel',event=>{touches.delete(event.pointerId);dragged=true;pointerStart=undefined;pinchDistance=undefined;});
canvas.addEventListener('pointerleave',()=>{if(!touches.size)clearHover();});
canvas.addEventListener('wheel',event=>{
  if(!event.shiftKey||event.ctrlKey||event.metaKey)return;
  event.preventDefault();zoomView(Math.exp(event.deltaY*.001));
},{passive:false});
canvas.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  const step=Math.PI/24;
  const actions={ArrowLeft:()=>rotateView(-step),ArrowRight:()=>rotateView(step),ArrowUp:()=>rotateView(0,step),ArrowDown:()=>rotateView(0,-step),'+':()=>zoomView(.82),'=':()=>zoomView(.82),'-':()=>zoomView(1.22),Home:()=>setPose(equipment==='rig'?'beauty':'studio-beauty'),Escape:()=>{setTouchRotation(false);viewMenu.open=true;$('[data-gesture-toggle]').focus();}};
  if(actions[event.key]){event.preventDefault();actions[event.key]();}
});
canvas.addEventListener('dblclick',fitSelected);
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();suspended=true;$('[data-failure]').hidden=false;root.dataset.renderReady='false';});
canvas.addEventListener('webglcontextrestored',()=>{suspended=false;$('[data-failure]').hidden=true;root.dataset.renderReady='true';requestDraw();});
function dispose(){
  destroyed=true;cancelAnimationFrame(frame);resizeObserver?.disconnect();themeObserver?.disconnect();visibilityObserver?.disconnect();
  const geometries=new Set(),materials=new Set(),textures=new Set();scene?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
  for(const m of materials){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}
  geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());scene?.environment?.dispose();renderer?.dispose();
}
window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();},{once:true});
// Read-only diagnostics support checks of the actual rendered model and ray picking.
root.rigDiagnostics={
  snapshot:()=>({equipment,selected,activePanel,readingExpanded,lcdOpening,fiberAngle,azimuth:state.az,elevation:state.el,radius:state.radius,parts:parts.size,meshes:pickables.length,renderer:!!renderer,drawCalls:renderer?.info.render.calls}),
  project:(id)=>{const g=parts.get(id);if(!g||!camera)return null;scene.updateMatrixWorld(true);const p=new T.Box3().setFromObject(g).getCenter(new T.Vector3());p.project(camera);return {x:(p.x+1)/2*canvas.clientWidth,y:(1-p.y)/2*canvas.clientHeight};}
};
