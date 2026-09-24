import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import "./styles/onboarding-presets.css";
import { App } from "./ui/App";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
