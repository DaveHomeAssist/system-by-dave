import type { RegistryTool, SbdRegistry } from "./types";

declare global {
  interface Window {
    SBD_REGISTRY?: SbdRegistry;
  }
}

const fallbackTools: RegistryTool[] = [
  { id: "input-list", name: "Input List", href: "../input-list.html", dept: "Audio", phases: ["advance", "prep", "show"], tag: "Inputs", desc: "Source list and patch prep." },
  { id: "audio-patch", name: "Audio Patch", href: "../audio-patch.html", dept: "Audio", phases: ["prep", "loadin", "show"], tag: "Audio", desc: "Console channel and stagebox routing." },
  { id: "line-check", name: "Line Check", href: "../line-check.html", dept: "Audio", phases: ["loadin", "show"], tag: "Check", desc: "Verification state for inputs." },
  { id: "power-plan", name: "Power Plan", href: "../power-plan.html", dept: "Power", phases: ["advance", "prep", "loadin"], tag: "Power", desc: "Circuit and headroom planning." },
  { id: "rf-coordination", name: "RF Coordination", href: "../rf-coordination.html", dept: "Comms", phases: ["advance", "prep", "show"], tag: "RF", desc: "Wireless frequency coordination." }
];

export function readRegistry(): SbdRegistry {
  if (typeof window !== "undefined" && window.SBD_REGISTRY) return window.SBD_REGISTRY;
  return {
    version: "fallback",
    phases: [
      { id: "advance", label: "Advance" },
      { id: "prep", label: "Prep" },
      { id: "loadin", label: "Load In" },
      { id: "show", label: "Show" },
      { id: "strike", label: "Strike" },
      { id: "closeout", label: "Closeout" }
    ],
    tools: fallbackTools,
    recommended: {}
  };
}
