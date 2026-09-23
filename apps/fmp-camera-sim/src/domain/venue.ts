import { type Dimension, type EvidenceStatus, SETTLED_VENUE_STATUSES, VENUE_STATUS_OPTIONS } from "./evidence";
import { ftToM, mToFt } from "./units";
import { type Issue, IssueList, readEnum, readNumber, readObject, readString } from "./validate";

export const VENUE_SCHEMA = "fmp-camera-simulator.venue";
export const VENUE_VERSION = 1;

export type DistanceBasis = "horizontal" | "line-of-sight";
export type MountOrientation = "upright" | "inverted";

export const DISTANCE_BASES: readonly DistanceBasis[] = ["horizontal", "line-of-sight"];
export const MOUNT_ORIENTATIONS: readonly MountOrientation[] = ["upright", "inverted"];

/**
 * Stage coordinates in metres. The origin is the centre of the downstage edge (DSE) at deck height.
 * - right: toward stage right, the performer's right when facing the house. From the catwalk this
 *   is house left, so it appears on the left of the camera picture.
 * - upstage: away from the house. Negative values are downstage of the DSE, in the pit and bowl.
 * - height: above the stage deck.
 */
export interface StagePoint {
  right: number;
  upstage: number;
  height: number;
}

export type DimensionKey =
  | "cameraToDse"
  | "stageDepth"
  | "stageWidth"
  | "cameraHeight"
  | "cameraLateral"
  | "deckHeight"
  | "pitDepth";

export interface VenueProfile {
  schema: typeof VENUE_SCHEMA;
  version: typeof VENUE_VERSION;
  id: string;
  name: string;
  dimensions: Record<DimensionKey, Dimension>;
  /** Which distance the camera-to-DSE figure describes. */
  distanceBasis: { value: DistanceBasis; status: EvidenceStatus; note: string };
  mount: {
    orientation: MountOrientation;
    /** Direction pan 0° points, measured clockwise from the stage centreline (toward upstage). */
    panZeroBearingDeg: number;
    status: EvidenceStatus;
    note: string;
  };
  /** Reference only. Never used to calculate optical distance. */
  reference: { cableRoute: string };
}

export interface DimensionSpec {
  key: DimensionKey;
  label: string;
  help: string;
  /** Allowed range in metres. */
  min: number;
  max: number;
  /** Signed values are allowed (lateral offset). */
  signed?: boolean;
  /** Critical dimensions keep the "Approximate venue" indicator on until measured or confirmed. */
  critical: boolean;
}

export const DIMENSION_SPECS: readonly DimensionSpec[] = [
  {
    key: "cameraToDse",
    label: "Camera to downstage edge",
    help: "From the P240 lens to the centre of the downstage edge (the stage origin), on the basis chosen below.",
    min: ftToM(20),
    max: ftToM(400),
    critical: true,
  },
  {
    key: "cameraHeight",
    label: "Camera height above stage",
    help: "P240 lens height above the stage deck.",
    min: 0,
    max: ftToM(150),
    critical: true,
  },
  {
    key: "cameraLateral",
    label: "Camera lateral offset",
    help: "Positive toward stage right (house left). Negative toward stage left (house right).",
    min: ftToM(-150),
    max: ftToM(150),
    signed: true,
    critical: true,
  },
  {
    key: "stageWidth",
    label: "Stage width",
    help: "Stage-left to stage-right width of the performance deck.",
    min: ftToM(10),
    max: ftToM(250),
    critical: true,
  },
  {
    key: "stageDepth",
    label: "Stage depth",
    help: "Downstage edge to the upstage limit of the performance deck.",
    min: ftToM(10),
    max: ftToM(200),
    critical: true,
  },
  {
    key: "deckHeight",
    label: "Deck height above pit floor",
    help: "Shapes the pit and bowl drawing only. It does not move the camera.",
    min: 0,
    max: ftToM(12),
    critical: false,
  },
  {
    key: "pitDepth",
    label: "Pit depth",
    help: "Downstage edge to the front of the reserved seating. Varies per show; schematic only.",
    min: 0,
    max: ftToM(60),
    critical: false,
  },
];

export const DIMENSION_SPEC_BY_KEY: Record<DimensionKey, DimensionSpec> = Object.fromEntries(
  DIMENSION_SPECS.map((spec) => [spec.key, spec]),
) as Record<DimensionKey, DimensionSpec>;

export function defaultVenueProfile(): VenueProfile {
  return {
    schema: VENUE_SCHEMA,
    version: VENUE_VERSION,
    id: "fmp",
    name: "Freedom Mortgage Pavilion",
    dimensions: {
      cameraToDse: {
        value: ftToM(110),
        status: "estimated",
        note: "Reported as 100–120 ft from the catwalk camera to the downstage edge. Not yet measured, and the report does not say whether it is horizontal or line of sight.",
      },
      cameraHeight: {
        value: ftToM(35),
        status: "demo",
        note: "Unknown. Demo value until the catwalk lens height above the stage deck is measured.",
      },
      cameraLateral: {
        value: 0,
        status: "demo",
        note: "Centred on the stage centreline as a demo assumption.",
      },
      stageWidth: {
        value: ftToM(61),
        status: "estimated",
        note: "Scale reading of Live Nation's published Stage & Pit plan, about ±2–5 ft. The plan does not annotate the deck edge, so this is not a certified stage dimension.",
      },
      stageDepth: {
        value: ftToM(75),
        status: "inferred",
        note: "Inferred from a video-office comment. The Stage & Pit plan reads about 113 ft for the whole stage rectangle, which likely includes upstage and backstage area, so it is not used as the performance depth.",
      },
      deckHeight: {
        value: ftToM(5),
        status: "demo",
        note: "Not published. Demo value for drawing the pit and bowl.",
      },
      pitDepth: {
        value: ftToM(12),
        status: "demo",
        note: "The pit and barricade line change per show. Public seating guides place the pit in front of sections 101–103.",
      },
    },
    distanceBasis: {
      value: "horizontal",
      status: "demo",
      note: "The reported 100–120 ft has not established whether it is horizontal or line of sight. Horizontal is a demo assumption.",
    },
    mount: {
      orientation: "upright",
      panZeroBearingDeg: 0,
      status: "demo",
      note: "Mount orientation and pan-zero heading are not established. Upright, with pan 0° on the stage centreline, is a demo assumption.",
    },
    reference: {
      cableRoute:
        "SDI from the catwalk head across the ceiling to the video office, reaching ATEM Input 4. Traced on site in 2025. Reference only: cable length is never used as optical distance.",
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

const describeFt = (metres: number) => `${Math.round(mToFt(metres))} ft`;

/** Validates an untrusted value as a venue profile. Returns every issue with its field path. */
export function parseVenueProfile(
  value: unknown,
  path = "venue",
): { ok: true; venue: VenueProfile } | { ok: false; issues: Issue[] } {
  const issues = new IssueList();
  const root = readObject(issues, value, path);
  if (!root) return { ok: false, issues: issues.issues };
  if (root.schema !== VENUE_SCHEMA) {
    issues.add(`${path}.schema`, `Expected "${VENUE_SCHEMA}".`);
  }
  if (root.version !== VENUE_VERSION) {
    issues.add(
      `${path}.version`,
      typeof root.version === "number"
        ? `Unsupported venue profile version ${root.version}. This simulator reads version ${VENUE_VERSION}.`
        : "Missing venue profile version.",
    );
  }
  const id = readString(issues, root.id, `${path}.id`, { maxLength: 80, allowEmpty: false });
  const name = readString(issues, root.name, `${path}.name`, { maxLength: 160, allowEmpty: false });

  const dimensionsRoot = readObject(issues, root.dimensions, `${path}.dimensions`);
  const dimensions = {} as Record<DimensionKey, Dimension>;
  if (dimensionsRoot) {
    for (const spec of DIMENSION_SPECS) {
      const dimPath = `${path}.dimensions.${spec.key}`;
      const raw = readObject(issues, dimensionsRoot[spec.key], dimPath);
      if (!raw) continue;
      const dimValue = readNumber(issues, raw.value, `${dimPath}.value`, {
        min: spec.min,
        max: spec.max,
        describe: describeFt,
      });
      const status = readEnum(issues, raw.status, `${dimPath}.status`, VENUE_STATUS_OPTIONS);
      const note = readString(issues, raw.note, `${dimPath}.note`);
      if (dimValue !== null && status && note !== null) {
        dimensions[spec.key] = { value: dimValue, status, note };
      }
    }
  }

  const basisRoot = readObject(issues, root.distanceBasis, `${path}.distanceBasis`);
  const basis = basisRoot
    ? {
        value: readEnum(issues, basisRoot.value, `${path}.distanceBasis.value`, DISTANCE_BASES),
        status: readEnum(issues, basisRoot.status, `${path}.distanceBasis.status`, VENUE_STATUS_OPTIONS),
        note: readString(issues, basisRoot.note, `${path}.distanceBasis.note`),
      }
    : null;

  const mountRoot = readObject(issues, root.mount, `${path}.mount`);
  const mount = mountRoot
    ? {
        orientation: readEnum(issues, mountRoot.orientation, `${path}.mount.orientation`, MOUNT_ORIENTATIONS),
        panZeroBearingDeg: readNumber(issues, mountRoot.panZeroBearingDeg, `${path}.mount.panZeroBearingDeg`, {
          min: -180,
          max: 180,
          describe: (v) => `${v}°`,
        }),
        status: readEnum(issues, mountRoot.status, `${path}.mount.status`, VENUE_STATUS_OPTIONS),
        note: readString(issues, mountRoot.note, `${path}.mount.note`),
      }
    : null;

  const referenceRoot = readObject(issues, root.reference, `${path}.reference`);
  const cableRoute = referenceRoot
    ? readString(issues, referenceRoot.cableRoute, `${path}.reference.cableRoute`)
    : null;

  if (!issues.ok || !id || !name || !basis || !mount || cableRoute === null) {
    return { ok: false, issues: issues.issues };
  }
  const venue: VenueProfile = {
    schema: VENUE_SCHEMA,
    version: VENUE_VERSION,
    id,
    name,
    dimensions,
    distanceBasis: {
      value: basis.value as DistanceBasis,
      status: basis.status as EvidenceStatus,
      note: basis.note as string,
    },
    mount: {
      orientation: mount.orientation as MountOrientation,
      panZeroBearingDeg: mount.panZeroBearingDeg as number,
      status: mount.status as EvidenceStatus,
      note: mount.note as string,
    },
    reference: { cableRoute },
  };
  const geometry = deriveVenueGeometry(venue, path);
  if (!geometry.ok) return { ok: false, issues: geometry.issues };
  return { ok: true, venue };
}

// ---------------------------------------------------------------------------------------------
// Derived geometry
// ---------------------------------------------------------------------------------------------

export type MarkId = "DSR" | "DSC" | "DSL" | "CSR" | "CS" | "CSL" | "USR" | "USC" | "USL";

export interface StageMark {
  id: MarkId;
  label: string;
  point: StagePoint;
}

export interface VenueGeometry {
  /** P240 lens position. */
  camera: StagePoint;
  /** Plan (horizontal) distance from the lens to the stage origin. */
  horizontalDistance: number;
  /** Straight-line distance from the lens to the stage origin. */
  lineOfSight: number;
  /** Depression angle from the lens to the stage origin, degrees below horizontal. */
  depressionToOriginDeg: number;
  stageWidth: number;
  stageDepth: number;
  deckHeight: number;
  pitDepth: number;
  marks: StageMark[];
  mountOrientation: MountOrientation;
  panZeroBearingDeg: number;
}

const MARK_ROWS: ReadonlyArray<{ prefix: "DS" | "CS" | "US"; name: string; fraction: number }> = [
  { prefix: "DS", name: "Downstage", fraction: 0.12 },
  { prefix: "CS", name: "Centre stage", fraction: 0.35 },
  { prefix: "US", name: "Upstage", fraction: 0.6 },
];

const MARK_COLUMNS: ReadonlyArray<{ suffix: "R" | "C" | "L"; name: string; fraction: number }> = [
  { suffix: "R", name: "right", fraction: 0.3 },
  { suffix: "C", name: "centre", fraction: 0 },
  { suffix: "L", name: "left", fraction: -0.3 },
];

export function stageMarks(stageWidth: number, stageDepth: number): StageMark[] {
  const marks: StageMark[] = [];
  for (const row of MARK_ROWS) {
    for (const column of MARK_COLUMNS) {
      const id = (row.prefix === "CS" && column.suffix === "C"
        ? "CS"
        : column.suffix === "C"
          ? `${row.prefix}C`
          : `${row.prefix}${column.suffix}`) as MarkId;
      const label =
        row.prefix === "CS" && column.suffix === "C"
          ? "Centre stage"
          : column.suffix === "C"
            ? `${row.name} centre`
            : `${row.name} ${column.name}`;
      marks.push({
        id,
        label,
        point: { right: column.fraction * stageWidth, upstage: row.fraction * stageDepth, height: 0 },
      });
    }
  }
  return marks;
}

const MIN_HOUSE_SEPARATION = ftToM(5);

export function deriveVenueGeometry(
  venue: VenueProfile,
  path = "venue",
): { ok: true; geometry: VenueGeometry } | { ok: false; issues: Issue[] } {
  const issues = new IssueList();
  const d = venue.dimensions;
  const distance = d.cameraToDse.value;
  const height = d.cameraHeight.value;
  const lateral = d.cameraLateral.value;

  let plan = distance;
  if (venue.distanceBasis.value === "line-of-sight") {
    const planSquared = distance * distance - height * height;
    if (planSquared <= MIN_HOUSE_SEPARATION * MIN_HOUSE_SEPARATION) {
      issues.add(
        `${path}.dimensions.cameraToDse.value`,
        `A line-of-sight distance must be longer than the camera height (${Math.round(mToFt(height))} ft).`,
      );
    } else {
      plan = Math.sqrt(planSquared);
    }
  }
  const upstageSquared = plan * plan - lateral * lateral;
  if (issues.ok && upstageSquared <= MIN_HOUSE_SEPARATION * MIN_HOUSE_SEPARATION) {
    issues.add(
      `${path}.dimensions.cameraLateral.value`,
      "The lateral offset must be smaller than the camera's horizontal distance to the downstage edge.",
    );
  }
  if (!issues.ok) return { ok: false, issues: issues.issues };

  const houseDistance = Math.sqrt(upstageSquared);
  const camera: StagePoint = { right: lateral, upstage: -houseDistance, height };
  const lineOfSight = Math.sqrt(plan * plan + height * height);
  return {
    ok: true,
    geometry: {
      camera,
      horizontalDistance: plan,
      lineOfSight,
      depressionToOriginDeg: (Math.atan2(height, plan) * 180) / Math.PI,
      stageWidth: d.stageWidth.value,
      stageDepth: d.stageDepth.value,
      deckHeight: d.deckHeight.value,
      pitDepth: d.pitDepth.value,
      marks: stageMarks(d.stageWidth.value, d.stageDepth.value),
      mountOrientation: venue.mount.orientation,
      panZeroBearingDeg: venue.mount.panZeroBearingDeg,
    },
  };
}

/** Critical items that are still estimates or placeholders. Empty means the venue is settled. */
export function unsettledVenueItems(venue: VenueProfile): string[] {
  const items: string[] = [];
  for (const spec of DIMENSION_SPECS) {
    if (spec.critical && !SETTLED_VENUE_STATUSES.has(venue.dimensions[spec.key].status)) items.push(spec.label);
  }
  if (!SETTLED_VENUE_STATUSES.has(venue.distanceBasis.status)) items.push("Distance basis");
  if (!SETTLED_VENUE_STATUSES.has(venue.mount.status)) items.push("Mount orientation");
  return items;
}
