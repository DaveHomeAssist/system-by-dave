import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../../shared/av-console/console.css";
import "./styles.css";

// The host owns navigation, never the Infrastructure document.
if (window.parent !== window && new URLSearchParams(location.search).get("sbdEmbed") === "console") {
  document.documentElement.classList.add("infra-embedded");
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
