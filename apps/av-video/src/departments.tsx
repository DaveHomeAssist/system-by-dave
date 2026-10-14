import { memo, useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactElement } from "react";
import { App as Audio, library as audioPanels, defaults as audioViews } from "../../av-audio/src/App";
import { App as Lighting } from "../../av-lighting/src/App";
import { App as Infrastructure } from "../../infrastructure/src/App";
import { App as Office } from "../../front-office/src/App";
import { App as Shop } from "../../the-shop/src/App";
import { App as Ops } from "../../show-ops/src/App";
import { App as Control } from "../../show-control/src/App";
import { App as Calculator } from "../../av-calculator/src/App";
import { LIBRARY as lightingPanels, DEFAULT_VIEWS as lightingViews } from "../../av-lighting/src/model";
import { LIBRARY as infrastructurePanels, DEFAULT_VIEWS as infrastructureViews } from "../../infrastructure/src/model";
import { LIBRARY as officePanels, DEFAULT_VIEWS as officeViews } from "../../front-office/src/model";
import { LIBRARY as shopPanels, DEFAULT_VIEWS as shopViews } from "../../the-shop/src/model";
import { LIBRARY as opsPanels, DEFAULT_VIEWS as opsViews } from "../../show-ops/src/model";
import { LIBRARY as controlPanels, DEFAULT_VIEWS as controlViews } from "../../show-control/src/model";
import { LIBRARY as calculatorPanels, DEFAULT_VIEWS as calculatorViews } from "../../av-calculator/src/model";
import { prepare } from "../../av-calculator/src/bridge";
import { DepartmentScreen, type DepartmentBridge } from "../../shared/av-console/Department";
import { DepartmentNavigation } from "../../shared/av-console/DepartmentContext";
import type { Panel, View } from "../../shared/av-console/layout";
import calculatorHTML from "../../../av-calculator.html?raw";
import "virtual:department.css";

export const DEPARTMENTS = [
  { id: "audio", Component: memo(Audio), panels: audioPanels, views: audioViews },
  { id: "show-control", Component: memo(Control), panels: controlPanels, views: controlViews },
  { id: "show-ops", Component: memo(Ops), panels: opsPanels, views: opsViews },
  { id: "front-office", Component: memo(Office), panels: officePanels, views: officeViews },
  { id: "shop", Component: memo(Shop), panels: shopPanels, views: shopViews },
  { id: "infrastructure", Component: memo(Infrastructure), panels: infrastructurePanels, views: infrastructureViews },
  { id: "lighting", Component: memo(Lighting), panels: lightingPanels, views: lightingViews },
  { id: "av-calculator", Component: memo(Calculator), panels: calculatorPanels, views: calculatorViews },
];

// Display-only compatibility: keep old saved bytes and stable view/panel IDs.
// A former whole-app tile becomes its department's default individual panels.
export function expandDepartmentPanels(panels: Panel[]): Panel[] {
  return panels.flatMap(panel => {
    const department = DEPARTMENTS.find(d => panel.type === `suite-${d.id}`);
    if (!department) return [panel];
    return department.views[0].panels.map(child => {
      const x = panel.x + Math.floor(child.x * panel.w / 12), y = panel.y + Math.floor(child.y * panel.h / 8);
      const right = panel.x + Math.floor((child.x + child.w) * panel.w / 12);
      const bottom = panel.y + Math.floor((child.y + child.h) * panel.h / 8);
      return { ...child, id: `${panel.id}/${child.id}`, type: `${department.id}:${child.type}`, x, y, w: right - x, h: bottom - y };
    }).filter(p => p.w > 0 && p.h > 0);
  });
}
export const expandDepartmentViews = (views: View[]) => views.map(v => ({ ...v, panels: expandDepartmentPanels(v.panels) }));

let calculatorBoot: Promise<void> | undefined;
function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script"); script.src = src;
    script.onload = () => resolve(); script.onerror = () => reject(Error(`Could not load ${src}; calculator data was not reset.`));
    document.head.append(script);
  });
}
function startCalculator() {
  return calculatorBoot ||= (async () => {
    const parsed = new DOMParser().parseFromString(calculatorHTML, "text/html");
    const source = parsed.getElementById("calculatorSource"), sets = parsed.getElementById("fieldSetsDialog");
    if (!source || !sets) throw Error("Calculator source panels are unavailable.");
    const container = document.createElement("div"); container.dataset.department = "av-calculator";
    container.append(source, sets); document.body.append(container);
    await loadScript("/js/av-viewport.js");
    await loadScript("/js/av-calculator.js");
    await loadScript("/js/av-calculator-field-sets.js");
    prepare(container);
  })();
}

export function DepartmentRuntime({ bridge, show }: { bridge: DepartmentBridge; show: (type: string) => boolean }) {
  const started = useSyncExternalStore(bridge.subscribe, bridge.started);
  const [ready, setReady] = useState(bridge.id !== "av-calculator"), [error, setError] = useState("");
  useEffect(() => {
    if (started && !ready && !error) void startCalculator().then(() => setReady(true), e => setError(String(e)));
  }, [started, ready, error]);
  const present = useCallback((screen: ReactElement) => <DepartmentScreen bridge={bridge} screen={screen} />, [bridge]);
  const navigation = useMemo(() => ({ show: (type: string) => show(`${bridge.id}:${type}`) }), [bridge, show]);
  const entry = DEPARTMENTS.find(d => d.id === bridge.id);
  if (!started || !entry) return null;
  if (error) return <p role="alert">{error}</p>;
  if (!ready) return null;
  const Component = entry.Component;
  return <DepartmentNavigation.Provider value={navigation}><Component present={present} /></DepartmentNavigation.Provider>;
}
