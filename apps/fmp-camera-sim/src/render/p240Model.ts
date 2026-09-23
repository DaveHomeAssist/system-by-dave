import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  type Object3D,
} from "three";
import { DEG } from "../domain/units";
import { type MountOrientation } from "../domain/venue";

/** The physical P240 stays at real scale; its overview label identifies it across the bowl. */
export const P240_DISPLAY_SCALE = 1;

export interface P240Model {
  root: Group;
  /** Rotates about the vertical axis with pan. */
  pan: Group;
  /** Rotates about the pan-relative horizontal axis with tilt. */
  tilt: Group;
  setPose(headingDeg: number, tiltDeg: number, orientation: MountOrientation): void;
}

/**
 * A simplified P240: fixed base, yoke that pans, head that tilts, lens facing -Z. The root sits at
 * the lens centre so the model, the viewing cone and the monitor share one origin. Dimensions follow
 * the published 163 x 199 x 231 mm envelope before the display scale is applied.
 */
export function buildP240(): P240Model {
  const body = new MeshLambertMaterial({ color: 0x2a2d33 });
  const trim = new MeshLambertMaterial({ color: 0x4a4f58 });
  const glass = new MeshLambertMaterial({ color: 0x0b0c0e });
  const tally = new MeshBasicMaterial({ color: 0xff453a, toneMapped: false });

  const root = new Group();
  root.name = "p240";
  const mount = new Group();
  root.add(mount);

  const base = new Mesh(new BoxGeometry(0.163, 0.07, 0.2), body);
  base.position.y = -0.145;
  mount.add(base);

  const pan = new Group();
  mount.add(pan);
  const yokeFloor = new Mesh(new CylinderGeometry(0.075, 0.08, 0.03, 20), trim);
  yokeFloor.position.y = -0.1;
  const armLeft = new Mesh(new BoxGeometry(0.02, 0.13, 0.07), trim);
  armLeft.position.set(-0.075, -0.04, 0);
  const armRight = armLeft.clone();
  armRight.position.x = 0.075;
  pan.add(yokeFloor, armLeft, armRight);

  const tilt = new Group();
  pan.add(tilt);
  const head = new Mesh(new BoxGeometry(0.12, 0.11, 0.17), body);
  head.position.z = 0.01;
  const lensBarrel = new Mesh(new CylinderGeometry(0.038, 0.042, 0.03, 24), trim);
  lensBarrel.rotation.x = Math.PI / 2;
  lensBarrel.position.z = -0.085;
  const lensGlass = new Mesh(new CylinderGeometry(0.03, 0.03, 0.005, 24), glass);
  lensGlass.rotation.x = Math.PI / 2;
  lensGlass.position.z = -0.101;
  const mohawk = new Mesh(new BoxGeometry(0.018, 0.012, 0.12), tally);
  mohawk.position.y = 0.061;
  tilt.add(head, lensBarrel, lensGlass, mohawk);

  root.scale.setScalar(P240_DISPLAY_SCALE);

  return {
    root,
    pan,
    tilt,
    setPose(headingDeg, tiltDeg, orientation) {
      if (orientation === "inverted") {
        // Hanging under the catwalk: the model is upside down, so its local axes flip.
        mount.rotation.set(0, 0, Math.PI);
        pan.rotation.set(0, headingDeg * DEG, 0);
        tilt.rotation.set(-tiltDeg * DEG, 0, 0);
      } else {
        mount.rotation.set(0, 0, 0);
        pan.rotation.set(0, -headingDeg * DEG, 0);
        tilt.rotation.set(tiltDeg * DEG, 0, 0);
      }
    },
  };
}

/** World direction the modelled lens points (the head's local -Z), for tests and diagnostics. */
export function lensDirection(head: Object3D): [number, number, number] {
  head.updateWorldMatrix(true, false);
  const e = head.matrixWorld.elements;
  const x = -e[8];
  const y = -e[9];
  const z = -e[10];
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}
