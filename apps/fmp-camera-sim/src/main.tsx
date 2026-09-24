import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import "./styles/onboarding-presets.css";
import { App } from "./ui/App";
import { ErrorBoundary } from "./ui/ErrorBoundary";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
