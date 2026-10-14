/// <reference path="./env.d.ts" />
import { useEffect, useRef, useState } from "react";
import type { Pack, PackDef, PackHost } from "../../shared/av-console/pack";
import { LIBRARY, DEFAULT_VIEWS } from "./model";
import { nodes, pagers, parking, prepare } from "./bridge";
import { initializeCalculator } from "virtual:calculator-native";
import sourceHTML from "../../../av-calculator.html?raw";

let initialized = false;
function initialize() {
  if (initialized) return;
  const source = new DOMParser().parseFromString(sourceHTML, "text/html");
  const content = source.getElementById("calculatorSource"), sets = source.getElementById("fieldSetsDialog");
  if (!content || !sets) throw Error("Calculator controls are unavailable. Saved values were not reset.");
  const root = document.createElement("div"); root.className = "calculator-native";
  root.append(content, sets); document.body.append(root);
  root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(link => {
    link.href = new URL(link.getAttribute("href")!, new URL("/av-calculator.html", location.origin)).href;
  });
  // The original engine keeps its original nodes, listeners, storage and
  // formulas. Its document queries cannot see another department's controls.
  const owned = [content, sets, ...Array.from(content.querySelectorAll<HTMLElement>(".calc-card,.summary-panel"))];
  const query = (selector: string) => [...new Set(owned.flatMap(element => [
    ...(element.matches(selector) ? [element] : []), ...Array.from(element.querySelectorAll<HTMLElement>(selector)),
  ]))];
  const localDocument = new Proxy(document, {
    get(target, key) {
      if (key === "getElementById") return (id: string) => query(`#${CSS.escape(id)}`)[0] || null;
      if (key === "querySelector") return (selector: string) => query(selector)[0] || null;
      if (key === "querySelectorAll") return query;
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const theme = document.documentElement.dataset.avTheme;
  try { initializeCalculator(localDocument); prepare(root); initialized = true; }
  finally { if (theme) document.documentElement.dataset.avTheme = theme; }
}

function CalculatorPanel({ id }: { id: string }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = nodes.get(id); if (!node || !container.current) return;
    container.current.append(node); pagers.get(id)?.refresh();
    return () => { parking.append(node); };
  }, [id]);
  return <div className="calculator-native calculator-leaf" data-control={id} ref={container} />;
}
function useCalculatorPack(host: PackHost): Pack {
  const [ready, setReady] = useState(initialized);
  const [status, setStatus] = useState("Calculator inputs autosave independently. Choose an individual calculation panel.");
  const [problem, setProblem] = useState(false);
  // The shell updates its workspace ref during render. Inspect it after commit
  // so simply opening a different department never starts the legacy engine.
  useEffect(() => {
    if (ready || problem || !host.panels().length) return;
    try { initialize(); setReady(true); }
    catch (error) { setProblem(true); setStatus(String(error)); }
  });
  useEffect(() => {
    if (!ready) return;
    const action = nodes.get("actionStatus")!, saved = nodes.get("saveStatus")!;
    const update = () => {
      const text = [action.textContent, saved.textContent].filter(Boolean).join(" "), error = action.classList.contains("error");
      setStatus(text); setProblem(error); host.notify(text, error);
    };
    const observer = new MutationObserver(update);
    for (const element of [action, saved]) observer.observe(element, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class"] });
    update(); return () => observer.disconnect();
  }, [ready]);
  const notify = (text: string, error = false) => { setStatus(text); setProblem(error); host.notify(text, error); };
  return {
    id: "calculator", label: "AV Calculator", title: "Field calculations", summary: "Independent calculation panels · inputs autosave",
    dirty: false, blocked: !ready, save: () => notify(status, problem),
    exportDoc: () => nodes.get("summaryCard")?.querySelector<HTMLButtonElement>("#downloadSummaryBtn")?.click(),
    status, problem, notify,
    recovery: { offer: null, restore: () => undefined, discard: () => undefined, errors: [] },
    render: type => ({
      body: ready ? <CalculatorPanel id={type} /> : <p role="status">{problem ? status : "Preparing calculator controls…"}</p>,
      actions: ready ? <button type="button" onClick={() => document.querySelector<HTMLDialogElement>(".calculator-native #fieldSetsDialog")?.showModal()}>Field sets</button> : undefined,
    }),
    library: LIBRARY, quick: LIBRARY.map(p => ({ type: p.type, label: p.name })), views: DEFAULT_VIEWS,
    storeViews: () => notify("Store this arrangement using the shared workspace view controls."),
  };
}
export const calculatorPack: PackDef = { id: "calculator", label: "AV Calculator", consoleId: "av-calculator", library: LIBRARY, defaultViews: DEFAULT_VIEWS, use: useCalculatorPack };
