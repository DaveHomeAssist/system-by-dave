import {createStageView} from './stage-view.js';
const root=document.querySelector('#tab-stage');createStageView(root,()=>{},()=>false,{plotUrl:'/stage/plot.json',venueUrl:'/stage/venue.json',referenceOnly:true});
const cameras=new Set(['Projectors','Coverage','Plan','Selected side']);
root.addEventListener('click',event=>{const button=event.target.closest('.pj-stage-camera button');if(!button||!cameras.has(button.textContent.trim()))return;for(const peer of button.parentElement.querySelectorAll('button'))if(cameras.has(peer.textContent.trim()))peer.setAttribute('aria-pressed',String(peer===button));});
