// Existing Lighting normalization and PlotForge mapping, extracted without schema changes.
export const KEY = 'sbd.avLighting.v1';
export const SCHEMA = 'system-by-dave.av-lighting.v1';
export const LEGACY = 'system-by-dave.lighting-patch.v1';
export const PLOTFORGE_KIND = 'plotforge-interop-manifest';
// A Lighting backup repeats mapped fixture fields alongside its source manifest.
export const MAX_IMPORT_BYTES = 12_000_000;
export const MAX_MANIFEST_CHARS = 1_500_000;
export const FIELDS = ['unit','fixture','position','mode','universe','address','channel','dimmer','color','focus','status','notes'];
export const STATUSES = ['planned','hung','addressed','patched','focused','issue','spare'];
export const blank = () => ({ schema:SCHEMA, meta:{showName:'Untitled lighting plan',venue:'',lead:''}, items:[] });
export const fixture = raw => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('A fixture record is invalid.');
  const item = {id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID()};
  for (const field of FIELDS) item[field] = typeof raw[field] === 'string' ? raw[field].slice(0, field === 'notes' ? 2000 : 500) : '';
  if (typeof raw.sourceId === 'string' && raw.sourceId) item.sourceId = raw.sourceId.slice(0, 100);
  if (!STATUSES.includes(item.status)) item.status = 'planned';
  return item;
};
export const plotForgeManifest = raw => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.kind !== PLOTFORGE_KIND || raw.schemaVersion !== 1) throw new Error('Use a PlotForge interop manifest version 1.');
  if (!raw.show || typeof raw.show.name !== 'string' || !Array.isArray(raw.positions) || !Array.isArray(raw.commentPins) || !Array.isArray(raw.fixtures) || !raw.fixtures.length || raw.fixtures.length > 1000) throw new Error('PlotForge manifest must contain 1–1,000 fixtures and its show, positions and comment pins.');
  if (typeof raw.generatedAt !== 'string' || JSON.stringify(raw).length > MAX_MANIFEST_CHARS) throw new Error('PlotForge manifest is missing provenance or exceeds the import size limit.');
  const ids = new Set();
  for (const row of raw.fixtures) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.id !== 'string' || !row.id || row.id.length > 100 || ids.has(row.id)) throw new Error('PlotForge fixture IDs must be unique nonempty strings.');
    ids.add(row.id);
    if (row.dmx != null && (typeof row.dmx !== 'object' || Array.isArray(row.dmx))) throw new Error(`PlotForge fixture ${row.id} has an invalid DMX assignment.`);
    for (const value of [row.dmx?.universe, row.dmx?.address]) if (value != null && (!Number.isInteger(value) || value < 1)) throw new Error(`PlotForge fixture ${row.id} has an invalid DMX assignment.`);
  }
  return raw;
};
export const validate = raw => {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items) || raw.items.length > 1000) throw new Error('Expected a plan with up to 1,000 fixtures.');
  if (raw.schema && raw.schema !== SCHEMA && raw.schema !== LEGACY) throw new Error('This file uses an unsupported schema.');
  const ids = new Set();
  const items = raw.items.map(fixture);
  for (const item of items) { if (ids.has(item.id)) item.id = crypto.randomUUID(); ids.add(item.id); }
  const source = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
  const result = {schema:SCHEMA,meta:{showName:String(source.showName || 'Untitled lighting plan').slice(0,120),venue:String(source.venue || '').slice(0,120),lead:String(source.lead || '').slice(0,80)},items};
  if (raw.plotforgeSource !== undefined) result.plotforgeSource = plotForgeManifest(raw.plotforgeSource);
  return result;
};
export const fromPlotForge = source => {
  const manifest = plotForgeManifest(source);
  let needsWork = 0, unknownStatuses = 0;
  const items = manifest.fixtures.map(row => {
    let status = row.status;
    if (status === 'needs_work') { status = 'issue'; needsWork++; }
    else if (!STATUSES.includes(status)) { status = 'planned'; unknownStatuses++; }
    const focus = Number.isFinite(row.focus?.xMm) && Number.isFinite(row.focus?.yMm) ? `x ${row.focus.xMm} mm, y ${row.focus.yMm} mm` : '';
    return {id:row.id,sourceId:row.id,unit:row.unitNumber == null ? '' : String(row.unitNumber),fixture:row.profileName || '',position:row.positionName || '',mode:row.mode || '',universe:row.dmx?.universe == null ? '' : String(row.dmx.universe),address:row.dmx?.address == null ? '' : String(row.dmx.address),channel:row.channel == null ? '' : String(row.channel),dimmer:row.dimmer || '',color:row.color || '',focus,status,notes:row.notes?.crew || ''};
  });
  const plan = validate({schema:SCHEMA,meta:{showName:manifest.show.name,venue:manifest.show.metadata?.venue || '',lead:''},items,plotforgeSource:manifest});
  return {plan,needsWork,unknownStatuses};
};

export function conflicts(plan) { const counts = new Map(); for (const item of plan.items) { const key = addressKey(item); if (key) counts.set(key,(counts.get(key)||0)+1); } return counts; }
export function addressKey(item) {
  if (item.status === 'spare') return '';
  const normalize = value => { const text=value.trim(); return /^\d+$/.test(text) ? String(BigInt(text)) : text; };
  const universe=normalize(item.universe), address=normalize(item.address);
  return universe && address ? `${universe}:${address}` : '';
}
export function hasConflict(item,map) { const key=addressKey(item); return !!key && map.get(key)>1; }
