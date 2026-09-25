import { useId, useRef, useState } from "react";
import { downloadText, sessionFilename } from "../app/download";
import { isOfflineBuild, OFFLINE_FILE, SUITE_LINKS, suiteHref } from "../app/links";
import { type SimulatorStore, type StoreState } from "../app/store";
import { type SuggestionLevel, training, useTraining } from "../app/training";
import { lensState } from "../domain/camera";
import { MAX_IMPORT_BYTES } from "../domain/project";
import { formatSigned } from "../domain/units";
import { type Issue } from "../domain/validate";
import { nowSeconds } from "../input/controller";
import { suggestPresetName } from "../sim/presetName";
import { SelectField } from "./fields";

const SUGGESTION_OPTIONS: ReadonlyArray<{ value: SuggestionLevel; label: string }> = [
  { value: "on", label: "On" },
  { value: "quiet", label: "Quiet: highlights only" },
  { value: "off", label: "Off: remember nothing" },
];

interface Props {
  store: SimulatorStore;
  state: StoreState;
}

/** "at 14:05:09" today; "on 23 Sep, 14:05:09" for a session restored from an earlier day. */
function savedWhen(iso: string, now = new Date()): string {
  const saved = new Date(iso);
  const time = saved.toLocaleTimeString();
  return saved.toDateString() === now.toDateString()
    ? `at ${time}`
    : `on ${saved.toLocaleDateString(undefined, { day: "numeric", month: "short" })}, ${time}`;
}

export function SessionPanel({ store, state }: Props) {
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importIssues, setImportIssues] = useState<Issue[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const { presets } = state.project.session;
  const camera = state.project.camera;
  const record = useTraining();
  const suggestions = training.level(record);
  // Once Shading practice has been used on this device, the exercise it has left.
  const practiceLeft = suggestions === "on" && Object.keys(record.practice).length > 0 ? training.nextStep(record, "practice") : null;

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    setImportIssues([]);
    setImportMessage("");
    if (fileRef.current) fileRef.current.value = "";
    if (file.size > MAX_IMPORT_BYTES) {
      setImportMessage(`${file.name} is larger than 2 MB, which is too large for a simulator session. Nothing changed.`);
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setImportMessage("The file could not be read.");
      return;
    }
    const result = store.importText(text, nowSeconds());
    if (result.ok) setImportMessage(`Imported ${file.name}.`);
    else {
      setImportIssues(result.issues);
      setImportMessage(`${file.name} was not imported. Nothing in the open session changed.`);
    }
  };

  return (
    <div className="settings">
      <section aria-labelledby="presets-title">
        <h3 id="presets-title">Presets</h3>
        {presets.length === 0 ? (
          <p className="field-help">No presets stored. Press Store, then a number, to keep the current shot.</p>
        ) : (
          <ul className="preset-list">
            {presets.map((preset) => {
              const lens = lensState(camera, preset.lens);
              return (
                <li key={preset.slot}>
                  <span className="preset-slot">{preset.slot}</span>
                  <label className="visually-hidden" htmlFor={`preset-name-${preset.slot}`}>
                    Name for preset {preset.slot}
                  </label>
                  <input
                    key={`${preset.savedAt}|${preset.name}`}
                    id={`preset-name-${preset.slot}`}
                    className="preset-name-input"
                    defaultValue={preset.name}
                    maxLength={40}
                    placeholder={suggestions === "off" ? "Name" : suggestPresetName(state.geometry, camera, preset)}
                    onBlur={(event) => {
                      if (event.target.value !== preset.name) store.renamePreset(preset.slot, event.target.value);
                    }}
                  />
                  <span className="preset-pose">
                    {formatSigned(preset.pan)}° / {formatSigned(preset.tilt)}° · {lens.zoomRatio.toFixed(1)}×
                  </span>
                  <button type="button" className="tool-button" onClick={() => store.recallPreset(preset.slot, nowSeconds())}>
                    Recall
                  </button>
                  <button type="button" className="tool-button" onClick={() => store.deletePreset(preset.slot)} aria-label={`Delete preset ${preset.slot}`}>
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="save-title">
        <h3 id="save-title">Save and share</h3>
        <p className={`storage-status ${state.storage.state === "ok" ? "" : "is-warn"}`} role="status">
          {state.storage.state === "ok"
            ? state.storage.savedAt
              ? `Saved in this browser ${savedWhen(state.storage.savedAt)}.`
              : "Saved in this browser as you work."
            : `${state.storage.reason} The session still works; export it to keep it.`}
        </p>
        <div className="button-row">
          <button
            type="button"
            className="primary-button"
            onClick={() => downloadText(store.exportText(), sessionFilename())}
          >
            Export session (.json)
          </button>
          <button type="button" className="secondary-button" aria-describedby={fileId} onClick={() => fileRef.current?.click()}>
            Import session…
          </button>
          <input
            ref={fileRef}
            className="visually-hidden"
            type="file"
            tabIndex={-1}
            aria-hidden="true"
            accept="application/json,.json"
            onChange={(event) => void onImport(event.target.files?.[0])}
          />
        </div>
        <p className="field-help" id={fileId}>
          Exports carry the venue profile with its evidence notes, the camera profile, presets, performer and results. Imports are checked in full
          before anything changes.
        </p>
        {importMessage && (
          <div className={`notice ${importIssues.length ? "notice-error" : "notice-ok"}`} role={importIssues.length ? "alert" : "status"}>
            <p>{importMessage}</p>
            {importIssues.length > 0 && (
              <ul>
                {importIssues.slice(0, 8).map((issue) => (
                  <li key={issue.path + issue.message}>
                    <code>{issue.path}</code>: {issue.message}
                  </li>
                ))}
                {importIssues.length > 8 && <li>and {importIssues.length - 8} more</li>}
              </ul>
            )}
          </div>
        )}
      </section>

      {!isOfflineBuild() && (
        <section aria-labelledby="offline-title">
          <h3 id="offline-title">Offline copy</h3>
          <p className="field-help">A single HTML file with the whole simulator. It runs from disk with networking off; its saved data stays separate from this page.</p>
          <a className="secondary-button" href={OFFLINE_FILE} download>
            Download offline copy
          </a>
        </section>
      )}

      <section aria-labelledby="refs-title">
        <h3 id="refs-title">FMP references</h3>
        <ul className="link-list">
          <li>
            <a href={suiteHref(SUITE_LINKS.ptzGuide)}>Catwalk PTZ operating guide</a>
          </li>
          <li>
            <a href={suiteHref(SUITE_LINKS.superJoy)}>3D SuperJoy G1 guide</a>
          </li>
          <li>
            <a href={suiteHref(SUITE_LINKS.p240Model)}>BirdDog P240 3D model</a>
          </li>
          <li>
            <a href={suiteHref(SUITE_LINKS.hub)}>FMP Video Operations</a>
          </li>
        </ul>
      </section>

      <section aria-labelledby="other-cameras-title">
        <h3 id="other-cameras-title">Other cameras</h3>
        <p className="field-help">Cameras 1–3 are manned URSA Broadcast G2 bodies, shaded from the shader panel. Camera 4 is set from its own menus, not the shader panel.</p>
        <ul className="link-list">
          <li>
            <a href={suiteHref(SUITE_LINKS.shadingPractice)}>Exposure and colour: Shading practice</a>
          </li>
          <li>
            <a href={suiteHref(SUITE_LINKS.ursaRig)}>URSA camera rig explorer</a>
          </li>
          {practiceLeft && (
            <li>
              <a href={suiteHref(SUITE_LINKS.shadingPractice)} data-testid="practice-continue">
                Continue in Shading practice · next: {training.title("practice", practiceLeft)}
                {record.practice[practiceLeft] ? `, best ${record.practice[practiceLeft].best}` : ""}
              </a>
            </li>
          )}
        </ul>
      </section>

      <section aria-labelledby="suggestions-title">
        <h3 id="suggestions-title">Suggestions</h3>
        <SelectField label="Suggest next steps" value={suggestions} options={SUGGESTION_OPTIONS} onChange={(level) => training.setLevel(undefined, level)} />
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            training.forget();
            store.hint("Training history forgotten on this device. The session and its results are kept.");
          }}
        >
          Forget training history
        </button>
        <p className="field-help">
          This device remembers which exercises you tried and passed here and in Shading practice, to mark the next one, and names unnamed presets
          from the shot. Nothing leaves this device, and the session and its results are kept either way.
          {isOfflineBuild() ? " This offline copy keeps its own record, apart from housevideo.app." : ""}
        </p>
      </section>

      <section aria-labelledby="reset-title">
        <h3 id="reset-title">Reset</h3>
        {confirmReset ? (
          <div className="button-row">
            <button
              type="button"
              className="danger-button"
              onClick={() => {
                store.resetSession(nowSeconds());
                setConfirmReset(false);
              }}
            >
              Clear presets and results
            </button>
            <button type="button" className="secondary-button" onClick={() => setConfirmReset(false)}>
              Keep them
            </button>
          </div>
        ) : (
          <button type="button" className="secondary-button" onClick={() => setConfirmReset(true)}>
            Reset session…
          </button>
        )}
        <p className="field-help">Resetting keeps the venue and camera profiles. Export first if you want the presets back later.</p>
      </section>
    </div>
  );
}
