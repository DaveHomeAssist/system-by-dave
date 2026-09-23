import { type IssueList, readEnum, readObject, readString } from "./validate";

// Every venue dimension and camera parameter carries how we know it. The interface keeps
// estimates, placeholders and uncalibrated behaviour visible instead of presenting them as fact.

export type EvidenceStatus =
  | "measured"
  | "confirmed"
  | "published"
  | "estimated"
  | "inferred"
  | "demo"
  | "uncalibrated";

export const EVIDENCE_STATUSES: readonly EvidenceStatus[] = [
  "measured",
  "confirmed",
  "published",
  "estimated",
  "inferred",
  "demo",
  "uncalibrated",
];

export const EVIDENCE_LABELS: Record<EvidenceStatus, string> = {
  measured: "Measured",
  confirmed: "Confirmed",
  published: "Published spec",
  estimated: "Estimated",
  inferred: "Inferred",
  demo: "Demo value",
  uncalibrated: "Uncalibrated",
};

export const EVIDENCE_HINTS: Record<EvidenceStatus, string> = {
  measured: "Measured at the venue.",
  confirmed: "Confirmed by the evidence identified in the source note.",
  published: "Manufacturer's published specification.",
  estimated: "Estimate from a report or a drawing reading. Verify on site.",
  inferred: "Inferred from indirect evidence. Verify on site.",
  demo: "Placeholder for practice. Replace it with a measurement.",
  uncalibrated: "Training assumption. Not matched to the installed camera.",
};

/** Statuses that settle a venue dimension. Anything else keeps the venue marked approximate. */
export const SETTLED_VENUE_STATUSES: ReadonlySet<EvidenceStatus> = new Set(["measured", "confirmed"]);

/** Statuses an operator may assign to a venue dimension. */
export const VENUE_STATUS_OPTIONS: readonly EvidenceStatus[] = [
  "measured",
  "confirmed",
  "estimated",
  "inferred",
  "demo",
];

export const EVIDENCE_METHODS = ["unknown", "assumption", "photo", "scaled-plan", "staff-report", "field-measurement", "manufacturer", "operator"] as const;
export type EvidenceMethod = typeof EVIDENCE_METHODS[number];

export interface Provenance {
  method: EvidenceMethod;
  sourceIds: string[];
}

/** Optional for legacy records; unknown is not silently replaced with new evidence. */
export function readProvenance(issues: IssueList, value: unknown, path: string): Provenance | undefined {
  if (value === undefined) return undefined;
  const root = readObject(issues, value, path);
  if (!root) return undefined;
  const method = readEnum(issues, root.method, `${path}.method`, EVIDENCE_METHODS);
  if (!Array.isArray(root.sourceIds) || root.sourceIds.length > 16) {
    issues.add(`${path}.sourceIds`, "Expected up to 16 source identifiers.");
    return undefined;
  }
  const sourceIds: string[] = [];
  root.sourceIds.forEach((value, index) => {
    const id = readString(issues, value, `${path}.sourceIds[${index}]`, { maxLength: 160, allowEmpty: false });
    if (id !== null) sourceIds.push(id);
  });
  return method ? { method, sourceIds } : undefined;
}

export interface Evidence {
  status: EvidenceStatus;
  note: string;
  provenance?: Provenance;
}

/** A length in metres with its provenance. */
export interface Dimension extends Evidence {
  value: number;
}

export const isEvidenceStatus = (value: unknown): value is EvidenceStatus =>
  typeof value === "string" && (EVIDENCE_STATUSES as readonly string[]).includes(value);

/** Editing a value is not a new measurement. Keep its note for reference, but withdraw the claim. */
export function editedEvidence<T extends Evidence>(evidence: T): Omit<T, "status" | "provenance"> & Evidence {
  return { ...evidence, status: "demo", provenance: { method: "operator", sourceIds: [] } };
}
