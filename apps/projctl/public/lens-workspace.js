import { lensDirection } from './lens-direction.js';
const AXES = ['h','v','focus','zoom'];
const SPEEDS = {slow:'Fine',normal:'Normal',fast:'Coarse'};
const ARROWS = {ArrowLeft:['h','-'],ArrowRight:['h','+'],ArrowUp:['v','+'],ArrowDown:['v','-']};
const identity = p => p ? JSON.stringify([p.slot,p.driver,p.ip,p.mac,p.reverseH,p.reverseV]) : '';
export function lensJogCapability(projector) {
  const c=projector?.capabilities?.lensJog;
  return {axes:AXES.filter(axis=>c?.axes?.includes(axis)),speeds:Object.keys(SPEEDS).filter(speed=>c?.speeds?.includes(speed)),mode:c?.mode||'unsupported',stop:c?.stop===true,positionReadback:c?.positionReadback===true};
}
export function createLensWorkspace(host,{send,onSave,onRecall,onPresets}={}) {
  host.className='avd-panel pj-detail-panel pj-lens-workspace';
  host.innerHTML=`<div class="pj-lens-heading"><h3>Lens workspace</h3><strong data-lens-target></strong></div><p class="pj-mono" data-lens-state></p>
    <div class="pj-lens-layout"><div><div class="pj-lens-pad" role="group" aria-label="Image shift"><button type="button" class="avd-btn" data-lens-axis="v" data-dir="+" aria-label="Shift image up">↑<span>Up</span></button><button type="button" class="avd-btn" data-lens-axis="h" data-dir="-" aria-label="Shift image left">←<span>Left</span></button><span class="pj-lens-pad-label">Shift</span><button type="button" class="avd-btn" data-lens-axis="h" data-dir="+" aria-label="Shift image right">→<span>Right</span></button><button type="button" class="avd-btn" data-lens-axis="v" data-dir="-" aria-label="Shift image down">↓<span>Down</span></button></div><label class="avd-field"><span class="avd-field__label">Shift step</span><select class="avd-input" data-lens-speed="shift"></select></label></div>
    <div class="pj-lens-optics">${[['focus','Focus','Back','Forward'],['zoom','Zoom','Out','In']].map(([axis,label,minus,plus])=>`<div><strong>${label}</strong><div class="pj-two"><button type="button" class="avd-btn" data-lens-axis="${axis}" data-dir="-" aria-label="${label} ${minus}"><b aria-hidden="true">−</b>${minus}</button><button type="button" class="avd-btn" data-lens-axis="${axis}" data-dir="+" aria-label="${label} ${plus}"><b aria-hidden="true">+</b>${plus}</button></div><label class="avd-field"><span class="avd-field__label">${label} step</span><select class="avd-input" data-lens-speed="${axis}"></select></label></div>`).join('')}</div></div>
    <div class="pj-lens-keyboard-row"><button type="button" class="avd-btn" data-lens-keyboard aria-pressed="false">Enable arrow keys</button><button type="button" class="avd-btn avd-btn--danger" data-lens-stop aria-label="Stop lens">Stop lens</button></div><div class="pj-lens-keyboard" tabindex="0" role="group" aria-label="Arrow key lens shift" data-lens-keyboard-area><span data-lens-keyboard-note>Arrow keys off</span><small>One jog per press · Escape disables · leave this panel to release</small></div>
    <p class="pj-mono" data-lens-semantics></p><p class="pj-mono" data-lens-mapping></p><dl class="pj-lens-readback" data-lens-readback></dl><p class="pj-mono" role="status" data-lens-feedback></p><small class="pj-lens-ack-note">✓ = command acknowledged · position and image still need checking</small>
    <details class="pj-lens-presets"><summary>Save / recall rig lens presets</summary><p class="pj-mono">Rig presets may include other projectors. Recall requires a separate confirmation; check every reported position and the image.</p><div class="pj-lens-preset-save"><input class="avd-input" data-lens-preset-name aria-label="Rig preset name" placeholder="Preset name"><button type="button" class="avd-btn" data-lens-save>Save rig preset</button></div><div class="pj-lens-preset-save"><select class="avd-input" data-lens-preset aria-label="Saved rig lens preset"></select><button type="button" class="avd-btn" data-lens-recall>Recall rig preset</button></div><p class="pj-mono" data-lens-preset-result></p><button type="button" class="avd-btn" data-lens-presets>Review all presets</button></details>`;
  const $=selector=>host.querySelector(selector),pad=$('[data-lens-keyboard-area]');
  const shiftSelect=$('[data-lens-speed=shift]'),shiftLabel=shiftSelect.parentElement;shiftSelect.setAttribute('aria-label','Shift step');shiftSelect.title='Shift step';$('.pj-lens-pad-label').replaceChildren(shiftSelect);shiftLabel.remove();
  const details=document.createElement('details');details.className='pj-lens-details';const summary=document.createElement('summary');summary.textContent='Positions, direction mapping & presets';details.append(summary);for(const selector of ['[data-lens-semantics]','[data-lens-mapping]','[data-lens-readback]','.pj-lens-ack-note','.pj-lens-presets'])details.append(host.querySelector(selector));host.append(details);

  let context={projector:null,connected:false,lock:true,active:false,presets:[]},enabled=false,disableOnClick=false,held=null,pending=null,stopPending=false,lastJog=0,speedSignature='',presetSignature='',presetBusy=false;
  const speeds={shift:'slow',focus:'slow',zoom:'slow'};
  const caps=()=>lensJogCapability(context.projector);
  const ready=()=>context.active&&context.connected&&(context.connection?.current ?? context.projector?.status?.online)&&!context.lock&&caps().axes.length&&caps().speeds.length&&!(context.projector.driver==='pulse'&&context.projector.status?.power!=='on');
  const moving=()=>!!pending||!!context.projector?.busy;
  const feedback=text=>{$('[data-lens-feedback]').textContent=text;$('[data-lens-feedback]').title=text;};
  function buttonState(button,phase){if(!button)return;clearTimeout(button._lensFeedbackTimer);button.dataset.commandState=phase;button.setAttribute('aria-busy',String(['sending','releasing'].includes(phase)));button.title=phase==='acknowledged'?'Command acknowledged; verify the image and readbacks.':phase==='confirmation'?'Confirmation required before movement.':phase;if(['acknowledged','error','cancelled'].includes(phase))button._lensFeedbackTimer=setTimeout(()=>{if(button.dataset.commandState===phase)delete button.dataset.commandState;},2500);}

  function stop(target=pending) {
    if(!target||!target.stop||stopPending||!context.connected)return;
    stopPending=true;buttonState($('[data-lens-stop]'),'sending');Promise.resolve().then(()=>send(target.projector,{op:'stop'})).then(ok=>buttonState($('[data-lens-stop]'),ok===false?'error':'acknowledged')).catch(error=>{buttonState($('[data-lens-stop]'),'error');feedback(error.message);}).finally(()=>{stopPending=false;paint();});
  }
  function release(){held=null;if(pending){const button=host.querySelector('[data-command-state="sending"]');if(button&&pending.stop){pending.releaseRequested=true;buttonState(button,'releasing');}stop();}}
  function disarm(){enabled=false;release();paint();}
  async function jog(axis,dir,keyboard=false){
    if(!ready()||moving()||!caps().axes.includes(axis)||keyboard&&Date.now()-lastJog<200)return;
    lastJog=Date.now();const button=host.querySelector(`[data-lens-axis="${axis}"][data-dir="${dir}"]`);buttonState(button,'sending');const p=context.projector,c=caps(),token={projector:p,identity:identity(p),stop:c.stop};pending=token;feedback('Sending one lens jog…');paint();
    try{const ok=await send(p,{axis,dir:lensDirection(p,axis,dir),speed:speeds[axis==='h'||axis==='v'?'shift':axis]});if(pending===token){buttonState(button,token.releaseRequested?'cancelled':ok===false?'error':'acknowledged');feedback(token.releaseRequested?'Lens release requested. Check the reported motor state and image.':ok===false?'Lens command failed. Check the command log.':c.positionReadback?'Command completed. Check the reported positions and image.':'Command accepted. Absolute lens position is not reported.');}}
    catch(error){if(pending===token){buttonState(button,'error');feedback(error.message);}}
    finally{button.setAttribute('aria-busy','false');if(pending===token)pending=null;else buttonState(button,'cancelled');paint();}
  }
  host.querySelectorAll('[data-lens-axis]').forEach(button=>button.onclick=()=>jog(button.dataset.lensAxis,button.dataset.dir));
  host.querySelectorAll('[data-lens-speed]').forEach(select=>select.onchange=()=>{speeds[select.dataset.lensSpeed]=select.value;});
  $('[data-lens-keyboard]').onpointerdown=()=>{disableOnClick=enabled;};
  $('[data-lens-keyboard]').onclick=()=>{const disable=disableOnClick||enabled;disableOnClick=false;if(disable){disarm();return;}if(!ready()||moving())return;enabled=true;paint();pad.focus();};
  $('[data-lens-stop]').onclick=()=>{if(pending)stop();else if(context.projector)stop({projector:context.projector,stop:caps().stop});};
  pad.addEventListener('keydown',event=>{
    if(event.target!==pad||!enabled)return;
    if(event.key==='Escape'){event.preventDefault();disarm();return;}
    const direction=ARROWS[event.key];if(!direction)return;
    event.preventDefault();if(event.repeat||held||!ready()||moving())return;
    held=event.key;jog(...direction,true);
  });
  pad.addEventListener('keyup',event=>{if(event.target===pad&&ARROWS[event.key]&&event.key===held){event.preventDefault();release();}});
  pad.addEventListener('blur',disarm);
  const windowBlur=()=>disarm(),visibility=()=>{if(document.hidden)disarm();};
  window.addEventListener('blur',windowBlur);window.addEventListener('pagehide',windowBlur);document.addEventListener('visibilitychange',visibility);
  $('[data-lens-save]').onclick=async()=>{const name=$('[data-lens-preset-name]').value.trim();if(!name||!ready()||presetBusy)return;await presetAction(()=>onSave(name),$('[data-lens-save]'));};
  $('[data-lens-recall]').onclick=async()=>{const name=$('[data-lens-preset]').value;if(!name||!ready()||moving()||presetBusy)return;await presetAction(()=>onRecall(name),$('[data-lens-recall]'));};
  $('[data-lens-presets]').onclick=()=>onPresets();
  async function presetAction(action,button){presetBusy=true;buttonState(button,'sending');paint();try{await action();buttonState(button,button.textContent.includes('Confirm')?'confirmation':'acknowledged');}catch(error){buttonState(button,'error');feedback(error.message);}finally{presetBusy=false;paint();}}
  function paint(){
    const p=context.projector,c=caps(),available=!!ready(),busy=moving();
    $('[data-lens-target]').textContent=p?`${p.lane} · ${p.model||p.label}`:'No assigned projector';
    $('[data-lens-state]').textContent=!context.connected?'Relay disconnected':!p?'Unassigned · no controls':!(context.connection?.current ?? p.status?.online)?context.connection?.detail||'No current projector reply':context.lock?'Show lock on':c.axes.length?busy?'Lens command in progress':'Online · show lock off':'Lens jogging unsupported by this driver';
    host.querySelectorAll('[data-lens-axis]').forEach(button=>button.disabled=!available||busy||!c.axes.includes(button.dataset.lensAxis));
    const signature=JSON.stringify(c.speeds);if(signature!==speedSignature){speedSignature=signature;host.querySelectorAll('[data-lens-speed]').forEach(select=>{select.replaceChildren(...c.speeds.map(value=>new Option(SPEEDS[value],value)));const key=select.dataset.lensSpeed;if(!c.speeds.includes(speeds[key]))speeds[key]=c.speeds[0]||'slow';select.value=speeds[key];});}
    host.querySelectorAll('[data-lens-speed]').forEach(select=>select.disabled=!available||busy);
    $('[data-lens-keyboard]').disabled=!available||busy&&!enabled||!c.axes.includes('h')&&!c.axes.includes('v');$('[data-lens-keyboard]').textContent=enabled?'Disable arrow keys':'Enable arrow keys';$('[data-lens-keyboard]').setAttribute('aria-pressed',String(enabled));pad.dataset.enabled=String(enabled);
    $('[data-lens-keyboard-note]').textContent=enabled?`Arrow keys enabled for ${p?.lane} · shift only`:'Arrow keys off';
    $('[data-lens-stop]').hidden=!c.stop;$('[data-lens-stop]').disabled=!context.connected||!p?.status?.online||stopPending;
    $('[data-lens-semantics]').textContent=c.mode==='native-jog'?'One native jog per press. Fine / Normal / Coarse select supported motor speeds; this driver has no Stop command or absolute position readback.':c.mode==='bounded-step'?'One bounded step per press. Fine / Normal / Coarse use the driver’s supported increments; key release sends Stop while a command is pending.':'No supported lens movement metadata is available.';
    $('[data-lens-mapping]').textContent=p?`Image-direction mapping · H ${p.reverseH?'reversed':'normal'} · V ${p.reverseV?'reversed':'normal'} · mounting settings in Configuration`:'';
    const lens=p?.status?.lens,readback=$('[data-lens-readback]');readback.replaceChildren();
    if(c.positionReadback){const note=document.createElement('div');note.className='pj-lens-readback-label';note.textContent=context.connected&&(context.connection?.current ?? p?.status?.online)?'Reported native encoder positions':'Last reported native encoder positions';readback.append(note);for(const [axis,label]of[['h','H'],['v','V'],['focus','Focus'],['zoom','Zoom']]){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=Number.isFinite(lens?.[axis])?`${lens[axis]} · ${lens[axis+'State']||'motor state unknown'}`:'Position unavailable';row.append(dt,dd);readback.append(row);}}
    const presets=(context.presets||[]).filter(item=>item.perSlot?.[p?.slot]?.lens),select=$('[data-lens-preset]');const sig=JSON.stringify(presets.map(item=>item.name));if(sig!==presetSignature){presetSignature=sig;const previous=select.value;select.replaceChildren(new Option(presets.length?'Choose a rig lens preset':'No absolute lens preset for this unit',''),...presets.map(item=>new Option(item.name,item.name)));if(presets.some(item=>item.name===previous))select.value=previous;}
    const chosen=presets.find(item=>item.name===select.value);$('[data-lens-recall]').textContent=chosen?.confirm?'Confirm rig lens recall':'Recall rig preset';$('[data-lens-preset-result]').textContent=chosen?.result||(!p?.capabilities?.lensRecall?'Absolute lens recall is unsupported / not stored for this driver.':'Saved native positions are not an optical alignment guarantee.');
    $('[data-lens-save]').disabled=!available||busy||presetBusy;$('[data-lens-recall]').disabled=!available||busy||presetBusy||!chosen;select.disabled=presetBusy;
  }
  $('[data-lens-preset]').onchange=paint;
  paint();
  return {update(next){const old=context;context=next;const unsafe=!ready()||identity(old.projector)!==identity(next.projector)||old.projector?.lane!==next.projector?.lane;if(unsafe){enabled=false;held=null;if(pending){const target=pending;pending=null;if(old.projector?.slot!==next.projector?.slot||identity(old.projector)===identity(next.projector))stop(target);}}paint();},destroy(){disarm();window.removeEventListener('blur',windowBlur);window.removeEventListener('pagehide',windowBlur);document.removeEventListener('visibilitychange',visibility);}};
}
