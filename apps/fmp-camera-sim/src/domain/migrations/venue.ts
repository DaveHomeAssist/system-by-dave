import { type Issue, IssueList, readObject } from "../validate";

/** Must match `VENUE_VERSION` in `../venue`. Kept local to avoid an import cycle. */
const CURRENT_VENUE_VERSION = 6;

/** Saved venue profile versions this simulator can still open. */
export type VenueSourceVersion = 1 | 2 | 3 | 4 | 5 | 6;

export const VENUE_SOURCE_VERSIONS: readonly VenueSourceVersion[] = [1, 2, 3, 4, 5, 6];

export function isVenueSourceVersion(value: unknown): value is VenueSourceVersion {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6;
}

/**
 * Normalize a venue root from any supported saved version toward the current field layout
 * before field reads. Does not validate values — only fills structural gaps so the parser can
 * read a single shape. Returns a shallow-cloned root with nested mount/reference copies when
 * those objects are rewritten.
 */
export function migrateVenueRootTowardCurrent(
  value: unknown,
  path: string,
  issues: IssueList,
): { ok: true; root: Record<string, unknown>; sourceVersion: VenueSourceVersion } | { ok: false; issues: Issue[] } {
  const root = readObject(issues, value, path);
  if (!root) return { ok: false, issues: issues.issues };

  if (!isVenueSourceVersion(root.version)) {
    issues.add(
      `${path}.version`,
      typeof root.version === "number"
        ? `Unsupported venue profile version ${root.version}. This simulator reads versions 1–${CURRENT_VENUE_VERSION}.`
        : "Missing venue profile version.",
    );
    return { ok: false, issues: issues.issues };
  }

  const sourceVersion = root.version;
  let next: Record<string, unknown> = { ...root };

  // v1–v2: mount evidence covered both orientation and heading. Promote that claim into
  // headingEvidence without inventing provenance the older file never stored.
  if (sourceVersion <= 2) {
    const mount = readObject(issues, next.mount, `${path}.mount`);
    if (mount && mount.headingEvidence === undefined) {
      next = {
        ...next,
        mount: {
          ...mount,
          headingEvidence: { status: mount.status, note: mount.note },
        },
      };
    }
  }

  // v1 had no geometryRevision field; treat those files as the legacy pavilion sketch.
  if (sourceVersion === 1) {
    const reference = readObject(issues, next.reference, `${path}.reference`);
    if (reference) {
      next = {
        ...next,
        reference: { ...reference, geometryRevision: "legacy-v1" },
      };
    }
  }

  next = { ...next, version: CURRENT_VENUE_VERSION };
  return { ok: true, root: next, sourceVersion };
}
