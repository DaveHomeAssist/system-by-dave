import { useState } from "react";
import { type SimulatorStore, type StoreState } from "../app/store";
import { MARK_IDS, PATH_IDS, PATH_LABELS, type PathId, type PerformerConfig, type PerformerMode } from "../domain/session";
import { mToFt } from "../domain/units";
import { type MarkId } from "../domain/venue";
import { type Issue } from "../domain/validate";
import { NumberField, RadioGroup, SelectField, withFieldIssue } from "./fields";

interface Props {
  store: SimulatorStore;
  state: StoreState;
}

export function PerformerSettings({ store, state }: Props) {
  const performer = state.project.session.performer;
  const marks = state.geometry.marks;
  const [issues, setIssues] = useState<Issue[]>([]);
  const following = state.exercise?.id === "follow" && state.exercise.progress.status === "running";

  const update = (patch: Partial<PerformerConfig>) => {
    const result = store.updatePerformer(patch);
    const field = Object.keys(patch)[0];
    setIssues(result.ok ? [] : field ? withFieldIssue(result.issues, `session.performer.${field}`) : result.issues);
  };
  const errorFor = (field: string) => issues.find((issue) => issue.path === `session.performer.${field}`)?.message;

  return (
    <div className="settings">
      <p className="settings-intro">
        One human-scale performer on the stage. Marks are spike positions laid out across the deck; stage right is the performer's right.
      </p>
      {following && <div className="notice notice-warn">The follow exercise is driving the performer. These settings unlock when it finishes or is reset.</div>}
      <fieldset className="plain-fieldset" disabled={following}>
      <RadioGroup<PerformerMode>
        legend="Performer"
        value={performer.mode}
        options={[
          { value: "mark", label: "Stand on a mark" },
          { value: "path", label: "Walk a repeatable path" },
        ]}
        onChange={(mode) => update({ mode })}
      />
      <SelectField<MarkId>
        label="Mark"
        value={performer.markId}
        options={MARK_IDS.map((id) => ({ value: id, label: `${id} · ${marks.find((m) => m.id === id)?.label ?? id}` }))}
        onChange={(markId) => update({ markId })}
      />
      <SelectField<PathId> label="Path" value={performer.pathId} options={PATH_IDS.map((id) => ({ value: id, label: PATH_LABELS[id] }))} onChange={(pathId) => update({ pathId })} />
      <NumberField label="Walking speed" value={performer.walkSpeed} digits={1} step={0.1} unit="m/s" help="1.2 m/s is an easy walk." error={errorFor("walkSpeed")} onCommit={(walkSpeed) => update({ walkSpeed })} />
      <NumberField
        label="Height"
        value={performer.height}
        digits={2}
        step={0.01}
        unit="m"
        help={`${mToFt(performer.height).toFixed(1)} ft.`}
        error={errorFor("height")}
        onCommit={(height) => update({ height })}
      />
      <NumberField label="Pause at each point" value={performer.pauseS} digits={1} step={0.5} unit="s" error={errorFor("pauseS")} onCommit={(pauseS) => update({ pauseS })} />
      <button type="button" className="secondary-button" onClick={() => store.restartPerformer()} disabled={performer.mode !== "path"}>
        Restart the path from the beginning
      </button>
      </fieldset>
      {issues.some((issue) => issue.path === "session.performer") && (
        <p className="field-error" role="alert">
          {issues.find((issue) => issue.path === "session.performer")?.message}
        </p>
      )}
    </div>
  );
}
