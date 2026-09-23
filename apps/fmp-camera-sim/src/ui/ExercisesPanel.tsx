import { useState } from "react";
import { type SimulatorStore, type StoreState } from "../app/store";
import { nowSeconds } from "../input/controller";
import { EXERCISE_IDS, EXERCISE_SETTING_RANGES, type ExerciseId, type ExerciseSettings } from "../domain/session";
import { type Issue } from "../domain/validate";
import { EXERCISE_BRIEFS, EXERCISE_TITLES } from "../exercises/types";
import { NumberField, withFieldIssue } from "./fields";

interface Props {
  store: SimulatorStore;
  state: StoreState;
}

type Group = keyof ExerciseSettings;

const SETTING_LABELS: { [G in Group]: { [K in keyof ExerciseSettings[G]]: { label: string; unit: string; digits: number } } } = {
  wide: {
    safeAreaPct: { label: "Safe area", unit: "% of frame", digits: 0 },
    minStageFillPct: { label: "Minimum stage fill", unit: "% of width", digits: 0 },
    holdS: { label: "Hold steady for", unit: "s", digits: 1 },
  },
  follow: {
    targetWidthPct: { label: "Target box width", unit: "% of frame", digits: 0 },
    targetHeightPct: { label: "Target box height", unit: "% of frame", digits: 0 },
    minHeightPct: { label: "Performer at least", unit: "% of height", digits: 0 },
    maxHeightPct: { label: "Performer at most", unit: "% of height", digits: 0 },
    passPct: { label: "Pass when on target", unit: "% of walk", digits: 0 },
    countdownS: { label: "Countdown", unit: "s", digits: 0 },
  },
  recall: {
    panTiltToleranceDeg: { label: "Pan/tilt tolerance", unit: "°", digits: 3 },
    lensTolerance: { label: "Lens tolerance", unit: "of travel", digits: 4 },
    distinctDeg: { label: "Distinct shots: move", unit: "°", digits: 1 },
    distinctFovRatio: { label: "…or change field of view", unit: "×", digits: 2 },
    moveAwayDeg: { label: "Move away by", unit: "°", digits: 1 },
  },
};

export function ExercisesPanel({ store, state }: Props) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const active = state.exercise;
  const settings = state.project.session.exerciseSettings;
  const results = state.project.session.exerciseResults;

  const updateSetting = (group: Group, key: string, value: number) => {
    const next = structuredClone(settings) as unknown as Record<string, Record<string, number>>;
    next[group][key] = value;
    const result = store.updateExerciseSettings(next as unknown as ExerciseSettings);
    setIssues(result.ok ? [] : withFieldIssue(result.issues, `session.exerciseSettings.${group}.${key}`));
  };

  return (
    <div className="settings exercises">
      <p className="settings-intro">
        Three guided exercises. Thresholds are training settings for practice, not professional camera-operation standards. Each exercise can be
        reset and replayed.
      </p>
      {EXERCISE_IDS.map((id: ExerciseId) => {
        const isActive = active?.id === id;
        const progress = isActive ? active.progress : null;
        const last = [...results].reverse().find((result) => result.exercise === id);
        return (
          <article key={id} className={`exercise-card ${isActive ? "is-active" : ""}`} aria-labelledby={`exercise-${id}`}>
            <header>
              <h3 id={`exercise-${id}`}>{EXERCISE_TITLES[id]}</h3>
              {progress && <span className={`status-pill status-${progress.status}`}>{progress.status === "complete" ? (progress.result?.passed ? "Complete" : "Finished") : "Running"}</span>}
            </header>
            <p className="exercise-brief">{EXERCISE_BRIEFS[id]}</p>
            <div className="exercise-actions">
              <button type="button" className="primary-button" onClick={() => store.startExercise(id, nowSeconds())}>
                {isActive ? (progress?.status === "complete" ? "Replay" : "Restart") : "Start"}
              </button>
              {isActive && (
                <button type="button" className="secondary-button" onClick={() => store.resetExercise()}>
                  Reset
                </button>
              )}
            </div>
            {progress && (
              <div className="exercise-progress" data-testid={`exercise-${id}-progress`} data-status={progress.status}>
                <p className="exercise-headline">{progress.headline}</p>
                {progress.note && <p className="exercise-note">{progress.note}</p>}
                {progress.checks.length > 0 && (
                  <ul className="checklist">
                    {progress.checks.map((check) => (
                      <li key={check.label} className={check.done ? "is-done" : ""}>
                        <span aria-hidden="true">{check.done ? "✓" : "○"}</span> {check.label}
                        <span className="visually-hidden">{check.done ? " (done)" : " (not yet)"}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {progress.figures.length > 0 && (
                  <dl className="figures">
                    {progress.figures.map((figure) => (
                      <div key={figure.label}>
                        <dt>{figure.label}</dt>
                        <dd>{figure.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {progress.result && <p className={`exercise-result ${progress.result.passed ? "is-pass" : "is-miss"}`}>{progress.result.summary}</p>}
              </div>
            )}
            {!isActive && last && (
              <p className="exercise-last">
                Last: {last.passed ? "passed" : "not yet"} · {new Date(last.completedAt).toLocaleString()} · {last.summary}
              </p>
            )}
          </article>
        );
      })}

      <details className="training-settings">
        <summary>Training settings</summary>
        {issues.length > 0 && (
          <div className="notice notice-error" role="alert">
            {issues.map((issue) => (
              <p key={issue.path}>
                <code>{issue.path}</code>: {issue.message}
              </p>
            ))}
          </div>
        )}
        {(Object.keys(SETTING_LABELS) as Group[]).map((group) => (
          <fieldset key={group} className="dimension">
            <legend>{EXERCISE_TITLES[group]}</legend>
            {Object.entries(SETTING_LABELS[group]).map(([key, meta]) => {
              const range = (EXERCISE_SETTING_RANGES[group] as Record<string, readonly [number, number]>)[key];
              const value = (settings[group] as Record<string, number>)[key];
              return (
                <NumberField
                  key={key}
                  label={meta.label}
                  value={value}
                  digits={meta.digits}
                  unit={meta.unit}
                  help={`Range ${range[0]}–${range[1]}.`}
                  error={issues.find((issue) => issue.path === `session.exerciseSettings.${group}.${key}`)?.message}
                  onCommit={(next) => updateSetting(group, key, next)}
                />
              );
            })}
          </fieldset>
        ))}
      </details>

      <section aria-labelledby="history-title" className="history">
        <h3 id="history-title">Results</h3>
        {results.length === 0 ? (
          <p className="field-help">No exercises completed yet.</p>
        ) : (
          <>
            <ol className="history-list" reversed>
              {[...results]
                .reverse()
                .slice(0, 12)
                .map((result) => (
                  <li key={result.id}>
                    <strong>{EXERCISE_TITLES[result.exercise]}</strong> · {result.passed ? "passed" : "not yet"} · {new Date(result.completedAt).toLocaleString()}
                    <span>{result.summary}</span>
                  </li>
                ))}
            </ol>
            <button type="button" className="secondary-button" onClick={() => store.clearResults()}>
              Clear results
            </button>
          </>
        )}
      </section>
    </div>
  );
}
