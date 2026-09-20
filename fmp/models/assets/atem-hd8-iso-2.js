
(function(root){
  'use strict';
  function buildModel(T,makeCanvas) {
    const model=new T.Group(),groups=new Map(),caps=new Map(),displays=new Map();
    const dark=new T.MeshStandardMaterial({color:0x22272a,roughness:.7,metalness:.25});
    const rim=new T.MeshStandardMaterial({color:0x92999b,roughness:.35,metalness:.8});
    const black=new T.MeshStandardMaterial({color:0x090d10,roughness:.68,metalness:.2});
    const silver=new T.MeshStandardMaterial({color:0xb4bec1,roughness:.25,metalness:.88});
    const ivory=new T.MeshStandardMaterial({color:0xdadfdc,roughness:.37,metalness:.08});
    const gold=new T.MeshStandardMaterial({color:0xb58b39,roughness:.4,metalness:.65});
    const textures=[];
    function material(color) {return new T.MeshStandardMaterial({color,roughness:.47,metalness:.12});}
    function mesh(geo,mat,parent,x=0,y=0,z=0) {const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
    function box(p,w,h,d,mat,x=0,y=0,z=0){return mesh(new T.BoxGeometry(w,h,d),mat,p,x,y,z);}
    function rounded(p,w,h,d,r,mat,x=0,y=0,z=0) {
      const s=new T.Shape(),a=-w/2,b=-h/2;
      s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);
      return mesh(new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:3}),mat,p,x,y,z);
    }
    function cylinder(p,r,d,mat,x=0,y=0,z=0,radial=16) {const m=mesh(new T.CylinderGeometry(r,r,d,radial),mat,p,x,y,z);m.rotation.x=Math.PI/2;return m;}
    function ring(p,r,t,mat,x=0,y=0,z=0){return mesh(new T.TorusGeometry(r,t,6,24),mat,p,x,y,z);}
    function canvasTexture(w,h,paint) {const c=makeCanvas(w,h);paint(c.getContext('2d'),w,h);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=4;textures.push(tx);return {canvas:c,texture:tx};}
    function textPlane(p,text,w,h,x=0,y=0,z=.25,color='#182126',bg=null) {
      const tx=canvasTexture(256,128,(ctx,cw,ch)=>{ctx.clearRect(0,0,cw,ch);if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,cw,ch);}ctx.fillStyle=color;const rows=text.split('\n'),fontSize=rows.length>1?35:text.length>10?22:text.length>6?30:46;ctx.font='600 '+fontSize+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';rows.forEach((s,i)=>ctx.fillText(s,cw/2,ch/2+(i-(rows.length-1)/2)*39,235));});
      const m=mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx.texture,transparent:!bg,depthWrite:false}),p,x,y,z);m.castShadow=false;return m;
    }
    const shell=new T.Group();shell.userData.componentId='atem.chassis';model.add(shell);groups.set('atem.chassis',shell);
    // Photo reconstruction in arbitrary model units, not manufacturing dimensions.
    const profile=new T.Shape();profile.moveTo(-7,0);profile.lineTo(7,0);profile.lineTo(7,2.1);profile.lineTo(-7,1.12);profile.closePath();
    const wedge=mesh(new T.ExtrudeGeometry(profile,{depth:25.35,bevelEnabled:false}),dark,shell);wedge.rotation.y=-Math.PI/2;wedge.position.x=12.675;
    // Local profile X becomes world Z, with higher rear at negative Z.
    wedge.rotation.y=Math.PI/2;wedge.position.x=-12.675;
    const deck=new T.Group();deck.position.y=1.62;deck.rotation.x=.07;model.add(deck);
    const deckRim=rounded(shell,26.15,14.5,.22,.35,rim);deckRim.rotation.x=-Math.PI/2+.07;deckRim.position.set(0,1.55,0);
    const deckTop=rounded(shell,26,14.35,.18,.3,dark);deckTop.rotation.copy(deckRim.rotation);deckTop.position.set(0,1.64,0);
    const deckFace=new T.Group();deckFace.rotation.x=-Math.PI/2;deckFace.position.y=.22;deck.add(deckFace);
    const console=new T.Group();console.position.set(0,4.08,-5.65);console.rotation.x=-.24;model.add(console);
    rounded(console,26,4.2,.8,.33,rim,0,0,-.43);
    rounded(console,25.88,4.1,.42,.3,dark,0,0,.02);
    rounded(console,25.25,3.53,.035,.22,black,0,0,-.46);
    const consoleFace=new T.Group();consoleFace.position.z=.46;console.add(consoleFace);
    textPlane(consoleFace,'Blackmagicdesign',4.7,.65,9.27,.12,.035,'#c6cdcd');
    textPlane(consoleFace,'ATEM TELEVISION STUDIO HD8 ISO',7.8,.25,0,-1.91,.035,'#838e90');
    const rear=new T.Group();rear.position.set(0,1.02,-7.18);rear.rotation.y=Math.PI;model.add(rear);
    box(rear,25.5,1.85,.13,black,0,0,0);
    // Rear panel belongs to the enclosure, without making all connectors one target.
    for(const m of [...console.children].filter(m=>m.isMesh))m.userData.componentId='atem.chassis';
    for(const m of [...rear.children].filter(m=>m.isMesh))m.userData.componentId='atem.chassis';
    for(let side of [-1,1]) {
      for(let i=0;i<12;i++){const v=box(shell,.035,.48,.15,black,side*12.7,.85,-3.8+i*.62);v.rotation.x=-.5;}
      for(let z of [-5.5,5.5])box(shell,1,.17,1,black,side*10.9,-.08,z);
    }
    let lever;
    for(const c of root.ATEM.catalog.components) {
      const s=c.shape;if(s.type==='chassis')continue;
      const g=new T.Group();g.userData.componentId=c.component_id;groups.set(c.component_id,g);
      const p=s.surface==='console'?consoleFace:s.surface==='rear'?rear:deckFace;
      g.position.set(s.x,s.surface==='deck'?-s.z:s.y,s.surface==='rear'?.08:0);p.add(g);
      if(s.type==='button'||s.type==='small') {
        const small=s.type==='small';rounded(g,s.w+.09,s.h+.09,.045,.07,black);
        const cap=rounded(g,s.w,s.h,small?.1:.19,.07,(small?dark:ivory).clone(),0,0,.035);caps.set(c.component_id,cap);
        if(s.text)textPlane(g,s.text,s.w*.94,s.h*.83,0,0,small?.146:.236,small?'#bbc4c7':'#202a2b');
      } else if(s.type==='knob') {
        cylinder(g,s.r+.055,.13,black,0,0,.07);cylinder(g,s.r,.4,dark,0,0,.27);cylinder(g,s.r*.79,.025,material(0x697275),0,0,.482);
        for(let i=0;i<12;i++){const a=i*Math.PI/6;box(g,.021,.036,.28,black,Math.sin(a)*s.r,Math.cos(a)*s.r,.3);}
        box(g,.025,s.r*.6,.012,ivory,0,s.r*.38,.5);
      } else if(s.type==='display') {
        rounded(g,s.w+.12,s.h+.13,.05,.07,black);
        const tx=canvasTexture(s.display==='system'?768:1024,s.display==='system'?384:200,(ctx,w,h)=>{ctx.fillStyle='#101c2c';ctx.fillRect(0,0,w,h);});
        mesh(new T.PlaneGeometry(s.w,s.h),new T.MeshBasicMaterial({map:tx.texture}),g,0,0,.062);
        displays.set(s.display,tx);
      } else if(s.type==='tbar') {
        rounded(g,1.3,3.62,.025,.1,black);box(g,.14,3.12,.035,material(0x040606),.3,0,.04);
        for(let i=0;i<=10;i++)box(g,i%5===0?.34:.22,.025,.01,ivory,-.27,-1.44+i*.288,.06);
        lever=new T.Group();g.add(lever);box(lever,.16,.2,.6,black,0,0,.31);
        const handle=cylinder(lever,.235,1.62,dark,0,0,.74);handle.rotation.set(0,0,Math.PI/2);
        for(let x of [-.74,.74]){const end=cylinder(lever,.24,.085,silver,x,0,.74);end.rotation.set(0,0,Math.PI/2);}
      } else if(['bnc','jack','rca','xlr'].includes(s.type)) {
        const r=s.type==='xlr'?.4:s.type==='jack'?.3:s.type==='rca'?.22:.29;
        cylinder(g,r+.045,.065,silver,0,0,.05,20);
        cylinder(g,r,s.type==='bnc'?.45:.12,s.type==='xlr'?dark:silver,0,0,s.type==='bnc'?.25:.11,20);
        ring(g,r*.85,.03,silver,0,0,s.type==='bnc'?.49:.18);
        const zz=s.type==='bnc'?.493:.181;
        cylinder(g,r*.68,.008,s.type==='rca'?material(c.component_id.endsWith('.r')?0xcc3831:0xe2e2d7):black,0,0,zz);
        if(s.type==='bnc'){cylinder(g,r*.36,.008,ivory,0,0,zz+.007);cylinder(g,.035,.012,gold,0,0,zz+.016);for(let x of [-1,1])box(g,.075,.1,.11,silver,x*r,0,.33);}
        if(s.type==='xlr') {const n=c.component_id.endsWith('headset')?5:c.component_id.endsWith('dc')?4:3;for(let j=0;j<n;j++){const a=(j/n)*Math.PI*2;cylinder(g,.035,.015,gold,Math.sin(a)*r*.37,Math.cos(a)*r*.37,zz+.014);}}
        if(s.type==='jack')cylinder(g,.11,.01,black,0,0,zz+.012);
      } else if(['rj','usb','iec','hdmi'].includes(s.type)) {
        const w=s.type==='usb'?.47:s.type==='hdmi'?.19:s.type==='iec'?.86:s.w;
        const h=s.type==='usb'?.13:s.type==='hdmi'?.65:s.type==='iec'?.72:s.h;
        rounded(g,w+.075,h+.075,.06,.025,silver);rounded(g,w,h,.02,.025,black,0,0,.064);
        if(s.type==='rj')for(let i=0;i<5;i++)box(g,.025,.16,.006,gold,-w*.3+i*w*.15,-h*.25,.09);
        if(s.type==='iec')for(let i=0;i<3;i++)box(g,.05,.18,.05,silver,-.24+i*.24,i===1?.08:-.1,.1);
      }
      if(s.surface==='rear') {
        let label=c.label.replace('Camera return SDI OUT ','OUT ').replace('SDI INPUT ','IN ').replace(' · SDI output','').replace(' · RJ12 RS-422','').replace(' · RJ45 expansion','').replace(' · RCA','').replace('ANALOG AUDIO IN CH ','CH ');
        if(label.length>20)label=label.replace('MULTIVIEW','M/V').replace('TALKBACK','TALK');
        textPlane(g,label,.84,.15,0,s.y>0?-.34:-.37,.075,'#c6cccc');
      }
    }
    // Enclosure face meshes carry their own IDs for ray picking.
    shell.traverse(o=>{if(o.isMesh)o.userData.componentId='atem.chassis';});
    function sourceLabel(n,venue){return (venue?root.ATEM.venueLabels:root.ATEM.hardwareLabels)[n-1];}
    function drawDisplays(state,venue) {
      const sys=displays.get('system'),ctx=sys.canvas.getContext('2d');ctx.fillStyle='#132033';ctx.fillRect(0,0,768,384);
      ctx.fillStyle='#f2a43a';ctx.fillRect(0,0,160,5);ctx.font='17px Arial';ctx.textAlign='center';ctx.fillText('HOME',82,33);ctx.fillStyle='#adb9c6';['NETWORK','ABOUT','PROFILES'].forEach((x,i)=>ctx.fillText(x,272+i*180,33));
      ctx.font='18px Arial';ctx.fillText('PREVIEW',190,126);ctx.fillText('PROGRAM',575,126);ctx.font='bold 36px Arial';ctx.fillStyle=root.ATEM.tally(state).preview==='red'?'#ff4a48':'#59d57f';ctx.fillText(sourceLabel(state.preview,venue),190,180,340);ctx.fillStyle='#ff4a48';ctx.fillText(state.black>.98?'BLACK':sourceLabel(state.program,venue),575,180,340);
      ctx.fillStyle='#aab9c8';ctx.font='24px Arial';['1:06','1:00','1:00','1:06'].forEach((x,i)=>ctx.fillText(x,95+i*192,310));ctx.font='13px Arial';['AUTO RATE','DSK 1 RATE','DSK 2 RATE','FTB RATE'].forEach((x,i)=>ctx.fillText(x,95+i*192,339));ctx.font='12px Arial';ctx.fillText('ILLUSTRATIVE TRAINING DISPLAY',384,371);sys.texture.needsUpdate=true;
      const labels=displays.get('sources'),l=labels.canvas.getContext('2d');l.fillStyle='#14253b';l.fillRect(0,0,1024,200);
      for(let i=1;i<=10;i++){const x=(i-.5)*102.4;l.fillStyle=i===state.program||i===state.preview&&root.ATEM.tally(state).inTransition?'#ff4a48':i===state.preview?'#69dc8d':'#b5c6d5';l.font='20px Arial';l.textAlign='center';const txt=sourceLabel(i,venue).replace('Media Player','MP').replace('Camera ','CAM ');l.fillText(txt,x,60,96);l.fillText(txt,x,150,96);l.fillStyle='#2d4155';l.fillRect(i*102.4-2,6,1,186);}labels.texture.needsUpdate=true;
      const audio=displays.get('audio'),a=audio.canvas.getContext('2d');a.fillStyle='#142031';a.fillRect(0,0,1024,200);
      for(let i=0;i<10;i++){const x=i*102.4;a.fillStyle='#b8c7d7';a.font='18px Arial';a.textAlign='center';a.fillText(i<8?'Cam '+(i+1):'MP '+(i-7),x+50,23);a.font='12px Arial';a.fillText('Level',x+50,47);for(let j=0;j<12;j++){a.fillStyle=j<6?'#367d54':j<9?'#ac8f37':'#9b4439';a.fillRect(x+34,165-j*8,14,6);a.fillRect(x+52,165-j*8,14,6);}a.fillStyle='#5c6e7f';a.font='10px Arial';a.fillText('STATIC',x+50,189);}audio.texture.needsUpdate=true;
    }
    let displayKey='';
    function applyState(state,venue) {
      caps.forEach((m,id)=>{let color=id.includes('.menu.')||id.includes('.audio.')||id.includes('.talk.')||id.includes('.system.')||id.includes('.keypad.')?0x252c30:0xdadfdc;
        if(id==='atem.program.'+state.program)color=0xf03330;
        if(id==='atem.preview.'+state.preview)color=root.ATEM.tally(state).preview==='red'?0xf03330:0x3bcc68;
        if(id==='atem.transition.mix'||id==='atem.transition.background'&&state.background)color=0xf4bb48;
        if(id==='atem.transition.auto'&&state.transitioning)color=0xf03330;
        if(id==='atem.transition.ftb'&&state.black>0)color=0xf03330;
        m.material.color.setHex(color);m.material.emissive.setHex(color===0xf03330?0x7b100b:color===0x3bcc68?0x155520:color===0xf4bb48?0x644207:0);m.material.emissiveIntensity=.4;
      });
      lever.position.y=1.36-(state.leverEnd?1-state.progress:state.progress)*2.72;
      const nextDisplayKey=[state.program,state.preview,state.black>.98,venue,root.ATEM.tally(state).inTransition].join('|');
      if(nextDisplayKey!==displayKey){drawDisplays(state,venue);displayKey=nextDisplayKey;}
    }
    model.updateMatrixWorld(true);
    return {model,groups,caps,displays,applyState,lever,textures};
  }
  root.buildATEMModel=buildModel;
  if(typeof module!=='undefined'&&module.exports)module.exports=buildModel;
})(typeof globalThis!=='undefined'?globalThis:this);
