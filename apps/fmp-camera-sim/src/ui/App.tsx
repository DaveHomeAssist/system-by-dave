import { useCallback, useEffect, useRef, useState } from "react";
import { downloadText, sessionFilename } from "../app/download";
import { Engine } from "../app/engine";
import { type LayoutClass, useLayoutClass, useStoreState } from "../app/hooks";
import { SimulatorStore } from "../app/store";
import { useTheme } from "../app/theme";
import { InputController, nowSeconds } from "../input/controller";
import { attachKeyboard } from "../input/keyboard";
import { MonitorOverlay } from "../render/monitorOverlay";
import { type OverviewPreset, SceneRenderer } from "../render/renderer";
import { browserStorage } from "../storage/persist";
import { AppBar } from "./AppBar";
import { ControlsPanel } from "./ControlsPanel";
import { HelpDialog } from "./HelpDialog";
import { MonitorPanel } from "./MonitorPanel";
import { type PanelTab, SidePanel } from "./SidePanel";
import { VenuePanel } from "./VenuePanel";

type MobileTab = "operate" | "venue" | "exercises" | "settings";

const MOBILE_TABS: Array<{ id: MobileTab; label: string }> = [
  { id: "operate", label: "Operate" },
  { id: "venue", label: "Venue" },
  { id: "exercises", label: "Exercises" },
  { id: "settings", label: "Settings" },
];

const SETTINGS_TABS: PanelTab[] = ["venue", "camera", "performer", "session"];

const venueDefault = (layout: LayoutClass) => layout === "desktop" || layout === "ultrawide";

export function App() {
  const [runtime] = useState(() => {
    const store = new SimulatorStore(browserStorage());
    return { store, input: new InputController(store) };
  });
  const { store, input } = runtime;
  const state = useStoreState(store);
  const { theme, toggle: toggleTheme } = useTheme();
  const layout = useLayoutClass();
  const phone = layout === "phone";
  const docked = layout === "ultrawide";

  const [venueShown, setVenueShown] = useState(() => venueDefault(layout));
  const [expanded, setExpanded] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; tab: PanelTab }>({ open: false, tab: "exercises" });
  const [mobileTab, setMobileTab] = useState<MobileTab>("operate");
  const [settingsTab, setSettingsTab] = useState<PanelTab>("venue");
  const [helpOpen, setHelpOpen] = useState(false);
  const [quality, setQuality] = useState(0);

  const monitorRef = useRef<HTMLCanvasElement>(null);
  const overviewRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  // Follow the layout class when it changes (rotation, window resize).
  const lastLayout = useRef(layout);
  useEffect(() => {
    if (lastLayout.current === layout) return;
    lastLayout.current = layout;
    setVenueShown(venueDefault(layout));
    if (layout !== "phone") setMobileTab("operate");
  }, [layout]);

  // Renderer and frame loop. A renderer failure leaves the simulation and controls running.
  useEffect(() => {
    const monitor = monitorRef.current;
    const overview = overviewRef.current;
    let renderer: SceneRenderer | null = null;
    if (monitor && overview) {
      try {
        renderer = new SceneRenderer(monitor, overview, {
          onContextLost: () => store.setRenderStatus("lost"),
          onContextRestored: () => store.setRenderStatus("ok"),
          onQualityChange: setQuality,
        });
        renderer.setGeometry(store.getState().geometry);
        renderer.setTheme(themeRef.current);
        store.setRenderStatus("ok");
      } catch (error) {
        renderer = null;
        store.setRenderStatus("unavailable", error instanceof Error ? error.message : "");
      }
    }
    rendererRef.current = renderer;
    const overlay = overlayRef.current ? new MonitorOverlay(overlayRef.current) : null;
    const engine = new Engine({
      store,
      input,
      renderer,
      overlay,
      overviewVisible: () => (overviewRef.current?.clientWidth ?? 0) > 1,
    });
    engine.start();
    return () => {
      engine.stop();
      renderer?.dispose();
      rendererRef.current = null;
    };
  }, [store, input]);

  useEffect(() => {
    rendererRef.current?.setGeometry(state.geometry);
  }, [state.geometry]);

  useEffect(() => {
    rendererRef.current?.setTheme(theme);
  }, [theme]);

  // Keyboard operation. Actions read the latest callbacks through refs so the listener stays put.
  const toggleExpanded = useCallback(() => setExpanded((value) => !value), []);
  const actions = useRef({ toggleExpanded, openHelp: () => setHelpOpen(true) });
  actions.current = { toggleExpanded, openHelp: () => setHelpOpen(true) };
  useEffect(
    () =>
      attachKeyboard(store, input, {
        toggleExpanded: () => actions.current.toggleExpanded(),
        openHelp: () => actions.current.openHelp(),
      }),
    [store, input],
  );

  // Read-only diagnostics for browser verification (?diagnostics=1).
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("diagnostics")) return undefined;
    // Readings advance the simulation to "now" first, exactly as the next frame would, so a slow
    // renderer cannot make a probe read a state up to one frame old.
    const current = () => {
      store.advanceTo(Math.max(nowSeconds(), store.wall));
      return store.getTelemetry();
    };
    const api = {
      snapshot: () => current().snapshot,
      frame: () => {
        const { frame } = current();
        return { forward: frame.forward, position: frame.position, hfovDeg: frame.hfovDeg };
      },
      render: () => rendererRef.current?.getDiagnostics() ?? null,
      state: () => {
        const s = store.getState();
        return {
          renderStatus: s.renderStatus,
          storage: s.storage,
          unsettled: s.unsettled,
          calibrated: s.calibrated,
          exercise: s.exercise ? { id: s.exercise.id, status: s.exercise.progress.status, result: s.exercise.progress.result } : null,
          presets: s.project.session.presets,
          geometry: { camera: s.geometry.camera, stageWidth: s.geometry.stageWidth, stageDepth: s.geometry.stageDepth },
          hidden: s.hidden,
        };
      },
    };
    (window as unknown as { __fmpCameraSim?: typeof api }).__fmpCameraSim = api;
    return () => {
      delete (window as unknown as { __fmpCameraSim?: typeof api }).__fmpCameraSim;
    };
  }, [store]);

  const openPanel = (tab: PanelTab, opener: HTMLElement) => {
    openerRef.current = opener;
    if (phone) {
      if (tab === "exercises") setMobileTab("exercises");
      else {
        setSettingsTab(tab);
        setMobileTab("settings");
      }
      return;
    }
    setDrawer((current) => (current.open && current.tab === tab && !docked ? { open: false, tab } : { open: true, tab }));
  };

  const closePanel = () => {
    setDrawer((current) => ({ ...current, open: false }));
    window.setTimeout(() => openerRef.current?.focus(), 0);
  };

  const panelOpen = phone ? mobileTab === "exercises" || mobileTab === "settings" : docked || drawer.open;
  const panelTab: PanelTab = phone ? (mobileTab === "exercises" ? "exercises" : settingsTab) : drawer.tab;
  const panelTabs = phone ? (mobileTab === "exercises" ? (["exercises"] as PanelTab[]) : SETTINGS_TABS) : undefined;

  return (
    <div
      className="sim-app"
      data-layout={layout}
      data-expanded={expanded}
      data-venue={venueShown ? "shown" : "collapsed"}
      data-panel={panelOpen ? "open" : "closed"}
      data-mobile-tab={mobileTab}
    >
      <AppBar
        state={state}
        theme={theme}
        drawerOpen={panelOpen}
        drawerTab={panelTab}
        showPanelButtons={!phone}
        onOpen={openPanel}
        onHelp={() => setHelpOpen(true)}
        onToggleTheme={toggleTheme}
      />
      {state.storageNotice && (
        <div className="banner banner-warn" role="alert">
          <p>{state.storageNotice}</p>
          <button type="button" className="tool-button" onClick={() => store.dismissStorageNotice()}>
            Dismiss
          </button>
        </div>
      )}
      {state.storage.state === "unavailable" && (
        <div className="banner banner-warn" role="status">
          <p>{state.storage.reason} The session still works. Export it to keep presets and results.</p>
          <button
            type="button"
            className="tool-button"
            onClick={() => downloadText(store.exportText(), sessionFilename())}
          >
            Export session
          </button>
        </div>
      )}
      {state.storageConflict && (
        <div className="banner banner-warn" role="alert">
          <p>Another tab saved a different copy of this session. Autosave is paused here until you choose which copy to keep.</p>
          <button type="button" className="tool-button" onClick={() => store.useSavedCopy(nowSeconds())}>
            Load the other copy
          </button>
          <button type="button" className="tool-button" onClick={() => store.keepThisCopy()}>
            Keep this tab's copy
          </button>
        </div>
      )}
      <div className="sim-workspace">
        <MonitorPanel
          state={state}
          store={store}
          canvasRef={monitorRef}
          overlayRef={overlayRef}
          expanded={expanded}
          onToggleExpanded={toggleExpanded}
          onGuides={(patch) => store.setGuides(patch)}
        />
        <VenuePanel
          state={state}
          canvasRef={overviewRef}
          shown={phone ? mobileTab === "venue" : venueShown && !expanded}
          quality={quality}
          onToggle={() => {
            if (expanded) setExpanded(false);
            setVenueShown((value) => !value);
          }}
          onView={(view: OverviewPreset) => rendererRef.current?.setOverviewView(view, state.geometry)}
        />
        <ControlsPanel store={store} input={input} state={state} />
        <SidePanel
          store={store}
          state={state}
          open={panelOpen}
          docked={docked || phone}
          tab={panelTab}
          tabs={panelTabs}
          onTab={(tab) => (phone ? setSettingsTab(tab) : setDrawer({ open: true, tab }))}
          onClose={closePanel}
        />
      </div>
      {phone && (
        <nav className="mobile-rail" aria-label="Simulator sections">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-current={mobileTab === tab.id ? "page" : undefined}
              onClick={() => {
                input.releaseAll(nowSeconds());
                setMobileTab(tab.id);
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
