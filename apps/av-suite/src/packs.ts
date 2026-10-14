import type { PackDef } from "../../shared/av-console/pack";
import { videoPack } from "../../av-video/src/pack";
import { audioPack } from "../../av-audio/src/pack";
import { showControlPack } from "../../show-control/src/pack";
import { showOpsPack } from "../../show-ops/src/pack";
import { frontOfficePack } from "../../front-office/src/pack";
import { shopPack } from "../../the-shop/src/pack";
import { infrastructurePack } from "../../infrastructure/src/pack";
import { lightingPack } from "../../av-lighting/src/pack";
import { calculatorPack } from "../../av-calculator/src/pack";

/* All nine Rail identities expose individual, in-process panels. */
export const PACKS: PackDef[] = [videoPack, audioPack, showControlPack, showOpsPack, frontOfficePack, shopPack, infrastructurePack, lightingPack, calculatorPack];

/* Specialist tools hosted as chrome-less panels (`?sbdEmbed=panel`). Each
   keeps its own page, document and storage; the shell never reads them. */
export type Specialist = { id: string; label: string; description: string; consoleId?: string; fallbackHref: string; minW: number; minH: number };
export const SPECIALISTS: Specialist[] = [
  { id: "throwline", label: "Throwline", description: "Projector throw, fit, brightness and multi-projector layouts with Stage 3D.", fallbackHref: "ProjectorThrow/", minW: 5, minH: 4 },
  { id: "led-wall-calculator", label: "LED Wall Calculator", description: "Cabinet layout, native raster, processor ports and power planning.", fallbackHref: "led-wall-calculator.html", minW: 4, minH: 4 },
  { id: "teleprompter", label: "Teleprompter", description: "Scripts, cues, remote mode, rundown and read view.", fallbackHref: "teleprompter.html", minW: 4, minH: 3 },
  { id: "show-timer", label: "Show Timer", description: "Countdown, count up, clock, stage view and warnings.", fallbackHref: "show-timer.html", minW: 3, minH: 2 },
  { id: "cue-sheet", label: "Cue Sheet", description: "Cue lists with layered playback, monitor output and capture inputs.", fallbackHref: "cue-sheet.html", minW: 4, minH: 3 },
  { id: "pixelforge", label: "PixelForge", description: "Vector, text and image editing for show graphics and overlays.", fallbackHref: "pixelforge/", minW: 5, minH: 4 },
  { id: "stageplotter", label: "StagePlotter", description: "Room layouts with screens, cameras, speakers, mics, power and cable paths.", fallbackHref: "stage-plot.html", minW: 5, minH: 4 },
];

type Registry = { tools?: { id: string; href: string }[] };
declare global { interface Window { SBD_REGISTRY?: Registry } }

export function specialistHref(tool: Specialist) {
  const registered = window.SBD_REGISTRY?.tools?.find(entry => entry.id === tool.id)?.href;
  return `/${(registered || tool.fallbackHref).replace(/^\.?\//, "")}`;
}
