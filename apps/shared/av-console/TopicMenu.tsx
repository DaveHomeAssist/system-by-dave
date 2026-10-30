import { ReactNode, useId, useRef, useState } from "react";
import "./topic-menu.css";

type Topic = { name: string; description: string; content: ReactNode; closeOnAction?: boolean };
/** A single menu page at a time. Native modal behavior keeps keyboard focus inside. */
export function TopicMenu({ label, topics }: { label: string; topics: Topic[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const [topic, setTopic] = useState<string | null>(null);
  const selected = topics.find(item => item.name === topic);
  function enter(name: string | null) {
    setTopic(name);
    requestAnimationFrame(() => heading.current?.focus());
  }
  return <>
    <button type="button" aria-haspopup="dialog" onClick={() => { setTopic(null); dialog.current?.showModal(); requestAnimationFrame(() => heading.current?.focus()); }}>{label} <span aria-hidden="true">⌄</span></button>
    <dialog ref={dialog} className="topic-menu" aria-labelledby={id} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="topic-menu-page">
        <header>{selected && <button type="button" aria-label={`Back to ${label}`} onClick={() => enter(null)}>← Back</button>}<h2 id={id} ref={heading} tabIndex={-1}>{selected?.name || label}</h2><button type="button" aria-label={`Close ${label}`} onClick={() => dialog.current?.close()}>×</button></header>
        <div className="topic-menu-content" onClickCapture={event => { const button = (event.target as HTMLElement).closest("button"); if (selected?.closeOnAction && button && !button.disabled) dialog.current?.close(); }}>{selected ? selected.content : topics.map(item => <button className="topic-menu-topic" type="button" key={item.name} onClick={() => enter(item.name)}><span><strong>{item.name}</strong><small>{item.description}</small></span><span aria-hidden="true">›</span></button>)}</div>
      </div>
    </dialog>
  </>;
}
