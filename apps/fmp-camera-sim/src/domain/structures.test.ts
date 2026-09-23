import { describe, it, expect } from "vitest";
import { Matrix4, InstancedMesh, Mesh, PerspectiveCamera, Raycaster, Vector3 } from "three";
import { defaultStructures, defaultShowPackage, fixtureContains, structuresAreSettled } from "./structures";
import { defaultProject, serializeProject, parseProjectText } from "./project";
import { deriveVenueGeometry } from "./venue";
import { buildStructures, fohFloorHeight, SHELL_LAYER, setShellCutaway } from "../render/structureBuilder";
import { buildBowl } from "../render/bowlBuilder";

const geometry = () => { const result = deriveVenueGeometry(defaultProject().venue); if (!result.ok) throw new Error("Invalid default"); return result.geometry; };
describe("venue structures and production", () => {
  it("keeps operator LED pixels and pitch separate from provisional physical dimensions", () => {
    const walls = defaultStructures().fixtures.filter(f => f.kind === "led");
    expect(walls).toHaveLength(6);
    expect(walls.map(f => f.display!.pitchMm.value)).toEqual([10, 10, 8, 8, 8, 8]);
    for (const wall of walls) {
      expect(wall.display!.pixelWidth.value).toBe(1600);
      expect(wall.display!.pixelHeight.value).toBe(900);
      expect(wall.display!.pitchMm.status).toBe("confirmed");
      expect(wall.size.status).toBe("demo");
      expect(wall.size.value.right).not.toBe(wall.display!.pixelWidth.value * wall.display!.pitchMm.value / 1000);
    }
  });
  it("records wall presence as the operator reported it without settling size or position", () => {
    const walls = defaultStructures().fixtures.filter(f => f.kind === "led");
    const presence = (id: string) => walls.find(f => f.id === id)!.enabled;
    for (const id of ["Stage Right LED", "Stage Left LED"]) expect(presence(id)).toMatchObject({ value: true, status: "confirmed", provenance: { method: "operator", sourceIds: ["operator-display-spec-20260923"] } });
    for (const id of ["D1 lawn delay", "D2 lawn delay", "D3 lawn delay", "D4 lawn delay"]) expect(presence(id)).toMatchObject({ value: true, status: "inferred", provenance: { method: "operator" } });
    // Each wall owns its evidence object, so editing one delay wall cannot change another.
    expect(presence("D1 lawn delay")).not.toBe(presence("D2 lawn delay"));
    for (const wall of walls) { expect(wall.position.status).toBe("demo"); expect(wall.size.status).toBe("demo"); }
    expect(structuresAreSettled(defaultStructures())).toBe(false);
  });
  it("migrates legacy scene-free exports without changing dimensions, pose or presets", () => {
    const old = JSON.parse(serializeProject(defaultProject())); old.venue.version = 2; old.session.version = 1;
    delete old.venue.structures; delete old.session.showPackage;
    const before = JSON.stringify({ dimensions: old.venue.dimensions, pose: old.session.pose, presets: old.session.presets });
    const result = parseProjectText(JSON.stringify(old)); expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Migration failed");
    expect(JSON.stringify({ dimensions: result.project.venue.dimensions, pose: result.project.session.pose, presets: result.project.session.presets })).toBe(before);
    expect(result.project.venue.structures).toEqual(defaultStructures());
    expect(result.project.session.showPackage).toEqual(defaultShowPackage());
    expect(parseProjectText(serializeProject(result.project))).toEqual(result);
  });
  it("rejects malformed dimensions, pixel counts and rotations with their paths", () => {
    for (const [mutate, path] of [
      [(p: ReturnType<typeof defaultProject>) => { p.venue.structures.shell.ridgeHeight.value = 2; }, "venue.structures.shell.ridgeHeight.value"],
      [(p: ReturnType<typeof defaultProject>) => { p.venue.structures.fixtures[0].yaw.value = 181; }, "venue.structures.fixtures[0].yaw.value"],
      [(p: ReturnType<typeof defaultProject>) => { p.venue.structures.fixtures[5].display!.pixelWidth.value = 10.5; }, "venue.structures.fixtures[5].display.pixelWidth.value"],
    ] as const) {
      const p = defaultProject(); mutate(p); const result = parseProjectText(serializeProject(p));
      expect(result.ok).toBe(false); if (!result.ok) expect(result.issues.some(i => i.path === path)).toBe(true);
    }
  });
  it("intersects the physical roof from the lens and cutaway changes overview only", () => {
    const g = geometry(), built = buildStructures(g, defaultShowPackage(), false);
    const ray = new Raycaster(new Vector3(g.camera.right, g.camera.height, -g.camera.upstage), new Vector3(0, 1, 0)); ray.layers.enable(SHELL_LAYER);
    const hits = ray.intersectObject(built.root, true);
    expect(hits.some(h => h.object.name === "pavilion-roof" && h.object.userData.occluder)).toBe(true);
    const monitor = new PerspectiveCamera(), overview = new PerspectiveCamera(); monitor.layers.enable(SHELL_LAYER); overview.layers.enable(SHELL_LAYER);
    const rendered = (camera: PerspectiveCamera) => { const list: string[] = []; built.root.traverse(o => { if (o instanceof Mesh && o.layers.test(camera.layers)) list.push(o.uuid); }); return list; };
    const before = rendered(monitor), beforeOverview = rendered(overview);
    setShellCutaway(overview, true);
    expect(rendered(monitor)).toEqual(before); expect(rendered(overview).length).toBeLessThan(beforeOverview.length);
    setShellCutaway(overview, false); expect(rendered(overview)).toEqual(beforeOverview);
    built.dispose();
  });
  it("places FOH above the rake and clears its rotated footprint of seats", () => {
    const g = geometry(), foh = g.structures.fixtures.find(f => f.kind === "foh")!; foh.yaw.value = 15; foh.position.value.right = 2;
    const bowl = buildBowl(g.bowl, g.pitDepth, g.deckHeight, false, g.structures.fixtures);
    const structure = buildStructures(g, defaultShowPackage(), false);
    expect(structure.root.getObjectByName("Front of House")!.position.y).toBe(fohFloorHeight(g, foh));
    expect(fohFloorHeight(g, foh)).toBeGreaterThan(4);
    let count = 0; const matrix = new Matrix4(), point = new Vector3();
    bowl.root.traverse(o => { if (o instanceof InstancedMesh && o.name.startsWith("seat-detail")) for (let i=0;i<o.count;i++) {
      o.getMatrixAt(i, matrix); point.setFromMatrixPosition(matrix); count++;
      expect(fixtureContains(foh, -point.x, -point.z, 0.59)).toBe(false);
    }});
    const original = buildBowl(g.bowl, g.pitDepth, g.deckHeight, false);
    expect(count).toBeLessThan(original.root.userData.bowl.seats);
    original.dispose(); bowl.dispose(); structure.dispose();
  });
  it("converts performer stage-right coordinates to house-left geometry", () => {
    const g = geometry(), built = buildStructures(g, defaultShowPackage(), false);
    const right = g.structures.fixtures.find(f => f.id === "Stage Right LED")!;
    expect(right.position.value.right).toBeGreaterThan(0);
    expect(built.fixtures.getObjectByName(right.id)!.position.x).toBe(-right.position.value.right);
    expect(built.fixtures.getObjectByName("Stage Left LED")!.position.x).toBeGreaterThan(0);
    built.dispose();
  });
  it("clears every show obstruction without removing house displays or FOH", () => {
    const built = buildStructures(geometry(), {version:1,name:"Empty",fixtures:[]}, false);
    let meshes=0; built.show.traverse(o=>{if(o instanceof Mesh)meshes++;}); expect(meshes).toBe(0);
    expect(built.fixtures.getObjectByName("Front of House")).toBeDefined();
    expect(built.fixtures.getObjectByName("Stage Right LED")).toBeDefined(); built.dispose();
  });
});
