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
  confirmed: "Confirmed by the video office.",
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

export interface Evidence {
  status: EvidenceStatus;
  note: string;
}

/** A length in metres with its provenance. */
export interface Dimension extends Evidence {
  value: number;
}

export const isEvidenceStatus = (value: unknown): value is EvidenceStatus =>
  typeof value === "string" && (EVIDENCE_STATUSES as readonly string[]).includes(value);
