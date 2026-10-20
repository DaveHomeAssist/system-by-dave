export const KEY = 'sbd.infrastructure.v1';
export const SCHEMA = 'system-by-dave.infrastructure.v1';
export const TYPES = {
  power: { title: 'Power', legacy: 'system-by-dave.power-plan.v1', field: 'circuits', label: 'circuit', status: ['planned','ready','issue'] },
  network: { title: 'Network', legacy: 'system-by-dave.network-plan.v1', field: 'devices', label: 'device', status: ['planned','online','issue'] },
  cable: { title: 'Cable', legacy: 'system-by-dave.cable-plan.v1', field: 'items', label: 'cable', status: ['planned','pulled','tested','issue'] }
};
export function blank(){ return {schema:SCHEMA, name:'Untitled infrastructure plan', records:[], legacySources:[]}; }
export function validPlan(value){
  if (!value || value.schema !== SCHEMA || typeof value.name !== 'string' || !Array.isArray(value.records) || !Array.isArray(value.legacySources)) throw new Error('Unsupported infrastructure document');
  if (value.records.length > 2000 || value.legacySources.length > 100) throw new Error('Document exceeds the supported size');
  for (const row of value.records) {
    if (!row || !TYPES[row.type] || typeof row.id !== 'string' || !row.id || typeof row.name !== 'string' || typeof row.status !== 'string' || !row.status.trim()) throw new Error('Invalid infrastructure record');
    for (const field of ['location','issue','capacity','draw','ip','vlan','source','destination']) if (row[field] !== undefined && typeof row[field] !== 'string') throw new Error(`Invalid ${field} field`);
    if (row.sourceRecord !== undefined && (!row.sourceRecord || typeof row.sourceRecord !== 'object' || Array.isArray(row.sourceRecord))) throw new Error('Invalid original record');
  }
  return value;
}
export function legacyPreview(value){
  if (!value || typeof value !== 'object') throw new Error('Invalid JSON document');
  const entry = Object.entries(TYPES).find(([,type]) => value.schema === type.legacy);
  if (!entry) throw new Error('Unsupported legacy schema');
  const [kind,type] = entry;
  if (!Array.isArray(value[type.field]) || value[type.field].length > 500) throw new Error('Invalid legacy records');
  const records = value[type.field].map((sourceRecord,index) => {
    if (!sourceRecord || typeof sourceRecord !== 'object' || Array.isArray(sourceRecord)) throw new Error('Invalid legacy record');
    return {id:`${kind}-${crypto.randomUUID()}`, type:kind, name:String(sourceRecord[type.label] || `${type.title} ${index + 1}`), location:String(sourceRecord.location || sourceRecord.zone || sourceRecord.path || ''), status:String(sourceRecord.status || 'planned'), issue:String(sourceRecord.issue || (sourceRecord.status === 'issue' ? sourceRecord.notes || '' : '')), sourceRecord:structuredClone(sourceRecord)};
  });
  return {kind, records, original:structuredClone(value)};
}
export function mergeLegacy(plan,preview){
  validPlan(plan);
  return validPlan({...plan, records:[...plan.records,...preview.records], legacySources:[...plan.legacySources,preview.original]});
}
export function issueFor(row){ const capacity=Number(row.capacity ?? row.sourceRecord?.capacity); const draw=Number(row.draw ?? row.sourceRecord?.draw); if(row.type==='power' && capacity>0 && draw>capacity) return `Draw ${draw} A exceeds ${capacity} A capacity`; return row.issue?.trim() || (row.status==='issue' ? 'Marked issue' : ''); }
export function counts(records){return {total:records.length, issues:records.filter(issueFor).length, ready:records.filter(row => ['ready','online','tested'].includes(row.status)).length};}
