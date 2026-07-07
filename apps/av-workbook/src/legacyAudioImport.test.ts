import { describe, expect, it } from "vitest";
import { LEGACY_AUDIO_KEYS, mergeLegacyAudioIntoWorkbook, readLegacyAudioBundle, type LegacyAudioBundle } from "./legacyAudioImport";
import { createSampleWorkbook } from "./sampleWorkbook";
import type { AvWorkbook } from "./types";

function legacyCount<T extends { id: string }>(rows: T[], prefix: string): number {
  return rows.filter((row) => row.id.startsWith(prefix)).length;
}

function legacyAudioBundle(): LegacyAudioBundle {
  return {
    inputList: {
      key: LEGACY_AUDIO_KEYS.inputList,
      meta: {
        showName: "Legacy Gala",
        venueName: "Ballroom B",
        showDate: "2026-07-07",
        engineerName: "Avery A1",
        consoleName: "Yamaha QL5"
      },
      rows: [
        {
          id: "input-ceo",
          channel: "1",
          source: "Legacy CEO Lav",
          type: "wireless",
          patch: "RF Rack A1",
          conn: "XLR",
          phantom: "no",
          stand: "Lav",
          monitor: "Presenter",
          owner: "A2",
          status: "checked",
          notes: "Fresh batteries"
        }
      ]
    },
    audioPatch: {
      key: LEGACY_AUDIO_KEYS.audioPatch,
      meta: {
        showName: "Legacy Gala",
        venue: "Ballroom B",
        showDate: "2026-07-07",
        a1: "Avery A1",
        consoleName: "QL5"
      },
      items: [
        {
          id: "patch-ceo",
          channel: "1",
          source: "Legacy CEO Lav",
          type: "lav",
          console: "QL5 Ch 1",
          stagebox: "RF Rack A",
          input: "1",
          phantom: "off",
          gain: "-24 dB",
          destination: "Main PA",
          monitor: "Presenter",
          status: "ready",
          notes: "Primary presenter"
        }
      ]
    },
    lineCheck: {
      key: LEGACY_AUDIO_KEYS.lineCheck,
      meta: {
        showName: "Legacy Gala",
        venue: "Ballroom B",
        showDate: "2026-07-07",
        leadTech: "Riley A2"
      },
      items: [
        {
          id: "line-ceo",
          channel: "1",
          source: "Legacy CEO Lav",
          type: "lav",
          location: "Stage",
          tech: "Riley A2",
          console: "QL5 Ch 1",
          input: "RF Rack A 1",
          destination: "Main PA",
          talkback: "Clear",
          status: "passed",
          problem: "",
          notes: "Walk test complete"
        }
      ]
    }
  };
}

describe("legacy audio import", () => {
  it("migrates Input List, Audio Patch, and Line Check into linked workbook records", () => {
    const result = mergeLegacyAudioIntoWorkbook(createSampleWorkbook(), legacyAudioBundle());

    expect(result.summary.importedKeys).toEqual([LEGACY_AUDIO_KEYS.inputList, LEGACY_AUDIO_KEYS.audioPatch, LEGACY_AUDIO_KEYS.lineCheck]);
    expect(result.summary).toMatchObject({ signalSources: 1, patchRecords: 1, lineChecks: 1 });
    expect(result.workbook.show).toMatchObject({
      showName: "Legacy Gala",
      venue: "Ballroom B",
      targetDate: "2026-07-07"
    });

    const source = result.workbook.signalSources.find((item) => item.label === "Legacy CEO Lav");
    expect(source).toMatchObject({ sourceType: "mic", ownerRole: "A2", phantomRequired: false, status: "line_check_verified" });

    const patch = result.workbook.patchRecords.find((item) => item.channel === "1" && item.id.startsWith("legacy-patch-"));
    expect(patch).toMatchObject({
      signalSourceId: source?.id,
      console: "QL5",
      stagebox: "RF Rack A / 1",
      target: "QL5 Ch 1 -> Main PA",
      status: "ready_for_show"
    });

    const lineCheck = result.workbook.lineChecks.find((item) => item.id.startsWith("legacy-linecheck-"));
    expect(lineCheck).toMatchObject({
      patchRecordId: patch?.id,
      checkedBy: "Riley A2",
      checkedAt: "2026-07-07",
      result: "passed"
    });
    expect(lineCheck?.notes).toContain("Walk test complete");
  });

  it("creates a fallback patch record from Input List when Audio Patch has no row", () => {
    const bundle = legacyAudioBundle();
    delete bundle.audioPatch;

    const result = mergeLegacyAudioIntoWorkbook(createSampleWorkbook(), bundle);

    expect(result.summary.patchRecords).toBe(1);
    expect(result.workbook.patchRecords[0]).toMatchObject({
      id: expect.stringMatching(/^legacy-input-patch-/),
      stagebox: "RF Rack A1",
      target: "RF Rack A1 -> Presenter"
    });
  });

  it("does not duplicate legacy records on repeated import", () => {
    const first = mergeLegacyAudioIntoWorkbook(createSampleWorkbook(), legacyAudioBundle()).workbook;
    const second = mergeLegacyAudioIntoWorkbook(first, legacyAudioBundle()).workbook;

    expect(legacyCount(second.signalSources, "legacy-")).toBe(legacyCount(first.signalSources, "legacy-"));
    expect(legacyCount(second.patchRecords, "legacy-")).toBe(legacyCount(first.patchRecords, "legacy-"));
    expect(legacyCount(second.lineChecks, "legacy-")).toBe(legacyCount(first.lineChecks, "legacy-"));
    expect(second.auditEvents.filter((event) => event.id.startsWith("legacy-audio-import-"))).toHaveLength(1);
  });

  it("keeps different sources distinct when legacy tools reuse the same channel number", () => {
    const bundle = legacyAudioBundle();
    bundle.audioPatch?.items.push({
      id: "patch-backup",
      channel: "1",
      source: "Backup Handheld",
      type: "handheld",
      console: "QL5 Ch 2",
      stagebox: "RF Rack B",
      input: "2",
      phantom: "off",
      gain: "-20 dB",
      destination: "Main PA",
      monitor: "",
      status: "patched",
      notes: ""
    });

    const result = mergeLegacyAudioIntoWorkbook(createSampleWorkbook(), bundle);
    const backup = result.workbook.signalSources.find((source) => source.label === "Backup Handheld");
    const backupPatch = result.workbook.patchRecords.find((patch) => patch.target === "QL5 Ch 2 -> Main PA");

    expect(backup).toBeDefined();
    expect(backupPatch?.signalSourceId).toBe(backup?.id);
    expect(result.summary.signalSources).toBe(2);
  });

  it("normalizes real localStorage payloads by their legacy keys", () => {
    const storage = new Map<string, string>([
      [
        LEGACY_AUDIO_KEYS.inputList,
        JSON.stringify({
          schema: "system-by-dave.input-list.v1",
          meta: { showName: "Reader Test", venueName: "Room 1" },
          rows: [{ id: "r1", ch: 7, source: "Podium", type: "podium", patch: "A7", phantom: "yes", status: "patched" }]
        })
      ],
      [
        LEGACY_AUDIO_KEYS.lineCheck,
        JSON.stringify({
          schema: "system-by-dave.line-check.v1",
          meta: { showDate: "2026-07-08" },
          items: [{ id: "l1", channel: 7, source: "Podium", status: "issue", problem: "No signal" }]
        })
      ]
    ]);

    const bundle = readLegacyAudioBundle({ getItem: (key) => storage.get(key) ?? null });

    expect(bundle.inputList?.rows[0]).toMatchObject({ channel: "7", source: "Podium", phantom: "yes" });
    expect(bundle.lineCheck?.items[0]).toMatchObject({ channel: "7", source: "Podium", problem: "No signal" });
    expect(bundle.audioPatch).toBeUndefined();
  });

  it("returns the same workbook when no legacy audio data exists", () => {
    const workbook: AvWorkbook = createSampleWorkbook();
    const result = mergeLegacyAudioIntoWorkbook(workbook, {});

    expect(result.workbook).toBe(workbook);
    expect(result.summary.importedKeys).toEqual([]);
  });
});
