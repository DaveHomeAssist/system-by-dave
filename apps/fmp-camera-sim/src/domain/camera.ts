import { type EvidenceStatus } from "./evidence";
import { clamp, DEG } from "./units";
import { type Issue, IssueList, readBoolean, readEnum, readNumber, readObject, readString } from "./validate";

export const CAMERA_SCHEMA = "fmp-camera-simulator.camera";
export const CAMERA_VERSION = 1;

export type PresetEasing = "smoothstep" | "smootherstep" | "linear";
export const PRESET_EASINGS: readonly PresetEasing[] = ["smoothstep", "smootherstep", "linear"];

/** SuperJoy-style training speed scale, as used by the existing 3D SuperJoy trainer. */
export const SPEED_LEVEL_MIN = 1;
export const SPEED_LEVEL_MAX = 8;

/** Figures from the manufacturer's published specification. Read-only in the interface. */
export interface PublishedSpec {
  panMinDeg: number;
  panMaxDeg: number;
  tiltMinDeg: number;
  tiltMaxDeg: number;
  panMaxSpeedDegS: number;
  tiltMaxSpeedDegS: number;
  presetMaxSpeedDegS: number;
  minSpeedDegS: number;
  hfovWideDeg: number;
  hfovTeleDeg: number;
  focalWideMm: number;
  focalTeleMm: number;
  presetCount: number;
  source: { label: string; url: string; retrieved: string };
}

/** Operating limits, which may be narrower than the published travel. */
export interface OperatingLimits {
  panMinDeg: number;
  panMaxDeg: number;
  tiltMinDeg: number;
  tiltMaxDeg: number;
  status: EvidenceStatus;
  note: string;
}

/** How the simulated head responds. None of this is calibrated against the installed camera. */
export interface Behaviour {
  /** Joystick deflection is raised to this power before scaling to speed. 1 = linear. */
  curveExponent: number;
  /** Deflection inside this fraction produces no movement. */
  deadband: number;
  /** Time to reach the commanded speed from rest. */
  rampUpS: number;
  /** Time to stop from the commanded speed once input is released. */
  stopS: number;
  /** Pan speed at training level 1. Level 8 is the published manual maximum. */
  panLevel1DegS: number;
  /** Full wide-to-tele travel time at zoom speed level 8. */
  zoomFastTravelS: number;
  /** Full wide-to-tele travel time at zoom speed level 1. */
  zoomSlowTravelS: number;
  zoomRampS: number;
  /** 0 = pan/tilt speed ignores zoom; 1 = speed scales with the frame width. */
  zoomAdaptiveStrength: number;
  /** Preset travel speed at training level 1. Level 8 is the published preset maximum. */
  presetLevel1DegS: number;
  presetMinDurationS: number;
  presetEasing: PresetEasing;
  /** Tele Convert: modelled as a fixed 2x sensor crop across the zoom range. Unverified. */
  teleConvert: boolean;
  status: EvidenceStatus;
  note: string;
}

export interface CameraProfile {
  schema: typeof CAMERA_SCHEMA;
  version: typeof CAMERA_VERSION;
  /** Camera identity stored with every preset. */
  id: string;
  label: string;
  model: string;
  published: PublishedSpec;
  limits: OperatingLimits;
  behaviour: Behaviour;
  calibration: { status: "uncalibrated" | "calibrated"; note: string };
}

export const P240_PUBLISHED: PublishedSpec = Object.freeze({
  panMinDeg: -175,
  panMaxDeg: 175,
  tiltMinDeg: -30,
  tiltMaxDeg: 90,
  panMaxSpeedDegS: 100,
  tiltMaxSpeedDegS: 50,
  presetMaxSpeedDegS: 150,
  minSpeedDegS: 0.05,
  hfovWideDeg: 70.2,
  hfovTeleDeg: 4.1,
  focalWideMm: 4.4,
  focalTeleMm: 88.4,
  presetCount: 128,
  source: Object.freeze({
    label: "BirdDog P240 technical specifications",
    url: "https://birddog.tv/p240-techspecs/",
    retrieved: "2026-09-23",
  }),
}) as PublishedSpec;

export function defaultCameraProfile(): CameraProfile {
  return {
    schema: CAMERA_SCHEMA,
    version: CAMERA_VERSION,
    id: "fmp-cam4-p240",
    label: "Camera 4 · Catwalk PTZ",
    model: "BirdDog P240",
    published: { ...P240_PUBLISHED, source: { ...P240_PUBLISHED.source } },
    limits: {
      panMinDeg: P240_PUBLISHED.panMinDeg,
      panMaxDeg: P240_PUBLISHED.panMaxDeg,
      tiltMinDeg: P240_PUBLISHED.tiltMinDeg,
      tiltMaxDeg: P240_PUBLISHED.tiltMaxDeg,
      status: "published",
      note: "Published P240 travel. No venue movement restriction is recorded for Camera 4.",
    },
    behaviour: {
      curveExponent: 1.8,
      deadband: 0.06,
      rampUpS: 0.25,
      stopS: 0.2,
      panLevel1DegS: 2,
      zoomFastTravelS: 2.4,
      zoomSlowTravelS: 40,
      zoomRampS: 0.15,
      zoomAdaptiveStrength: 1,
      presetLevel1DegS: 5,
      presetMinDurationS: 0.5,
      presetEasing: "smoothstep",
      teleConvert: false,
      status: "uncalibrated",
      note: "Response curve, stopping time, zoom speed and preset travel are training assumptions. They have not been compared with the installed P240 or the SuperJoy.",
    },
    calibration: {
      status: "uncalibrated",
      note: "Not yet compared against the installed Camera 4.",
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Lens model
// ---------------------------------------------------------------------------------------------

export const MONITOR_ASPECT = 16 / 9;

/**
 * Horizontal half-angle tangent at a lens position from 0 (wide) to 1 (tele). The image width
 * interpolates geometrically between the published wide and tele fields of view, which is how a
 * focal length that changes at a constant zoom ratio behaves. Both published endpoints are exact.
 */
export function tanHalfHfov(profile: CameraProfile, lens: number): number {
  const p = clamp(lens, 0, 1);
  const wide = Math.tan((profile.published.hfovWideDeg * DEG) / 2);
  const tele = Math.tan((profile.published.hfovTeleDeg * DEG) / 2);
  const crop = profile.behaviour.teleConvert ? 0.5 : 1;
  return wide * Math.pow(tele / wide, p) * crop;
}

export interface LensState {
  lens: number;
  hfovDeg: number;
  vfovDeg: number;
  focalMm: number;
  zoomRatio: number;
}

export function lensState(profile: CameraProfile, lens: number): LensState {
  const p = clamp(lens, 0, 1);
  const tanH = tanHalfHfov(profile, p);
  const tanV = tanH / MONITOR_ASPECT;
  const crop = profile.behaviour.teleConvert ? 2 : 1;
  const focal = profile.published.focalWideMm * Math.pow(profile.published.focalTeleMm / profile.published.focalWideMm, p);
  return {
    lens: p,
    hfovDeg: (2 * Math.atan(tanH)) / DEG,
    vfovDeg: (2 * Math.atan(tanV)) / DEG,
    focalMm: focal * crop,
    zoomRatio: (focal / profile.published.focalWideMm) * crop,
  };
}

/** Lens position that produces a horizontal field of view (inverse of tanHalfHfov). */
export function lensForHfov(profile: CameraProfile, hfovDeg: number): number {
  const wide = Math.tan((profile.published.hfovWideDeg * DEG) / 2);
  const tele = Math.tan((profile.published.hfovTeleDeg * DEG) / 2);
  const crop = profile.behaviour.teleConvert ? 0.5 : 1;
  const target = Math.tan((hfovDeg * DEG) / 2) / crop;
  return clamp(Math.log(target / wide) / Math.log(tele / wide), 0, 1);
}

// ---------------------------------------------------------------------------------------------
// Speed tables (training scale 1-8, geometric between level 1 and the published maximum)
// ---------------------------------------------------------------------------------------------

const levelFraction = (level: number) =>
  (clamp(Math.round(level), SPEED_LEVEL_MIN, SPEED_LEVEL_MAX) - SPEED_LEVEL_MIN) / (SPEED_LEVEL_MAX - SPEED_LEVEL_MIN);

const geometric = (low: number, high: number, fraction: number) => low * Math.pow(high / low, fraction);

export function panSpeedForLevel(profile: CameraProfile, level: number): number {
  const { panMaxSpeedDegS } = profile.published;
  return geometric(Math.min(profile.behaviour.panLevel1DegS, panMaxSpeedDegS), panMaxSpeedDegS, levelFraction(level));
}

export function tiltSpeedForLevel(profile: CameraProfile, level: number): number {
  const { panMaxSpeedDegS, tiltMaxSpeedDegS } = profile.published;
  return panSpeedForLevel(profile, level) * (tiltMaxSpeedDegS / panMaxSpeedDegS);
}

/** Lens travel per second (full range = 1) at a zoom speed level. */
export function zoomRateForLevel(profile: CameraProfile, level: number): number {
  const { zoomFastTravelS, zoomSlowTravelS } = profile.behaviour;
  const travel = geometric(zoomSlowTravelS, Math.min(zoomFastTravelS, zoomSlowTravelS), levelFraction(level));
  return 1 / travel;
}

export function presetSpeedForLevel(profile: CameraProfile, level: number): number {
  const { presetMaxSpeedDegS } = profile.published;
  return geometric(Math.min(profile.behaviour.presetLevel1DegS, presetMaxSpeedDegS), presetMaxSpeedDegS, levelFraction(level));
}

/** Zoom-adaptive scale for pan/tilt speed: 1 at wide, proportional to frame width at strength 1. */
export function zoomSpeedFactor(profile: CameraProfile, lens: number): number {
  const ratio = tanHalfHfov(profile, lens) / Math.tan((profile.published.hfovWideDeg * DEG) / 2);
  return Math.pow(Math.min(1, ratio), clamp(profile.behaviour.zoomAdaptiveStrength, 0, 1));
}

/** Tilt limits after mounting. An inverted head with E-Flip looks down as far as it could look up. */
export function effectiveTiltLimits(profile: CameraProfile, orientation: "upright" | "inverted"): { min: number; max: number } {
  const { tiltMinDeg, tiltMaxDeg } = profile.limits;
  return orientation === "inverted" ? { min: -tiltMaxDeg, max: -tiltMinDeg } : { min: tiltMinDeg, max: tiltMaxDeg };
}

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

export interface BehaviourSpec {
  key: keyof Omit<Behaviour, "status" | "note" | "presetEasing" | "teleConvert">;
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

export const BEHAVIOUR_SPECS: readonly BehaviourSpec[] = [
  { key: "curveExponent", label: "Response curve", help: "1 is linear; higher gives finer control near centre.", min: 1, max: 3.5, step: 0.1, unit: "power" },
  { key: "deadband", label: "Deadband", help: "Joystick travel ignored around centre.", min: 0, max: 0.25, step: 0.01, unit: "of travel" },
  { key: "rampUpS", label: "Acceleration time", help: "Time to reach the commanded speed.", min: 0.02, max: 1.5, step: 0.01, unit: "s" },
  { key: "stopS", label: "Stopping time", help: "Time to stop after release.", min: 0.02, max: 1.5, step: 0.01, unit: "s" },
  { key: "panLevel1DegS", label: "Pan speed at level 1", help: "Level 8 is the published 100°/s manual maximum.", min: 0.05, max: 20, step: 0.05, unit: "°/s" },
  { key: "zoomFastTravelS", label: "Zoom travel at level 8", help: "Wide to tele at the fastest zoom speed. Preset recalls zoom at this speed.", min: 0.5, max: 20, step: 0.1, unit: "s" },
  { key: "zoomSlowTravelS", label: "Zoom travel at level 1", help: "Wide to tele at the slowest zoom speed.", min: 2, max: 120, step: 1, unit: "s" },
  { key: "zoomRampS", label: "Zoom ramp", help: "Time for zoom to reach speed or stop.", min: 0.02, max: 1, step: 0.01, unit: "s" },
  { key: "zoomAdaptiveStrength", label: "Zoom-adaptive sensitivity", help: "0 ignores zoom; 1 keeps on-screen speed constant.", min: 0, max: 1, step: 0.05, unit: "strength" },
  { key: "presetLevel1DegS", label: "Preset speed at level 1", help: "Level 8 is the published 150°/s preset maximum.", min: 0.5, max: 60, step: 0.5, unit: "°/s" },
  { key: "presetMinDurationS", label: "Minimum preset travel", help: "Shortest time a recall takes.", min: 0.1, max: 5, step: 0.1, unit: "s" },
];

export function parseCameraProfile(
  value: unknown,
  path = "camera",
): { ok: true; camera: CameraProfile } | { ok: false; issues: Issue[] } {
  const issues = new IssueList();
  const root = readObject(issues, value, path);
  if (!root) return { ok: false, issues: issues.issues };
  if (root.schema !== CAMERA_SCHEMA) issues.add(`${path}.schema`, `Expected "${CAMERA_SCHEMA}".`);
  if (root.version !== CAMERA_VERSION) {
    issues.add(
      `${path}.version`,
      typeof root.version === "number"
        ? `Unsupported camera profile version ${root.version}. This simulator reads version ${CAMERA_VERSION}.`
        : "Missing camera profile version.",
    );
  }
  const id = readString(issues, root.id, `${path}.id`, { maxLength: 80, allowEmpty: false });
  const label = readString(issues, root.label, `${path}.label`, { maxLength: 120, allowEmpty: false });
  const model = readString(issues, root.model, `${path}.model`, { maxLength: 80, allowEmpty: false });

  // Published figures are fixed facts about the P240; an import may not rewrite them.
  const publishedRoot = readObject(issues, root.published, `${path}.published`);
  if (publishedRoot) {
    for (const key of Object.keys(P240_PUBLISHED) as (keyof PublishedSpec)[]) {
      if (key === "source") continue;
      if (publishedRoot[key] !== P240_PUBLISHED[key]) {
        issues.add(`${path}.published.${key}`, `Published P240 value is ${String(P240_PUBLISHED[key])}.`);
      }
    }
  }

  const limitsRoot = readObject(issues, root.limits, `${path}.limits`);
  let limits: OperatingLimits | null = null;
  if (limitsRoot) {
    const pub = P240_PUBLISHED;
    const panMin = readNumber(issues, limitsRoot.panMinDeg, `${path}.limits.panMinDeg`, { min: pub.panMinDeg, max: pub.panMaxDeg });
    const panMax = readNumber(issues, limitsRoot.panMaxDeg, `${path}.limits.panMaxDeg`, { min: pub.panMinDeg, max: pub.panMaxDeg });
    const tiltMin = readNumber(issues, limitsRoot.tiltMinDeg, `${path}.limits.tiltMinDeg`, { min: pub.tiltMinDeg, max: pub.tiltMaxDeg });
    const tiltMax = readNumber(issues, limitsRoot.tiltMaxDeg, `${path}.limits.tiltMaxDeg`, { min: pub.tiltMinDeg, max: pub.tiltMaxDeg });
    const status = readEnum(issues, limitsRoot.status, `${path}.limits.status`, ["published", "measured", "confirmed", "estimated", "demo"] as const);
    const note = readString(issues, limitsRoot.note, `${path}.limits.note`);
    if (panMin !== null && panMax !== null && panMin >= panMax - 1) issues.add(`${path}.limits.panMaxDeg`, "Pan maximum must exceed pan minimum by at least 1°.");
    if (tiltMin !== null && tiltMax !== null && tiltMin >= tiltMax - 1) issues.add(`${path}.limits.tiltMaxDeg`, "Tilt maximum must exceed tilt minimum by at least 1°.");
    if (panMin !== null && panMax !== null && tiltMin !== null && tiltMax !== null && status && note !== null) {
      limits = { panMinDeg: panMin, panMaxDeg: panMax, tiltMinDeg: tiltMin, tiltMaxDeg: tiltMax, status, note };
    }
  }

  const behaviourRoot = readObject(issues, root.behaviour, `${path}.behaviour`);
  let behaviour: Behaviour | null = null;
  if (behaviourRoot) {
    const values: Partial<Behaviour> = {};
    for (const spec of BEHAVIOUR_SPECS) {
      const v = readNumber(issues, behaviourRoot[spec.key], `${path}.behaviour.${spec.key}`, { min: spec.min, max: spec.max });
      if (v !== null) (values as Record<string, number>)[spec.key] = v;
    }
    const easing = readEnum(issues, behaviourRoot.presetEasing, `${path}.behaviour.presetEasing`, PRESET_EASINGS);
    const teleConvert = readBoolean(issues, behaviourRoot.teleConvert, `${path}.behaviour.teleConvert`);
    const status = readEnum(issues, behaviourRoot.status, `${path}.behaviour.status`, ["uncalibrated", "measured"] as const);
    const note = readString(issues, behaviourRoot.note, `${path}.behaviour.note`);
    if (
      values.zoomFastTravelS !== undefined &&
      values.zoomSlowTravelS !== undefined &&
      values.zoomFastTravelS > values.zoomSlowTravelS
    ) {
      issues.add(`${path}.behaviour.zoomFastTravelS`, "Level 8 zoom travel must not be slower than level 1.");
    }
    if (issues.ok && easing && teleConvert !== null && status && note !== null) {
      behaviour = { ...(values as Behaviour), presetEasing: easing, teleConvert, status, note };
    }
  }

  const calibrationRoot = readObject(issues, root.calibration, `${path}.calibration`);
  const calibration = calibrationRoot
    ? {
        status: readEnum(issues, calibrationRoot.status, `${path}.calibration.status`, ["uncalibrated", "calibrated"] as const),
        note: readString(issues, calibrationRoot.note, `${path}.calibration.note`),
      }
    : null;

  if (!issues.ok || !id || !label || !model || !limits || !behaviour || !calibration?.status || calibration.note === null) {
    return { ok: false, issues: issues.issues };
  }
  const defaults = defaultCameraProfile();
  return {
    ok: true,
    camera: {
      schema: CAMERA_SCHEMA,
      version: CAMERA_VERSION,
      id,
      label,
      model,
      published: defaults.published,
      limits,
      behaviour,
      calibration: { status: calibration.status, note: calibration.note },
    },
  };
}

export function isCameraCalibrated(profile: CameraProfile): boolean {
  return profile.calibration.status === "calibrated" && profile.behaviour.status === "measured";
}

/** Reference metadata only: mass and sensor size do not imply calibrated optics or rigging capacity. */
export const P240_HARDWARE = Object.freeze({
  envelopeMm: Object.freeze([163, 199, 231] as const),
  massKg: 2.395,
  sensor: "1/2.5-inch CMOS, 8.5 MP",
  apertureWide: 2.0,
  apertureTele: 3.8,
  power: "12 VDC or PoE+ (IEEE 802.3at)",
  simultaneousPtzWatts: 22.5,
  source: P240_PUBLISHED.source,
});
