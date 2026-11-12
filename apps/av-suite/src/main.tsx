// First, so storage is checked before any pack module runs.
import { storageState } from "./storage";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../../shared/av-console/console.css";
import "../../av-video/src/styles.css";
import "../../av-video/src/flow.css";
import "../../av-audio/src/styles.css";
import "../../show-control/src/styles.css";
import "../../show-ops/src/styles.css";
import "../../front-office/src/styles.css";
import "../../the-shop/src/styles.css";
import "../../infrastructure/src/styles.css";
import "../../av-lighting/src/styles.css";
import "../../equipment-lab/src/styles.css";
import "./shell.css";
import "virtual:calculator-native.css";
const root = document.getElementById("root")!;
if (storageState === "unusable") {
  // Storage is refused and no stand-in could be installed: say so instead of rendering nothing.
  const notice = document.createElement("main");
  notice.className = "suite-blocked";
  notice.setAttribute("role", "alert");
  const title = document.createElement("h1");
  title.textContent = "AV by Dave can't open here";
  const text = document.createElement("p");
  text.textContent = "This browser is blocking site storage for this site, and the console needs it to open. Allow site data (cookies) for this site, then reload.";
  notice.append(title, text);
  root.replaceChildren(notice);
} else {
  createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
}
