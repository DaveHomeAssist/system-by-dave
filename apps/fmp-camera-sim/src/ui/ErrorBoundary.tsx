import { Component, type ErrorInfo, type ReactNode } from "react";
import { downloadText, sessionFilename } from "../app/download";
import { SUITE_LINKS, suiteHref } from "../app/links";
import { APP_LABEL } from "../release";
import { browserStorage, setAsideSavedSession, STORAGE_KEY } from "../storage/persist";

interface State {
  error: Error | null;
  note: string;
}

/** The saved session as stored, even when it is the reason the interface failed. */
function savedText(): string | null {
  try {
    return browserStorage()?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * Last line of defence around the whole interface. If it fails to start or draw, this says so
 * and keeps the saved session reachable: export it, or set it aside and start fresh, since a
 * session that breaks the page would break every reload too.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, note: "" };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // The page cannot report errors anywhere (connect-src 'none'); the console is the record.
    console.error("FMP Camera Simulator stopped:", error, info.componentStack);
  }

  private startFresh = (): void => {
    const kept = setAsideSavedSession(browserStorage());
    if (kept === null) {
      this.setState({ note: "Browser storage has no room to keep a copy of the saved session. Export it first, or clear this site's data." });
      return;
    }
    window.location.reload();
  };

  render() {
    const { error, note } = this.state;
    if (!error) return this.props.children;
    const saved = savedText();
    return (
      <div className="sim-crash" role="alert" data-testid="sim-crash">
        <h1>The simulator stopped</h1>
        <p>
          Something went wrong while starting or drawing the simulator. Nothing here connects to a real camera, so no equipment was
          affected.
        </p>
        <p className="sim-crash-detail">
          {error.message || "Unknown error"} · {APP_LABEL}
        </p>
        <div className="sim-crash-actions">
          <button type="button" className="tool-button" onClick={() => window.location.reload()}>
            Reload
          </button>
          {saved !== null && (
            <>
              <button type="button" className="tool-button" onClick={() => downloadText(saved, sessionFilename())}>
                Export the saved session
              </button>
              <button type="button" className="tool-button" onClick={this.startFresh}>
                Set the saved session aside and start fresh
              </button>
            </>
          )}
        </div>
        {note && <p className="sim-crash-note">{note}</p>}
        <p>
          The <a href={suiteHref(SUITE_LINKS.ptzGuide)}>Catwalk PTZ operating guide</a> covers the real camera meanwhile.
        </p>
      </div>
    );
  }
}
