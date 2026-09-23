import { type PerspectiveCamera } from "three";
import { MONITOR_ASPECT } from "../domain/camera";
import { DEG } from "../domain/units";
import { type CameraFrame } from "../sim/framing";

/**
 * Drives a Three.js camera from the simulation's camera frame. Pan is a rotation about the world
 * vertical and tilt a rotation about the panned horizontal axis, as on a pan-tilt head (Euler YXZ).
 * sim/framing.test.ts proves this matches the evaluator's projection exactly.
 */
export function applyFrameToCamera(camera: PerspectiveCamera, frame: CameraFrame): void {
  camera.position.set(frame.position.x, frame.position.y, frame.position.z);
  camera.rotation.order = "YXZ";
  camera.rotation.set(frame.tiltDeg * DEG, -frame.headingDeg * DEG, 0);
  camera.fov = frame.vfovDeg;
  camera.aspect = MONITOR_ASPECT;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}
