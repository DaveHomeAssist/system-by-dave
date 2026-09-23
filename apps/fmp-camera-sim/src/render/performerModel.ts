import { BoxGeometry, CapsuleGeometry, Group, Mesh, MeshLambertMaterial, SphereGeometry } from "three";
import { type PerformerState } from "../sim/performer";
import { stageToWorld } from "../sim/framing";

const REFERENCE_HEIGHT = 1.75;
const STRIDE_RADIANS_PER_METRE = 2.2;

export interface PerformerModel {
  root: Group;
  update(state: PerformerState): void;
}

/** A plain, human-scale figure. It faces the house at rest and its direction of travel when walking. */
export function buildPerformer(): PerformerModel {
  const shirt = new MeshLambertMaterial({ color: 0xd9733a });
  const trousers = new MeshLambertMaterial({ color: 0x2b2f3a });
  const skin = new MeshLambertMaterial({ color: 0xc9a080 });
  const shoes = new MeshLambertMaterial({ color: 0x17181b });
  const hair = new MeshLambertMaterial({ color: 0x2a1d16 });

  const root = new Group();
  root.name = "performer";
  const body = new Group();
  root.add(body);

  const makeLeg = (x: number) => {
    const hip = new Group();
    hip.position.set(x, 0.92, 0);
    const leg = new Mesh(new CapsuleGeometry(0.075, 0.72, 4, 10), trousers);
    leg.position.y = -0.44;
    const shoe = new Mesh(new BoxGeometry(0.11, 0.07, 0.24), shoes);
    shoe.position.set(0, -0.89, 0.05);
    hip.add(leg, shoe);
    return hip;
  };
  const makeArm = (x: number) => {
    const shoulder = new Group();
    shoulder.position.set(x, 1.42, 0);
    const arm = new Mesh(new CapsuleGeometry(0.055, 0.56, 4, 10), shirt);
    arm.position.y = -0.33;
    const hand = new Mesh(new SphereGeometry(0.055, 10, 8), skin);
    hand.position.y = -0.66;
    shoulder.add(arm, hand);
    return shoulder;
  };
  const leftLeg = makeLeg(-0.1);
  const rightLeg = makeLeg(0.1);
  const leftArm = makeArm(-0.25);
  const rightArm = makeArm(0.25);
  const torso = new Mesh(new CapsuleGeometry(0.19, 0.38, 6, 14), shirt);
  torso.position.y = 1.2;
  torso.scale.set(1, 1, 0.62);
  const neck = new Mesh(new CapsuleGeometry(0.05, 0.06, 4, 8), skin);
  neck.position.y = 1.52;
  const head = new Mesh(new SphereGeometry(0.11, 18, 14), skin);
  head.position.y = 1.64;
  head.scale.set(0.9, 1.1, 0.95);
  const hairCap = new Mesh(new SphereGeometry(0.112, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.1), hair);
  hairCap.position.y = 1.665;
  body.add(leftLeg, rightLeg, leftArm, rightArm, torso, neck, head, hairCap);

  return {
    root,
    update(state) {
      const world = stageToWorld(state.position);
      root.position.set(world.x, world.y, world.z);
      root.scale.setScalar(state.height / REFERENCE_HEIGHT);
      // The model faces +z (toward the house) at rest; stage facing is measured toward stage right.
      root.rotation.y = -state.facing;
      const swing = state.moving ? Math.sin(state.stride * STRIDE_RADIANS_PER_METRE) * 0.45 : 0;
      leftLeg.rotation.x = swing;
      rightLeg.rotation.x = -swing;
      leftArm.rotation.x = -swing * 0.7;
      rightArm.rotation.x = swing * 0.7;
      body.position.y = state.moving ? Math.abs(Math.cos(state.stride * STRIDE_RADIANS_PER_METRE)) * 0.025 : 0;
    },
  };
}
