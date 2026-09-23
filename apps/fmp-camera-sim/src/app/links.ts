// Links into the FMP suite. The hosted page uses root paths on housevideo.app; the standalone
// offline file (html[data-build="offline"]) opens from disk, so it names the suite absolutely.

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
  p240Model: "/fmp/models/p240.html",
} as const;

export const OFFLINE_FILE = "fmp-camera-simulator-offline.html";
