import {
  type CameraProfile,
  panSpeedForLevel,
  presetSpeedForLevel,
  SPEED_LEVEL_MAX,
  SPEED_LEVEL_MIN,
  tiltSpeedForLevel,
  zoomRateForLevel,
} from "../domain/camera";
import { type SpeedLevels } from "../domain/session";

interface Props {
  speeds: SpeedLevels;
  profile: CameraProfile;
  onChange(axis: keyof SpeedLevels, level: number): void;
}

const ROWS: Array<{ axis: keyof SpeedLevels; label: string }> = [
  { axis: "pan", label: "Pan" },
  { axis: "tilt", label: "Tilt" },
  { axis: "zoom", label: "Zoom" },
  { axis: "preset", label: "Preset" },
];

function describe(axis: keyof SpeedLevels, level: number, profile: CameraProfile): string {
  if (axis === "pan") return `${panSpeedForLevel(profile, level).toFixed(1)}°/s max`;
  if (axis === "tilt") return `${tiltSpeedForLevel(profile, level).toFixed(1)}°/s max`;
  if (axis === "zoom") return `${(1 / zoomRateForLevel(profile, level)).toFixed(1)} s wide→tele`;
  return `${presetSpeedForLevel(profile, level).toFixed(0)}°/s travel`;
}

/** SuperJoy-style speed selection on the trainer's 1-8 scale. */
export function SpeedControls({ speeds, profile, onChange }: Props) {
  return (
    <fieldset className="speed-controls">
      <legend className="control-label">
        Speed <span className="control-hint">[ ] pan/tilt · Shift+[ ] zoom · , . preset</span>
      </legend>
      {ROWS.map(({ axis, label }) => {
        const level = speeds[axis];
        return (
          <div className="speed-row" key={axis}>
            <span className="speed-name" id={`speed-${axis}`}>
              {label}
            </span>
            <button
              type="button"
              className="step-button"
              aria-label={`${label} speed down`}
              disabled={level <= SPEED_LEVEL_MIN}
              onClick={() => onChange(axis, level - 1)}
            >
              −
            </button>
            <output className="speed-value" aria-labelledby={`speed-${axis}`} aria-live="off">
              {level}
              <span className="speed-of">/{SPEED_LEVEL_MAX}</span>
            </output>
            <button
              type="button"
              className="step-button"
              aria-label={`${label} speed up`}
              disabled={level >= SPEED_LEVEL_MAX}
              onClick={() => onChange(axis, level + 1)}
            >
              +
            </button>
            <span className="speed-detail">{describe(axis, level, profile)}</span>
          </div>
        );
      })}
    </fieldset>
  );
}
