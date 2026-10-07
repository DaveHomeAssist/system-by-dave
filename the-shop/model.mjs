export const KEY = 'sbd.shop.v1';
export const SCHEMA = 'system-by-dave.shop.v1';
export const SOURCES = Object.freeze({
  'gear-prep': {key:'gear-prep.v1', label:'Gear Prep', schema:'system-by-dave.gear-prep.v1'},
  'truck-pack': {key:'truck-pack.v1', label:'Truck Pack Plan', schema:'system-by-dave.truck-pack.v1'},
  'load-in-plan': {key:'load-in-plan.v1', label:'Load In Plan', schema:'system-by-dave.load-in-plan.v1'},
  'strike-plan': {key:'strike-plan.v1', label:'Strike Plan', schema:'system-by-dave.strike-plan.v1'}
});
export const PHASES = ['prep','pack','load in','strike'];
export const STATUSES = ['queued','working','ready','hold'];
const field = (value, length=240) => String(value ?? '').slice(0,length);
export function emptyPlan() { return {schema:SCHEMA,name:'Untitled shop plan',items:[]}; }
export function validatePlan(value) {
  if (!value || value.schema !== SCHEMA || !Array.isArray(value.items) || value.items.length > 2000) throw new Error('Unsupported or damaged Shop plan. Export the original data before continuing.');
  const ids = new Set();
  const items = value.items.map(item => {
    if (!item || typeof item !== 'object' || !item.id || ids.has(item.id) || !String(item.title ?? '').trim() || !PHASES.includes(item.phase) || !STATUSES.includes(item.status)) throw new Error('A Shop row is invalid or duplicated.');
    ids.add(item.id);
    return {id:field(item.id,100),title:field(item.title),caseId:field(item.caseId,120),department:field(item.department,80),owner:field(item.owner,120),location:field(item.location),destination:field(item.destination),notes:field(item.notes,2000),blocker:field(item.blocker,1000),phase:item.phase,status:item.status,source:item.source || null,original:item.original ?? null};
  });
  return {schema:SCHEMA,name:field(value.name,120),items};
}
export function stageLegacy(kind, payload) {
  const spec = SOURCES[kind];
  if (!spec) throw new Error('Unsupported source.');
  if (!payload || payload.schema !== spec.schema || !Array.isArray(payload.items) || payload.items.length > 2000) throw new Error(`This is not a supported ${spec.label} export.`);
  return payload.items.map((original, index) => {
    if (!original || typeof original !== 'object' || Array.isArray(original)) throw new Error(`Source row ${index+1} is invalid.`);
    const title = field(original.item || original.contents || original.caseId).trim();
    if (!title) throw new Error(`Source row ${index+1} has no item or case name.`);
    const phase = kind === 'truck-pack' ? 'pack' : kind === 'load-in-plan' ? 'load in' : kind === 'strike-plan' ? 'strike' : 'prep';
    const status = ['issue','missing','hold'].includes(original.status) || original.blocker || original.issue ? 'hold' : ['strapped','loaded','returned','built','checked','tested'].includes(original.status) ? 'ready' : 'queued';
    return {id:crypto.randomUUID(),title,caseId:field(original.caseId,120),department:field(original.department || original.category,80),owner:field(original.owner,120),location:field(original.location || original.truckZone),destination:field(original.destination || original.dock),notes:field(original.notes,2000),blocker:field(original.blocker || original.issue,1000),phase,status,source:{kind,id:field(original.id,120),show:field(payload.meta?.showName,120)},original:structuredClone(original)};
  });
}
