import { type SimulatorStore, type StoreState, type Telemetry } from "../app/store";
import { type InputController, nowSeconds } from "../input/controller";
import { Joystick } from "./Joystick";
import { PresetPad } from "./PresetPad";
import { SpeedControls } from "./SpeedControls";
import { ZoomControl } from "./ZoomControl";

interface Props {
  store: SimulatorStore;
  input: InputController;
  state: StoreState;
  telemetry: Telemetry;
}

/** Compact SuperJoy-style surface: joystick, zoom, speeds, presets, Home and Stop. */
export function ControlsPanel({ store, input, state, telemetry }: Props) {
  const { session } = state.project;
  const announcement = state.announcement;
  return (
    <section className="panel controls-panel" aria-labelledby="controls-title">
      <h2 id="controls-title" className="visually-hidden">
        Camera controls
      </h2>
      <div className="controls-grid">
        <Joystick input={input} commanded={telemetry.snapshot.input} />
        <ZoomControl input={input} lens={telemetry.lens} commandedZoom={telemetry.snapshot.input.zoom} />
        <SpeedControls speeds={session.speeds} profile={state.project.camera} onChange={(axis, level) => store.setSpeed(axis, level)} />
        <PresetPad
          presets={session.presets}
          armed={state.storeArmed}
          onArm={(armed) => store.armStore(armed)}
          onPress={(slot) => (state.storeArmed ? store.storePreset(slot, nowSeconds()) : store.recallPreset(slot, nowSeconds()))}
          onHome={() => store.home(nowSeconds())}
          onStop={() => {
            input.releaseAll(nowSeconds());
            store.stop(nowSeconds());
          }}
        />
      </div>
      <p className={`status-line ${announcement ? `tone-${announcement.tone}` : ""}`} role="status" aria-live="polite" data-testid="status-line">
        {announcement?.text ?? "Ready. Drag the joystick, use the arrow keys, or press ? for shortcuts."}
      </p>
    </section>
  );
}
