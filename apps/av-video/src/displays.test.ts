import { describe, expect, it } from "vitest";
import { displayFields, displayGaps, displayIssues, displaysCsv, newDisplay, projectionFields, suggestedRoutes } from "./displays";
import { applyImport, emptyDocument, LEGACY, parseDocument, previewImport, sampleDocument } from "./model";

describe("Displays and Projection", () => {
  it("loads earlier backups without rewriting routes or inventing destination records", () => {
    const doc = sampleDocument();
    const { displays, ...old } = doc;
    const { displays: enabled, ...modules } = old.modules;
    const restored = parseDocument(JSON.stringify({ ...old, modules }));
    expect(restored.routes).toEqual(doc.routes);
    expect(restored.displays).toEqual([]);
    expect(restored.modules.displays).toBe(true);
  });
  for (const kind of ["display", "projection"] as const) {
    it(`preserves every ${kind} field, extra source fields, metadata, blanks and long notes`, async () => {
      const fields = kind === "display" ? displayFields : projectionFields;
      const row = Object.fromEntries(fields.map(field => [field, `${field}  exact\n text`]));
      row.notes = "\n notes, with \"quotes\"\n".repeat(300); row.status = "custom status"; row.aspect = "";
      const raw = JSON.stringify({ schema: `system-by-dave.${kind === "display" ? "display-plan" : "projection-plan"}.v1`, meta: { showName: "Gala", handoffTo: "Operator", lead: "Unchanged" }, items: [{ ...row, extra: { retain: true }, id: "original" }] });
      const preview = await previewImport(raw, "fixture");
      const doc = applyImport(emptyDocument(), preview);
      expect(doc.displays[0]).toMatchObject(row);
      expect(doc.displays[0].routeId).toBe("");
      expect(doc.routes).toHaveLength(0);
      expect(doc.imports[0].raw).toBe(raw);
      expect(doc.meta.handoffTo).toBe("Operator");
      expect(parseDocument(JSON.stringify(doc))).toEqual(doc);
      doc.displays[0].notes = "Newer operator edit";
      expect(() => applyImport(doc, preview)).toThrow("already imported");
    });
  }
  it("recognizes browser sheets and the old throw alias without mistaking them for patch rows", async () => {
    const preview = await previewImport(JSON.stringify({ items: [{ screen: "Main", throw: "12.3 m" }] }), "saved", LEGACY["Projection Plan"]);
    expect(preview.displays[0].throwDistance).toBe("12.3 m");
    expect(preview.routes).toEqual([]);
    expect((await previewImport('{"items":[]}', "empty", LEGACY["Display Plan"])).displays).toEqual([]);
    await expect(previewImport('{"items":[{"encoder":"Foreign stream"}]}', "foreign")).rejects.toThrow();
    await expect(previewImport('{"items":[{"screen":"A","display":"B"}]}', "ambiguous")).rejects.toThrow();
    await expect(previewImport('{"schema":"foreign","items":[{"display":"A"}]}', "foreign")).rejects.toThrow();
    await expect(previewImport('{"items":[{"display":"A","resolution":123}]}', "bad")).rejects.toThrow();
  });
  it("suggests route matches without merging, keeps stable links through renames, and flags deletion", () => {
    const doc = sampleDocument();
    const item = { ...newDisplay("display"), display: "IMAG screens", status: "ready" };
    expect(suggestedRoutes(item, doc.routes)).toEqual([doc.routes[0]]);
    expect(item.routeId).toBe("");
    expect(displayGaps(item, doc.routes)).toContain("Route not linked");
    item.routeId = doc.routes[0].id;
    doc.routes[0].destination = "Renamed screens";
    expect(displayGaps(item, doc.routes)).not.toContain("Linked route was removed");
    expect(displayGaps(item, doc.routes.slice(1))).toContain("Linked route was removed");
    expect(item.status).toBe("ready");
  });
  it("retains hidden records and scoped checks through backups", async () => {
    const doc = sampleDocument(); doc.displays = [newDisplay("projection")];
    expect(displayIssues(doc)).toHaveLength(1);
    doc.modules.displays = false;
    expect(displayIssues(doc)).toEqual([]);
    const next = applyImport(emptyDocument(), await previewImport(JSON.stringify(doc), "backup"));
    expect(next).toEqual(doc);
    next.modules.displays = true;
    expect(displayIssues(next)).toHaveLength(1);
  });
  it("preserves both imports and metadata without clobbering an existing plan", async () => {
    const doc = sampleDocument();
    const preview = await previewImport('{"items":[{"display":"IMAG screens"}],"meta":{"showName":"Different show"}}', "sheet");
    const next = applyImport(doc, preview);
    expect(next.title).toBe(doc.title);
    expect(next.meta).toEqual(doc.meta);
    expect(next.routes).toEqual(doc.routes);
    expect(next.displays[0].routeId).toBe("");
    expect(JSON.parse(next.imports[0].raw).meta.showName).toBe("Different show");
  });
  it("preserves configured project identity on first imports, including empty sheets", async () => {
    for (const records of [[], [{ display: "Main screen" }]]) {
      const raw = JSON.stringify({ schema: "system-by-dave.display-plan.v1", meta: { showName: "Source show", venue: "Source venue", videoLead: "Source lead" }, items: records });
      const preview = await previewImport(raw, "sheet");
      for (const configured of [{ ...emptyDocument(), title: "Configured show" }, { ...emptyDocument(), meta: { venue: "Chosen venue", videoLead: "Chosen lead" } }]) {
        const next = applyImport(configured, preview);
        expect(next.title).toBe(configured.title);
        expect(next.meta).toEqual(configured.meta);
        expect(next.imports[0].raw).toBe(raw);
      }
    }
  });
  it("does not rename a blank plan when importing an empty sheet", async () => {
    const doc = emptyDocument();
    const preview = await previewImport('{"schema":"system-by-dave.projection-plan.v1","items":[],"meta":{"showName":"Empty source"}}', "empty");
    const next = applyImport(doc, preview);
    expect(next.title).toBe(doc.title); expect(next.meta).toEqual({});
  });
  it("exports all fields as quoted CSV and neutralizes spreadsheet formulas", () => {
    const csv = displaysCsv([{ ...newDisplay("projection"), screen: '=HYPERLINK("bad")', notes: 'a,b\nc' }]);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"a,b\nc"');
    expect(csv.split("\r\n")[0]).toContain("throwDistance");
  });
  it("rejects duplicate destination IDs and unknown document fields", () => {
    const doc = emptyDocument(); const row = newDisplay("display");
    expect(() => parseDocument(JSON.stringify({ ...doc, displays: [row, row] }))).toThrow();
    expect(() => parseDocument(JSON.stringify({ ...doc, displays: [{ ...row, surprise: true }] }))).toThrow();
  });
});
