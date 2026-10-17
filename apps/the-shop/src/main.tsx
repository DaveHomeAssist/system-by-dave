import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../../shared/av-console/console.css";
import "./styles.css";

try {
  const shared = localStorage.getItem('av-theme-mode.v1');
  const previous = localStorage.getItem('sbd.shop.theme.v1');
  if (!['light', 'dark', 'white', 'black', 'system'].includes(shared || '') && ['light', 'dark'].includes(previous || '')) {
    document.documentElement.dataset.avTheme = previous!;
    localStorage.setItem('av-theme-mode.v1', previous!);
  }
} catch { /* Theme for this visit remains available without storage. */ }

// The suite host owns navigation; Shop retains its independent Save and panels.
if (window.parent !== window && new URLSearchParams(location.search).get("sbdEmbed") === "console") {
  document.documentElement.classList.add("shop-embedded");
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
