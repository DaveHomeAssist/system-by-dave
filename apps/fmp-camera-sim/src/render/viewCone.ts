import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
} from "three";
import { add, type CameraFrame, scale, type Vec3 } from "../sim/framing";

/** Longest cone edge drawn when a frame corner never meets the stage plane. */
const MAX_REACH_M = 90;

export interface ViewCone {
  root: Group;
  update(frame: CameraFrame): void;
  /** Corner points of the last update, for diagnostics. */
  corners(): Vec3[];
  /** Apex (lens position) of the last update. */
  apex(): Vec3;
}

/**
 * The camera's viewing cone: four edges from the lens through the frame corners, stopped where
 * they meet the stage-deck plane, with a translucent fill. It is built from the same frame that
 * drives the monitor camera.
 */
export function buildViewCone(): ViewCone {
  const root = new Group();
  root.name = "view-cone";
  const positions = new Float32Array(5 * 3);
  const fillGeometry = new BufferGeometry();
  fillGeometry.setAttribute("position", new BufferAttribute(positions, 3));
  // Apex 0; far corners 1-4 (top-left, top-right, bottom-right, bottom-left).
  fillGeometry.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 1, 2, 3, 1, 3, 4]);
  const fill = new Mesh(
    fillGeometry,
    new MeshBasicMaterial({ color: 0x4f9dff, transparent: true, opacity: 0.13, side: DoubleSide, depthWrite: false, toneMapped: false }),
  );
  fill.renderOrder = 8;
  const edgeGeometry = new BufferGeometry();
  edgeGeometry.setAttribute("position", new BufferAttribute(positions, 3));
  edgeGeometry.setIndex([0, 1, 0, 2, 0, 3, 0, 4, 1, 2, 2, 3, 3, 4, 4, 1]);
  const edges = new LineSegments(edgeGeometry, new LineBasicMaterial({ color: 0x78b6ff, transparent: true, opacity: 0.9, toneMapped: false }));
  edges.renderOrder = 9;
  root.add(fill, edges);
  const corners: Vec3[] = [];

  return {
    root,
    corners: () => corners.map((c) => ({ ...c })),
    apex: () => ({ x: positions[0], y: positions[1], z: positions[2] }),
    update(frame) {
      const signs: Array<[number, number]> = [
        [-1, 1],
        [1, 1],
        [1, -1],
        [-1, -1],
      ];
      positions[0] = frame.position.x;
      positions[1] = frame.position.y;
      positions[2] = frame.position.z;
      corners.length = 0;
      signs.forEach(([sx, sy], i) => {
        const direction = add(add(frame.forward, scale(frame.right, sx * frame.tanH)), scale(frame.up, sy * frame.tanV));
        const length = Math.hypot(direction.x, direction.y, direction.z);
        const unit = scale(direction, 1 / length);
        let reach = MAX_REACH_M;
        if (unit.y < -1e-4) reach = Math.min(MAX_REACH_M, -frame.position.y / unit.y);
        const corner = add(frame.position, scale(unit, Math.max(0.5, reach)));
        corners.push(corner);
        positions[(i + 1) * 3] = corner.x;
        positions[(i + 1) * 3 + 1] = corner.y;
        positions[(i + 1) * 3 + 2] = corner.z;
      });
      const attribute = fillGeometry.getAttribute("position") as BufferAttribute;
      attribute.needsUpdate = true;
      (edgeGeometry.getAttribute("position") as BufferAttribute).needsUpdate = true;
      fillGeometry.computeBoundingSphere();
      edgeGeometry.computeBoundingSphere();
    },
  };
}
