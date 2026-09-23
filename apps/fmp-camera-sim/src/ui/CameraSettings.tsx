import { useId, useState } from "react";
import { type SimulatorStore, type StoreState } from "../app/store";
import {
  BEHAVIOUR_SPECS,
  type CameraProfile,
  panSpeedForLevel,
  PRESET_EASINGS,
  type PresetEasing,
  presetSpeedForLevel,
  SPEED_LEVEL_MAX,
  tiltSpeedForLevel,
  zoomRateForLevel,
} from "../domain/camera";
import { EVIDENCE_LABELS, type EvidenceStatus } from "../domain/evidence";
import { type Issue } from "../domain/validate";
import { EvidenceBadge, NoteField, NumberField, SelectField, withFieldIssue } from "./fields";

interface Props {
  store: SimulatorStore;
  state: StoreState;
}

const EASING_LABELS: Record<PresetEasing, string> = {
  smoothstep: "Ease in and out (cubic)",
  smootherstep: "Gentle ease (quintic)",
  linear: "Constant speed",
};

const LIMIT_STATUSES: EvidenceStatus[] = ["published", "measured", "confirmed", "estimated", "demo"];

export function CameraSettings({ store, state }: Props) {
  const camera = state.project.camera;
  const pub = camera.published;
  const [issues, setIssues] = useState<Issue[]>([]);
  const teleId = useId();

  const apply = (mutate: (draft: CameraProfile) => void, fieldPath?: string) => {
    const draft = structuredClone(camera);
    mutate(draft);
    const result = store.updateCamera(draft);
    setIssues(result.ok ? [] : fieldPath ? withFieldIssue(result.issues, fieldPath) : result.issues);
  };
  const errorFor = (path: string) => issues.find((issue) => issue.path === path)?.message;

  return (
    <div className="settings">
      <div className={`notice ${state.calibrated ? "" : "notice-warn"}`}>
        <strong>{state.calibrated ? "Calibrated" : "Uncalibrated camera behaviour."}</strong>{" "}
        Published P240 figures set the travel, speeds and field of view. Response curve, stopping time, zoom speed and preset travel are
        training assumptions until they are compared with the installed Camera 4. Changing them stops the camera.
      </div>

      <section aria-labelledby="published-title">
        <h3 id="published-title">
          Published specification <EvidenceBadge status="published" />
        </h3>
        <table className="spec-table">
          <tbody>
            <tr>
              <th scope="row">Pan travel</th>
              <td>
                ±{pub.panMaxDeg}°
              </td>
            </tr>
            <tr>
              <th scope="row">Tilt travel</th>
              <td>
                +{pub.tiltMaxDeg}° to {pub.tiltMinDeg}°
              </td>
            </tr>
            <tr>
              <th scope="row">Manual speed (zoom adaptive)</th>
              <td>
                Pan {pub.minSpeedDegS}–{pub.panMaxSpeedDegS}°/s · Tilt {pub.minSpeedDegS}–{pub.tiltMaxSpeedDegS}°/s
              </td>
            </tr>
            <tr>
              <th scope="row">Preset speed</th>
              <td>Up to {pub.presetMaxSpeedDegS}°/s</td>
            </tr>
            <tr>
              <th scope="row">Horizontal field of view</th>
              <td>
                {pub.hfovWideDeg}° wide to {pub.hfovTeleDeg}° tele
              </td>
            </tr>
            <tr>
              <th scope="row">Lens</th>
              <td>
                {pub.focalWideMm}–{pub.focalTeleMm} mm, about {(pub.focalTeleMm / pub.focalWideMm).toFixed(0)}× optical
              </td>
            </tr>
            <tr>
              <th scope="row">Presets</th>
              <td>{pub.presetCount} on the camera (9 in this trainer)</td>
            </tr>
          </tbody>
        </table>
        <p className="field-help">
          Source:{" "}
          <a href={pub.source.url} rel="noopener noreferrer" target="_blank">
            {pub.source.label}
          </a>{" "}
          (checked {pub.source.retrieved}). Opens in a new tab.
        </p>
      </section>

      <fieldset className="dimension">
        <legend>
          Operating limits <EvidenceBadge status={camera.limits.status} />
        </legend>
        <div className="field-pair">
          <NumberField label="Pan left" value={camera.limits.panMinDeg} digits={1} unit="°" error={errorFor("camera.limits.panMinDeg")} onCommit={(v) => apply((d) => void (d.limits.panMinDeg = v), "camera.limits.panMinDeg")} />
          <NumberField label="Pan right" value={camera.limits.panMaxDeg} digits={1} unit="°" error={errorFor("camera.limits.panMaxDeg")} onCommit={(v) => apply((d) => void (d.limits.panMaxDeg = v), "camera.limits.panMaxDeg")} />
          <NumberField label="Tilt down" value={camera.limits.tiltMinDeg} digits={1} unit="°" error={errorFor("camera.limits.tiltMinDeg")} onCommit={(v) => apply((d) => void (d.limits.tiltMinDeg = v), "camera.limits.tiltMinDeg")} />
          <NumberField label="Tilt up" value={camera.limits.tiltMaxDeg} digits={1} unit="°" error={errorFor("camera.limits.tiltMaxDeg")} onCommit={(v) => apply((d) => void (d.limits.tiltMaxDeg = v), "camera.limits.tiltMaxDeg")} />
        </div>
        <p className="field-help">Limits stay inside the published travel. An inverted mount mirrors the tilt range.</p>
        <SelectField<EvidenceStatus>
          label="Evidence"
          value={camera.limits.status}
          options={LIMIT_STATUSES.map((status) => ({ value: status, label: EVIDENCE_LABELS[status] }))}
          onChange={(status) => apply((d) => void (d.limits.status = status))}
        />
        <NoteField label="Source note" value={camera.limits.note} onCommit={(note) => apply((d) => void (d.limits.note = note))} />
      </fieldset>

      <fieldset className="dimension">
        <legend>
          Response and travel <EvidenceBadge status={camera.behaviour.status} />
        </legend>
        {BEHAVIOUR_SPECS.map((spec) => (
          <NumberField
            key={spec.key}
            label={spec.label}
            value={camera.behaviour[spec.key]}
            digits={spec.step < 0.1 ? 2 : spec.step < 1 ? 1 : 0}
            step={spec.step}
            unit={spec.unit}
            help={`${spec.help} Range ${spec.min}–${spec.max}.`}
            error={errorFor(`camera.behaviour.${spec.key}`)}
            onCommit={(value) => apply((d) => void (d.behaviour[spec.key] = value), `camera.behaviour.${spec.key}`)}
          />
        ))}
        <SelectField<PresetEasing>
          label="Preset easing"
          value={camera.behaviour.presetEasing}
          options={PRESET_EASINGS.map((easing) => ({ value: easing, label: EASING_LABELS[easing] }))}
          onChange={(easing) => apply((d) => void (d.behaviour.presetEasing = easing))}
        />
        <div className="field field-check">
          <input id={teleId} type="checkbox" checked={camera.behaviour.teleConvert} onChange={(event) => apply((d) => void (d.behaviour.teleConvert = event.target.checked))} />
          <label htmlFor={teleId}>
            Tele Convert
            <small>Modelled as a fixed 2× crop across the zoom range, reaching about 40× in HD. Not verified on Camera 4.</small>
          </label>
        </div>
      </fieldset>

      <section aria-labelledby="speed-table-title">
        <h3 id="speed-table-title">Speed levels in use</h3>
        <div className="table-scroll">
          <table className="spec-table speed-table">
            <thead>
              <tr>
                <th scope="col">Level</th>
                <th scope="col">Pan °/s</th>
                <th scope="col">Tilt °/s</th>
                <th scope="col">Zoom travel s</th>
                <th scope="col">Preset °/s</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: SPEED_LEVEL_MAX }, (_, i) => i + 1).map((level) => (
                <tr key={level}>
                  <th scope="row">{level}</th>
                  <td>{panSpeedForLevel(camera, level).toFixed(1)}</td>
                  <td>{tiltSpeedForLevel(camera, level).toFixed(1)}</td>
                  <td>{(1 / zoomRateForLevel(camera, level)).toFixed(1)}</td>
                  <td>{presetSpeedForLevel(camera, level).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="field-help">The 1–8 scale is the trainer's teaching scale, not the SuperJoy's hardware range. Pan and tilt speeds fall with zoom when zoom-adaptive sensitivity is on.</p>
      </section>

      <button
        type="button"
        className="secondary-button"
        onClick={() => {
          const result = store.resetCamera();
          setIssues(result.ok ? [] : result.issues);
        }}
      >
        Reset camera profile
      </button>
    </div>
  );
}
