import { useId, useRef, useState } from "react";
import { downloadText, sessionFilename } from "../app/download";
import { isOfflineBuild, OFFLINE_FILE, SUITE_LINKS, suiteHref } from "../app/links";
import { type SimulatorStore, type StoreState } from "../app/store";
import { lensState } from "../domain/camera";
import { MAX_IMPORT_BYTES } from "../domain/project";
import { formatSigned } from "../domain/units";
import { type Issue } from "../domain/validate";
import { nowSeconds } from "../input/controller";

interface Props {
  store: SimulatorStore;
  state: StoreState;
}

export function SessionPanel({ store, state }: Props) {
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importIssues, setImportIssues] = useState<Issue[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const { presets } = state.project.session;
  const camera = state.project.camera;

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
                    placeholder="Name"
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
              ? `Saved in this browser at ${new Date(state.storage.savedAt).toLocaleTimeString()}.`
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
