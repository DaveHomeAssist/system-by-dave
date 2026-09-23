import { buildTerrain } from "./terrainBuilder";
import { buildStructures } from "./structureBuilder";
import { type ShowPackage, defaultShowPackage } from "../domain/structures";
import { buildBowl } from "./bowlBuilder";
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Group,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  type Object3D,
  PlaneGeometry,
} from "three";
import { type VenueGeometry } from "../domain/venue";
import { stageToWorld } from "../sim/framing";
import { makeLabel } from "./labels";

// Parametric FMP scene built from the venue profile. Everything here is schematic: the stage
// deck and marks follow the profile's dimensions, while the stage house, backline, pit rail and
// seating bowl are drawn from public seating guides and demo values, not from venue CAD.

/** Layer 1 holds venue-view-only helpers (labels, the enlarged P240, the cone). */
export const OVERVIEW_LAYER = 1;

const WING_WIDTH = 5;

export interface VenueObjects {
  root: Group;
  /** Distance from the stage origin to the back of the 200 level, metres (for view framing). */
  extent: number;
  dispose(): void;
}

function onOverviewLayer(object: Object3D): Object3D {
  object.traverse((child) => child.layers.set(OVERVIEW_LAYER));
  return object;
}

export function buildVenue(g: VenueGeometry, show: ShowPackage = defaultShowPackage()): VenueObjects {
  const root = new Group();
  root.name = "venue";
  const disposables: Array<BufferGeometry | Material | CanvasTexture> = [];
  const track = <T extends BufferGeometry | Material | CanvasTexture>(item: T): T => {
    disposables.push(item);
    return item;
  };
  const mat = (color: number) => track(new MeshLambertMaterial({ color }));

  const W = g.stageWidth;
  const D = g.stageDepth;
  const deck = g.deckHeight;
  const pitFloor = -deck;

  // Stage deck: top face at height 0, downstage edge on z = 0. The body is masked black so the
  // stage front does not catch the front wash; a separate top surface carries the deck colour.
  const stage = new Mesh(track(new BoxGeometry(W, Math.max(deck, 0.05), D)), mat(0x0e0f11));
  stage.position.set(0, -Math.max(deck, 0.05) / 2, -D / 2);
  stage.name = "stage-deck";
  root.add(stage);
  const deckTop = new Mesh(track(new PlaneGeometry(W, D)), mat(0x2e2f35));
  deckTop.rotation.x = -Math.PI / 2;
  deckTop.position.set(0, 0.002, -D / 2);
  root.add(deckTop);
  // Wing floors either side of the performance deck.
  for (const side of [-1, 1]) {
    const wing = new Mesh(track(new BoxGeometry(WING_WIDTH, Math.max(deck, 0.05), D)), mat(0x1f2024));
    wing.position.set(side * (W / 2 + WING_WIDTH / 2), -Math.max(deck, 0.05) / 2, -D / 2);
    root.add(wing);
  }
  // Downstage edge tape.
  const edge = new Mesh(track(new BoxGeometry(W, 0.012, 0.06)), track(new MeshBasicMaterial({ color: 0xe0b64a, toneMapped: false })));
  edge.position.set(0, 0.006, -0.03);
  edge.name = "dse";
  root.add(edge);
  // Spike marks: small tape crosses on the deck.
  const tape = track(new MeshLambertMaterial({ color: 0xf1ede2 }));
  const tapeA = track(new BoxGeometry(0.5, 0.01, 0.05));
  const tapeB = track(new BoxGeometry(0.05, 0.01, 0.5));
  for (const mark of g.marks) {
    const p = stageToWorld(mark.point);
    const a = new Mesh(tapeA, tape);
    const b = new Mesh(tapeB, tape);
    a.position.set(p.x, 0.006, p.z);
    b.position.set(p.x, 0.006, p.z);
    root.add(a, b);
    const label = onOverviewLayer(makeLabel(mark.id, { height: 0.55 }));
    label.position.set(p.x, 0.5, p.z);
    root.add(label);
  }

  // Pit floor from the stage front to the first seating row, with a barricade line.
  const firstRow = g.pitDepth + 1;
  const pitWidth = Math.max(W + 16, 40);
  const pit = new Mesh(track(new PlaneGeometry(pitWidth, firstRow + 2)), mat(0x24262b));
  pit.rotation.x = -Math.PI / 2;
  pit.position.set(0, pitFloor + 0.001, (firstRow + 2) / 2);
  root.add(pit);
  if (g.pitDepth > 2) {
    const barricade = new Mesh(track(new BoxGeometry(W, 1.1, 0.12)), mat(0x24272c));
    barricade.position.set(0, pitFloor + 0.55, 1.6);
    root.add(barricade);
  }
  const pitLabel = onOverviewLayer(makeLabel("Pit (varies per show)", { height: 0.9 }));
  pitLabel.position.set(0, pitFloor + 1.4, Math.max(2.5, g.pitDepth * 0.6));
  root.add(pitLabel);

  const bowl = buildBowl(g.bowl, g.pitDepth, g.deckHeight, true, g.structures.fixtures);
  root.add(bowl.root);

  const terrain = buildTerrain(g);
  root.add(terrain.root);
  const structures = buildStructures(g, show);
  root.add(structures.root);
  const dseLabel = onOverviewLayer(makeLabel("DSE · stage origin", { height: 0.8 }));
  dseLabel.position.set(W / 2 + 2.2, 0.8, 0.4);
  root.add(dseLabel);

  const extent = bowl.extent;
  return {
    root,
    extent,
    dispose() {
      bowl.dispose();
      structures.dispose();
      terrain.dispose();
      root.traverse((child) => {
        if ((child as Mesh).isMesh || (child as { isSprite?: boolean }).isSprite) {
          const material = (child as Mesh).material as Material & { map?: CanvasTexture | null };
          if (child.name.startsWith("label:")) {
            material.map?.dispose();
            material.dispose();
          }
        }
      });
      disposables.forEach((item) => item.dispose());
    },
  };
}
