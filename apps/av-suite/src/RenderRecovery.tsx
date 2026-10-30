import { Component, createRef, type ReactNode } from "react";

/** Contains React render failures without changing stored plans or retrying automatically. */
export class RenderRecovery extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  private recovery = createRef<HTMLElement>();

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.recovery.current?.focus();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main id="workspace" className="suite-recovery" ref={this.recovery} tabIndex={-1} aria-labelledby="recovery-title">
        <div className="suite-recovery-card">
          <h1 id="recovery-title">The console could not display this workspace</h1>
          <p role="alert">A display error stopped the console. This recovery screen does not clear your saved plans or workspace.</p>
          <p>Unsaved edits may be unavailable. Reload once to try again. If the error returns, leave this page open and ask for help before clearing any site data.</p>
          <div className="suite-recovery-actions">
            <button type="button" onClick={() => window.location.reload()}>Reload console</button>
            <button type="button" onClick={() => {
              const current = document.documentElement.dataset.avTheme;
              const dark = current === "dark" || current === "black" || (current === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
              document.documentElement.dataset.avTheme = dark ? "light" : "dark";
            }}>Switch light or dark theme</button>
          </div>
        </div>
      </main>
    );
  }
}
