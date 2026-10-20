import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../../shared/av-console/console.css";
import "./styles.css";

// The host owns navigation, never the Lighting document.
if (window.parent !== window && new URLSearchParams(location.search).get("sbdEmbed") === "console") {
  document.documentElement.classList.add("lighting-embedded");
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
