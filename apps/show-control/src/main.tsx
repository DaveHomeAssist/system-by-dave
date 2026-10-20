import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../../shared/av-console/console.css";
import "./styles.css";

try {
  const shared = localStorage.getItem('av-theme-mode.v1');
  const previous = localStorage.getItem('sbd.showControl.theme.v1');
  if (!['light', 'dark', 'white', 'black', 'system'].includes(shared || '') && ['light', 'dark'].includes(previous || '')) {
    document.documentElement.dataset.avTheme = previous!;
    localStorage.setItem('av-theme-mode.v1', previous!);
  }
} catch { /* Theme for this visit remains available without storage. */ }

// The suite host owns navigation around an embedded application. Keep Show
// Control' Save and workspace, without nesting a second application Rail inside it.
if (window.parent !== window && new URLSearchParams(location.search).get("sbdEmbed") === "console") {
  document.documentElement.classList.add("call-embedded");
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
