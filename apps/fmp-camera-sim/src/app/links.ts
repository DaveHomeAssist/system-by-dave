// Links into the FMP suite. The hosted page uses root paths on housevideo.app; the standalone
// offline file (html[data-build="offline"]) opens from disk, so it names the suite absolutely.
// Every target here is listed in docs/camera-training-links.md, and
// scripts/camera_training_links.test.mjs checks that each one still exists.

import { EXERCISE_IDS, type ExerciseId } from "../domain/session";

export const SUITE_ORIGIN = "https://housevideo.app";

export const isOfflineBuild = (): boolean =>
  typeof document !== "undefined" && document.documentElement.dataset.build === "offline";

export function suiteHref(path: string): string {
  return isOfflineBuild() ? `${SUITE_ORIGIN}${path}` : path;
}

export const SUITE_LINKS = {
  hub: "/fmp/",
  ptzGuide: "/fmp/ptz/",
  superJoy: "/fmp/ptz/SuperJoy-G1-Interactive-Guide.html",
  p240Model: "/fmp/models/p240.html#part=p240.lens",
  /** Exposure and colour for Cameras 1–3. Camera 4 is set from its own menus, not the shader panel. */
  shadingPractice: "/shader/practice.html",
  /** The manned cameras: URSA Broadcast G2 bodies on Fujinon lenses. */
  ursaRig: "/fmp/rig/?equipment=rig&part=body",
} as const;

export const OFFLINE_FILE = "fmp-camera-simulator-offline.html";

/** A one-time link into an exercise: `?exercise=wide|follow|recall`. */
export interface ExerciseLink {
  exercise: ExerciseId | null;
  /** The value when it names no exercise (trimmed, at most 40 characters). */
  unknown: string | null;
  /** The query string without `exercise`, for replacing the address once the link is used. */
  search: string;
}

export function readExerciseLink(search: string): ExerciseLink | null {
  const params = new URLSearchParams(search);
  if (!params.has("exercise")) return null;
  const raw = (params.get("exercise") ?? "").trim();
  params.delete("exercise");
  const rest = params.toString();
  const exercise = (EXERCISE_IDS as readonly string[]).includes(raw) ? (raw as ExerciseId) : null;
  return { exercise, unknown: exercise ? null : raw.slice(0, 40), search: rest ? `?${rest}` : "" };
}
