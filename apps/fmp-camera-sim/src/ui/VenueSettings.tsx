import { BowlInspector } from "./BowlInspector";
import { ProvenanceFields } from "./ProvenanceFields";
import { useState } from "react";
import { type SimulatorStore, type StoreState } from "../app/store";
import { EVIDENCE_LABELS, editedEvidence, type EvidenceStatus, VENUE_STATUS_OPTIONS } from "../domain/evidence";
import { fromDisplayLength, toDisplayLength, formatLength, type LengthUnit } from "../domain/units";
import { type Issue } from "../domain/validate";
import { applyFmpStageProfile, type FmpStageProfile, DIMENSION_SPECS, type DistanceBasis, type MountOrientation, type VenueProfile } from "../domain/venue";
import { EvidenceBadge, NoteField, NumberField, RadioGroup, SelectField, withFieldIssue } from "./fields";

const STATUS_OPTIONS = VENUE_STATUS_OPTIONS.map((status) => ({ value: status, label: EVIDENCE_LABELS[status] }));

interface Props {
  store: SimulatorStore;
  state: StoreState;
}

export function VenueSettings({ store, state }: Props) {
  const venue = state.project.venue;
  const unit = state.project.session.preferences.unit;
  const g = state.geometry;
  const [profile, setProfile] = useState<FmpStageProfile>("plan");
  const [preview, setPreview] = useState(false);
  const proposed = applyFmpStageProfile(venue, profile);
  const [issues, setIssues] = useState<Issue[]>([]);

  const apply = (mutate: (draft: VenueProfile) => void, fieldPath?: string) => {
    const draft = structuredClone(venue);
    mutate(draft);
    const result = store.updateVenue(draft);
    setIssues(result.ok ? [] : fieldPath ? withFieldIssue(result.issues, fieldPath) : result.issues);
  };
  const errorFor = (prefix: string) => issues.find((issue) => issue.path.startsWith(prefix))?.message;
  const digits = unit === "ft" ? 1 : 2;
  const unmatched = issues.filter(
    (issue) =>
      issue.path.includes(".provenance") ||
      !DIMENSION_SPECS.some((spec) => issue.path.startsWith(`venue.dimensions.${spec.key}`)) &&
      !issue.path.startsWith("venue.mount.panZeroBearingDeg"),
  );

  return (
    <div className="settings">
      <p className="settings-intro">
        Every dimension keeps its value, its evidence status and a source note. The simulator works in metres and shows {unit === "ft" ? "feet" : "metres"}.
        Anything not measured or confirmed keeps the <strong>Approximate venue</strong> flag on. Source identifiers refer to your reference or measurement log; recording a method does not verify a value. Editing a value resets its evidence to Demo; set its evidence again after verification.
      </p>
      <fieldset className="dimension">
        <legend>Photo reference profile</legend>
        <p>Current geometry: {venue.reference.geometryRevision === "legacy-v1" ? "preserved legacy settings" : "photo review baseline (editable)"}.</p>
        <p>Stage dimensions are provisional. P100 establishes the inverted mount, but not camera height, pan-zero heading or firmware flip settings.</p>
        <SelectField<FmpStageProfile> label="Stage interpretation" value={profile}
          options={[{ value: "plan", label: "Plan interpretation · 113 × 61 ft" }, { value: "working-depth", label: "Working depth · 113 × 75 ft" }]}
          onChange={(value) => { setProfile(value); setPreview(false); }} />
        <button type="button" className="secondary-button" onClick={() => setPreview(true)}>Preview profile update</button>
        {preview && <div className="notice" role="status">
          <p>Width: {formatLength(venue.dimensions.stageWidth.value, unit)} → {formatLength(proposed.dimensions.stageWidth.value, unit)}<br />
          Depth: {formatLength(venue.dimensions.stageDepth.value, unit)} → {formatLength(proposed.dimensions.stageDepth.value, unit)}<br />
          Mount: {venue.mount.orientation} → inverted</p>
          <p>Camera coordinates, heading and stored presets stay unchanged. Framing changes with the stage footprint. Current tilt may clamp to the inverted travel limits.</p>
          <button type="button" className="secondary-button" onClick={() => {
            const result = store.updateVenue(proposed);
            setIssues(result.ok ? [] : result.issues);
            if (result.ok) setPreview(false);
          }}>Apply profile update</button>
          <button type="button" className="secondary-button" onClick={() => setPreview(false)}>Cancel profile update</button>
        </div>}
      </fieldset>
      <RadioGroup<LengthUnit>
        legend="Units"
        value={unit}
        options={[
          { value: "ft", label: "Feet" },
          { value: "m", label: "Metres" },
        ]}
        onChange={(next) => store.setUnit(next)}
      />
      {unmatched.length > 0 && (
        <div className="notice notice-error" role="alert">
          <strong>Change rejected.</strong> The last valid venue stays in use.
          <ul>
            {unmatched.map((issue) => (
              <li key={issue.path}>
                <code>{issue.path}</code>: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="derived" aria-label="Derived camera geometry">
        <div>
          <span>Horizontal distance</span>
          <strong>{formatLength(g.horizontalDistance, unit)}</strong>
        </div>
        <div>
          <span>Line of sight</span>
          <strong>{formatLength(g.lineOfSight, unit)}</strong>
        </div>
        <div>
          <span>Looks down to the DSE</span>
          <strong>{g.depressionToOriginDeg.toFixed(1)}°</strong>
        </div>
      </div>

      {DIMENSION_SPECS.map((spec) => {
        const dimension = venue.dimensions[spec.key];
        const path = `venue.dimensions.${spec.key}`;
        return (
          <fieldset className="dimension" key={spec.key}>
            <legend>
              {spec.label} <EvidenceBadge status={dimension.status} />
              {spec.critical && <span className="critical-tag">Critical</span>}
            </legend>
            <NumberField
              label="Value"
              value={toDisplayLength(dimension.value, unit)}
              digits={digits}
              unit={unit}
              step={unit === "ft" ? 0.5 : 0.1}
              help={spec.help}
              error={errorFor(path)}
              onCommit={(value) =>
                apply((draft) => {
                  const next = fromDisplayLength(value, unit);
                  if (Math.abs(draft.dimensions[spec.key].value - next) > 1e-9) {
                    draft.dimensions[spec.key] = { ...editedEvidence(draft.dimensions[spec.key]), value: next };
                  }
                }, `${path}.value`)
              }
            />
            <SelectField<EvidenceStatus>
              label="Evidence"
              value={dimension.status}
              options={STATUS_OPTIONS}
              onChange={(status) =>
                apply((draft) => {
                  draft.dimensions[spec.key].status = status;
                })
              }
            />
            <ProvenanceFields value={dimension.provenance} onChange={(provenance) =>
              apply((draft) => { draft.dimensions[spec.key].provenance = provenance; })} />
            <NoteField
              label="Source note"
              value={dimension.note}
              onCommit={(note) =>
                apply((draft) => {
                  draft.dimensions[spec.key].note = note;
                })
              }
            />
          </fieldset>
        );
      })}

      <fieldset className="dimension">
        <legend>
          Distance basis <EvidenceBadge status={venue.distanceBasis.status} />
          <span className="critical-tag">Critical</span>
        </legend>
        <RadioGroup<DistanceBasis>
          legend="The camera-to-DSE figure is"
          value={venue.distanceBasis.value}
          options={[
            { value: "horizontal", label: "Horizontal distance", hint: "Measured level, as on a plan" },
            { value: "line-of-sight", label: "Line of sight", hint: "Straight from the lens; height is removed to place the camera" },
          ]}
          onChange={(value) =>
            apply((draft) => {
              if (draft.distanceBasis.value !== value) draft.distanceBasis = { ...editedEvidence(draft.distanceBasis), value };
            })
          }
        />
        <SelectField<EvidenceStatus>
          label="Evidence"
          value={venue.distanceBasis.status}
          options={STATUS_OPTIONS}
          onChange={(status) =>
            apply((draft) => {
              draft.distanceBasis.status = status;
            })
          }
        />
        <ProvenanceFields value={venue.distanceBasis.provenance} onChange={(provenance) =>
          apply((draft) => { draft.distanceBasis.provenance = provenance; })} />
        <NoteField
          label="Source note"
          value={venue.distanceBasis.note}
          onCommit={(note) =>
            apply((draft) => {
              draft.distanceBasis.note = note;
            })
          }
        />
      </fieldset>

      <fieldset className="dimension">
        <legend>
          Mount orientation <EvidenceBadge status={venue.mount.status} />
          <span className="critical-tag">Critical</span>
        </legend>
        <RadioGroup<MountOrientation>
          legend="Orientation"
          value={venue.mount.orientation}
          options={[
            { value: "upright", label: "Upright", hint: "Tilt travel +90° to −30°" },
            { value: "inverted", label: "Inverted", hint: "Upright simulated video; tilt +30° to −90°. Real flip settings unknown." },
          ]}
          onChange={(orientation) =>
            apply((draft) => {
              if (draft.mount.orientation !== orientation) draft.mount = { ...editedEvidence(draft.mount), orientation };
            })
          }
        />
        <SelectField<EvidenceStatus>
          label="Evidence"
          value={venue.mount.status}
          options={STATUS_OPTIONS}
          onChange={(status) =>
            apply((draft) => {
              draft.mount.status = status;
            })
          }
        />
        <ProvenanceFields value={venue.mount.provenance} onChange={(provenance) =>
          apply((draft) => { draft.mount.provenance = provenance; })} />
        <NoteField
          label="Source note"
          value={venue.mount.note}
          onCommit={(note) =>
            apply((draft) => {
              draft.mount.note = note;
            })
          }
        />
      </fieldset>

      <fieldset className="dimension">
        <legend>Pan-zero heading <EvidenceBadge status={venue.mount.headingEvidence.status} /><span className="critical-tag">Critical</span></legend>
        <p>Photo-observed mounting does not verify the real controller's zero heading.</p>
        <NumberField
          label="Pan 0° heading"
          value={venue.mount.panZeroBearingDeg}
          digits={1}
          unit="°"
          help="Where pan 0° points, clockwise from the stage centreline."
          error={errorFor("venue.mount.panZeroBearingDeg")}
          onCommit={(value) =>
            apply((draft) => {
              if (draft.mount.panZeroBearingDeg !== value) {
                draft.mount.panZeroBearingDeg = value;
                draft.mount.headingEvidence = editedEvidence(draft.mount.headingEvidence);
              }
            }, "venue.mount.panZeroBearingDeg")
          }
        />
        <SelectField<EvidenceStatus> label="Evidence" value={venue.mount.headingEvidence.status} options={STATUS_OPTIONS}
          onChange={(status) => apply((draft) => { draft.mount.headingEvidence.status = status; })} />
        <ProvenanceFields value={venue.mount.headingEvidence.provenance} onChange={(provenance) =>
          apply((draft) => { draft.mount.headingEvidence.provenance = provenance; })} />
        <NoteField label="Source note" value={venue.mount.headingEvidence.note}
          onCommit={(note) => apply((draft) => { draft.mount.headingEvidence.note = note; })} />
      </fieldset>

      <BowlInspector bowl={venue.bowl} geometry={g} onChange={bowl => apply(draft => { draft.bowl = bowl; })} />

      <section className="reference-block" aria-labelledby="cable-route-title">
        <h3 id="cable-route-title">Cable route (reference only)</h3>
        <p>{venue.reference.cableRoute}</p>
      </section>

      <p className="settings-foot">
        Stage directions are performer-facing: stage right is the performer's right, which is house left and the left side of the Camera 4 picture.
      </p>
      <button
        type="button"
        className="secondary-button"
        onClick={() => {
          const result = store.resetVenue();
          setIssues(result.ok ? [] : result.issues);
        }}
      >
        Reset venue to the FMP estimates
      </button>
    </div>
  );
}
