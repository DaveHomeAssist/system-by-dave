import {PANEL_PROTOCOL,PANEL_VERSION,EQUIPMENT_ID,validEnvelope} from './panel-contract.js';
export const ION_VIEWER_ORIGIN='https://ion-workbench.davein4k.chatgpt.site';

// Shared by the preview and the React workspace adapter. Handshake, not iframe
// load, establishes readiness; a sign-in/error page can also fire load.
export function mountGearPanel({container,src=new URL('/',ION_VIEWER_ORIGIN).href,initialState,onState=()=>{},onStatus=()=>{},theme='dark',timeoutMs=15000}) {
 const url=new URL(src,location.href);
 if(![location.origin,ION_VIEWER_ORIGIN].includes(url.origin))throw Error('Unsupported gear viewer origin.');
 url.searchParams.set('sbdEmbed','panel');
 const session='gear_'+crypto.randomUUID().replaceAll('-','');
 const frame=document.createElement('iframe');frame.className='gear-panel-frame';frame.title='ETC Ion and Universal 2×20 3D viewer';
 frame.allow='fullscreen';frame.referrerPolicy='strict-origin-when-cross-origin';
 const feedback=document.createElement('div');feedback.className='gear-panel-feedback';feedback.setAttribute('role','status');
 const message=document.createElement('span');
 const retry=document.createElement('button');retry.type='button';retry.textContent='Retry viewer';
 const full=document.createElement('a');full.textContent='Open full viewer';full.target='_blank';full.rel='noopener noreferrer';
 const fullURL=new URL(url);fullURL.searchParams.delete('sbdEmbed');full.href=fullURL.href;
 feedback.append(message,retry,full);container.append(frame,feedback);
 let ready=false,disposed=false,lastState=initialState,lastTheme=theme,poll,timer;
 const send=(type,extra={})=>frame.contentWindow?.postMessage({protocol:PANEL_PROTOCOL,version:PANEL_VERSION,session,type,...extra},url.origin);
 const report=(state,text)=>{container.dataset.gearStatus=state;message.textContent=text;feedback.hidden=state==='ready';retry.hidden=state==='loading';onStatus(state,text);};
 const clear=()=>{clearInterval(poll);clearTimeout(timer);};
 const handshake=()=>{
  clear();ready=false;report('loading','Opening 3D viewer…');
  const hello=()=>send('connect',{state:lastState,theme:lastTheme});hello();poll=setInterval(hello,750);
  timer=setTimeout(()=>{clear();report('unavailable','Viewer has not connected. Open the full viewer to check access, then retry.');},timeoutMs);
 };
 const receive=event=>{
  const msg=event.data;
  if(disposed||event.source!==frame.contentWindow||event.origin!==url.origin||!validEnvelope(msg)||msg.session!==session||msg.equipment!==EQUIPMENT_ID)return;
  if(!['ready','state'].includes(msg.type)||!msg.state||msg.state.version!==1||msg.state.equipment!==EQUIPMENT_ID)return;
  if(msg.type==='ready'){ready=true;clear();report('ready','Viewer connected.');}
  if(!ready)return;
  lastState=msg.state;onState(msg.state);
 };
 frame.addEventListener('load',handshake);window.addEventListener('message',receive);
 retry.onclick=()=>{frame.src=url.href;handshake();};
 frame.src=url.href;handshake();
 return {
  command(type,payload={}){if(ready&&['select','focus','reset'].includes(type))send(type,payload);},
  restore(state){lastState=state;if(ready)send('restore',{state});},
  setTheme(value){lastTheme=value;if(ready)send('theme',{theme:value});},
  getState(){return lastState;},
  dispose(){if(disposed)return;disposed=true;clear();window.removeEventListener('message',receive);frame.removeEventListener('load',handshake);frame.remove();feedback.remove();delete container.dataset.gearStatus;}
 };
}
