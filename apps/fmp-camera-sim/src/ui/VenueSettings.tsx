import { useState } from "react";
import { type SimulatorStore, type StoreState } from "../app/store";
import { EVIDENCE_LABELS, type EvidenceStatus, VENUE_STATUS_OPTIONS } from "../domain/evidence";
import { fromDisplayLength, toDisplayLength, formatLength, type LengthUnit } from "../domain/units";
import { type Issue } from "../domain/validate";
import { DIMENSION_SPECS, type DistanceBasis, type MountOrientation, type VenueProfile } from "../domain/venue";
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
      !DIMENSION_SPECS.some((spec) => issue.path.startsWith(`venue.dimensions.${spec.key}`)) &&
      !issue.path.startsWith("venue.mount.panZeroBearingDeg"),
  );

  return (
    <div className="settings">
      <p className="settings-intro">
        Every dimension keeps its value, its evidence status and a source note. The simulator works in metres and shows {unit === "ft" ? "feet" : "metres"}.
        Anything not measured or confirmed keeps the <strong>Approximate venue</strong> flag on.
      </p>
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
                  draft.dimensions[spec.key].value = fromDisplayLength(value, unit);
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
              draft.distanceBasis.value = value;
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
          Camera mounting <EvidenceBadge status={venue.mount.status} />
          <span className="critical-tag">Critical</span>
        </legend>
        <RadioGroup<MountOrientation>
          legend="Orientation"
          value={venue.mount.orientation}
          options={[
            { value: "upright", label: "Upright", hint: "Tilt travel +90° to −30°" },
            { value: "inverted", label: "Inverted with E-Flip", hint: "Tilt travel +30° to −90°" },
          ]}
          onChange={(orientation) =>
            apply((draft) => {
              draft.mount.orientation = orientation;
            })
          }
        />
        <NumberField
          label="Pan 0° heading"
          value={venue.mount.panZeroBearingDeg}
          digits={1}
          unit="°"
          help="Where pan 0° points, clockwise from the stage centreline."
          error={errorFor("venue.mount.panZeroBearingDeg")}
          onCommit={(value) =>
            apply((draft) => {
              draft.mount.panZeroBearingDeg = value;
            }, "venue.mount.panZeroBearingDeg")
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
