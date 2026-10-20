import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../../shared/av-console/console.css";
import "./styles.css";

// The suite host owns navigation around an embedded application. Keep Show
// Ops' Save and workspace, without nesting a second application Rail inside it.
if (window.parent !== window && new URLSearchParams(location.search).get("sbdEmbed") === "console") {
  document.documentElement.classList.add("ops-embedded");
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
