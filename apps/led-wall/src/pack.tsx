/// <reference path="./env.d.ts" />
import { useEffect, useRef, useState } from "react";
import type { Pack, PackDef, PackHost } from "../../shared/av-console/pack";
import type { PanelDef, View } from "../../shared/av-console/layout";
import sourceHTML from "../../../led-wall-calculator.html?raw";
import "virtual:led-native.css";

export const LED_LIBRARY: PanelDef[] = [
  ["profile", "Cabinet Profile"], ["layout", "Wall Layout"], ["data", "Video and Data"],
  ["power", "Power and Viewing"], ["results", "LED Results"], ["tools", "LED Tools"], ["preview", "Cabinet Preview"],
].map(([type, name]) => ({ type, name, description: `LED wall ${name.toLowerCase()}. Planning estimates only.`, group: "Planning", minW: 4, minH: 4 }));
const view = (type: string): View => ({ id: type, name: `LED ${LED_LIBRARY.find(p => p.type === type)!.name}`, panels: [{ id: `led-${type}`, type, x: 0, y: 0, w: 12, h: 8 }] });
const nodes = new Map<string, HTMLElement>();
const pagers = new Map<string, {refresh: () => void; reveal: (element: Element) => void}>();
let initializePromise: Promise<void> | null = null;
let initialized = false, parking: HTMLElement, action: HTMLElement, saved: HTMLElement;
let pendingInspection = false;

function revealInspection() {
  const inspector = nodes.get("tools")?.querySelector<HTMLElement>("#ledCabinetInspector");
  if (!pendingInspection || !inspector?.closest(".led-native-content")) return;
  pagers.get("tools")?.reveal(inspector);
  const report = inspector.querySelector<HTMLElement>("#ledCabinetInspection");
  if (report?.getClientRects().length) {
    report.focus({preventScroll:true});
    pendingInspection = false;
  }
}

function initialize(host: PackHost): Promise<void> {
  if (initialized) return Promise.resolve();
  if (!initializePromise) initializePromise = prepare(host).finally(() => { initializePromise = null; });
  return initializePromise;
}
async function prepare(host: PackHost) {
  const { initializeLED } = await import("virtual:led-native");
  if (!host.panels().length) return;
  const source = new DOMParser().parseFromString(sourceHTML, "text/html");
  const suite = source.getElementById("ledWallConfigurator");
  if (!suite) throw Error("LED controls unavailable. Saved values were not reset.");
  parking = document.createElement("div"); parking.hidden = true; parking.className = "led-native led-suite";
  parking.append(suite);
  const tools = document.createElement("section");
  for (const selector of [".led-suite-actions", "#ledCabinetInspector", ".led-disclaimer"]) tools.append(suite.querySelector(selector)!);
  const results = document.createElement("section"); results.append(suite.querySelector("#ledResultStrip")!, suite.querySelector(".led-detail-grid")!);
  for (const [type, node] of [
    ["profile", suite.querySelector("#ledProfileSection")], ["layout", suite.querySelector("#ledLayoutSection")],
    ["data", suite.querySelector("#ledProcessingSection")], ["power", suite.querySelector("#ledPowerSection")],
    ["results", results], ["tools", tools], ["preview", suite.querySelector(".led-stage")],
  ] as [string, HTMLElement][]) { nodes.set(type, node); parking.append(node); }
  const theme = source.getElementById("themeToggle")!; parking.append(theme);
  saved = source.getElementById("saveStatus")!; action = source.getElementById("actionStatus")!;
  parking.append(saved, action); document.body.append(parking);
  const owned = [suite, theme, saved, action, ...nodes.values()];
  const query = (selector: string) => [...new Set(owned.flatMap(node => [
    ...(node.matches(selector) ? [node] : []), ...Array.from(node.querySelectorAll<HTMLElement>(selector)),
  ]))];
  const root = new Proxy(document.documentElement, {get(target, key) {
    if (key === "dataset") return new Proxy(target.dataset, {get(data, name) { return name === "avTool" ? "led-wall-calculator" : Reflect.get(data, name); }});
    const value = Reflect.get(target, key, target); return typeof value === "function" ? value.bind(target) : value;
  }});
  const localDocument = new Proxy(document, {get(target, key) {
    if (key === "documentElement") return root;
    if (key === "getElementById") return (id: string) => query(`#${CSS.escape(id)}`)[0] || null;
    if (key === "querySelector") return (selector: string) => query(selector)[0] || null;
    if (key === "querySelectorAll") return query;
    const value = Reflect.get(target, key, target); return typeof value === "function" ? value.bind(target) : value;
  }});
  const previousTheme = document.documentElement.dataset.avTheme;
  try { initializeLED(localDocument, (input, init) => fetch(typeof input === "string" ? new URL(input, `${location.origin}/led-wall-calculator.html`) : input, init)); }
  finally { if (previousTheme) document.documentElement.dataset.avTheme = previousTheme; }
  for (const [type, node] of nodes) {
    node.hidden = false;
    const fields = node.querySelector<HTMLElement>(".led-module-fields"); if (fields) fields.hidden = false;
    const items = document.createElement("div"); items.className = "led-native-items";
    if (type === "preview") continue;
    // Page individual results and actions, not an entire expanding disclosure grid.
    const units = fields ? Array.from(fields.children) : type === "results"
      ? [...Array.from(node.querySelector("#ledResultStrip")!.children), ...Array.from(node.querySelector(".led-detail-grid")!.children)]
      : [...Array.from(node.querySelector(".led-suite-actions")!.children), node.querySelector("#ledCabinetInspector")!, node.querySelector(".led-disclaimer")!];
    if (type === "tools") {
      const inspector = node.querySelector<HTMLElement>("#ledCabinetInspector")!;
      const coordinates = inspector.querySelector(".led-cabinet-coordinates")!;
      const controls = Array.from(coordinates.querySelectorAll("label")).map(label => {
        const field = document.createElement("div"); field.className = "field";
        field.append(label, coordinates.querySelector(`#${label.htmlFor}`)!); return field;
      });
      units.splice(units.indexOf(inspector), 0, ...controls); coordinates.remove();
      const report = inspector.querySelector<HTMLElement>("#ledCabinetInspection")!;
      report.classList.add("led-detail-body");
    }
    items.append(...units); if (fields) fields.remove();
    if (type === "results" || type === "tools") node.replaceChildren();
    node.querySelector("legend")?.remove(); node.setAttribute("aria-label", LED_LIBRARY.find(p => p.type === type)!.name); node.append(items);
    for (const text of items.querySelectorAll<HTMLElement>(".led-detail-body, .field-note, .led-disclaimer, .model-note")) {
      text.dataset.web2Scroll = ""; text.tabIndex = 0;
      text.setAttribute("aria-label", text.closest("details")?.querySelector("summary")?.textContent || "LED planning notes");
    }
    const pager = window.AVViewport.paginate(node, items, {units: () => units.flatMap(unit => unit.classList.contains("led-mode-fields") ? Array.from(unit.children) : [unit]) as HTMLElement[], label: LED_LIBRARY.find(p => p.type === type)!.name, hiddenClass: "led-native-away", navClass: "led-native-pages", beforeMeasure: available => {
      node.style.setProperty("--led-page-height", `${Math.max(0, available)}px`);
    }});
    pagers.set(type, pager);
    node.addEventListener("toggle", event => {
      const detail = event.target as HTMLDetailsElement;
      if (detail.open) pager.reveal(detail); else pager.refresh();
    }, true);
  }
  query("#ledWallPreview")[0].addEventListener("led-wall:select", () => {
    pendingInspection = true;
    host.show("tools");
    requestAnimationFrame(revealInspection);
  });
  initialized = true;
}

function Leaf({type}: {type: string}) {
  const ref = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false), [expanded, setExpanded] = useState(false);
  const [expandError, setExpandError] = useState(false);
  useEffect(() => {
    const leaf = ref.current; if (!leaf) return;
    const resize = new ResizeObserver(() => setCompact(leaf.clientHeight < 160)); resize.observe(leaf);
    const update = () => {setExpanded(document.fullscreenElement === leaf); requestAnimationFrame(() => pagers.get(type)?.refresh());};
    document.addEventListener("fullscreenchange", update);
    return () => {resize.disconnect(); document.removeEventListener("fullscreenchange", update);};
  }, [type]);
  useEffect(() => {
    const node = nodes.get(type); if (!node || !content.current) return;
    content.current.append(node); pagers.get(type)?.refresh();
    if (type === "tools") revealInspection();
    return () => {parking.append(node);};
  }, [type]);
  const expand = async () => {
    try {
      if (expanded) await document.exitFullscreen();
      else if (ref.current?.requestFullscreen) await ref.current.requestFullscreen();
      else throw Error("Fullscreen unavailable");
      setExpandError(false);
    } catch {setExpandError(true);}
  };
  return <div className={`led-native led-suite led-native-leaf${compact && !expanded ? " led-native-compact" : ""}`} ref={ref}>
    <div className="led-native-expand" hidden={!compact && !expanded}>
      <button type="button" onClick={expand}>{expanded ? "Restore panel" : expandError ? "Retry full screen" : "Expand LED panel"}</button>
      {!expanded && <a href="/led-wall-calculator.html">Open standalone</a>}
    </div>
    <div className="led-native-content" ref={content} />
  </div>;
}
function useLEDPack(host: PackHost): Pack {
  const [ready, setReady] = useState(initialized), [problem, setProblem] = useState(false);
  const [status, setStatus] = useState("LED planning estimates. Inputs save independently.");
  useEffect(() => {
    if (ready || problem || !host.panels().length) return;
    let active = true;
    initialize(host).then(() => {if (active) setReady(initialized);}).catch(error => {if (active) {setProblem(true); setStatus(String(error));}});
    return () => {active = false;};
  });
  useEffect(() => {
    if (!ready) return;
    const update = () => {setStatus(`${saved.textContent}. ${action.textContent}`); setProblem(action.classList.contains("error"));};
    const observer = new MutationObserver(update); observer.observe(action, {subtree:true,childList:true,characterData:true,attributes:true}); observer.observe(saved, {childList:true}); update();
    return () => observer.disconnect();
  }, [ready]);
  const notify = (text: string, error = false) => {setStatus(text);setProblem(error);host.notify(text,error);};
  return {id:"led",label:"LED Wall Calculator",title:"LED wall planning",summary:"Cabinet-aware planning estimates",dirty:false,blocked:!ready,
    save:()=>notify(status,problem),exportDoc:()=>nodes.get("tools")?.querySelector<HTMLButtonElement>("#downloadLedSummaryBtn")?.click(),
    status,problem,notify,recovery:{offer:null,restore:()=>undefined,discard:()=>undefined,errors:[]},
    render:type=>({body:ready?<Leaf type={type}/>:<p role="status">{problem?status:"Preparing LED controls…"}</p>}),
    library:LED_LIBRARY,quick:LED_LIBRARY.map(p=>({type:p.type,label:p.name})),views:LED_LIBRARY.map(p=>view(p.type)),
    storeViews:()=>notify("Use the shared workspace view controls to store this arrangement.")};
}
export const ledPack: PackDef = {id:"led",label:"LED Wall Calculator",consoleId:"led-wall-calculator",library:LED_LIBRARY,defaultViews:LED_LIBRARY.map(p=>view(p.type)),use:useLEDPack};
