import { lazy, Suspense, useState } from 'react';
import type { Pack, PackHost, PackDef } from '../../shared/av-console/pack';
import { download } from '../../shared/av-console/pack';
import { CATALOG, CONTROLS, DEFAULT_VIEWS, ENTRIES, HEAD_IDS, LIBRARY, initialSelection } from './model';
import type { Entry } from './model';
const Viewer = lazy(() => import('./Viewer'));
const PACKAGE = '/equipment-lab/data/models/cartoni.maxima30.reference/';
function External({ href, children }: { href: string; children: React.ReactNode }) { return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>; }
function Library({ selected, choose }: { selected: Entry; choose: (entry: Entry) => void }) {
  const [query, setQuery] = useState(''), [group, setGroup] = useState('All equipment');
  const rows = ENTRIES.filter(entry => (group === 'All equipment' || group === entry.collection) && `${entry.name} ${entry.role} ${entry.inventoryId}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="lab-library"><div className="lab-filter"><label>Find equipment<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, manufacturer or assembly" /></label><label>Collection<select value={group} onChange={event => setGroup(event.target.value)}>{['All equipment', ...new Set(ENTRIES.map(entry => entry.collection))].map(name => <option key={name}>{name}</option>)}</select></label><p role="status">{rows.length} of {ENTRIES.length} entries</p></div><div className="lab-list" data-web2-scroll tabIndex={0} aria-label="Equipment results">{rows.length ? rows.map(entry => <button className="lab-card" key={entry.inventoryId} aria-pressed={entry.inventoryId === selected.inventoryId} onClick={() => choose(entry)}><small>{entry.collection} · {entry.inventoryId}</small><strong>{entry.name}</strong><span>{entry.geometryConfidence === 'generic' ? 'Generic context' : entry.inventoryId === 'C02' ? '3D reference available here' : 'Existing interactive model'}</span></button>) : <p>No matching equipment. Try a shorter name or another collection.</p>}</div></section>;
}
export function useEquipmentLabPack(host: PackHost): Pack {
  const [selection, setSelection] = useState(initialSelection), [status, setStatus] = useState('Choose equipment to inspect. Model selection does not operate hardware.');
  const [problem, setProblem] = useState(false);
  const [views, setViews] = useState(DEFAULT_VIEWS);
  const { entry, component } = selection;
  const selectedControl = CONTROLS.find(control => control.id === component) || CONTROLS[0];
  const notify = (text: string, error = false) => { setStatus(text); setProblem(error); host.notify(text, error); };
  function choose(next: Entry, control = component) {
    setSelection({ entry: next, component: control, issue: '' });
    const url = new URL(location.href); url.searchParams.set('equipment', next.inventoryId); if (next.inventoryId === 'C02') url.searchParams.set('component', control); else url.searchParams.delete('component'); history.replaceState(history.state, '', url);
    notify(`${next.name} selected. ${next.geometryConfidence === 'generic' ? 'Generic context model.' : 'Illustrative geometry; physical accuracy remains separately evidenced.'}`);
  }
  function Inspector() {
    return <section className="lab-inspector"><div className="lab-heading"><small>{entry.collection} · {entry.inventoryId}</small><h2>{entry.name}</h2>{selection.issue && <p role="alert">{selection.issue}</p>}</div>{entry.inventoryId === 'C02' ? <><Suspense fallback={<p role="status">Preparing 3D viewer…</p>}><Viewer selected={component} onSelect={id => choose(entry, id)} /></Suspense><div className="lab-control"><label>Control<select value={component} onChange={event => choose(entry, event.target.value)}>{CONTROLS.map(control => <option key={control.id} value={control.id}>{control.label}</option>)}</select></label><p>{selectedControl.purpose}</p></div></> : <div className="lab-copy" data-web2-scroll tabIndex={0}><p>{entry.role}</p>{entry.notes && <p>{entry.notes}</p>}<p>{entry.geometryConfidence === 'generic' ? 'This is a generic context model. Exact hardware identity and dimensions are not established.' : 'Inspect this model in its existing viewer while its shared library adapter is migrated.'}</p><External href={entry.viewUrl}>Open {entry.name}</External></div>}</section>;
  }
  function Practice() {
    return <section className="lab-copy" data-web2-scroll tabIndex={0}><small>{entry.inventoryId} · LOCAL PRACTICE</small><h2>{entry.name}</h2>{entry.inventoryId === 'C02' ? <><p>Use the full camera rig for the existing balance walkthrough. Its Panasonic body is generic, and the balance behavior is illustrative.</p><h3>{selectedControl.label}</h3><p>{selectedControl.action}</p><External href={entry.viewUrl.replace(/#.*$/, '#' + component)}>Open camera rig practice</External><p>No payload weight, center of gravity or counterbalance number is prescribed for an unknown camera build.</p></> : <><p>{entry.role}</p><p>Supported practice remains with the equipment's existing viewer. Opening or selecting equipment sends no hardware commands.</p><External href={entry.viewUrl}>Open existing model</External></>}</section>;
  }
  function Reference() {
    return <section className="lab-copy" data-web2-scroll tabIndex={0}><small>{entry.collection} · {entry.inventoryId}</small><h2>{entry.name}</h2><dl><dt>Model scope</dt><dd>{entry.geometryConfidence === 'generic' ? 'Generic context, exact model unknown' : 'Approximate inspection geometry'}</dd><dt>Source</dt><dd>{entry.source.repository}</dd><dt>Source revision</dt><dd><code>{entry.source.revision.slice(0,12)}</code></dd></dl>{entry.inventoryId === 'C02' ? <><p>The original Ion reference package passed 58 checks with 2 not applicable. Its physical dimensions, fit and real counterbalance remain unverified.</p><ul><li><a href={PACKAGE + 'cartoni.maxima30.inspection.glb'} download>Download Cartoni GLB</a></li><li><a href={PACKAGE + 'cartoni.maxima30.definition.json'} download>Download control definition</a></li><li><a href={PACKAGE + 'checklist.html'} target="_blank" rel="noopener noreferrer">Read reference checklist</a></li><li><External href="https://www.cartoni.com/wp-content/uploads/ProductDocuments/FluidHeads/Cartoni_FluidHeads_HM3100_Maxima30_UserManual.pdf">Cartoni Maxima 30 manual</External></li></ul><p>All {HEAD_IDS.length} existing head control IDs are preserved.</p></> : <><p>The model is registered in the shared library. Its native adapter and individual qualification remain part of the migration.</p><External href={entry.viewUrl}>Open model and its sources</External></>}<p>The family contains 43 equipment and accessory entries. Several share one procedural assembly.</p></section>;
  }
  return {
    id: 'equipment-lab', label: 'Equipment Lab', title: entry.name, summary: '43 entries · shared equipment reference', dirty: false, blocked: false,
    save: () => notify('Equipment reference is read only. Selection is included in the page link.'), exportDoc: () => download('equipment-lab-catalog.json', JSON.stringify(CATALOG,null,2)),
    status, problem, notify, recovery: { offer: null, restore: () => {}, discard: () => {}, errors: [] },
    render: type => ({ body: <div className="equipment-lab-native">{type === 'library' ? <Library selected={entry} choose={next => { choose(next); host.show('inspector'); }} /> : type === 'inspector' ? Inspector() : type === 'practice' ? Practice() : Reference()}</div> }),
    quick: LIBRARY.map(panel => ({ type: panel.type, label: ({library:'Library',inspector:'Inspect',practice:'Practice',reference:'Reference'} as Record<string,string>)[panel.type] })), library: LIBRARY, views, storeViews: next => { setViews(next); notify('Arrangement retained for this visit. Use the AV workspace to save it across visits.'); },
  };
}
export const equipmentLabPack: PackDef = { id: 'equipment-lab', label: 'Equipment Lab', consoleId: 'equipment-lab', library: LIBRARY, defaultViews: DEFAULT_VIEWS, use: useEquipmentLabPack };
