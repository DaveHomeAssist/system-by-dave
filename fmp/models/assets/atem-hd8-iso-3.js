
(function(){
  'use strict';
  const root=document.getElementById('atem-explorer');if(!root)return;
  const $=id=>root.querySelector('#atem-'+id),data=ATEM,components=data.catalog.components,byId=new Map(components.map(c=>[c.component_id,c]));
  let state=data.initialState(),selected='atem.transition.cut',venue=false,currentView='overview',diagram=false,diagramFocus=null,sceneKit=null,renderer=null,scene=null,camera=null,highlighted=[],meshMap=new Map(),pendingFrame=false;
  let autoFrame=0,blackFrame=0,lesson=null,attempts=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const presets={overview:{target:[0,2.1,0],theta:.22,phi:.78,width:31,height:22},switching:{target:[-3.5,1.7,3.1],theta:.04,phi:.38,width:20,height:14},audio:{target:[-6.3,2,-2],theta:.05,phi:.48,width:15,height:10},console:{target:[-.8,4,-5.5],theta:0,phi:1.1,width:28,height:13},rear:{target:[0,1.8,-6.6],theta:Math.PI,phi:1.29,width:29,height:14}};
  let orbit={theta:.22,phi:.78,distance:44,target:null};
  function escapeText(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function label(n){return (venue?data.venueLabels:data.hardwareLabels)[n-1];}
  function labelOf(c){if(c.source_index&&/^atem\.(program|preview)\./.test(c.component_id))return c.label.split(' · ')[0]+' · '+label(c.source_index);return c.label;}
  function message(text){$('sim-message').textContent=text;}
  function populate(){
    const q=$('search').value.trim().toLowerCase();const visible=components.filter(c=>[labelOf(c),c.component_id,c.category,...c.aliases].join(' ').toLowerCase().includes(q));
    $('component').replaceChildren();{const whole=document.createElement('option');whole.value='';whole.textContent='Whole device \u00b7 '+components.length+' parts';$('component').append(whole);}for(const cat of data.categories){const items=visible.filter(c=>c.category===cat);if(!items.length)continue;const group=document.createElement('optgroup');group.label=cat;for(const c of items){const o=document.createElement('option');o.value=c.component_id;o.textContent=labelOf(c);group.append(o);}$('component').append(group);}
    $('component').value=visible.some(c=>c.component_id===selected)?selected:'';
    $('count').textContent='('+visible.length+')';$('total').textContent=components.length+' parts';
  }
  function queueOptions(){const q=$('queue');q.replaceChildren();for(let i=1;i<=10;i++){const o=document.createElement('option');o.value=String(i);o.textContent=label(i);q.append(o);}q.value=String(state.preview);}
  function findOwner(obj){while(obj){if(obj.userData&&obj.userData.componentId)return obj.userData.componentId;obj=obj.parent;}return null;}
  function clearHighlight(){for(const [m,original]of highlighted){m.material.dispose();m.material=original;}highlighted=[];}
  function highlight(){if(!sceneKit)return;for(const m of meshMap.get(selected)||[]){const original=m.material;if(!original||Array.isArray(original))continue;m.material=original.clone();if(m.material.emissive){const activeLamp=m===sceneKit.caps.get(selected)&&(selected==='atem.program.'+state.program||selected==='atem.preview.'+state.preview);if(activeLamp)m.material.emissiveIntensity=.65;else{m.material.emissive.setHex(0xe48c2a);m.material.emissiveIntensity=.48;}}else if(!m.material.map)m.material.color.lerp(new THREE.Color(0xffbc69),.5);highlighted.push([m,original]);}}
  function render(){pendingFrame=false;if(renderer&&!diagram&&!document.hidden){renderer.render(scene,camera);}}
  function requestRender(){if(!pendingFrame&&!document.hidden){pendingFrame=true;requestAnimationFrame(render);}}
  function updateCamera(){if(!camera)return;const t=orbit.target,sp=Math.sin(orbit.phi);camera.position.set(t.x+orbit.distance*sp*Math.sin(orbit.theta),t.y+orbit.distance*Math.cos(orbit.phi),t.z+orbit.distance*sp*Math.cos(orbit.theta));camera.lookAt(t);camera.updateMatrixWorld();requestRender();}
  function fitPreset(){if(!camera)return;const p=presets[currentView];orbit.theta=p.theta;orbit.phi=p.phi;orbit.target.set(...p.target);orbit.distance=Math.max(p.width/camera.aspect,p.height)/(2*Math.tan(camera.fov*Math.PI/360));updateCamera();}
  function setView(name){currentView=name;diagramFocus=null;root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));fitPreset();drawDiagram();}
  function boundsFor(id){const box=new THREE.Box3();for(const m of meshMap.get(id)||[])box.expandByObject(m);return box;}
  function focusPart(){const c=byId.get(selected);if(diagram){const s=c.shape;currentView=s.surface==='rear'?'rear':s.surface==='console'?'console':'switching';const p=diagramPosition(c);diagramFocus=c.kind==='chassis'?null:[p.x-3.3,p.y-2.6,6.6,5.2];drawDiagram();return;}if(!camera)return;const box=boundsFor(selected);if(box.isEmpty())return;const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());orbit.target.copy(center);orbit.distance=Math.max(4.8,Math.max(size.x/camera.aspect,size.y,size.z)*2.6);orbit.theta=c.shape.surface==='rear'?Math.PI:0;orbit.phi=c.shape.surface==='deck'?.35:1.22;updateCamera();}
  function clearSelection(){
    selected='';$('component').value='';
    $('category').textContent='Overview';$('label').textContent='Whole device';
    $('purpose').textContent='Click a part of the model, or choose one from the component menu.';
    $('id').textContent='';$('hover').textContent='';
    $('press').disabled=true;$('press').textContent='Identification only';
    $('limit').textContent='';$('sources').replaceChildren();$('venue-note').hidden=true;
    if(sceneKit){clearHighlight();requestRender();}drawDiagram();
    try{history.replaceState(null,'','#');}catch(_){/* Some embedded surfaces do not permit URL changes. */}
  }
  function select(id,options={}) {
    const c=byId.get(id);if(!c){message('That component link is not in this revision. Select a part from the list.');return;}
    selected=id;if(options.clearSearch){$('search').value='';populate();}
    if([...$('component').options].some(o=>o.value===id))$('component').value=id;
    $('category').textContent=c.category;$('label').textContent=labelOf(c);$('purpose').textContent=c.purpose;$('id').textContent=id;$('hover').textContent=labelOf(c);
    $('press').disabled=!c.sim;$('press').textContent=c.sim==='tbar'?'Use the lever below':c.sim?'Press in simulator':'Identification only';
    $('limit').textContent=c.limits;$('sources').replaceChildren();
    for(const sid of c.source_ids){const src=data.catalog.sources.find(x=>x.source_id===sid);const li=document.createElement('li');if(src.locator.startsWith('https://')){const a=document.createElement('a');a.href=src.locator;a.target='_blank';a.rel='noopener noreferrer';a.textContent=src.source_id==='bmd-spec'?'Blackmagic HD8 ISO specifications':src.source_id==='bmd-start'?'Blackmagic getting started':'Blackmagic product guide';li.append(a);}else li.textContent=src.locator;$('sources').append(li);}
    const hasVenue=venue&&c.source_index;$('venue-note').hidden=!hasVenue;if(hasVenue)$('venue-note').textContent=data.venueNotes[c.source_index-1]+' Source: draft FMP SOP, September 2026. Current patch unverified.';
    if(sceneKit){clearHighlight();highlight();requestRender();}drawDiagram();
    if(options.route!==false){try{history.replaceState(null,'','#part='+encodeURIComponent(id));}catch(_){/* Some embedded surfaces do not permit URL changes. */}}
  }
  function diagramPosition(c){const s=c.shape;return{x:s.x||0,y:s.surface==='console'?(currentView==='console'?-s.y:-9.4-s.y):s.surface==='rear'?-s.y:s.z||0};}
  function drawDiagram(){
    if(!diagram)return;const rear=currentView==='rear',consoleOnly=currentView==='console';let v=rear?[-13.6,-1.5,27.2,3]:consoleOnly?[-13.6,-2.4,27.2,4.8]:[-13.6,-12,27.2,19.3];if(diagramFocus)v=diagramFocus;
    const items=components.filter(c=>c.kind!=='chassis'&&(rear?c.shape.surface==='rear':consoleOnly?c.shape.surface==='console':c.shape.surface!=='rear'));
    let html='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+v.join(' ')+'" role="img" aria-label="Selectable '+(rear?'rear connector':consoleOnly?'system panel':'control surface')+' schematic. Use the component menu for keyboard selection."><rect x="-13.2" y="'+(rear?-1.1:consoleOnly?-2.15:-7.2)+'" width="26.4" height="'+(rear?2.2:consoleOnly?4.3:14.4)+'" rx=".25" fill="#252d31"/>';
    if(!rear&&!consoleOnly)html+='<rect x="-13.2" y="-11.6" width="26.4" height="4.3" rx=".25" fill="#30393d"/>';
    for(const c of items){const s=c.shape,p=diagramPosition(c);let w=s.w||s.r*2||.65,h=s.h||s.r*2||.55,fill=['small','knob'].includes(s.type)?'#3f4b50':s.type==='display'?'#102338':s.surface==='rear'?'#b2babc':'#dce0dc';
      if(c.component_id==='atem.program.'+state.program)fill='#f04b45';if(c.component_id==='atem.preview.'+state.preview)fill=data.tally(state).preview==='red'?'#f04b45':'#4bc879';if(c.component_id==='atem.transition.mix'||c.component_id==='atem.transition.background'&&state.background)fill='#ebba58';
      if(c.component_id==='atem.transition.ftb'&&state.black>.01)fill='#f04b45';
      html+='<g data-part="'+c.component_id+'" class="'+(c.component_id===selected?'selected':'')+'"><title>'+escapeText(labelOf(c))+'</title>';
      if(['bnc','jack','rca','xlr','knob'].includes(s.type))html+='<circle cx="'+p.x+'" cy="'+p.y+'" r="'+(s.r||.28)+'" fill="'+fill+'" stroke="#101617" stroke-width=".04"/><circle cx="'+p.x+'" cy="'+p.y+'" r="'+(s.r||.28)*.48+'" fill="#1d292c"/>';
      else html+='<rect x="'+(p.x-w/2)+'" y="'+(p.y-h/2)+'" width="'+w+'" height="'+h+'" rx=".06" fill="'+fill+'" stroke="#101617" stroke-width=".04"/>';
      if(s.type==='tbar'){let y=p.y-1.4+(state.leverEnd?1-state.progress:state.progress)*2.8;html+='<rect x="'+(p.x-.78)+'" y="'+(y-.18)+'" width="1.56" height=".36" rx=".11" fill="#899498"/>';}
      const t=s.text||(c.source_index&&s.surface==='deck'&&s.type==='button'?String(c.source_index):'');
      if(t){const lines=t.split('\n');lines.forEach((txt,i)=>{html+='<text x="'+p.x+'" y="'+(p.y+(i-(lines.length-1)/2)*.14+.055)+'" text-anchor="middle" font-family="Arial,sans-serif" font-size="'+(s.type==='small'?.102:.127)+'" font-weight="600" fill="'+(s.type==='small'?'#e2e5e2':'#1f2a2d')+'" pointer-events="none">'+escapeText(txt)+'</text>';});}
      if(s.display==='system')html+='<text x="'+p.x+'" y="'+p.y+'" text-anchor="middle" font-family="Arial" font-size=".35" fill="#e4e9e6">PVW '+state.preview+'     PGM '+state.program+'</text>';
      if(s.display==='sources')for(let i=1;i<=10;i++)html+='<text x="'+(-10.7+(i-1)*.82)+'" y="'+p.y+'" text-anchor="middle" font-family="Arial" font-size=".17" fill="#c2d2df">'+(i<9?'CAM '+i:'MP '+(i-8))+'</text>';
      html+='</g>';
    }
    html+='</svg>';$('diagram').innerHTML=html;
  }
  function showDiagram(value,reason){diagram=value||!renderer;$('diagram').hidden=!diagram;if(renderer)renderer.domElement.hidden=diagram;$('diagram-toggle').setAttribute('aria-pressed',String(diagram));$('render-status').textContent=diagram?'SELECTABLE SCHEMATIC / APPROXIMATE':'3D MODEL / PHOTO RECONSTRUCTION';root.querySelectorAll('[data-camera]').forEach(b=>b.disabled=diagram);$('touch').disabled=diagram;$('model-note').textContent=reason||(diagram?'Select a shape or use the component menu. “Focus this part” enlarges a region.':'Drag to orbit · Scroll to zoom · A click only selects');if(diagram)drawDiagram();else requestRender();}
  function refresh(){
    const busy=state.transitioning||state.progress>0,tally=data.tally(state);
    $('pvw-monitor').classList.toggle('on-program',tally.inTransition);$('pvw-label').classList.toggle('program-label',tally.inTransition);$('pvw-use').textContent=tally.inTransition?'In MIX':'Next';
    $('preview-feed').textContent=label(state.preview);$('program-feed').textContent=label(state.program);$('next-feed').textContent=label(state.preview);$('next-feed').style.opacity=String(state.progress);$('blackout').style.opacity=String(state.black);$('black-label').hidden=state.black<.999;
    $('pvw-monitor').setAttribute('aria-label','Preview '+label(state.preview)+(tally.inTransition?', selected in the active MIX; both source buttons red':''));$('pgm-monitor').setAttribute('aria-label',state.black>.999?'Program faded to black':'Program '+label(state.program)+(state.progress>0?', mixing toward '+label(state.preview):''));
    $('queue').value=String(state.preview);$('queue').disabled=busy;$('sim-cut').disabled=busy;$('sim-auto').disabled=busy;$('sim-bkgd').disabled=busy;$('sim-bkgd').setAttribute('aria-pressed',String(state.background));$('sim-ftb').setAttribute('aria-pressed',String(state.blackTarget===1));$('sim-ftb').disabled=state.ftbRunning;
    $('tbar').disabled=state.transitioning||!state.background;$('tbar').value=String(Math.round((state.leverEnd?1-state.progress:state.progress)*100));$('lever-state').textContent=state.progress>0?Math.round(state.progress*100)+'% through MIX · both source buttons red':'At end '+(state.leverEnd?'B':'A');
    if(sceneKit){clearHighlight();sceneKit.applyState(state,venue);highlight();requestRender();}drawDiagram();
  }
  function recordAction(type,source){
    if(!lesson||lesson.complete)return;
    if(lesson.step===0&&type==='preview'&&source===3){lesson.step=1;$('lesson-title').textContent='Step 2 · Check the picture';$('lesson-copy').textContent='Preview now shows Camera 3. Confirm the Preview source and that Program still shows Camera 1, then choose “Picture checked”.';$('lesson-check').hidden=false;return;}
    if(lesson.step===2&&type==='cut'){lesson.complete=true;$('lesson-title').textContent='Practice complete';$('lesson-copy').textContent='Camera 3 is on Program. Camera 1 is now on Preview. This completes the simulated task only.';$('lesson-result').textContent='Incorrect actions: '+lesson.errors+' · Hints: '+lesson.hints+' · Reveals: '+lesson.reveals+'. '+(lesson.hints||lesson.reveals?'Assisted practice.':'Practice completed without hints or reveals.');for(const x of ['hint','reveal','check'])$('lesson-'+x).hidden=true;$('lesson-start').textContent='Practice again';return;}
    if(type==='mix')return;
    lesson.errors++;lesson.step=0;cancelAnimations();state=data.initialState();$('lesson-check').hidden=true;
    $('lesson-copy').textContent=(type==='program'?'That Program button changes the live picture immediately.':type==='cut'?'Check the Preview picture before taking it.':'That is not the requested action.')+' Practice has reset: select Camera 3 on Preview first.';
    $('lesson-result').textContent='Incorrect actions: '+lesson.errors+' · Hints: '+lesson.hints+' · Reveals: '+lesson.reveals;
  }
  function cancelAnimations(){cancelAnimationFrame(autoFrame);cancelAnimationFrame(blackFrame);autoFrame=blackFrame=0;}
  function startAuto(){const start=performance.now(),duration=reduced?0:1200;state=data.reduce(state,{type:'auto-start'});function tick(now){const p=duration?Math.min(1,(now-start)/duration):1;state=data.reduce(state,{type:'progress',value:p});refresh();if(p<1)autoFrame=requestAnimationFrame(tick);else message('MIX complete. Program: '+label(state.program)+'. Preview: '+label(state.preview)+'.');}autoFrame=requestAnimationFrame(tick);}
  function fadeBlack(){const from=state.black;state=data.reduce(state,{type:'ftb-start'});const to=state.blackTarget,start=performance.now(),duration=reduced?0:1200;function tick(now){const p=duration?Math.min(1,(now-start)/duration):1;state=data.reduce(state,{type:'ftb-tick',value:from+(to-from)*p});refresh();if(p<1)blackFrame=requestAnimationFrame(tick);else message(to?'Program is faded to black. FTB again restores the picture.':'Program picture restored.');}blackFrame=requestAnimationFrame(tick);}
  function act(type,source){
    if(type==='tbar'){$('tbar').focus();message('Move the manual lever to the opposite end to complete a background MIX.');return;}
    if(state.transitioning||state.progress>0){if(type!=='ftb'){message('Finish the current transition before changing sources or taking again.');return;}}
    if(type==='ftb'&&state.ftbRunning)return;
    if(['cut','auto'].includes(type)&&!state.background){message('BKGD is off. With no key layers selected, there is no background take. Select BKGD, then try again.');return;}
    if(type==='auto'){recordAction(type,source);if(lesson&&!lesson.complete){refresh();return;}startAuto();message('Running a 1.2-second MIX.');return;}
    if(type==='ftb'){if(lesson&&!lesson.complete){recordAction(type,source);refresh();return;}fadeBlack();return;}
    state=data.reduce(state,{type,source});recordAction(type,source);refresh();
    message(type==='preview'?label(state.preview)+' queued on Preview. Program remains '+label(state.program)+'.':type==='program'?'Direct Program cut: '+label(state.program)+'.':type==='cut'?'CUT complete. Program: '+label(state.program)+'. Preview: '+label(state.preview)+'.':type==='background'?'BKGD '+(state.background?'selected. The next take changes the background.':'off. The next take has no selected layers in this practice.'):'MIX selected.');
  }
  function resetPractice(){cancelAnimations();state=data.initialState();lesson=null;for(const x of ['hint','reveal','check'])$('lesson-'+x).hidden=true;$('lesson-title').textContent='Try a clean take';$('lesson-copy').textContent='Practice selecting Camera 3 on Preview, checking the picture, and taking it with CUT.';$('lesson-result').textContent='';$('lesson-start').textContent='Start exercise';refresh();message('Practice reset: Program Camera 1, Preview Camera 2, MIX and BKGD selected.');}
  function init3D(){
    try {
      const T=THREE;renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;
      renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Rotatable ATEM HD8 ISO study model. Use the component menu to select controls by keyboard.');$('stage').prepend(renderer.domElement);
      scene=new T.Scene();scene.add(new T.HemisphereLight(0xecf4ff,0x716451,2.2));const key=new T.DirectionalLight(0xfff3de,3.1);key.position.set(-12,28,18);scene.add(key);const fill=new T.DirectionalLight(0xd7e8ff,2);fill.position.set(15,12,-15);scene.add(fill);
      sceneKit=buildATEMModel(T,(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;});scene.add(sceneKit.model);
      sceneKit.model.traverse(m=>{if(!m.isMesh)return;const id=findOwner(m);if(!id)return;if(!meshMap.has(id))meshMap.set(id,[]);meshMap.get(id).push(m);});
      camera=new T.PerspectiveCamera(38,1,.05,250);orbit.target=new T.Vector3();
      function resize(){if(!renderer)return;const r=$('stage').getBoundingClientRect(),previousAspect=camera.aspect;if(r.width<1||r.height<1)return;renderer.setSize(r.width,Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();if(!resize.done){fitPreset();resize.done=true;}else{if(camera.aspect<previousAspect)orbit.distance*=previousAspect/camera.aspect;updateCamera();}requestRender();}new ResizeObserver(resize).observe($('stage'));resize();
      const ray=new T.Raycaster(),point=new T.Vector2(),canvas=renderer.domElement;
      function hit(e){const b=canvas.getBoundingClientRect();point.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(point,camera);const h=ray.intersectObject(sceneKit.model,true)[0];return h?findOwner(h.object):null;}
      let drag=null,pointers=new Map(),pinch=0;
      canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,allowed:e.pointerType!=='touch'||$('touch').checked};if(drag.allowed)canvas.setPointerCapture(e.pointerId);if(pointers.size===2){const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}});
      canvas.addEventListener('pointermove',e=>{
        if(!drag){const id=hit(e);$('hover').textContent=id?labelOf(byId.get(id)):'Drag to orbit · Select a component';return;}
        pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.moved=true;
        if(drag.allowed){if(pointers.size===2){const p=[...pointers.values()],next=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch&&next)orbit.distance=Math.max(3,Math.min(95,orbit.distance*pinch/next));pinch=next;}else{orbit.theta-=(e.clientX-drag.lastX)*.008;orbit.phi=Math.max(.13,Math.min(1.56,orbit.phi+(e.clientY-drag.lastY)*.007));}updateCamera();}drag.lastX=e.clientX;drag.lastY=e.clientY;
      });
      canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const id=hit(e);if(id)select(id,{clearSearch:true});}pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);drag=null;pinch=0;});
      canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag=null;pinch=0;});
      canvas.addEventListener('wheel',e=>{e.preventDefault();orbit.distance=Math.max(3,Math.min(95,orbit.distance*Math.exp(e.deltaY*.001)));updateCamera();},{passive:false});
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer=null;showDiagram(true,'3D graphics became unavailable. The diagram and component descriptions remain usable.');});
      showDiagram(false);
    }catch(error){renderer=null;sceneKit=null;showDiagram(true,'3D graphics are unavailable in this browser. Use this selectable diagram and the component menu.');}
  }
  $('component').addEventListener('change',()=>$('component').value?select($('component').value):clearSelection());$('search').addEventListener('input',populate);$('focus').addEventListener('click',focusPart);
  $('press').addEventListener('click',()=>{const c=byId.get(selected);if(c.sim)act(c.sim,c.source_index);});
  root.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  root.querySelectorAll('[data-camera]').forEach(b=>b.addEventListener('click',()=>{switch(b.dataset.camera){case'left':orbit.theta-=.25;break;case'right':orbit.theta+=.25;break;case'up':orbit.phi=Math.max(.13,orbit.phi-.16);break;case'down':orbit.phi=Math.min(1.56,orbit.phi+.16);break;case'in':orbit.distance=Math.max(3,orbit.distance*.82);break;case'out':orbit.distance=Math.min(95,orbit.distance*1.22);break;case'reset':setView('overview');return;}updateCamera();}));
  $('diagram-toggle').addEventListener('click',()=>showDiagram(!diagram));$('touch').addEventListener('change',()=>{$('stage').classList.toggle('gestures',$('touch').checked);$('model-note').textContent=$('touch').checked?'Touch orbit enabled: drag to rotate, pinch to zoom. Uncheck to scroll through the model.':'Drag to orbit · Scroll to zoom · A click only selects';});
  $('diagram').addEventListener('click',e=>{const target=e.target.closest('[data-part]');if(target)select(target.dataset.part,{clearSearch:true});});
  $('queue').addEventListener('change',()=>{const n=Number($('queue').value);select('atem.preview.'+n,{clearSearch:true});act('preview',n);});
  for(const action of ['cut','auto','ftb','mix','bkgd'])$('sim-'+action).addEventListener('click',()=>{const type=action==='bkgd'?'background':action;select('atem.transition.'+type,{clearSearch:true});act(type);});
  $('tbar').addEventListener('input',()=>{if(!state.background||state.transitioning)return;let value=Number($('tbar').value)/100,progress=state.leverEnd?1-value:value;if(lesson&&!lesson.complete){recordAction('tbar');refresh();return;}select('atem.transition.tbar',{route:false});state=data.reduce(state,{type:'progress',value:progress});refresh();if(state.progress===0)message('Manual transition at an end. Program: '+label(state.program)+'.');else message('Manual MIX in progress: both selected source buttons are red. Complete the travel to take, or return to the starting end to cancel.');});
  $('labelset').addEventListener('change',()=>{venue=$('labelset').value==='fmp';populate();queueOptions();select(selected,{route:false});refresh();});$('reset').addEventListener('click',resetPractice);
  $('lesson-start').addEventListener('click',()=>{resetPractice();attempts++;lesson={step:0,errors:0,hints:0,reveals:0,complete:false};$('lesson-title').textContent='Step 1 · Queue Camera 3';$('lesson-copy').textContent='Find Camera 3 in the Preview row. Select it, then press it in the simulator. You can also use the Preview selector.';$('lesson-result').textContent=attempts>1?'Repeat practice.':'';$('lesson-start').textContent='Restart exercise';$('lesson-hint').hidden=false;$('lesson-reveal').hidden=false;setView('switching');});
  $('lesson-hint').addEventListener('click',()=>{if(!lesson||lesson.complete)return;lesson.hints++;$('lesson-copy').textContent=lesson.step===0?'Preview is the bottom source row. Select its third button; Program must stay Camera 1.':lesson.step===1?'Read both simulated monitors: Preview must be Camera 3 and Program Camera 1. Then confirm the check.':'CUT is below the transition-style buttons, to the left of AUTO.';$('lesson-result').textContent='Hints: '+lesson.hints+' · Reveals: '+lesson.reveals;});
  $('lesson-reveal').addEventListener('click',()=>{if(!lesson||lesson.complete)return;lesson.reveals++;select(lesson.step<2?'atem.preview.3':'atem.transition.cut',{clearSearch:true});focusPart();$('lesson-result').textContent='Answer revealed. This is assisted practice. Reveals: '+lesson.reveals;});
  $('lesson-check').addEventListener('click',()=>{if(!lesson||lesson.step!==1)return;if(state.preview!==3||state.program!==1){message('The exercise expects Camera 3 on Preview and Camera 1 on Program. Restart and try again.');return;}lesson.step=2;$('lesson-title').textContent='Step 3 · Take it';$('lesson-copy').textContent='The Preview picture is checked. Find CUT and press it in the simulator.';$('lesson-check').hidden=true;});
  const photoData=window.ATEM_PHOTOS||[];if(photoData.length){$('photo').src=photoData[0];$('photo-select').addEventListener('change',()=>{$('photo').src=photoData[Number($('photo-select').value)];$('photo').alt='Supplied ATEM '+$('photo-select').selectedOptions[0].text.toLowerCase();});}else{$('photo-block').hidden=true;$('inline-photo-note').hidden=false;}
  $('export-catalog').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(data.catalog,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ATEM-HD8-ISO-component-catalog-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestRender();});
  populate();queueOptions();init3D();refresh();
  let initial='';try{const fragment=new URLSearchParams(location.hash.slice(1)),id=fragment.get('part');if(id&&byId.has(id))initial=id;else if(id)message('This component link is not in this revision. Showing the whole device.');}catch(_){}
  if(initial)select(initial,{route:false});else clearSelection();
  window.addEventListener('pagehide',event=>{if(event.persisted)return;cancelAnimationFrame(autoFrame);cancelAnimationFrame(blackFrame);clearHighlight();const geometry=new Set(),materials=new Set(),textures=new Set();scene?.traverse(object=>{if(object.geometry)geometry.add(object.geometry);for(const material of [].concat(object.material||[]))materials.add(material);});for(const material of materials){for(const value of Object.values(material))if(value?.isTexture)textures.add(value);material.dispose();}geometry.forEach(value=>value.dispose());textures.forEach(value=>value.dispose());renderer?.dispose();});
  window.addEventListener('hashchange',()=>{const id=new URLSearchParams(location.hash.slice(1)).get('part');if(id)select(id,{route:false,clearSearch:true});});
})();
