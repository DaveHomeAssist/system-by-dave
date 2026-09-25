import { useEffect, useState, useSyncExternalStore } from "react";
import { type SimulatorStore, type StoreState, type Telemetry } from "./store";

export function useStoreState(store: SimulatorStore): StoreState {
  return useSyncExternalStore(store.subscribe, store.getState);
}

/** Live camera figures for readouts, sampled a few times a second rather than every frame. */
export function useTelemetry(store: SimulatorStore, hz = 12): Telemetry {
  const [telemetry, setTelemetry] = useState(() => store.getTelemetry());
  useEffect(() => {
    const id = window.setInterval(() => setTelemetry(store.getTelemetry()), 1000 / hz);
    return () => window.clearInterval(id);
  }, [store, hz]);
  return telemetry;
}

/** Whether a media query matches, following changes (rotation, window resize). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return undefined;
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener?.("change", onChange);
    return () => list.removeEventListener?.("change", onChange);
  }, [query]);
  return matches;
}

export type LayoutClass = "phone" | "tablet" | "desktop" | "ultrawide";

export function layoutFor(width: number): LayoutClass {
  if (width < 720) return "phone";
  if (width < 1100) return "tablet";
  if (width < 1800) return "desktop";
  return "ultrawide";
}

export function useLayoutClass(): LayoutClass {
  const [layout, setLayout] = useState<LayoutClass>(() => layoutFor(window.innerWidth));
  useEffect(() => {
    const onResize = () => setLayout(layoutFor(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return layout;
}
