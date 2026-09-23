import { type CameraProfile, defaultCameraProfile, parseCameraProfile } from "./camera";
import { defaultSession, parseSession, type Session } from "./session";
import { type Issue, IssueList, isPlainObject } from "./validate";
import { defaultVenueProfile, parseVenueProfile, type VenueProfile } from "./venue";

// A saved project is three versioned records: the venue profile, the camera profile and the
// session. Imports are validated completely before anything replaces the open session.

export const PROJECT_SCHEMA = "fmp-camera-simulator.project";
export const PROJECT_VERSION = 1;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export interface Project {
  venue: VenueProfile;
  camera: CameraProfile;
  session: Session;
}

export interface ProjectFile extends Project {
  schema: typeof PROJECT_SCHEMA;
  version: typeof PROJECT_VERSION;
  exportedAt: string;
  app: string;
}

export function defaultProject(): Project {
  const venue = defaultVenueProfile();
  const camera = defaultCameraProfile();
  return { venue, camera, session: defaultSession(venue.id, camera.id) };
}

export function toProjectFile(project: Project, exportedAt = new Date().toISOString()): ProjectFile {
  return {
    schema: PROJECT_SCHEMA,
    version: PROJECT_VERSION,
    exportedAt,
    app: "FMP Camera Simulator v1",
    venue: structuredClone(project.venue),
    camera: structuredClone(project.camera),
    session: structuredClone(project.session),
  };
}

export type ParseResult = { ok: true; project: Project } | { ok: false; issues: Issue[] };

/** Validates a parsed JSON value as a project file, including cross-record consistency. */
export function parseProject(value: unknown): ParseResult {
  if (!isPlainObject(value)) {
    return { ok: false, issues: [{ path: "project", message: "The file does not contain a simulator project." }] };
  }
  if (value.schema !== PROJECT_SCHEMA) {
    return {
      ok: false,
      issues: [{ path: "project.schema", message: `This is not an FMP Camera Simulator project (expected "${PROJECT_SCHEMA}").` }],
    };
  }
  if (value.version !== PROJECT_VERSION) {
    return {
      ok: false,
      issues: [
        {
          path: "project.version",
          message:
            typeof value.version === "number"
              ? `Unsupported project version ${value.version}. This simulator reads version ${PROJECT_VERSION}.`
              : "Missing project version.",
        },
      ],
    };
  }
  const issues = new IssueList();
  const venue = parseVenueProfile(value.venue, "venue");
  const camera = parseCameraProfile(value.camera, "camera");
  const session = parseSession(value.session, "session");
  if (!venue.ok) issues.issues.push(...venue.issues);
  if (!camera.ok) issues.issues.push(...camera.issues);
  if (!session.ok) issues.issues.push(...session.issues);
  if (!venue.ok || !camera.ok || !session.ok) return { ok: false, issues: issues.issues };

  if (session.session.venueId !== venue.venue.id) {
    issues.add("session.venueId", `The session refers to venue "${session.session.venueId}", but the file holds "${venue.venue.id}".`);
  }
  if (session.session.cameraId !== camera.camera.id) {
    issues.add("session.cameraId", `The session refers to camera "${session.session.cameraId}", but the file holds "${camera.camera.id}".`);
  }
  session.session.presets.forEach((preset, index) => {
    if (preset.cameraId !== camera.camera.id) {
      issues.add(
        `session.presets[${index}].cameraId`,
        `Preset ${preset.slot} belongs to camera "${preset.cameraId}", not "${camera.camera.id}".`,
      );
    }
  });
  if (!issues.ok) return { ok: false, issues: issues.issues };
  return { ok: true, project: { venue: venue.venue, camera: camera.camera, session: session.session } };
}

/** Parses JSON text from an import or storage. Never throws. */
export function parseProjectText(text: string): ParseResult {
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, issues: [{ path: "project", message: "The file is larger than 2 MB, which is too large for a simulator project." }] };
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, issues: [{ path: "project", message: "The file is not valid JSON." }] };
  }
  return parseProject(value);
}

export function serializeProject(project: Project, exportedAt?: string): string {
  return `${JSON.stringify(toProjectFile(project, exportedAt), null, 2)}\n`;
}
