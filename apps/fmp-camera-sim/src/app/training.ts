// Training memory shared with Camera Shading Practice: shader/fmp-training.js, bundled here and
// loaded there as a script, keeps which exercises this device tried and passed in either tool under
// localStorage "fmpTraining.v1". It holds exercise ids, scores and minute timestamps only, never
// leaves the device, and never replaces the session's own results. docs/camera-training-links.md
// describes the record; the offline file keeps its own copy, as it does its session.

import { useEffect, useState } from "react";
import "../../../../shader/fmp-training.js";
import { type ExerciseId } from "../domain/session";

export type SuggestionLevel = "on" | "quiet" | "off";
export type TrainingTool = "practice" | "sim";

export interface PracticeEntry {
  passed: boolean;
  best: number;
  checks: number;
  at: string;
}

export interface SimEntry {
  passed: boolean;
  tries: number;
  at: string;
}

export interface TrainingRecord {
  schema: string;
  prefs: { suggestions: SuggestionLevel; dismissed: Record<string, string> };
  last: { tool: TrainingTool; step: string; at: string } | null;
  practice: Record<string, PracticeEntry>;
  sim: Partial<Record<ExerciseId, SimEntry>>;
}

interface TrainingApi {
  KEY: string;
  STEPS: Record<TrainingTool, ReadonlyArray<{ id: string; title: string }>>;
  read(storage?: Storage): TrainingRecord;
  level(record: TrainingRecord): SuggestionLevel;
  recordStep(storage: Storage | undefined, tool: TrainingTool, id: string, result: { passed: boolean; score?: number }): TrainingRecord;
  setLevel(storage: Storage | undefined, level: SuggestionLevel): TrainingRecord;
  dismiss(storage: Storage | undefined, id: string): TrainingRecord;
  isDismissed(record: TrainingRecord, id: string): boolean;
  forget(storage?: Storage): TrainingRecord;
  title(tool: TrainingTool, id: string): string;
  nextStep(record: TrainingRecord, tool: TrainingTool): string | null;
  subscribe(listener: (record: TrainingRecord) => void, storage?: Storage): () => void;
}

export const training = (globalThis as unknown as { FmpTraining: TrainingApi }).FmpTraining;

/** Records a finished exercise. Suggestions set to Off record nothing; storage failures are the module's to absorb. */
export function recordSimResult(exercise: ExerciseId, passed: boolean): void {
  try {
    training.recordStep(undefined, "sim", exercise, { passed });
  } catch {
    // Training memory is a convenience; an exercise result never fails because of it.
  }
}

/** The record, kept current as this tab or another one changes it. */
export function useTraining(): TrainingRecord {
  const [record, setRecord] = useState(() => training.read());
  useEffect(() => training.subscribe(setRecord), []);
  return record;
}
