
(function (root) {
  'use strict';
  const sources = [
    {source_id:'photo-front',kind:'user_photo',locator:'Supplied front close-up, 2026-09-20 02:45',scope:'Visible control labels and relative placement'},
    {source_id:'photo-perspective',kind:'user_photo',locator:'Supplied front perspective, 2026-09-20 03:06:16',scope:'Enclosure and control surface geometry'},
    {source_id:'photo-rear',kind:'user_photo',locator:'Supplied rear view, 2026-09-20 03:06:23',scope:'Connector positions and markings'},
    {source_id:'photo-side',kind:'user_photo',locator:'Supplied side view, 2026-09-20 03:06:31',scope:'Profile, ventilation and transition lever'},
    {source_id:'bmd-spec',kind:'manufacturer',locator:'https://www.blackmagicdesign.com/products/atemtelevisionstudio/techspecs',scope:'ATEM Television Studio HD8 ISO section; accessed 2026-09-20'},
    {source_id:'bmd-start',kind:'manufacturer',locator:'https://www.blackmagicdesign.com/products/atemtelevisionstudio/gettingstarted',scope:'Program, Preview and transitions; accessed 2026-09-20'},
    {source_id:'bmd-product',kind:'manufacturer',locator:'https://www.blackmagicdesign.com/products/atemtelevisionstudio',scope:'Control surface functions; accessed 2026-09-20'},
    {source_id:'bmd-manual',kind:'manufacturer',locator:'ATEM Television Studio Switchers Installation and Operation Manual, June 2026 — https://documents.blackmagicdesign.com/UserManuals/ATEM_Television_Studio_HD_Manual.pdf (English pp. 3-193; accessed 2026-09-22)',scope:'Panel behaviour, lamp states, LCD menu navigation, transitions, keyers, talkback and the Fairlight audio mixer. Covers HD8, HD8 ISO and 4K8; 4K8-only controls are excluded here.'},
    {source_id:'fmp-sop',kind:'user_document',locator:'Switcher SOP.pdf, SOP-FMP-01 Rev A, September 2026',scope:'Draft venue source labels and operator sequence; current patch unverified'},
    {source_id:'field-reference',kind:'user_document',locator:'atem-tvs-hd8-iso-reference.html',scope:'Supplementary field reference; not firmware verification'},
    {source_id:'user-tbar-tally-2026-09-20',kind:'user_report',locator:'Dave’s correction in this discussion, 20 September 2026',scope:'Both selected Program and Preview source buttons are red while the manual transition lever is between endpoints. Adopted for this background-MIX simulation.'}
  ];
  const components = [];
  const categories = ['Switching','Transitions & keys','Audio','Aux, record & stream','System & talkback','Rear connections','Enclosure'];
  function add(id,label,category,shape,purpose,extra={}) {
    const surface=shape.surface||'deck';
    const c={component_id:'atem.'+id,label,kind:shape.type||'button',category,parent_id:null,confidence:'Documented',geometry_status:'photo_approximation',aliases:[],view_ids:[surface],source_ids:[surface==='rear'?'photo-rear':'photo-front','bmd-product'],purpose,shape,...extra};
    components.push(c); return c;
  }
  function button(id,label,category,x,z,text,purpose,extra={}) {
    return add(id,label,category,{type:'button',surface:'deck',x,z,w:.74,h:.74,text},purpose,extra);
  }
  function small(id,label,category,x,z,text,purpose,extra={}) {
    return add(id,label,category,{type:'small',surface:'deck',x,z,w:.61,h:.36,text},purpose,extra);
  }
  const simNotes={source_ids:['photo-front','bmd-start','bmd-manual']};
  const hardwareLabels=['Camera 1','Camera 2','Camera 3','Camera 4','Camera 5','Camera 6','Camera 7','Camera 8','Media Player 1','Media Player 2'];
  const venueLabels=['Camera 1','Camera 2','Camera 3','4 PTZ','Camera 5','Camera 6','7 Ads','8 Conf Mon','Media Player 1','Media Player 2'];
  const venueNotes=[
    'SOP: operated house camera in the pit, centre or slightly stage right. Position varies by show.',
    'SOP: operated house camera at front of house.',
    'SOP: operated house camera in the pit, stage left. Position varies by show.',
    'SOP: remote camera on the catwalk rail above section 202.',
    'SOP: tour tie line. A picture depends on what is patched for this show.',
    'SOP: second tour tie line. A picture depends on what is patched for this show.',
    'SOP: house ad loop from a Dell computer through an HDMI-to-SDI converter. Fallback approval remains a draft item.',
    'SOP: variable landing point. May be a return or a tour feed. Ask what is patched tonight before using it.',
    'Still or clip loaded into Media Player 1; this is an internal source, not SDI input 9.',
    'Still or clip loaded into Media Player 2; this is an internal source, not SDI input 10.'
  ];
  for(let i=1;i<=10;i++) {
    const x=-10.7+(i-1)*.82;
    button('source.'+i,'Source select '+i,'Switching',x,1.1,'', 'Select bus position '+i+'. Assigns a source to whatever the destination display names — an aux output or a keyer — not to Program or Preview. Lit means selected, blinking means the shifted source, green means a protected source: program, preview, clean feed 1 or clean feed 2. Press MACRO and this row turns blue and becomes macro slot '+i+' instead. Double-press to shift-select without holding SHIFT.',{source_index:i,source_ids:['photo-front','bmd-manual']});
    button('program.'+i,'Program · '+hardwareLabels[i-1],'Switching',x,4.25,'', 'Hot-switches this source straight to Program — an immediate cut, with no transition and no undo. Lit red means it is on air; blinking red means the shifted source on this button is live, so what is live is not what the label says. Unlike the preview and select rows, double-press does not shift-select here: the manual states that would momentarily put the wrong source on the program output.',{...simNotes,sim:'program',source_index:i});
    button('preview.'+i,'Preview · '+hardwareLabels[i-1],'Switching',x,5.52,'', 'Queues this source on Preview; it reaches Program on the next transition, so selecting it alone changes nothing on air. Lit green means selected, blinking green means a shifted source is on preview. Double-press is the same as shift-selecting, which is quicker than holding SHIFT. During the simulated MIX both selected source buttons are red; the idle Preview selection returns to green at an endpoint.',{...simNotes,sim:'preview',source_index:i});
    add('audio.encoder.'+i,'Audio strip '+i+' encoder','Audio',{type:'knob',surface:'deck',x,z:-1.9,r:.24},'Encoder for channel strip '+i+' of the bank currently shown on the LCD. What it adjusts is set by the mode buttons: under LEVEL, turning right raises that input\u2019s level, and pressing ALT turns the same knob into gain. EQ, COMP, GATE, EXP, LIM and PAN each remap all ten encoders to that processor\u2019s parameters, left to right in the order they appear in the Dynamics window. BNK> and <BNK change which ten channels these encoders address, so read the LCD before turning one.',{source_ids:['photo-front','bmd-manual']});
    small('audio.on.'+i,'Audio strip '+i+' ON','Audio',x,-1.19,'ON','Soft button for channel strip '+i+'. Under LEVEL it cycles that input between audio-follows-video, on and off — three states, not a simple mute. Under LEVEL or PAN it lights red while that input is on air. Under the dynamics modes it becomes whatever the LCD shows above it; in the channel 1 position that is the on/off switch for the selected processor.',{source_ids:['photo-front','bmd-manual']});
    small('audio.solo.'+i,'Audio strip '+i+' SOLO','Audio',x,-.62,'SOLO','Solos channel '+i+' so you hear only that input in the monitor path, and a headset icon appears on that strip\u2019s LCD while it is active. It is a tool for refining one adjustment; it does not change what the Program mix sends to air.',{source_ids:['photo-front','bmd-manual']});
    small('audio.select.'+i,'Audio strip '+i+' SEL','Audio',x,-.05,'SEL','Selects or de-selects channel '+i+' for parameter work. Under GATE and EXP it chooses which track is in focus. Under PAN you rarely need it — turning that channel\u2019s knob selects the strip and lights SEL for you.',{source_ids:['photo-front','bmd-manual']});
  }
  add('audio.meters','Audio meter display','Audio',{type:'display',surface:'deck',x:-7.01,z:-3.14,w:8.25,h:1.62,display:'audio'},'Shows audio channel labels, meters and status. The meter marks in this reconstruction are illustrative, not incoming audio.');
  add('source.labels','Source label display','Switching',{type:'display',surface:'deck',x:-7.01,z:2.67,w:8.25,h:1.54,display:'sources'},'Source-name strips align with the Program and Preview buttons. In this trainer they follow the standard or FMP label set.');
  button('source.shift','Source select SHIFT','Switching',-1.55,1.1,'SHIFT','Accesses the alternate source bank for the source-select row. Shifted-source behavior is not simulated.');
  button('program.shift','Program / Preview SHIFT','Switching',-1.55,4.25,'SHIFT','Accesses additional Program / Preview sources. Alternate banks are not simulated; read the actual displayed source names.');
  button('preview.transition','PREV TRANS','Transitions & keys',-1.55,5.52,'PREV\nTRANS','Previews the next transition on the Preview output. It does not take that transition to Program.');
  const audioModes=[['LEVEL','PAN'],['EQ','EXP'],['COMP','LIM'],['GATE','CAM']];
  audioModes.forEach((row,r)=>row.forEach((t,c)=>small('audio.mode.'+t.toLowerCase(),t+' audio mode','Audio',-1.65+c*.82,-3.82+r*.57,t,'Selects '+({LEVEL:'level',PAN:'pan',EQ:'equalization',EXP:'expander',COMP:'compressor',LIM:'limiter',GATE:'gate',CAM:'camera-control'}[t])+' parameters for the audio/control encoders.')));
  const audioCtlPurpose={master:'MSTR swaps the channel strips over to the switcher\u2019s output side \u2014 headset, control out and studio out \u2014 and gives you the master fader for the final program mix.',alt:'ALT reveals the second function of whatever is currently mapped. The one you will use most: under LEVEL it turns the ten encoders into gain controls, which is what you set when normalising inputs before a show.','bank-prev':'<BNK shifts the ten channel strips back to the previous group of ten inputs. The strip LCDs rename themselves to match.','bank-next':'BNK> shifts the ten channel strips one bank to the right, to the next group of ten inputs. If an encoder is not doing what you expect, check which bank you are on.'};
  [['MSTR','ALT'],['<BNK','BNK>']].forEach((row,r)=>row.forEach((t,c)=>{const key=['master','alt','bank-prev','bank-next'][r*2+c];small('audio.'+key,t+' audio control','Audio',-1.65+c*.82,-.65+r*.57,t,audioCtlPurpose[key],{source_ids:['photo-front','bmd-manual']});}));
  const auxSources=[1,2,3,4,'PGM',5,6,7,8,'M/V\nPVW'];
  // Ten shortcuts: the eight SDI inputs, program, and a multiview/preview toggle.
  // Everything else reaches an aux through the aux menu in system control. Manual p.36.
  const auxPurpose=n=>n==='PGM'?'Sends the program feed to whichever aux output is armed. A switch on an aux output is always clean, so you can cut on an aux without glitching it.':n==='M/V\nPVW'?'Toggles the armed aux output between multiview and preview. It lights white for multiview and green for preview, so the colour tells you which one is feeding that output.':'Shortcut that routes SDI input '+n+' to whichever aux output is armed. For sources without a shortcut — colour bars, media players, or a clean feed taken before the downstream keyers — press the aux button in system control and dial the source in on the knob under that output.';
  auxSources.forEach((n,i)=>button('aux.source.'+(i+1),'Aux source '+String(n).replace('\n',' / '),'Aux, record & stream',.65+(i%5)*.82,-2.83+Math.floor(i/5)*.82,String(n),auxPurpose(n),{source_ids:['photo-front','bmd-manual']}));
  [1,2].forEach((n,i)=>button('aux.target.'+n,'AUX '+n+' target','Aux, record & stream',5.3,-2.83+i*.82,'AUX '+n,'Selects Aux '+n+' as the destination for the auxiliary source buttons.',{source_ids:['photo-front','bmd-spec','bmd-product']}));
  button('macro','MACRO','Transitions & keys',.65,1.1,'MACRO','Changes the source-select row to macro operation. Stored routines are not included in this trainer.');
  button('transition.background','BKGD next transition','Transitions & keys',.65,1.92,'BKGD','Includes the background picture in the next transition. The basic practice keeps BKGD selected and all keys off.',{...simNotes,sim:'background'});
  for(let i=1;i<=4;i++) {
    button('key.'+i+'.on','Upstream key '+i+' ON','Transitions & keys',.65+i*.82,1.1,'ON','Puts upstream key '+i+' on or off air. An illuminated key does not identify its content; inspect the actual output first.');
    button('key.'+i+'.next','KEY '+i+' next transition','Transitions & keys',.65+i*.82,1.92,'KEY '+i,'Includes upstream key '+i+' in the next transition. This differs from its ON button.');
  }
  ['DIP','DVE','STING','MIX','WIPE','ARM'].forEach((t,i)=>button('transition.'+t.toLowerCase(),t+' transition control','Transitions & keys',2.29+(i%3)*.82,3.58+Math.floor(i/3)*.82,t,t==='MIX'?'Selects a mix (dissolve) for the next transition. AUTO follows the selected style and rate.':t==='ARM'?'Arms a configured transition function. Its context is not simulated.':'Selects the '+t.toLowerCase()+' transition style. This trainer simulates MIX only.',t==='MIX'?{...simNotes,sim:'mix'}:{}));
  button('transition.cut','CUT','Transitions & keys',2.29,5.7,'CUT','Immediately completes the selected next transition. With BKGD selected and keys off, Program and Preview exchange sources.',{...simNotes,sim:'cut'});
  button('transition.auto','AUTO','Transitions & keys',3.93,5.7,'AUTO','Runs the selected transition at its configured rate. The practice uses a 1.2-second MIX, an illustrative training setting.',{...simNotes,sim:'auto'});
  add('transition.tbar','Manual transition lever (T-bar)','Transitions & keys',{type:'tbar',surface:'deck',x:6.6,z:4.35,w:1.6,h:3.6},'Controls transition progress by hand. Between endpoints, both selected Program and Preview source buttons are red. Complete the travel to exchange sources, or return to the starting end to cancel the partial MIX.',{...simNotes,sim:'tbar',limits:'Lever geometry and travel are illustrative. The practice models a background MIX only. Mid-transition button colors follow Dave’s correction; this is not independent hardware verification.'});
  for(let i=1;i<=2;i++) {
    button('dsk.'+i+'.tie','DSK '+i+' TIE','Transitions & keys',9.2+(i-1)*.82,3.12,'DSK '+i+'\nTIE','Ties downstream key '+i+' to the next main transition.');
    button('dsk.'+i+'.cut','DSK '+i+' CUT','Transitions & keys',9.2+(i-1)*.82,4.9,'DSK '+i+'\nCUT','Immediately toggles downstream key '+i+'. Check whether the key is on before using it to remove a graphic.');
    button('dsk.'+i+'.auto','DSK '+i+' AUTO','Transitions & keys',9.2+(i-1)*.82,5.72,'DSK '+i+'\nAUTO','Fades downstream key '+i+' on or off using its own rate.');
  }
  button('transition.ftb','FTB · Fade to black','Transitions & keys',11.9,5.72,'FTB','Fades the Program output to black, including its layers. Press again to fade back. The practice models video only, not audio fade behavior.',{...simNotes,sim:'ftb'});
  [['GRAB\nSTILL','grab-still','Captures a still from the switcher.'],['REC','record','Starts recording to configured storage.'],['SWITCH','switch-disk','Switches recording storage where configured.'],['STOP','record-stop','Stops recording.']].forEach(([t,id,p],i)=>button('record.'+id,t.replace('\n',' '),'Aux, record & stream',9.2+(i%2)*.82,-2.83+Math.floor(i/2)*.82,t,p+' Recording and storage are not simulated.'));
  ['ON AIR','OFF'].forEach((t,i)=>button('stream.'+(i?'off':'on'),'Stream '+t,'Aux, record & stream',11.9,-2.83+i*.82,t,(i?'Stops':'Starts')+' the configured stream. The stream ON AIR light is separate from Program-source selection. No streaming is performed by this trainer.'));
  const talkLabels=[['CALL','PGM\nMIX'],['DIM','MUTE'],['CANS','SPKR'],['TALK','STUDIO']];
  talkLabels.forEach((row,r)=>row.forEach((t,c)=>add('talk.'+t.toLowerCase().replace('\n','-'),t.replace('\n',' ')+' talkback control','System & talkback',{type:'small',surface:'console',x:-10.8+c*.93,y:.86-r*.57,w:.71,h:.39,text:t},'Talkback / monitoring control labeled '+t.replace('\n',' ')+'. Monitor and talkback settings are not simulated.')));
  const menu=[['HOME','SETTINGS','KEYERS','◀','▶'],['MIX','WIPE','DVE','STINGER','DIP'],['FTB','MEDIA\nPLAYERS','BORDER','COLOR','TALK'],['MACRO','SUPER\nSOURCE','CAMERA\nCONTROL','AUDIO','AUX']];
  const menuIds=['home','settings','keyers','previous','next','mix','wipe','dve','stinger','dip','ftb','media-players','border','color','talk','macro','supersource','camera-control','audio','aux'];
  menu.forEach((row,r)=>row.forEach((t,c)=>add('menu.'+menuIds[r*5+c],t.replace('\n',' ')+' menu','System & talkback',{type:'small',surface:'console',x:-7.8+c*.95,y:.86-r*.57,w:.76,h:.39,text:t},t==='HOME'?'Returns the LCD to its Home page. Preview and Program source names are visible here.':'Opens or navigates the '+t.replace('\n',' ')+' LCD menu. Menu settings are not emulated.')));
  add('system.lcd','System LCD','System & talkback',{type:'display',surface:'console',x:-.25,y:.1,w:5.35,h:2.13,display:'system'},'Context-sensitive system display. The training Home page mirrors simulated Preview and Program names.');
  for(let i=1;i<=4;i++) {
    add('system.soft.'+i,'LCD soft key '+i,'System & talkback',{type:'small',surface:'console',x:-2.22+(i-1)*1.3,y:1.44,w:.55,h:.2,text:'—'},'Soft key '+i+', above the LCD. It selects whatever option the LCD prints directly above it, so its meaning changes with every menu — on the settings menu these are how you reach button mapping and the HyperDeck setup.',{source_ids:['photo-front','bmd-manual']});
    add('system.encoder.'+i,'LCD encoder '+i,'System & talkback',{type:'knob',surface:'console',x:-2.22+(i-1)*1.3,y:-1.36,r:.29},'Knob '+i+', below the LCD. It adjusts the parameter printed above it on the current page. Pressing a knob can open its value for keypad entry — press the auto rate knob, for example, and the keypad lights so you can type a duration.',{source_ids:['photo-front','bmd-manual']});
  }
  [1,2,3,4,5,6,7,8,9,'ENTER',0,'RESET'].forEach((n,i)=>add('keypad.'+String(n).toLowerCase(),'Keypad '+n,'System & talkback',{type:'small',surface:'console',x:3.7+(i%3)*.96,y:.86-Math.floor(i/3)*.57,w:.73,h:.39,text:String(n)},n==='ENTER'?'Confirms a value typed on the keypad — a new auto-transition duration, for example, after pressing the auto rate knob. Until ENTER is pressed the previous value still stands.':n==='RESET'?'Labelled RESET on this unit, but the June 2026 operation manual does not describe a keypad reset key anywhere in its control panel chapters. Its exact behaviour is unverified here and is deliberately not guessed at. Do not press it mid-show on the assumption that it only clears a half-typed number.':'Jumps straight to page '+n+' of the open LCD menu, skipping repeated presses of the arrow buttons. It lights whenever the open menu has more than one page. When a value is being edited — after pressing a knob such as auto rate — the same key types the digit '+n+' instead.'+({4:' In the general settings menu, page 4 is the brightness controls.',6:' In the general settings menu, page 6 is the switching mode choice between program/preview and A/B direct.'}[n]||''),{source_ids:n==='RESET'?['photo-front']:['photo-front','bmd-manual'],confidence:n==='RESET'?'Unknown':'Documented'}));
  function rear(id,label,type,x,y,purpose,extra={}) {
    // Connector type comes from the Blackmagic specification and the rear photograph
    // shows where each one sits, so these are stronger than the photo_approximation
    // floor add() applies to parts whose position was estimated.
    return add('rear.'+id,label,'Rear connections',{type,surface:'rear',x,y,w:.65,h:.55,r:.28},purpose,{source_ids:['photo-rear','bmd-spec'],geometry_status:'documented_type_photo_grounded',...extra});
  }
  rear('ac','AC power input','iec',-12,.0,'IEC mains power input. Power connections are identification-only in this guide.');
  rear('dc','12 V DC power input','xlr',-10.7,0,'4-pin XLR 12 V DC input. Pinouts and power procedures are outside this trainer.');
  [['reference','Reference',-9.55],['timecode','Timecode',-8.65],['madi','MADI',-7.75]].forEach(([id,label,x])=>{
    rear(id+'.out',label+' OUT','bnc',x,.39,id==='madi'?'MADI digital audio output. This connector is not an SDI video output.':label+' output on BNC.');
    rear(id+'.in',label+' IN','bnc',x,-.43,id==='madi'?'MADI digital audio input, up to 32 channels. This connector is not an SDI video input.':label+' input on BNC.');
  });
  [1,2].forEach((n,i)=>rear('usb.'+n,'USB-C '+n,'usb',-6.75+i*.83,.27,'One of two USB-C ports (USB 3.0). Record the program here to an external SSD or flash drive, or use the port as a webcam output or for software control. With two drives connected you can move recording between them with the SWITCH button without stopping. Format drives as HFS+ where you can — it journals, so a corrupted disk is more likely to be recoverable — or exFAT if the media has to be read on Windows too.',{source_ids:['photo-rear','bmd-spec','bmd-manual']}));
  rear('remote','REMOTE · RJ12 RS-422','rj',-5.12,.4,'Remote RS-422 connector on RJ12. It is not an Ethernet port.',{shape:{type:'rj',surface:'rear',x:-5.12,y:.4,w:.52,h:.55}});
  rear('talkback','TALKBACK · RJ45 expansion','rj',-4.16,.4,'Talkback expansion on an RJ45 connector. It is not one of the four Ethernet network ports.');
  [1,2,3,4].forEach((n,i)=>rear('ethernet.'+n,'Ethernet port '+n,'rj',-6.72+i*.86,-.43,'One port of the built-in four-port 10/100/1000 BASE-T switch, so the switcher can share a single network drop with other gear. The network carries ATEM Software Control, hardware panels such as the ATEM Camera Control Panel, and direct streaming. On an HD8 ISO it also carries video: streaming sources arriving over Ethernet, such as a Blackmagic Studio Camera 6K Pro, can be selected as switcher inputs.',{source_ids:['photo-rear','bmd-spec','bmd-manual']}));
  for(let i=1;i<=8;i++) {
    rear('sdi-out.'+i,'Camera return SDI OUT '+i,'bnc',-3.02+(i-1)*.87,.39,'Return feed '+i+'. Patch this to a camera\u2019s program SDI input and it carries the return picture plus the camera control packets — the switcher broadcasts those on every non-downconverted SDI output, which is how shading and tally reach the camera down one cable. Tally follows the camera\u2019s own ID number, not the socket, so a camera on input '+i+' must be set to '+i+' or the wrong operator gets the light. Camera control is never sent on the multiview outputs. This is a return feed, not an ISO record output.',{source_index:i,source_ids:['photo-rear','bmd-spec','bmd-manual']});
    rear('sdi-in.'+i,'SDI INPUT '+i,'bnc',-3.02+(i-1)*.87,-.43,'3G-SDI video input '+i+' with input re-synchronization and format conversion within supported standards.',{source_index:i});
  }
  rear('aux.2','AUX 2 · SDI output','bnc',4.35,.39,'Independently routed auxiliary SDI output 2. A venue destination cannot be inferred from this product photo.');
  rear('aux.1','AUX 1 · SDI output','bnc',4.35,-.43,'Independently routed auxiliary SDI output 1. A venue destination cannot be inferred from this product photo.');
  rear('program','PROGRAM · SDI output','bnc',5.26,.39,'Main SDI Program output. Downstream venue routing is not established by this model.');
  rear('multiview.sdi','MULTIVIEW · SDI output','bnc',5.26,-.43,'SDI multiview output for monitoring multiple sources and switcher status.');
  rear('multiview.hdmi','MULTIVIEW · HDMI output','hdmi',6.14,-.14,'HDMI multiview output. This is an output, not an HDMI camera input.');
  [['control','CONTROL OUT',7.06],['studio','STUDIO OUT',7.94]].forEach(([id,label,x])=>['L','R'].forEach((ch,i)=>rear(id+'.'+ch.toLowerCase(),label+' '+ch,'jack',x,.39-i*.82,'Quarter-inch analog monitoring output, '+label.toLowerCase()+' '+ch+'.')));
  ['L','R'].forEach((ch,i)=>rear('rca.'+ch.toLowerCase(),'STEREO IN '+ch+' · RCA','rca',8.88,.32-i*.64,'Analog stereo audio input '+ch+' on RCA.'));
  [1,2].forEach((n,i)=>rear('analog.'+n,'ANALOG AUDIO IN CH '+n,'xlr',9.85+i*1.05,0,'Balanced analog audio input channel '+n+' on 3-pin XLR.'));
  rear('headset','TALKBACK · headset','xlr',11.98,0,'5-pin XLR talkback headset connection. This is distinct from the RJ45 talkback expansion port.');
  add('chassis','Enclosure','Enclosure',{type:'chassis',surface:'deck'},'Integrated desktop switcher enclosure with a raised system panel, sloping control deck and side ventilation.',{source_ids:['photo-perspective','photo-side'],limits:'All enclosure geometry is approximate. This is not a fabrication model.'});
  const views=['deck','console','rear'].map(view_id=>({view_id,component_ids:components.filter(c=>c.view_ids.includes(view_id)).map(c=>c.component_id)}));
  for(const c of components)if(/^atem\.(program|preview)\.\d+$/.test(c.component_id)||c.component_id==='atem.transition.tbar')c.source_ids=[...c.source_ids,'user-tbar-tally-2026-09-20'];
  const catalog={schema_version:'1.0',guide_id:'atem-tvs-hd8-iso',revision:'1.0.1',model:'Blackmagic ATEM Television Studio HD8 ISO',model_limits:'Position and dimensions are reconstructed from photos, not measured CAD.',interaction_modes:{inspect:{action:'Select to inspect. This part is not operated by the trainer.',expected_result:'The inspector identifies the selected physical control.'},simulate:{action:'Use “Press in simulator” to try this control. Selecting it alone does not operate it.',expected_result:'Only the practice state changes. No equipment is connected.'}},sources,components,views,lessons:[{lesson_id:'preview-check-cut',component_ids:['atem.preview.3','atem.transition.cut','atem.transition.mix','atem.transition.background']}],behaviors:[{behavior_id:'background-mix-tally',confidence:'Reported',source_ids:['user-tbar-tally-2026-09-20'],statement:'At a partial background MIX, both selected source buttons are red. At either endpoint, Program is red and Preview is green.',scope:'Manual MIX; the simulator uses the same phase feedback for AUTO. Training displays mirror this state without claiming exact hardware LCD styling.'}],corrections:[{correction_id:'tbar-tally-2026-09-20',from_revision:'1.0.0',to_revision:'1.0.1',old_claim:'Preview remained green during a partial MIX.',replacement:'Both selected source buttons are red during a partial MIX; endpoint colors remain red/green.',source_id:'user-tbar-tally-2026-09-20',surfaces:['3D button lamps','training display colors','selectable diagram','monitor status and accessible names','lever feedback','component descriptions','inline and portable exports'],verification:'Focused state, scene-material and DOM checks. Rendered browser and physical hardware remain unverified.'}]};
  function initialState() {return {program:1,preview:2,mix:true,background:true,progress:0,black:0,blackTarget:0,transitioning:false,ftbRunning:false,leverEnd:0};}
  function reduce(state,event) {
    const s={...state};
    if(event.type==='reset') return initialState();
    if(event.type==='mix') {s.mix=true;return s;}
    if(event.type==='background'&&!s.transitioning&&s.progress===0) {s.background=!s.background;return s;}
    if(event.type==='preview'&&!s.transitioning&&s.progress===0) {s.preview=event.source;return s;}
    if(event.type==='program'&&!s.transitioning&&s.progress===0) {s.program=event.source;return s;}
    if(event.type==='ftb-start'&&!s.ftbRunning) {s.blackTarget=s.black>.5?0:1;s.ftbRunning=true;return s;}
    if(event.type==='ftb-tick') {s.black=Math.max(0,Math.min(1,event.value));if(s.black===s.blackTarget)s.ftbRunning=false;return s;}
    if(!s.background)return s;
    if(event.type==='cut'&&!s.transitioning&&s.progress===0) {s.program=state.preview;s.preview=state.program;return s;}
    if(event.type==='auto-start'&&!s.transitioning&&s.progress===0) {s.transitioning=true;return s;}
    if(event.type==='progress') {
      s.progress=Math.max(0,Math.min(1,event.value));
      if(s.progress===1) {s.program=state.preview;s.preview=state.program;s.progress=0;s.transitioning=false;s.leverEnd=1-state.leverEnd;}
      return s;
    }
    return s;
  }
  function tally(state){const inTransition=state.progress>0&&state.progress<1;return {inTransition,program:'red',preview:inTransition?'red':'green'};}
  root.ATEM={catalog,categories,hardwareLabels,venueLabels,venueNotes,initialState,reduce,tally};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ATEM;
})(typeof globalThis!=='undefined'?globalThis:this);
