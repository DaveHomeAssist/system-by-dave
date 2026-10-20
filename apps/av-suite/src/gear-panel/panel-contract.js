// Public, versioned UI-only contract. No fixture output or show data crosses it.
export const PANEL_PROTOCOL = 'avbydave.gear-panel';
export const PANEL_VERSION = 1;
export const EQUIPMENT_ID = 'etc-ion-universal-2x20';
export const EQUIPMENT_TYPES=Object.freeze({ion:EQUIPMENT_ID,wing:EQUIPMENT_ID,smartfade1248:'etc-smartfade-1248'});
export const HOST_ORIGINS = ['https://avbydave.com', 'https://www.avbydave.com'];
const finite = (n, lo, hi) => typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function validEnvelope(value) {
 return object(value) && value.protocol === PANEL_PROTOCOL && value.version === PANEL_VERSION &&
  typeof value.session === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(value.session) && typeof value.type === 'string';
}
export function normalizeViewState(input, components, equipment=EQUIPMENT_ID) {
 if (!object(input) || input.version !== 1 || input.equipment !== equipment) return null;
 const state = {version:1,equipment};
 if ((equipment==='etc-smartfade-1248'?['smartfade1248']:['combined','ion','wing']).includes(input.assembly)) state.assembly = input.assembly;
 if (typeof input.selected === 'string' && Object.hasOwn(components,input.selected)) state.selected = input.selected;
 for (const key of ['photo','inspector','index']) if (typeof input[key] === 'boolean') state[key] = input[key];
 if (['orbit','adjust'].includes(input.interaction)) state.interaction = input.interaction;
 const c = input.camera;
 if (object(c) && finite(c.yaw,-1000,1000) && finite(c.pitch,.16,1.55) && finite(c.distance,.15,4) &&
  Array.isArray(c.target) && c.target.length===3 && c.target.every(n=>finite(n,-5,5))) {
  state.camera={yaw:c.yaw,pitch:c.pitch,distance:c.distance,target:[...c.target]};
  if(finite(c.aspect,.05,20))state.camera.aspect=c.aspect;
 }
 if (object(input.levels)) {
  state.levels={};
  for(const [id,level] of Object.entries(input.levels).slice(0,200))
   if(Object.hasOwn(components,id) && components[id].kind==='Fader' && finite(level,0,100)) state.levels[id]=Math.round(level);
 }
 return state;
}
