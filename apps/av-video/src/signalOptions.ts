export const FORMAT_GROUPS = [
  { label: "HD · broadcast", values: ["720p50", "720p59.94", "720p60", "1080i50", "1080i59.94", "1080i60", "1080p23.98", "1080p24", "1080p25", "1080p29.97", "1080p30", "1080p50", "1080p59.94", "1080p60"] },
  { label: "UHD · 3840 × 2160", values: ["2160p23.98", "2160p24", "2160p25", "2160p29.97", "2160p30", "2160p50", "2160p59.94", "2160p60"] },
  { label: "Computer · 60 Hz", values: ["800x600p60", "1024x768p60", "1280x800p60", "1280x1024p60", "1366x768p60", "1440x900p60", "1600x900p60", "1600x1200p60", "1680x1050p60", "1920x1200p60", "2048x1080p60", "2560x1440p60"] },
];
export const CONNECTOR_GROUPS = [
  { label: "Digital video", values: ["HDMI", "Mini HDMI", "Micro HDMI", "DisplayPort", "Mini DisplayPort", "USB-C (DisplayPort Alt Mode)", "DVI-D", "DVI-I"] },
  { label: "SDI · BNC", values: ["SDI", "HD-SDI", "3G SDI", "6G SDI", "12G SDI"] },
  { label: "Analog video", values: ["VGA", "Composite (BNC)", "Composite (RCA)", "Component (BNC)", "S-Video"] },
  { label: "Network / fiber", values: ["Ethernet (RJ45)", "EtherCON", "Fiber (LC)", "Fiber (SC)", "OpticalCON DUO"] },
];
export const isPresetFormat = (value: string) => FORMAT_GROUPS.some(g => g.values.includes(value));
export function customFormat(width: string | number, height: string | number, rate: string | number): string {
  const w = Number(width), h = Number(height), hz = Number(rate);
  if (![w, h].every(n => Number.isSafeInteger(n) && n > 0 && n <= 65535) || !Number.isFinite(hz) || hz <= 0 || hz > 1000) throw new Error("Enter whole pixel dimensions and a frame rate between 0 and 1000 Hz.");
  return `${w}x${h}p${hz}`;
}
export function timingParts(format: string) {
  const custom = /^(\d+)x(\d+)p([\d.]+)$/.exec(format);
  if (custom) return { width: custom[1], height: custom[2], rate: custom[3] };
  const hd = /^(720|1080|2160)[pi]([\d.]+)$/.exec(format);
  return hd ? { width: hd[1] === "720" ? "1280" : hd[1] === "1080" ? "1920" : "3840", height: hd[1], rate: hd[2] } : { width: "", height: "", rate: "60" };
}
// Read the calculator's saved inputs without mutating them. Keep its whole-cabinet
// rounding and rotation rules; a native LED raster is not a hardware EDID claim.
export function savedLedTiming(raw: string | null) {
  if (!raw) throw new Error("No saved LED wall here. Open the LED Wall Calculator and set up a wall first.");
  const state = JSON.parse(raw) as Record<string, unknown>;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new Error("The saved LED wall could not be read.");
  const positive = (key: string) => {
    const n = Number(state[key]);
    if (!Number.isFinite(n) || n <= 0) throw new Error("The saved LED wall is incomplete. Open the calculator and check its dimensions.");
    return n;
  };
  let width = Number(state.ledCabinetPixelsWide), height = Number(state.ledCabinetPixelsHigh);
  if (!(width > 0 && height > 0)) {
    if (width > 0 || height > 0) throw new Error("The saved LED cabinet has only one pixel dimension. Complete it in the calculator first.");
    width = Math.round(positive("ledCabinetWidthMm") / positive("ledPitchMm"));
    height = Math.round(positive("ledCabinetHeightMm") / positive("ledPitchMm"));
  }
  const rotated = String(state.ledCabinetRotation) === "90";
  if (rotated) [width, height] = [height, width];
  const ceil = (n: number) => Math.max(1, Math.ceil(n - 1e-10));
  let columns: number, rows: number;
  if (state.ledMode === "targetRaster") {
    columns = ceil(positive("ledTargetWidthPx") / width); rows = ceil(positive("ledTargetHeightPx") / height);
  } else if (state.ledMode === "targetSize") {
    columns = ceil(positive("ledTargetWidthFt") * 304.8 / positive(rotated ? "ledCabinetHeightMm" : "ledCabinetWidthMm"));
    rows = ceil(positive("ledTargetHeightFt") * 304.8 / positive(rotated ? "ledCabinetWidthMm" : "ledCabinetHeightMm"));
  } else if (state.ledMode === "layout" || state.ledMode === "custom") {
    columns = positive("ledCabinetsWide"); rows = positive("ledCabinetsHigh");
  } else throw new Error("Open the LED Wall Calculator and save a current wall layout first.");
  if (![width, height, columns, rows].every(Number.isSafeInteger)) throw new Error("The saved LED wall needs whole cabinet and pixel dimensions.");
  const format = customFormat(width * columns, height * rows, positive("ledRefreshHz"));
  return { format, ...timingParts(format), name: typeof state.ledProductName === "string" ? state.ledProductName : "LED wall" };
}
