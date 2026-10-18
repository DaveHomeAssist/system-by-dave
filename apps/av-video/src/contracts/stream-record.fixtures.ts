import type { LegacyRecordFixture, LegacyStreamFixture } from "./stream-record";

/* Invented planning labels only: no provider, device, browser profile,
   environment variable or production document is a fixture source. */
export const streamFixture = {
  schema: "system-by-dave.stream-plan.v1",
  exportedAt: "2026-10-18T00:00:00.000Z",
  meta: { showName: "Synthetic rehearsal", client: "Fixture client", venue: "Fixture room", showDate: "2026-10-18", streamTech: "Test operator", producer: "Test producer", handoffTo: "Test relief" },
  items: [{
    id: "stream-fixture-1", encoder: "Encoder A", type: "primary",
    platform: "Test platform", destination: "Test audience", server: "Primary ingest",
    keyLabel: "Platform event label", input: "PGM SDI", resolution: "1080p59.94",
    bitrate: "8 Mbps", audio: "Embedded stereo", record: "Local test copy",
    backup: "Encoder B", status: "tested", notes: "  Preserve spacing\nand a second line.  ",
    unmapped: { operatorMemo: ["Keep verbatim", "Synthetic only"] },
  }],
} satisfies LegacyStreamFixture;

export const recordFixture = {
  schema: "system-by-dave.record-log.v1",
  exportedAt: "2026-10-18T00:00:00.000Z",
  meta: { showName: "Synthetic rehearsal", venue: "Fixture room", showDate: "2026-10-18", recordOp: "Test recorder", producer: "Test producer", audioLead: "Test A1", handoffTo: "Test relief" },
  records: [{
    id: "record-fixture-1", record: "REC 001", source: "Program test feed", type: "program",
    format: "ProRes", resolution: "1080p", audio: "embedded", media: "Fixture media A",
    status: "armed", duration: "01:02:03:04", backup: "Fixture media B",
    notes: "  Keep duration text\nand original notes.  ",
    unmapped: { operatorMemo: ["No device operation"] },
  }, {
    id: "record-fixture-2", record: "", source: "", type: "custom type",
    format: "custom format", resolution: "", audio: "", media: "",
    status: "awaiting courier", duration: "TBD", backup: "", notes: "",
  }],
} satisfies LegacyRecordFixture;

export const durationFixtures = ["", "  ", "2m30s", "01:02:03:04", "TBD", "45 min"] as const;
