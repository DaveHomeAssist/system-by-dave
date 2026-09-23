import { type Preset, PRESET_SLOTS } from "../domain/session";

interface Props {
  presets: Preset[];
  armed: boolean;
  onArm(armed: boolean): void;
  onPress(slot: number): void;
  onHome(): void;
  onStop(): void;
}

/** Nine preset keys laid out like a keypad, with Store, Home and Stop. */
export function PresetPad({ presets, armed, onArm, onPress, onHome, onStop }: Props) {
  const bySlot = new Map(presets.map((p) => [p.slot, p]));
  return (
    <div className="preset-pad">
      <div className="preset-head">
        <span className="control-label" id="preset-label">
          Presets
          <span className="control-hint">{armed ? "Choose a number to store" : "1–9 recall · Shift+number store"}</span>
        </span>
      </div>
      <div className={`preset-grid ${armed ? "is-armed" : ""}`} role="group" aria-labelledby="preset-label">
        {Array.from({ length: PRESET_SLOTS }, (_, i) => i + 1).map((slot) => {
          const preset = bySlot.get(slot);
          const name = preset?.name || (preset ? "Stored" : "Empty");
          const action = armed ? `Store current shot in preset ${slot}` : preset ? `Recall preset ${slot}, ${name}` : `Preset ${slot} is empty`;
          return (
            <button
              type="button"
              key={slot}
              className={`preset-key ${preset ? "has-preset" : ""}`}
              aria-label={action}
              onClick={() => onPress(slot)}
            >
              <span className="preset-number">{slot}</span>
              <span className="preset-name">{name}</span>
            </button>
          );
        })}
      </div>
      <div className="preset-actions">
        <button type="button" className={`action-button ${armed ? "is-armed" : ""}`} aria-pressed={armed} onClick={() => onArm(!armed)}>
          {armed ? "Cancel store" : "Store"}
        </button>
        <button type="button" className="action-button" onClick={onHome} title="Camera home: pan 0°, tilt 0°, full wide. Not the FMP safe-wide preset.">
          Home
        </button>
        <button type="button" className="action-button action-stop" onClick={onStop}>
          Stop
        </button>
      </div>
    </div>
  );
}
