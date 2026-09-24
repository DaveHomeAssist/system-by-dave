import { useEffect, useRef, useState, type FormEvent } from "react";
import { type Preset, PRESET_SLOTS } from "../domain/session";
import { keepFocus } from "./keepFocus";

interface Props {
  presets: Preset[];
  armed: boolean;
  onArm(armed: boolean): void;
  onPress(slot: number): void;
  onHome(): void;
  onStop(): void;
  onRename(slot: number, name: string): void;
  onClear(slot: number): void;
}

type MenuState = { slot: number; x: number; y: number } | null;

/** Nine preset keys laid out like a keypad, with Store, Home and Stop. */
export function PresetPad({ presets, armed, onArm, onPress, onHome, onStop, onRename, onClear }: Props) {
  const bySlot = new Map(presets.map((p) => [p.slot, p]));
  const [menu, setMenu] = useState<MenuState>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const longPress = useRef<{ slot: number; timer: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef(new Map<number, HTMLButtonElement>());
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing !== null) editRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!menu) return undefined;
    // Keyboard users (Menu key, Shift+F10) land on the first action, and Escape returns them.
    menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus({ preventScroll: true });
    const close = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenu(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenu(null);
      if (menuRef.current?.contains(document.activeElement)) slotRefs.current.get(menu.slot)?.focus({ preventScroll: true });
    };
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const openMenu = (slot: number, clientX: number, clientY: number) => {
    if (!bySlot.has(slot)) return;
    setMenu({ slot, x: clientX, y: clientY });
  };

  const clearLongPress = () => {
    if (longPress.current) {
      window.clearTimeout(longPress.current.timer);
      longPress.current = null;
    }
  };

  const beginRename = (slot: number) => {
    const preset = bySlot.get(slot);
    setMenu(null);
    setEditing(slot);
    setDraft(preset?.name ?? "");
  };

  const commitRename = (slot: number) => {
    onRename(slot, draft.trim());
    setEditing(null);
    setDraft("");
  };

  const clearSlot = (slot: number) => {
    setMenu(null);
    onClear(slot);
  };

  return (
    <div className="preset-pad">
      <div className="preset-head">
        <span className="control-label" id="preset-label">
          Presets
          <span className="control-hint">
            {armed ? "Choose a number to store" : "1–9 recall · Shift+number store · long-press rename/clear"}
          </span>
        </span>
      </div>
      <div className={`preset-grid ${armed ? "is-armed" : ""}`} role="group" aria-labelledby="preset-label">
        {Array.from({ length: PRESET_SLOTS }, (_, i) => i + 1).map((slot) => {
          const preset = bySlot.get(slot);
          const name = preset?.name || (preset ? "Stored" : "Empty");
          const action = armed
            ? `Store current shot in preset ${slot}`
            : preset
              ? `Recall preset ${slot}, ${name}`
              : `Preset ${slot} is empty`;
          if (editing === slot && preset) {
            return (
              <form
                key={slot}
                className="preset-key has-preset is-editing"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  commitRename(slot);
                }}
              >
                <span className="preset-number">{slot}</span>
                <input
                  ref={editRef}
                  className="preset-rename"
                  value={draft}
                  maxLength={40}
                  aria-label={`Name for preset ${slot}`}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => commitRename(slot)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setEditing(null);
                    }
                  }}
                />
              </form>
            );
          }
          return (
            <button
              {...keepFocus}
              type="button"
              key={slot}
              ref={(node) => {
                if (node) slotRefs.current.set(slot, node);
                else slotRefs.current.delete(slot);
              }}
              className={`preset-key ${preset ? "has-preset" : ""}`}
              aria-label={action}
              onClick={() => onPress(slot)}
              onContextMenu={(event) => {
                if (!preset) return;
                event.preventDefault();
                // A keyboard-opened menu has no pointer position; anchor it under the key.
                if (event.clientX === 0 && event.clientY === 0) {
                  const rect = event.currentTarget.getBoundingClientRect();
                  openMenu(slot, rect.left, rect.bottom);
                } else openMenu(slot, event.clientX, event.clientY);
              }}
              onPointerDown={(event) => {
                if (!preset || event.pointerType === "mouse") return;
                clearLongPress();
                const timer = window.setTimeout(() => {
                  longPress.current = null;
                  openMenu(slot, event.clientX, event.clientY);
                }, 480);
                longPress.current = { slot, timer };
              }}
              onPointerUp={clearLongPress}
              onPointerCancel={clearLongPress}
              onPointerLeave={clearLongPress}
            >
              <span className="preset-number">{slot}</span>
              <span className="preset-name">{name}</span>
            </button>
          );
        })}
      </div>
      <div className="preset-actions">
        <button {...keepFocus} type="button" className={`action-button ${armed ? "is-armed" : ""}`} aria-pressed={armed} onClick={() => onArm(!armed)}>
          {armed ? "Cancel store" : "Store"}
        </button>
        <button {...keepFocus} type="button" className="action-button" onClick={onHome} title="Camera home: pan 0°, tilt 0°, full wide. Not the FMP safe-wide preset.">
          Home
        </button>
        <button {...keepFocus} type="button" className="action-button action-stop" onClick={onStop}>
          Stop
        </button>
      </div>
      {menu && (
        <div
          ref={menuRef}
          className="preset-menu"
          role="menu"
          aria-label={`Preset ${menu.slot} actions`}
          style={{ left: menu.x, top: menu.y }}
        >
          <button type="button" role="menuitem" onClick={() => beginRename(menu.slot)}>
            Rename
          </button>
          <button type="button" role="menuitem" className="danger-item" onClick={() => clearSlot(menu.slot)}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
