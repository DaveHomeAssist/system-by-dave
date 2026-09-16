// FMP rig geometry — ported from the FMP Camera System guide's 3D explorer (v2: URSA G2, Vinten support, studio viewfinder, camera fiber rear panel, studio converter front).
// buildRigModels(THREE, catalog) -> { rig, studio, parts, poses, mats, setLcdOpening(deg), setFiberAngle(deg), floors }
export function buildRigModels(T, catalog) {
  const scene = new T.Group();
  const models = {};
  const parts = new Map();
  let fiberPivot, fiberCable, lcdHinge;
  function material(color,metalness=.3,roughness=.5){return new T.MeshStandardMaterial({color,metalness,roughness});}
  const mats={
    body:material(0x292d32,.46,.45), edge:material(0x495057,.64,.35), dark:material(0x111518,.15,.65),
    rubber:material(0x15181b,.03,.92), silver:material(0xb5bdc6,.87,.22), gold:material(0xc4a46a,.8,.24),
    glass:new T.MeshPhysicalMaterial({color:0x142c39,metalness:.35,roughness:.09,clearcoat:1,clearcoatRoughness:.06}),
    red:material(0xa32c2c,.12,.43), blue:material(0x1684ad,.35,.45), pin:material(0xbda66d,.78,.3)
  };
  function part(id,parent){const g=new T.Group();g.name=(catalog[id]&&catalog[id].title)||id;g.userData.cid=id;parent.add(g);parts.set(id,g);return g;}
  function subgroup(parent,pos=[0,0,0],rot=[0,0,0]){const g=new T.Group();g.position.set(pos[0],pos[1],pos[2]);g.rotation.set(rot[0],rot[1],rot[2]);parent.add(g);return g;}
  function add(parent,geometry,mat,pos=[0,0,0],rot=[0,0,0]){
    const m=new T.Mesh(geometry,mat);m.position.set(pos[0],pos[1],pos[2]);m.rotation.set(rot[0],rot[1],rot[2]);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
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

  function makeRig(){
    const rig=new T.Group();rig.name='Camera rig';scene.add(rig);models.rig=rig;
    const body=part('body',rig);
    box(body,2.38,1.76,1.27,[.48,1.96,0],mats.body,.095);
    box(body,2.1,.24,1.36,[.55,1.09,0],mats.edge,.045);
    box(body,1.73,.25,1.14,[.59,2.87,0],mats.dark,.045);
    cyl(body,.555,.24,[-.78,2.1,0],mats.edge,'x');torus(body,.505,.02,[-.913,2.1,0]);
    box(body,.43,1.16,.09,[-.49,2.0,.68],mats.dark,.025);
    cyl(body,.122,.07,[-.49,2.40,.742],mats.edge,'z');
    textPlane(body,'ND',.16,.065,[-.49,2.58,.736]);
    textPlane(body,'URSA G2',1.01,.13,[.74,2.77,.661]);
    for(let i=0;i<4;i++){box(body,.075,.06,.038,[-.62+i*.088,1.81,.75],mats.edge,.006);}
    cyl(body,.064,.027,[-.41,1.50,.741],mats.red,'z');textPlane(body,'REC',.075,.045,[-.41,1.50,.76]);
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
    const lcd=subgroup(lcdHinge,[.15,-2.04,-.770]);
    box(lcd,1.68,1.35,.17,[.73,2.04,.744],mats.body,.07);
    box(lcd,1.50,.20,.02,[.73,2.56,.844],mats.dark,.008);textPlane(lcd,'Blackmagic Design',1.12,.12,[.73,2.56,.861]);
    box(lcd,1.02,.49,.025,[.63,2.22,.851],mats.dark,.006);
    const statusTexture=canvasTexture(512,256,(ctx,w,h)=>{ctx.fillStyle='#a3ac88';ctx.fillRect(0,0,w,h);ctx.fillStyle='#333e30';ctx.font='25px monospace';ctx.fillText('STATUS / TIMECODE',23,49);ctx.font='60px monospace';ctx.fillText('00:00:00:00',21,125);ctx.font='24px monospace';ctx.fillText('LCD STATUS DISPLAY',23,194);ctx.strokeStyle='#55604a';ctx.strokeRect(10,10,w-20,h-20);});
    const stat=add(lcd,new T.PlaneGeometry(.96,.435),new T.MeshBasicMaterial({map:statusTexture}),[.63,2.22,.868]);stat.userData.noHighlight=true;stat.castShadow=false;
    for(let i=0;i<5;i++)box(lcd,.15,.085,.035,[.06+i*.23,1.87,.856],mats.dark,.009);
    for(let j=0;j<2;j++)for(let i=0;i<3;i++)box(lcd,.16,.09,.035,[.16+i*.22,1.63-j*.13,.851],mats.dark,.008);
    for(let i=0;i<2;i++)cyl(lcd,.106,.045,[.94+i*.28,1.59,.857],mats.dark,'z');
    cyl(lcd,.055,.045,[1.35,2.52,.856],mats.edge,'z');
    box(lcd,1.51,1.04,.012,[.73,2.105,.650],mats.dark,.015);
    add(lcd,new T.PlaneGeometry(1.39,.88),mats.glass,[.73,2.105,.642],[0,Math.PI,0]);
    textPlane(lcd,'Blackmagic Design',.78,.071,[.73,1.455,.641],[0,Math.PI,0]);
    for(const [x,y] of [[.025,1.48],[1.435,1.48],[.025,2.61],[1.435,2.61]]){
      const fastener=subgroup(lcd,[x,y,.652],[0,Math.PI,0]);screw(fastener,[0,0,0]);
    }
    const mounting=part('mount',rig);
    box(mounting,3.91,.18,1.47,[.50,.80,0],mats.edge,.025);box(mounting,3.29,.16,1.14,[.38,.965,0],mats.dark,.025);
    box(mounting,2.89,.20,1.23,[.55,.61,0],mats.body,.035);box(mounting,.22,.12,.20,[.95,.87,.79],mats.red,.013);
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
  function makeStudioViewfinder(rig){
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
    for(const y of [-.045,-.19])cyl(rear,.045,.095,[.61,y,-.255],mats.rubber,'x');
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
    cyl(port,.249,.15,[0,-.64,0],mats.edge,'y');cyl(port,.216,.17,[0,-.78,0],mats.rubber,'y');
    cyl(port,.123,.19,[0,-.95,0],mats.rubber,'y');
    for(let i=0;i<4;i++)torus(port,.122-i*.010,.015,[0,-.89-i*.039,0],mats.dark,'y');
    for(const x of [-.225,.225])cyl(port,.024,.07,[x,-.215,-.10],mats.silver,'y',12);
    fiberCable=tube(hybrid,[[2.66,1.67,-.96],[2.8,.80,-1.36],[3.85,-1.5,-2.20],[3.78,-4.8,-2.28],[3.88,-8.98,-2.38],[4.45,-9.28,-2.50]],.068);
  }
  function makeSupport(rig){
    const head=part('fluid-head',rig);
    box(head,1.49,.38,1.21,[.43,.35,0],mats.body,.085);
    box(head,1.13,.45,1.12,[.43,.03,0],mats.body,.10);
    cyl(head,.67,.23,[.43,-.30,0],mats.edge,'y');
    cyl(head,.62,.15,[.43,-.47,0],mats.dark,'y');
    add(head,new T.SphereGeometry(.53,40,24,0,Math.PI*2,Math.PI/2,Math.PI/2),mats.edge,[.43,-.44,0]);
    for(const side of [-1,1]){
      cyl(head,.29,.12,[.41,.23,side*.65],mats.body,'z');
      cyl(head,.18,.17,[.41,.23,side*.72],mats.edge,'z');
      torus(head,.158,.02,[.41,.23,side*.81],mats.rubber,'z');
    }
    cyl(head,.15,.18,[1.15,.09,0],mats.dark,'x');
    torus(head,.14,.022,[1.23,.09,0],mats.rubber,'x');
    box(head,.29,.055,.09,[.67,-.29,.69],mats.dark,.012,[0,0,-.28]);
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
    box(usb,.46,.42,.065,[0,0,0],mats.rubber,.037);textPlane(usb,'USB',.25,.08,[0,0,.036],'#8b9397');
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

  function setLcdOpening(degrees){
    const deg=T.MathUtils.clamp(Number(degrees)||0,0,90);
    if(lcdHinge)lcdHinge.rotation.y=-T.MathUtils.degToRad(deg);
    return deg;
  }
  function setFiberAngle(degrees){
    const deg=T.MathUtils.clamp(Number(degrees)||0,0,60);
    if(!fiberPivot||!fiberCable)return deg;
    fiberPivot.rotation.z=T.MathUtils.degToRad(deg);
    const rotation=new T.Quaternion().setFromEuler(fiberPivot.rotation);
    const exit=new T.Vector3(0,-1.225,0).applyQuaternion(rotation).add(fiberPivot.position);
    const tangent=new T.Vector3(0,-.50,0).applyQuaternion(rotation);
    const points=[exit,exit.clone().add(tangent),new T.Vector3(4.05,.23,-1.77),new T.Vector3(3.95,-2.0,-2.20),new T.Vector3(3.80,-6.3,-2.28),new T.Vector3(3.90,-8.98,-2.38),new T.Vector3(4.45,-9.28,-2.50)];
    fiberCable.geometry.dispose();
    fiberCable.geometry=new T.TubeGeometry(new T.CatmullRomCurve3(points),96,.068,10,false);
    return deg;
  }

  const poses={
    beauty:{az:-0.62,el:0.15,radius:27.5,target:[0,-1.55,0]},
    viewfinder:{az:Math.PI/2,el:.09,radius:7.8,target:[2.37,4.90,0]},
    'viewfinder-back':{az:-1.34,el:.20,radius:7.6,target:[2.20,4.83,0]},
    'viewfinder-mount':{az:-.38,el:.17,radius:6.9,target:[2.26,4.20,0]},
    'rig-top':{az:1.12,el:.22,radius:13.9,target:[.1,2.75,0]},
    operator:{az:-0.12,el:0.16,radius:10.4,target:[-0.40,1.72,0]},
    lcd:{az:.88,el:.20,radius:6.0,target:[.36,2.05,1.20]},
    connections:{az:2.35,el:0.24,radius:9.4,target:[0.55,1.75,-0.15]},
    support:{az:1.05,el:0.30,radius:10.3,target:[1.28,-.42,0]},
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
  const rig = makeRig();
  const studio = makeStudio();
  setLcdOpening(90);
  setFiberAngle(15);
  rig.removeFromParent();
  studio.removeFromParent();
  // Floor heights per model (rig stands on its spreader; the studio unit sits on its feet).
  const floors = { rig: -9.40, studio: -0.11 };
  return { rig, studio, parts, poses, mats, setLcdOpening, setFiberAngle, floors };
}
