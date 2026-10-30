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
const pagers = new Map<string, {refresh: () => void}>();
let initializePromise: Promise<void> | null = null;
let initialized = false, parking: HTMLElement, action: HTMLElement, saved: HTMLElement;

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
    const units = fields ? Array.from(fields.children) : Array.from(node.children);
    if (type === "preview") continue;
    items.append(...units); if (fields) fields.remove();
    node.querySelector("legend")?.remove(); node.setAttribute("aria-label", LED_LIBRARY.find(p => p.type === type)!.name); node.append(items);
    pagers.set(type, window.AVViewport.paginate(node, items, {units: units as HTMLElement[], label: LED_LIBRARY.find(p => p.type === type)!.name, hiddenClass: "led-native-away", navClass: "led-native-pages"}));
  }
  query("#ledWallPreview")[0].addEventListener("led-wall:select", () => host.show("tools"));
  initialized = true;
}

function Leaf({type}: {type: string}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = nodes.get(type); if (!node || !ref.current) return;
    ref.current.append(node); pagers.get(type)?.refresh();
    return () => {parking.append(node);};
  }, [type]);
  return <div className="led-native led-suite led-native-leaf" ref={ref} />;
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
