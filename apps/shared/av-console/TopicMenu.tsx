import { KeyboardEvent, ReactNode, useId, useRef, useState } from "react";
import "./topic-menu.css";

type Topic = { name: string; description: string; content: ReactNode; closeOnAction?: boolean };
/* Arrow keys move between plain buttons; tabs, fields and selects keep their own arrow behaviour. */
const ROVING = "button:not(:disabled):not([role]), button:not(:disabled)[role=menuitem]";
function owned(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !el || el.matches("input, select, textarea, [contenteditable=true], [role=tab], [role=slider]") || Boolean(el.closest("[role=tablist], [role=radiogroup]"));
}
/** A single menu page at a time. Native modal behavior keeps keyboard focus inside;
    Escape closes and focus returns to the menu button. Arrow keys, Home and End move
    through the topics, Right/Enter opens one and Left returns to the topic list. */
export function TopicMenu({ label, topics }: { label: string; topics: Topic[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const id = useId();
  const [topic, setTopic] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const selected = topics.find(item => item.name === topic);
  function focusTopic(name: string | null) {
    requestAnimationFrame(() => {
      const list = Array.from(content.current?.querySelectorAll<HTMLButtonElement>(".topic-menu-topic") || []);
      (list.find(button => button.dataset.topic === name) || list[0] || heading.current)?.focus();
    });
  }
  function enter(name: string | null) {
    const from = topic;
    setTopic(name);
    if (name === null) focusTopic(from);
    else requestAnimationFrame(() => heading.current?.focus());
  }
  function show() {
    setTopic(null); setOpen(true); dialog.current?.showModal(); focusTopic(null);
  }
  function keyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || owned(event.target)) return;
    if (selected && event.key === "ArrowLeft") { event.preventDefault(); enter(null); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      const target = event.target as HTMLElement;
      if (!selected && event.key === "ArrowRight" && target.classList.contains("topic-menu-topic")) { event.preventDefault(); enter(target.dataset.topic || null); }
      return;
    }
    const items = Array.from(content.current?.querySelectorAll<HTMLElement>(ROVING) || []).filter(el => el.getClientRects().length > 0);
    if (!items.length) return;
    event.preventDefault();
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
      : event.key === "ArrowDown" ? (at + 1) % items.length : (at <= 0 ? items.length - 1 : at - 1);
    items[next].focus();
  }
  return <>
    <button ref={opener} type="button" className="topic-menu-trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-menu`} onClick={show}>{label} <span aria-hidden="true">⌄</span></button>
    <dialog ref={dialog} id={`${id}-menu`} className="topic-menu" aria-labelledby={id} onKeyDown={keyDown}
      onClose={() => { setOpen(false); requestAnimationFrame(() => {
        // Return focus to the menu button unless the chosen action already moved it elsewhere.
        const button = opener.current, active = document.activeElement;
        if (button && document.contains(button) && (!active || active === document.body || dialog.current?.contains(active))) button.focus();
      }); }}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="topic-menu-page">
        <header>{selected && <button type="button" className="topic-menu-back" aria-label={`Back to ${label}`} aria-keyshortcuts="ArrowLeft" onClick={() => enter(null)}>← Back</button>}<h2 id={id} ref={heading} tabIndex={-1}>{selected?.name || label}</h2><button type="button" className="topic-menu-close" aria-label={`Close ${label}`} aria-keyshortcuts="Escape" onClick={() => dialog.current?.close()}>×</button></header>
        <div ref={content} className={`topic-menu-content${selected ? " is-topic" : " is-topics"}`} onClickCapture={event => { const button = (event.target as HTMLElement).closest("button"); if (selected?.closeOnAction && button && !button.disabled) dialog.current?.close(); }}>{selected ? selected.content : topics.map(item => <button className="topic-menu-topic" type="button" key={item.name} data-topic={item.name} onClick={() => enter(item.name)}><span><strong>{item.name}</strong><small>{item.description}</small></span><span className="topic-menu-chevron" aria-hidden="true">›</span></button>)}</div>
        {!selected && <p className="topic-menu-hint" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>→</kbd> open · <kbd>Esc</kbd> close</p>}
      </div>
    </dialog>
  </>;
}
