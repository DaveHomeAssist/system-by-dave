import { buildBowl } from "./bowlBuilder";
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  type Object3D,
  PlaneGeometry,
  SRGBColorSpace,
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
const HOUSE_HEIGHT = 13;

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

function screenTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 512, 288);
    gradient.addColorStop(0, "#1b2a57");
    gradient.addColorStop(0.55, "#5a2a6e");
    gradient.addColorStop(1, "#c2542d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 288);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 9; i += 1) ctx.fillRect(0, i * 32, 512, 2);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "#ffd9a8";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(256, 144, 70, 0, Math.PI * 2);
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function buildVenue(g: VenueGeometry): VenueObjects {
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

  // Stage house (demo scenery): back wall with a screen, side walls and a header.
  const houseWidth = W + WING_WIDTH * 2;
  const back = new Mesh(track(new BoxGeometry(houseWidth, HOUSE_HEIGHT + deck, 0.4)), mat(0x131418));
  back.position.set(0, (HOUSE_HEIGHT - deck) / 2, -D - 0.2);
  root.add(back);
  for (const side of [-1, 1]) {
    const wall = new Mesh(track(new BoxGeometry(0.4, HOUSE_HEIGHT + deck, D)), mat(0x17181c));
    wall.position.set(side * (houseWidth / 2 + 0.2), (HOUSE_HEIGHT - deck) / 2, -D / 2);
    root.add(wall);
    const leg = new Mesh(track(new BoxGeometry(1.2, HOUSE_HEIGHT - 1.5, 0.1)), mat(0x0f1013));
    leg.position.set(side * (W / 2 + 0.6), (HOUSE_HEIGHT - 1.5) / 2, -1.2);
    root.add(leg);
  }
  const header = new Mesh(track(new BoxGeometry(houseWidth, 1.4, 0.6)), mat(0x1a1b20));
  header.position.set(0, HOUSE_HEIGHT - 0.7, 0.2);
  root.add(header);
  const screenWidth = Math.min(W * 0.55, 14);
  const screen = new Mesh(
    track(new PlaneGeometry(screenWidth, (screenWidth * 9) / 16)),
    track(new MeshBasicMaterial({ map: track(screenTexture()), toneMapped: false })),
  );
  screen.position.set(0, 2.8 + (screenWidth * 9) / 32, -D + 0.25);
  root.add(screen);

  // Demo backline: drum riser, kit, amp stacks and a mic stand just downstage of DSC.
  const riser = new Mesh(track(new BoxGeometry(2.6, 0.6, 2.4)), mat(0x3c3f46));
  riser.position.set(0, 0.3, -D * 0.8);
  root.add(riser);
  const drumMat = mat(0x8a8f99);
  const kick = new Mesh(track(new CylinderGeometry(0.28, 0.28, 0.4, 20)), drumMat);
  kick.rotation.x = Math.PI / 2;
  kick.position.set(0, 0.88, -D * 0.8 + 0.4);
  const snare = new Mesh(track(new CylinderGeometry(0.18, 0.18, 0.14, 18)), drumMat);
  snare.position.set(0.45, 1.25, -D * 0.8 + 0.2);
  const tom = new Mesh(track(new CylinderGeometry(0.2, 0.2, 0.2, 18)), drumMat);
  tom.position.set(-0.45, 1.3, -D * 0.8 + 0.2);
  root.add(kick, snare, tom);
  for (const side of [-1, 1]) {
    const amp = new Mesh(track(new BoxGeometry(0.8, 1.6, 0.45)), mat(0x202227));
    amp.position.set(side * W * 0.3, 0.8, -D * 0.82);
    root.add(amp);
  }
  const stand = new Mesh(track(new CylinderGeometry(0.012, 0.012, 1.5, 6)), mat(0x6b6f78));
  stand.position.set(0, 0.75, -D * 0.06);
  const standBase = new Mesh(track(new CylinderGeometry(0.14, 0.14, 0.02, 12)), mat(0x3a3d44));
  standBase.position.set(0, 0.01, -D * 0.06);
  root.add(stand, standBase);

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

  const bowl = buildBowl(g.bowl, g.pitDepth, g.deckHeight);
  root.add(bowl.root);

  // Catwalk at the camera position: walkway, rails and hangers. The camera sits on the stage-side
  // edge; an inverted mount hangs below the walkway instead.
  const camera = stageToWorld(g.camera);
  const inverted = g.mountOrientation === "inverted";
  const deckY = inverted ? camera.y + 0.55 : camera.y - 0.5;
  const catwalk = new Group();
  catwalk.name = "catwalk";
  const span = 30;
  const walk = new Mesh(track(new BoxGeometry(span, 0.08, 0.9)), mat(0x5d636d));
  walk.position.set(camera.x, deckY, camera.z + 0.6);
  catwalk.add(walk);
  const railMat = mat(0x9aa3ad);
  for (const dz of [0.17, 1.03]) {
    const rail = new Mesh(track(new BoxGeometry(span, 0.05, 0.05)), railMat);
    rail.position.set(camera.x, deckY + 1.05, camera.z + dz);
    catwalk.add(rail);
    for (let x = -span / 2; x <= span / 2 + 1e-6; x += 2.5) {
      const post = new Mesh(track(new BoxGeometry(0.05, 1.05, 0.05)), railMat);
      post.position.set(camera.x + x, deckY + 0.52, camera.z + dz);
      catwalk.add(post);
    }
  }
  for (let x = -span / 2; x <= span / 2 + 1e-6; x += 5) {
    const hanger = new Mesh(track(new BoxGeometry(0.03, 4.5, 0.03)), railMat);
    hanger.position.set(camera.x + x, deckY + 3.3, camera.z + 0.6);
    catwalk.add(hanger);
  }
  // The mount plate meets the physical base; drop length remains a schematic assumption.
  const baseY = camera.y + (inverted ? 0.18 : -0.18);
  const bracket = new Mesh(track(new BoxGeometry(0.05, Math.abs(deckY - baseY), 0.05)), railMat);
  bracket.position.set(camera.x, (deckY + baseY) / 2, camera.z);
  const plate = new Mesh(track(new BoxGeometry(0.2, 0.025, 0.22)), railMat);
  plate.position.set(camera.x, baseY, camera.z);
  catwalk.add(plate);
  catwalk.add(bracket);
  root.add(catwalk);
  const catwalkLabel = onOverviewLayer(makeLabel("Catwalk", { height: 1 }));
  catwalkLabel.position.set(camera.x + span / 2 - 2, deckY + 2.2, camera.z + 0.6);
  root.add(catwalkLabel);
  const dseLabel = onOverviewLayer(makeLabel("DSE · stage origin", { height: 0.8 }));
  dseLabel.position.set(W / 2 + 2.2, 0.8, 0.4);
  root.add(dseLabel);

  const extent = bowl.extent;
  return {
    root,
    extent,
    dispose() {
      bowl.dispose();
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
