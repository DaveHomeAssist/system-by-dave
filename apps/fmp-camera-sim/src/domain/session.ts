import { type ShowPackage, defaultShowPackage, parseShowPackage } from "./structures";
import { SPEED_LEVEL_MAX, SPEED_LEVEL_MIN } from "./camera";
import { type LengthUnit } from "./units";
import { type MarkId } from "./venue";
import {
  type Issue,
  IssueList,
  readBoolean,
  readEnum,
  readInteger,
  readNumber,
  readObject,
  readString,
} from "./validate";

export const SESSION_SCHEMA = "fmp-camera-simulator.session";
export const SESSION_VERSION = 2;

export const PRESET_SLOTS = 9;
export const MAX_EXERCISE_RESULTS = 60;

export const MARK_IDS: readonly MarkId[] = ["DSR", "DSC", "DSL", "CSR", "CS", "CSL", "USR", "USC", "USL"];

export type PerformerMode = "mark" | "path";
export type PathId = "tour" | "cross";
export const PATH_IDS: readonly PathId[] = ["tour", "cross"];
export const PATH_LABELS: Record<PathId, string> = {
  tour: "Stage tour (all three rows)",
  cross: "Downstage cross and return",
};

export type ExerciseId = "wide" | "follow" | "recall";
export const EXERCISE_IDS: readonly ExerciseId[] = ["wide", "follow", "recall"];

export interface SpeedLevels {
  pan: number;
  tilt: number;
  zoom: number;
  preset: number;
}

export interface Preset {
  slot: number;
  name: string;
  /** Camera identity the pose belongs to. */
  cameraId: string;
  pan: number;
  tilt: number;
  /** Lens position, 0 = wide, 1 = tele. */
  lens: number;
  savedAt: string;
}

export interface PerformerConfig {
  mode: PerformerMode;
  markId: MarkId;
  pathId: PathId;
  /** Walking speed, metres per second. */
  walkSpeed: number;
  /** Standing height, metres. */
  height: number;
  /** Pause at each path point, seconds. */
  pauseS: number;
}

export interface ExerciseSettings {
  wide: { safeAreaPct: number; minStageFillPct: number; holdS: number };
  follow: {
    targetWidthPct: number;
    targetHeightPct: number;
    minHeightPct: number;
    maxHeightPct: number;
    passPct: number;
    countdownS: number;
  };
  recall: {
    panTiltToleranceDeg: number;
    lensTolerance: number;
    distinctDeg: number;
    distinctFovRatio: number;
    moveAwayDeg: number;
  };
}

export interface ExerciseResult {
  id: string;
  exercise: ExerciseId;
  completedAt: string;
  passed: boolean;
  summary: string;
  metrics: Record<string, number>;
}

export interface GuidePreferences {
  safeArea: boolean;
  centre: boolean;
  thirds: boolean;
}

export interface Session {
  schema: typeof SESSION_SCHEMA;
  version: typeof SESSION_VERSION;
  venueId: string;
  cameraId: string;
  speeds: SpeedLevels;
  pose: { pan: number; tilt: number; lens: number };
  presets: Preset[];
  showPackage: ShowPackage;
  performer: PerformerConfig;
  exerciseSettings: ExerciseSettings;
  exerciseResults: ExerciseResult[];
  preferences: { unit: LengthUnit; guides: GuidePreferences };
}

export function defaultExerciseSettings(): ExerciseSettings {
  return {
    wide: { safeAreaPct: 90, minStageFillPct: 55, holdS: 1 },
    follow: {
      targetWidthPct: 50,
      targetHeightPct: 60,
      minHeightPct: 25,
      maxHeightPct: 90,
      passPct: 70,
      countdownS: 3,
    },
    recall: {
      panTiltToleranceDeg: 0.1,
      lensTolerance: 0.005,
      distinctDeg: 5,
      distinctFovRatio: 1.25,
      moveAwayDeg: 3,
    },
  };
}

export function defaultSession(venueId: string, cameraId: string): Session {
  return {
    schema: SESSION_SCHEMA,
    version: SESSION_VERSION,
    venueId,
    cameraId,
    speeds: { pan: 4, tilt: 4, zoom: 4, preset: 4 },
    pose: { pan: 0, tilt: 0, lens: 0 },
    presets: [],
    showPackage: defaultShowPackage(),
    performer: { mode: "mark", markId: "CS", pathId: "tour", walkSpeed: 1.2, height: 1.75, pauseS: 2 },
    exerciseSettings: defaultExerciseSettings(),
    exerciseResults: [],
    preferences: { unit: "ft", guides: { safeArea: true, centre: true, thirds: false } },
  };
}

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

const SETTINGS_RANGES = {
  wide: {
    safeAreaPct: [50, 100],
    minStageFillPct: [0, 95],
    holdS: [0, 10],
  },
  follow: {
    targetWidthPct: [10, 100],
    targetHeightPct: [10, 100],
    minHeightPct: [5, 95],
    maxHeightPct: [10, 100],
    passPct: [0, 100],
    countdownS: [0, 10],
  },
  recall: {
    panTiltToleranceDeg: [0.001, 5],
    lensTolerance: [0.0001, 0.2],
    distinctDeg: [0, 90],
    distinctFovRatio: [1, 10],
    moveAwayDeg: [0, 90],
  },
} as const;

export const EXERCISE_SETTING_RANGES = SETTINGS_RANGES;

function parsePreset(issues: IssueList, value: unknown, path: string): Preset | null {
  const raw = readObject(issues, value, path);
  if (!raw) return null;
  const slot = readInteger(issues, raw.slot, `${path}.slot`, { min: 1, max: PRESET_SLOTS });
  const name = readString(issues, raw.name, `${path}.name`, { maxLength: 40 });
  const cameraId = readString(issues, raw.cameraId, `${path}.cameraId`, { maxLength: 80, allowEmpty: false });
  const pan = readNumber(issues, raw.pan, `${path}.pan`, { min: -180, max: 180 });
  const tilt = readNumber(issues, raw.tilt, `${path}.tilt`, { min: -90, max: 90 });
  const lens = readNumber(issues, raw.lens, `${path}.lens`, { min: 0, max: 1 });
  const savedAt = readString(issues, raw.savedAt, `${path}.savedAt`, { maxLength: 40 });
  if (savedAt !== null && !Number.isFinite(Date.parse(savedAt))) issues.add(`${path}.savedAt`, "Expected an ISO date.");
  if (slot === null || name === null || cameraId === null || pan === null || tilt === null || lens === null || savedAt === null) {
    return null;
  }
  return { slot, name, cameraId, pan, tilt, lens, savedAt };
}

function parseSettings(issues: IssueList, value: unknown, path: string): ExerciseSettings | null {
  const raw = readObject(issues, value, path);
  if (!raw) return null;
  const out = defaultExerciseSettings() as unknown as Record<string, Record<string, number>>;
  for (const [group, fields] of Object.entries(SETTINGS_RANGES)) {
    const groupRaw = readObject(issues, raw[group], `${path}.${group}`);
    if (!groupRaw) continue;
    for (const [field, [min, max]] of Object.entries(fields)) {
      const v = readNumber(issues, groupRaw[field], `${path}.${group}.${field}`, { min, max });
      if (v !== null) out[group][field] = v;
    }
  }
  const settings = out as unknown as ExerciseSettings;
  if (settings.follow.minHeightPct >= settings.follow.maxHeightPct) {
    issues.add(`${path}.follow.maxHeightPct`, "Maximum performer height must exceed the minimum.");
  }
  return issues.ok ? settings : null;
}

function parseResult(issues: IssueList, value: unknown, path: string): ExerciseResult | null {
  const raw = readObject(issues, value, path);
  if (!raw) return null;
  const id = readString(issues, raw.id, `${path}.id`, { maxLength: 80, allowEmpty: false });
  const exercise = readEnum(issues, raw.exercise, `${path}.exercise`, EXERCISE_IDS);
  const completedAt = readString(issues, raw.completedAt, `${path}.completedAt`, { maxLength: 40 });
  if (completedAt !== null && !Number.isFinite(Date.parse(completedAt))) issues.add(`${path}.completedAt`, "Expected an ISO date.");
  const passed = readBoolean(issues, raw.passed, `${path}.passed`);
  const summary = readString(issues, raw.summary, `${path}.summary`, { maxLength: 400 });
  const metricsRaw = readObject(issues, raw.metrics, `${path}.metrics`);
  const metrics: Record<string, number> = {};
  if (metricsRaw) {
    for (const [key, metric] of Object.entries(metricsRaw)) {
      const v = readNumber(issues, metric, `${path}.metrics.${key}`);
      if (v !== null) metrics[key] = v;
    }
  }
  if (!id || !exercise || completedAt === null || passed === null || summary === null || !metricsRaw) return null;
  return { id, exercise, completedAt, passed, summary, metrics };
}

export function parseSession(
  value: unknown,
  path = "session",
): { ok: true; session: Session } | { ok: false; issues: Issue[] } {
  const issues = new IssueList();
  const root = readObject(issues, value, path);
  if (!root) return { ok: false, issues: issues.issues };
  if (root.schema !== SESSION_SCHEMA) issues.add(`${path}.schema`, `Expected "${SESSION_SCHEMA}".`);
  if (root.version !== 1 && root.version !== SESSION_VERSION) {
    issues.add(
      `${path}.version`,
      typeof root.version === "number"
        ? `Unsupported session version ${root.version}. This simulator reads version ${SESSION_VERSION}.`
        : "Missing session version.",
    );
  }
  const showPackage = parseShowPackage(root.showPackage, issues, `${path}.showPackage`);
  const venueId = readString(issues, root.venueId, `${path}.venueId`, { maxLength: 80, allowEmpty: false });
  const cameraId = readString(issues, root.cameraId, `${path}.cameraId`, { maxLength: 80, allowEmpty: false });

  const speedsRaw = readObject(issues, root.speeds, `${path}.speeds`);
  const speeds: Partial<SpeedLevels> = {};
  if (speedsRaw) {
    for (const axis of ["pan", "tilt", "zoom", "preset"] as const) {
      const v = readInteger(issues, speedsRaw[axis], `${path}.speeds.${axis}`, { min: SPEED_LEVEL_MIN, max: SPEED_LEVEL_MAX });
      if (v !== null) speeds[axis] = v;
    }
  }

  const poseRaw = readObject(issues, root.pose, `${path}.pose`);
  const pose = poseRaw
    ? {
        pan: readNumber(issues, poseRaw.pan, `${path}.pose.pan`, { min: -180, max: 180 }),
        tilt: readNumber(issues, poseRaw.tilt, `${path}.pose.tilt`, { min: -90, max: 90 }),
        lens: readNumber(issues, poseRaw.lens, `${path}.pose.lens`, { min: 0, max: 1 }),
      }
    : null;

  const presets: Preset[] = [];
  if (!Array.isArray(root.presets)) {
    issues.add(`${path}.presets`, "Expected a list of presets.");
  } else if (root.presets.length > PRESET_SLOTS) {
    issues.add(`${path}.presets`, `At most ${PRESET_SLOTS} presets.`);
  } else {
    const seen = new Set<number>();
    root.presets.forEach((raw, index) => {
      const preset = parsePreset(issues, raw, `${path}.presets[${index}]`);
      if (!preset) return;
      if (seen.has(preset.slot)) issues.add(`${path}.presets[${index}].slot`, `Preset slot ${preset.slot} appears twice.`);
      seen.add(preset.slot);
      presets.push(preset);
    });
  }

  const performerRaw = readObject(issues, root.performer, `${path}.performer`);
  const performer = performerRaw
    ? {
        mode: readEnum(issues, performerRaw.mode, `${path}.performer.mode`, ["mark", "path"] as const),
        markId: readEnum(issues, performerRaw.markId, `${path}.performer.markId`, MARK_IDS),
        pathId: readEnum(issues, performerRaw.pathId, `${path}.performer.pathId`, PATH_IDS),
        walkSpeed: readNumber(issues, performerRaw.walkSpeed, `${path}.performer.walkSpeed`, { min: 0.3, max: 3 }),
        height: readNumber(issues, performerRaw.height, `${path}.performer.height`, { min: 1.2, max: 2.3 }),
        pauseS: readNumber(issues, performerRaw.pauseS, `${path}.performer.pauseS`, { min: 0, max: 20 }),
      }
    : null;

  const exerciseSettings = parseSettings(issues, root.exerciseSettings, `${path}.exerciseSettings`);

  const exerciseResults: ExerciseResult[] = [];
  if (!Array.isArray(root.exerciseResults)) {
    issues.add(`${path}.exerciseResults`, "Expected a list of exercise results.");
  } else if (root.exerciseResults.length > MAX_EXERCISE_RESULTS) {
    issues.add(`${path}.exerciseResults`, `At most ${MAX_EXERCISE_RESULTS} results.`);
  } else {
    root.exerciseResults.forEach((raw, index) => {
      const result = parseResult(issues, raw, `${path}.exerciseResults[${index}]`);
      if (result) exerciseResults.push(result);
    });
  }

  const preferencesRaw = readObject(issues, root.preferences, `${path}.preferences`);
  let preferences: Session["preferences"] | null = null;
  if (preferencesRaw) {
    const unit = readEnum(issues, preferencesRaw.unit, `${path}.preferences.unit`, ["ft", "m"] as const);
    const guidesRaw = readObject(issues, preferencesRaw.guides, `${path}.preferences.guides`);
    const guides = guidesRaw
      ? {
          safeArea: readBoolean(issues, guidesRaw.safeArea, `${path}.preferences.guides.safeArea`),
          centre: readBoolean(issues, guidesRaw.centre, `${path}.preferences.guides.centre`),
          thirds: readBoolean(issues, guidesRaw.thirds, `${path}.preferences.guides.thirds`),
        }
      : null;
    if (unit && guides && guides.safeArea !== null && guides.centre !== null && guides.thirds !== null) {
      preferences = { unit, guides: { safeArea: guides.safeArea, centre: guides.centre, thirds: guides.thirds } };
    }
  }

  if (
    !issues.ok ||
    !venueId ||
    !cameraId ||
    !pose ||
    pose.pan === null ||
    pose.tilt === null ||
    pose.lens === null ||
    !performer ||
    !exerciseSettings ||
    !preferences
  ) {
    return { ok: false, issues: issues.issues };
  }
  return {
    ok: true,
    session: {
      schema: SESSION_SCHEMA,
      version: SESSION_VERSION,
      venueId,
      cameraId,
      speeds: speeds as SpeedLevels,
      pose: { pan: pose.pan, tilt: pose.tilt, lens: pose.lens },
      presets: presets.sort((a, b) => a.slot - b.slot),
      showPackage,
      performer: performer as PerformerConfig,
      exerciseSettings,
      exerciseResults,
      preferences,
    },
  };
}
