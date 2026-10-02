import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import "./preset-select.css";

type Option = { value: string; label: string; group?: string };
type Props = { label: string; value: string; options: Option[]; onChange: (value: string) => void };

// Keep the popup in the document; native select menus can be misplaced by embedded browsers.
export function PresetSelect({ label, value, options, onChange }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLUListElement>(null);
  const search = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 8, top: 8, width: 280, maxHeight: 360 });
  const selected = Math.max(0, options.findIndex(option => option.value === value));

  function show() { setActive(selected); search.current.text = ""; setOpen(true); }
  function choose(index: number) { onChange(options[index].value); setOpen(false); trigger.current?.focus(); }

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const anchor = trigger.current!.getBoundingClientRect();
      const width = Math.min(Math.max(anchor.width, 280), window.innerWidth - 16);
      const below = window.innerHeight - anchor.bottom - 12;
      const above = anchor.top - 12;
      const upwards = below < 260 && above > below;
      const maxHeight = Math.max(44, Math.min(360, upwards ? above : below));
      const height = Math.min(popup.current!.scrollHeight + 2, maxHeight);
      setPosition({ width, maxHeight,
        left: Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8)),
        top: Math.max(8, Math.min(upwards ? anchor.top - height - 4 : anchor.bottom + 4, window.innerHeight - height - 8)) });
    }
    function outside(event: Event) {
      if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false);
    }
    function scroll(event: Event) { if (!popup.current?.contains(event.target as Node)) setOpen(false); }
    place();
    window.addEventListener("resize", place);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("scroll", scroll, true);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("scroll", scroll, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id, position.maxHeight]);

  function keydown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.ctrlKey || event.metaKey) return;
    const key = event.key;
    if (key === "Tab") { setOpen(false); return; }
    if (key === "Escape") { if (open) { event.preventDefault(); event.stopPropagation(); setOpen(false); } return; }
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(key)) {
      event.preventDefault();
      if (!open) { show(); if (key === "Home" || key === "End") setActive(key === "Home" ? 0 : options.length - 1); return; }
      if (key === "Enter" || key === " ") { choose(active); return; }
      setActive(key === "Home" ? 0 : key === "End" ? options.length - 1
        : Math.max(0, Math.min(options.length - 1, active + (key === "ArrowDown" ? 1 : -1))));
    } else if (key.length === 1 && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      search.current = { text: now - search.current.time > 700 ? key : search.current.text + key, time: now };
      const match = options.findIndex(option => option.label.toLowerCase().startsWith(search.current.text.toLowerCase()));
      setOpen(true);
      if (match >= 0) setActive(match);
    }
  }

  return <>
    <button ref={trigger} type="button" className="preset-select" role="combobox" aria-label={label}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      aria-activedescendant={open ? `${id}-${active}` : undefined} data-value={value}
      onClick={() => open ? setOpen(false) : show()} onKeyDown={keydown}>
      <span>{options[selected]?.label}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && createPortal(<ul ref={popup} id={id} role="listbox" aria-label={label} className="preset-options" style={position}>
      {options.map((option, index) => <li key={option.value} role="presentation">
        {option.group && option.group !== options[index - 1]?.group && <div className="preset-group" aria-hidden="true">{option.group}</div>}
        <div id={`${id}-${index}`} role="option" aria-selected={value === option.value} data-value={option.value}
          aria-label={option.group ? `${option.label}, ${option.group}` : option.label}
          className={`preset-option${active === index ? " active" : ""}`}
          onPointerMove={event => { if (event.pointerType === "mouse") setActive(index); }} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>
          <span>{option.label}</span><span aria-hidden="true">{value === option.value ? "✓" : ""}</span>
        </div>
      </li>)}
    </ul>, document.body)}
  </>;
}
