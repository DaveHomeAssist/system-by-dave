import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CARDS, DISCIPLINES, VIEWER_COUNT, disciplineLabel, matches } from './splash';
import type { Card, Discipline } from './splash';

const ALL = 'All collections';
const COLLECTIONS = [ALL, ...new Set(CARDS.map(card => card.entry.collection))];
const FEATURED = CARDS.find(card => card.reference) || CARDS[0];
const inspectHref = (card: Card) => `/equipment-lab/?equipment=${encodeURIComponent(card.entry.inventoryId)}`;
const altFor = (card: Card) => card.image?.shared ? `Render of the ${card.entry.collection} assembly, which includes the ${card.entry.name}` : `Render of the ${card.entry.name} model`;

function noteFor(card: Card) {
  if (card.reference) return 'Reference model: its checklist closed with 58 passing and 2 not applicable. Geometry is approximate and physical dimensions are not calibrated.';
  if (card.generic) return 'Generic context model. It stands in for a class of equipment and does not represent a specific product.';
  if (card.practice) return 'Practice controls run locally in the existing viewer. Nothing here connects to or controls real equipment.';
  return 'Approximate model, shown in its existing viewer while its shared adapter is migrated. Inspecting it never operates hardware.';
}

function Flags({ card }: { card: Card }) {
  return <>
    {card.reference && <span className="splash-flag reference">Reference</span>}
    {card.native && <span className="splash-flag native">3D here</span>}
    {card.practice && <span className="splash-flag practice">Practice</span>}
    {card.generic && <span className="splash-flag generic">Generic</span>}
  </>;
}

function Window({ card, alt = '' }: { card: Card; alt?: string }) {
  if (!card.image) return <span className="splash-window pending"><span><b>{card.entry.inventoryId}</b>Render pending</span></span>;
  return <span className="splash-window">
    <img src={card.image.src} alt={alt} loading="lazy" decoding="async" width={720} height={411} style={{ objectPosition: card.image.pos }} />
    {card.image.shared && <span className="splash-in">In {card.entry.collection}</span>}
  </span>;
}

export function Splash() {
  const root = useRef<HTMLElement>(null), sheet = useRef<HTMLElement>(null), trigger = useRef<HTMLElement | null>(null);
  const [discipline, setDiscipline] = useState<Discipline>('all');
  const [collection, setCollection] = useState(ALL);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(FEATURED.entry.inventoryId);
  const [overlay, setOverlay] = useState(false);
  const [open, setOpen] = useState(false);

  const inDiscipline = (card: Card, id: Discipline = discipline) => id === 'all' || card.discipline === id;
  const inCollection = (card: Card, name = collection) => name === ALL || card.entry.collection === name;
  const visible = CARDS.filter(card => inDiscipline(card) && inCollection(card) && matches(card, query));
  const card = CARDS.find(item => item.entry.inventoryId === selected)!;
  const others = card.members.filter(entry => entry.inventoryId !== card.entry.inventoryId).map(entry => CARDS.find(item => item.entry === entry)!);

  // The bench sheet is a column on wide layouts and a modal overlay on narrow ones.
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setOverlay(entry.contentRect.width < 960));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (!overlay) setOpen(false); }, [overlay]);
  useEffect(() => {
    if (!open) return;
    sheet.current?.querySelector<HTMLElement>('button, a[href]')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab' || !sheet.current) return;
      const items = [...sheet.current.querySelectorAll<HTMLElement>('button, a[href]')];
      const first = items[0], last = items[items.length - 1];
      if (!sheet.current.contains(document.activeElement)) { event.preventDefault(); first?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  function choose(next: Card, from: HTMLElement) {
    setSelected(next.entry.inventoryId);
    if (overlay) { trigger.current = from; setOpen(true); }
  }
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function showSibling(next: Card) {
    setSelected(next.entry.inventoryId);
    requestAnimationFrame(() => sheet.current?.querySelector<HTMLElement>('#splash-sheet-title')?.focus());
  }
  function reset() { setDiscipline('all'); setCollection(ALL); setQuery(''); }
  function onTabKey(event: ReactKeyboardEvent) {
    const step = ({ ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 } as Record<string, number>)[event.key];
    if (step === undefined && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const ids = DISCIPLINES.map(item => item.id);
    const current = ids.indexOf(discipline);
    const next = ids[event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 : (current + step + ids.length) % ids.length];
    setDiscipline(next);
    root.current?.querySelector<HTMLElement>(`#splash-tab-${next}`)?.focus();
  }

  const groups = discipline === 'all'
    ? DISCIPLINES.slice(1).map(group => ({ id: group.id, label: group.label, cards: visible.filter(item => item.discipline === group.id) })).filter(group => group.cards.length)
    : [{ id: discipline, label: '', cards: visible }];

  return <section ref={root} className="lab-splash" aria-labelledby="splash-title" data-overlay={overlay ? '' : undefined}>
    <div className="splash-layout">
      <div className="splash-rail">
        <p className="splash-eyebrow" id="splash-disciplines">Discipline</p>
        <div className="splash-tabs" role="tablist" aria-labelledby="splash-disciplines" onKeyDown={onTabKey}>
          {DISCIPLINES.map(item => {
            const on = item.id === discipline, count = CARDS.filter(entry => inDiscipline(entry, item.id) && inCollection(entry)).length;
            return <button key={item.id} id={`splash-tab-${item.id}`} type="button" role="tab" aria-selected={on} aria-controls="splash-results" tabIndex={on ? 0 : -1} data-count={count} onClick={() => setDiscipline(item.id)}>
              <span className="long">{item.label}</span><span className="short" aria-hidden="true">{item.short}</span><span className="splash-count">{count}</span>
            </button>;
          })}
        </div>
        <dl className="splash-key">
          <div><dt><span className="splash-flag practice">Practice</span></dt><dd>Local practice controls</dd></div>
          <div><dt><span className="splash-flag reference">Reference</span></dt><dd>Meets the full model standard</dd></div>
          <div><dt><span className="splash-flag generic">Generic</span></dt><dd>Stands in for a class of gear</dd></div>
        </dl>
        <p className="splash-foot">Previews are renders of approximate 3D models, not product photographs.</p>
      </div>

      <div className="splash-main">
        <header className="splash-intro">
          <div className="splash-copy">
            <p className="splash-eyebrow">Model library</p>
            <h2 id="splash-title">Inspect the gear before you touch it.</h2>
            <p className="splash-lede">Audio, DJ, lighting, video and camera gear, modeled in 3D. Choose a model to see where it opens. Selecting equipment never operates hardware.</p>
            <p className="splash-stats">
              <span><b>{CARDS.length}</b>entries</span>
              <span><b>{VIEWER_COUNT}</b>viewers</span>
              <span><b>{CARDS.filter(item => item.practice).length}</b>with practice</span>
              <span><b>{CARDS.filter(item => item.reference).length}</b>reference model</span>
            </p>
          </div>
          <figure className="splash-featured">
            {FEATURED.image && <img src={FEATURED.image.src} alt={altFor(FEATURED)} style={{ objectPosition: FEATURED.image.pos }} />}
            <figcaption>
              <span className="splash-featured-text">
                <span className="splash-eyebrow">Reference model</span>
                <button type="button" className="splash-featured-name" onClick={event => choose(FEATURED, event.currentTarget)}>
                  <span className="splash-tag">{FEATURED.entry.inventoryId}</span>{FEATURED.entry.name}
                </button>
              </span>
              <a className="splash-primary small" href={inspectHref(FEATURED)}>Inspect in 3D</a>
            </figcaption>
          </figure>
        </header>

        <div className="splash-toolbar">
          <label className="splash-search"><span>Find equipment</span>
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, maker, role or tag" autoComplete="off" spellCheck={false} />
          </label>
          <div className="splash-chips" role="group" aria-label="Collection">
            {COLLECTIONS.map(name => {
              const count = CARDS.filter(item => inDiscipline(item) && inCollection(item, name) && matches(item, query)).length;
              return <button key={name} type="button" aria-pressed={name === collection} disabled={!count && name !== collection} onClick={() => setCollection(name)}>{name}<span className="splash-count">{count}</span></button>;
            })}
          </div>
          <p className="splash-status" role="status">{visible.length} of {CARDS.length} entries</p>
        </div>

        <div className="splash-results" id="splash-results" role="tabpanel" aria-labelledby={`splash-tab-${discipline}`} tabIndex={0} data-web2-scroll>
          {visible.length ? <ul className="splash-grid">
            {groups.map(group => [
              group.label ? <li key={`head-${group.id}`} className="splash-group"><h3>{group.label}</h3><span className="splash-count">{group.cards.length}</span></li> : null,
              ...group.cards.map(item => <li key={item.entry.inventoryId}>
                <button type="button" className="splash-card" aria-pressed={item.entry.inventoryId === selected} onClick={event => choose(item, event.currentTarget)}>
                  <Window card={item} />
                  <span className="splash-body">
                    <span className="splash-id"><span className="splash-tag">{item.entry.inventoryId}</span><span>{item.entry.collection}</span></span>
                    <span className="splash-name">{item.entry.name}</span>
                    <span className="splash-role">{item.entry.role}</span>
                    <span className="splash-flags"><Flags card={item} /></span>
                  </span>
                </button>
              </li>),
            ])}
          </ul> : <div className="splash-empty">
            <p>No equipment matches. Try a shorter name, another discipline or all collections.</p>
            <button type="button" onClick={reset}>Show all equipment</button>
          </div>}
        </div>
      </div>

      {(!overlay || open) && <>
        {overlay && <div className="splash-scrim" onClick={close} />}
        <aside ref={sheet} className="splash-sheet" aria-labelledby="splash-sheet-title" {...(overlay ? { role: 'dialog', 'aria-modal': true } : {})}>
          <div className="splash-sheet-head">
            <p className="splash-eyebrow">Selected equipment</p>
            {overlay && <button type="button" className="splash-close" onClick={close} aria-label="Close selected equipment">×</button>}
          </div>
          <Window card={card} alt={altFor(card)} />
          <p className="splash-id"><span className="splash-tag">{card.entry.inventoryId}</span><span>{card.entry.collection}</span></p>
          {(card.reference || card.native || card.practice || card.generic) && <p className="splash-flags"><Flags card={card} /></p>}
          <h3 id="splash-sheet-title" tabIndex={-1}>{card.entry.name}</h3>
          <p className="splash-role">{card.entry.role}</p>
          <dl className="splash-facts">
            <dt>Discipline</dt><dd>{disciplineLabel(card.discipline)}</dd>
            <dt>Opens in</dt><dd>{card.native ? 'Equipment Lab 3D inspector' : card.members.length > 1 ? `Shared ${card.entry.collection} viewer · ${card.members.length} entries` : 'Its own existing viewer'}</dd>
            <dt>Geometry</dt><dd>{card.generic ? 'Generic context; exact model unknown' : 'Approximate'}</dd>
          </dl>
          <div className="splash-actions">
            {card.native
              ? <a className="splash-primary" href={inspectHref(card)}>Inspect in 3D</a>
              : <>
                <a className="splash-primary" href={card.entry.viewUrl} target="_blank" rel="noopener noreferrer">Open model viewer<span className="splash-hidden"> (opens in a new tab)</span></a>
                <a className="splash-secondary" href={inspectHref(card)}>Equipment Lab reference</a>
              </>}
          </div>
          {others.length > 0 && <section className="splash-siblings" aria-labelledby="splash-siblings-title">
            <p className="splash-eyebrow" id="splash-siblings-title">Same assembly</p>
            <ul>{others.map(item => <li key={item.entry.inventoryId}><button type="button" onClick={() => showSibling(item)}><span className="splash-tag">{item.entry.inventoryId}</span><span>{item.entry.name}</span></button></li>)}</ul>
          </section>}
          <p className="splash-note">{noteFor(card)}</p>
        </aside>
      </>}
    </div>
  </section>;
}
