import { describe, expect, it } from "vitest";
import { emptyDocument, LEGACY, parseDocument, previewImport } from "../model";
import { durationFixtures, recordFixture, streamFixture } from "./stream-record.fixtures";
import { recordFields, recordRowSchema, recordStatuses, streamFields, streamRowSchema, streamStatuses } from "./stream-record";

describe("Stream and Record design contract (not runtime support)", () => {
  it("gives every matrix field a text home without adding credential fields to Record", () => {
    expect(Object.keys(streamFixture.items[0]).filter(key => key !== "id" && key !== "unmapped")).toEqual([...streamFields]);
    expect(Object.keys(recordFixture.records[0]).filter(key => key !== "id" && key !== "unmapped")).toEqual([...recordFields]);
    expect(recordFields).not.toContain("keyLabel");
    expect(streamStatuses).toEqual(["planned", "configured", "sending", "tested", "ready", "issue", "backup"]);
    expect(recordStatuses).toEqual(["armed", "rolling", "stopped", "issue", "delivered"]);
  });

  it("preserves blanks, custom values, multiline notes and duration text in prospective rows", () => {
    const { id, unmapped: _originalOnly, ...fields } = streamFixture.items[0];
    const stream = { id, origin: "synthetic-fingerprint", routeId: "", ...fields };
    expect(streamRowSchema.parse(stream)).toEqual(stream);
    expect(streamRowSchema.parse({ ...stream, status: "custom status", type: "", keyLabel: "" }).keyLabel).toBe("");
    for (const source of recordFixture.records) {
      const fields = Object.fromEntries(recordFields.map(field => [field, source[field]]));
      const row = { id: source.id, origin: "synthetic-fingerprint", routeId: "", ...fields };
      for (const duration of durationFixtures) expect(recordRowSchema.parse({ ...row, duration }).duration).toBe(duration);
    }
  });

  it("rejects malformed prospective text instead of coercing it", () => {
    const fields = Object.fromEntries(recordFields.map(field => [field, recordFixture.records[0][field]]));
    const row = { id: "fixture", origin: "synthetic", routeId: "", ...fields };
    expect(recordRowSchema.safeParse({ ...row, duration: 45 }).success).toBe(false);
    expect(recordRowSchema.safeParse({ ...row, unexpected: "not a working field" }).success).toBe(false);
  });

  it("leaves the six-family live model unchanged and rejects both pending import families", async () => {
    expect(Object.keys(LEGACY)).toEqual(["Signal Flow", "Video Patch", "Display Plan", "Projection Plan", "Camera Shot List", "Playback Check"]);
    const doc = emptyDocument();
    const baseline = JSON.stringify(doc);
    for (const fixture of [streamFixture, recordFixture]) {
      await expect(previewImport(JSON.stringify(fixture), "synthetic.json")).rejects.toThrow();
      expect(JSON.stringify(doc)).toBe(baseline);
    }
    expect(parseDocument(baseline)).toEqual(doc);
    expect(() => parseDocument(JSON.stringify({ ...doc, streams: [] }))).toThrow();
    expect(() => parseDocument(JSON.stringify({ ...doc, recordings: [] }))).toThrow();
  });
});
