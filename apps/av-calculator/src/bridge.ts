type Pager = { refresh: () => void; destroy: () => void; reveal: (element: Element) => void };
declare global { interface Window { AVViewport: { paginate: (card: HTMLElement, items: HTMLElement, options: { units: HTMLElement[] | (() => HTMLElement[]); label: string; hiddenClass: string; navClass: string; beforeMeasure?: (available: number) => void }) => Pager } } }
export const nodes = new Map<string, HTMLElement>();
export const pagers = new Map<string, Pager>();
export let parking: HTMLElement;
export function prepare(root: ParentNode = document) {
  const byId = (id: string) => root.querySelector<HTMLElement>(`#${id}`);
  parking = byId('calculatorSource')!;
  const navigation = root.querySelector<HTMLElement>('[data-sbd-nav-slot]');
  if (navigation) nodes.set('navigation', navigation);
  const cards = Array.from(root.querySelectorAll<HTMLElement>('.calc-card'));
  const summary = root.querySelector<HTMLElement>('.summary-panel')!; summary.id = 'summaryCard'; cards.push(summary);
  const dock = root.querySelector<HTMLElement>('[data-sbd-suite-dock]');
  if (dock) {
    const card = document.createElement('section'); card.id = 'showContextCard'; card.className = 'calc-card calc-context';
    dock.querySelector('input')?.setAttribute('aria-label', 'Show readiness note'); card.append(dock); parking.append(card); cards.push(card);
  }
  for (const id of ['themeToggle', 'saveStatus', 'actionStatus']) { const node = byId(id)!; nodes.set(id, node); parking.append(node); }
  for (const card of cards) {
    const context = card.id === 'showContextCard';
    const units = context ? Array.from(dock!.querySelectorAll<HTMLElement>('a,button,input,span')) : card === summary
      ? [byId('summaryOutput')!, ...Array.from(card.querySelector<HTMLElement>('.summary-actions')!.children) as HTMLElement[], ...Array.from(card.querySelectorAll<HTMLElement>(':scope > .hint'))]
      : [...Array.from(card.querySelector<HTMLElement>('.card-body')!.children) as HTMLElement[], ...Array.from(card.querySelector<HTMLElement>('.result-grid')!.children) as HTMLElement[], card.querySelector<HTMLElement>('.hint')!];
    const items = document.createElement('div'); items.className = 'calculator-items';
    if (context) items.append(dock!); else items.append(...units);
    card.replaceChildren(); card.classList.add('calculator-content'); card.setAttribute('role', 'region');
    for (const unit of units) if (unit.classList.contains('hint')) unit.dataset.web2Scroll = '';
    card.setAttribute('aria-label', card.id === 'summaryCard' ? 'Complete operator summary' : card.id);
    nodes.set(card.id, card);
    pagers.set(card.id, window.AVViewport.paginate(card, items, { units, label: card.id, hiddenClass: 'calculator-away', navClass: 'calculator-pages', beforeMeasure: available => {
      if (card === summary) units[0].style.height = `${Math.max(30, Math.min(400, available))}px`;
    } }));
  }
  const output = byId('summaryOutput')!; output.dataset.web2Scroll = ''; output.tabIndex = 0;
  output.setAttribute('aria-label', 'Complete operator summary text');
}
