import { BusState, cut, feedOf, initialBus, multiview, PROGRAM, sourceAt, Switcher, Tile } from "./bus";
import { VideoDocument } from "./model";

/* Live panels: Switcher bus and Multiview. Both read the plan and the live
   bus state; neither edits the plan or controls hardware. */

type BusProps = { list: Switcher[]; current: string; state: Record<string, BusState>; onPick: (name: string) => void; onChange: (name: string, next: BusState, message: string) => void };
export function BusPanel({ list, current, state, onPick, onChange }: BusProps) {
  const sw = list.find(s => s.name === current) || list[0];
  if (!sw) return <div className="empty compact"><h3>No switcher in this plan</h3><p>A route's Processor names the switcher, and its Switcher / device input becomes a key on this bus. Add one in Patch or the Inspector.</p></div>;
  const st = state[sw.name] || initialBus(sw);
  const set = (next: BusState, message: string) => onChange(sw.name, next, message);
  const aux = sw.outputs.filter(o => !o.program);
  return <div className="bus-panel">
    {list.length > 1 && <label className="bus-pick">Switcher<select value={sw.name} onChange={e => onPick(e.target.value)}>{list.map(s => <option key={s.name}>{s.name}</option>)}</select></label>}
    <div className="bus-rows">
      {(["pgm", "pvw"] as const).map(row => <div className="bus-row" key={row} role="group" aria-label={row === "pgm" ? "Program bus" : "Preview bus"}>
        <span className={`bus-label bus-${row}`}>{row === "pgm" ? "PGM" : "PVW"}</span>
        <div className="bus-keys">{sw.inputs.map(i => { const on = st[row] === i.port; return <button key={i.port} type="button" className={`bus-key ${on ? `on-${row}` : ""}`} aria-pressed={on} title={i.port} onClick={() => set({ ...st, [row]: i.port }, row === "pgm" ? `Hot cut · ${i.source || i.port} on program. Live state, not a plan edit.` : `${i.source || i.port} on preview.`)}><strong>{i.source || "Source needed"}</strong><small>{i.port}</small></button>; })}</div>
      </div>)}
    </div>
    <div className="bus-foot">
      {aux.map(o => { const f = feedOf(sw, st, o.port); return <label key={o.port} className={`bus-aux ${f.via === "unset" ? "is-unset" : ""}`} title={o.destinations.join(", ")}><span>{o.port}</span>
        <select aria-label={`${o.port} source`} value={st.assign[o.port] || ""} onChange={e => set({ ...st, assign: { ...st.assign, [o.port]: e.target.value } }, e.target.value === PROGRAM ? `${o.port} follows program.` : e.target.value ? `${o.port} · ${sourceAt(sw, e.target.value) || e.target.value}.` : `${o.port} not assigned.`)}>
          <option value="">Not assigned</option><option value={PROGRAM}>Follow PGM</option>{sw.inputs.map(i => <option key={i.port} value={i.port}>{i.source || i.port}</option>)}
        </select></label>; })}
      <button type="button" className="primary bus-cut" title="Preview to program. Tracks the switcher; does not control hardware or edit the plan." onClick={() => set(cut(st), `Cut · ${sourceAt(sw, st.pvw) || st.pvw} on program. Live state, not a plan edit.`)} disabled={!st.pvw || st.pvw === st.pgm}>Cut</button>
    </div>
  </div>;
}

type MvProps = { doc: VideoDocument; list: Switcher[]; state: Record<string, BusState>; selected: string; onPick: (tile: Tile) => void };
export function MultiviewPanel({ doc, list, state, selected, onPick }: MvProps) {
  const tiles = multiview(doc, list, state);
  if (!tiles.length) return <div className="empty compact"><h3>Nothing to show yet</h3><p>Destinations appear here once routes name them.</p></div>;
  return <div className="mv-grid">{tiles.map(t => <button key={t.key} type="button" className={`mv-tile mv-${t.state} ${t.route && t.route === selected ? "is-selected" : ""}`} aria-label={`${t.name}: ${t.showing}`} onClick={() => onPick(t)}>
    {t.tag && <span className="mv-tag">{t.tag}</span>}
    <span className="mv-showing">{t.showing}</span>
    <span className="mv-name">{t.name}</span>
  </button>)}</div>;
}
