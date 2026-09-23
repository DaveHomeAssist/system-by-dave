// The simulator's release, fixed at build time: the newest entry in apps/fmp-camera-sim/CHANGELOG.md
// and a fingerprint of the shipped source (scripts/camera_sim_release.mjs, wired in vite.config.ts).
declare const __SIM_RELEASE__: { version: string; date: string; build: string };

export const RELEASE = __SIM_RELEASE__;

/** Written into exported projects, e.g. "FMP Camera Simulator 1.6.0 (build 1a2b3c4d)". */
export const APP_LABEL = `FMP Camera Simulator ${RELEASE.version} (build ${RELEASE.build})`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "23 Sep 2026" from the log's ISO date, the same in every locale. */
export function releaseDateLabel(date: string = RELEASE.date): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
