import { describe, expect, it } from "vitest";
import { applyImport, emptyDocument, loadDocument, parseDocument, previewImport, sampleDocument } from "./model";
import { moveSequence, newPlayback, newShot, playbackFields, playbackGaps, sequenceCsv, shotFields, shotGaps } from "./sequences";

describe("Cameras and Playback compatibility", () => {
  for (const family of ["shots", "cues"] as const) {
    const fields = family === "shots" ? shotFields : playbackFields;
    const schema = `system-by-dave.${family === "shots" ? "camera-shot-list" : "playback-check"}.v1`;
    it(`preserves every ${family} field, metadata, raw source and all statuses through a hidden-module backup`, async () => {
      const statuses = family === "shots" ? ["ready", "hold", "problem", "taken", "", "custom"] : ["ready", "pending", "issue", "played", "", "custom"];
      const rows = statuses.map(status => ({ ...Object.fromEntries(fields.map(key => [key, `${key} exact\n  text`])), status, notes: '  long, "quoted"\n'.repeat(350), type: "", extra: { untouched: true }, id: "legacy-id" }));
      const meta = family === "shots" ? { showName: "Camera show", venue: "Stage", date: "2026-10-05", director: "A", td: "B" } : { showName: "Playback show", venue: "Hall", showDate: "2026-10-05", playbackOp: "C", tdName: "D", audioLead: "E" };
      const raw = JSON.stringify({ schema, meta, [family]: rows });
      const preview = await previewImport(raw, "fixture");
      const doc = applyImport(emptyDocument(), preview);
      rows.forEach((row, i) => { for (const field of fields) expect((doc[family][i] as unknown as Record<string, string>)[field]).toBe(row[field as keyof typeof row]); });
      expect(doc.meta).toEqual(meta); expect(doc.imports[0].raw).toBe(raw);
      doc.modules.cameras = false; doc.modules.playback = false;
      expect(applyImport(emptyDocument(), await previewImport(JSON.stringify(doc), "backup"))).toEqual(doc);
      doc[family][0].notes = "New edit";
      expect(() => applyImport(doc, preview)).toThrow("already imported");
      expect(doc[family][0].notes).toBe("New edit");
    });
    it(`keeps empty and over-cap ${family} sources without truncation or invented records`, async () => {
      const empty = await previewImport(JSON.stringify({ schema, [family]: [], meta: { showName: "Empty source" } }), "empty");
      expect(applyImport(emptyDocument(), empty).title).toBe("Untitled video plan");
      const row = family === "shots" ? { camera: "Cam", subject: "Speaker" } : { file: "intro.mov", duration: "01:02:03:04" };
      const preview = await previewImport(JSON.stringify({ schema, [family]: Array.from({ length: 310 }, () => row) }), "large");
      expect(preview[family]).toHaveLength(310);
      expect(new Set(preview[family].map(item => item.id)).size).toBe(310);
      const existing = emptyDocument(); existing.shots = [newShot()]; existing.shots[0].notes = "Work in progress";
      expect(applyImport(existing, empty).title).toBe(existing.title);
    });
  }
  it("loads older plans in memory without writing or losing existing data", () => {
    const doc = sampleDocument();
    const { shots, cues, ...older } = doc;
    const { cameras, playback, ...modules } = doc.modules;
    const raw = JSON.stringify({ ...older, modules });
    expect(loadDocument({ getItem: () => raw }).doc).toEqual(doc);
    expect(parseDocument(raw).modules).toMatchObject({ cameras: true, playback: true });
  });
  it("rejects ambiguous, mismatched, malformed, future and duplicate-ID inputs", async () => {
    for (const value of [{ shots: [], cues: [] }, { schema: "system-by-dave.camera-shot-list.v1", cues: [] }, { shots: [{ camera: 42 }] }, { cues: [{ file: "intro", duration: 45 }] }, { schema: "system-by-dave.playback-check.v2", cues: [] }]) {
      await expect(previewImport(JSON.stringify(value), "bad")).rejects.toThrow();
    }
    const shot = newShot();
    expect(() => parseDocument(JSON.stringify({ ...emptyDocument(), shots: [shot, shot] }))).toThrow("Duplicate sequence IDs");
  });
  it("reorders without changing fields and preserves status independently of route checks", () => {
    const first = { ...newShot(), status: "ready" }, second = newShot();
    expect(moveSequence([first, second], second.id, -1)).toEqual([second, first]);
    expect(moveSequence([first, second], first.id, -1)).toEqual([first, second]);
    expect(shotGaps(first, [])).toContain("Camera missing"); expect(first.status).toBe("ready");
    expect(shotGaps({ ...first, routeId: "deleted" }, [])).toContain("Linked route was removed");
    expect(playbackGaps({ ...newPlayback(), status: "issue" }, [])).toContain("Reported issue");
  });
  it("exports every field and preserves duration text while neutralizing spreadsheet formulas", () => {
    for (const duration of ["2m30s", "01:02:03:04", "TBD", "45 min", ""]) {
      const csv = sequenceCsv([{ ...newPlayback(), duration, file: '=HYPERLINK("x")', notes: 'line1\nline2, "quoted"' }], playbackFields);
      expect(csv).toContain(`"${duration}"`); expect(csv).toContain('"\'=HYPERLINK(""x"")"');
      for (const key of playbackFields) expect(csv.split("\r\n")[0].split(",")).toContain(key);
    }
    expect(sequenceCsv([newShot()], shotFields).split("\r\n")[0]).toBe(["routeId", ...shotFields].join(","));
  });
});
