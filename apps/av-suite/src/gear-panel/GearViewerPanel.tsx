import { useEffect, useRef, useState } from 'react';
import type { PanelDef } from '../../../shared/av-console/layout';
import { mountGearPanel, ION_VIEWER_ORIGIN, type GearPanelHost } from './panel-host';
import { EQUIPMENT, SMARTFADE, readState, stateKey, storeState } from './state';
import './panel-host.css';

export type Gear = 'ion' | 'wing' | 'smartfade1248' | 'smartfade1248-second';
export const GEAR_PANELS: PanelDef[] = [
  { type: 'gear:ion', key: 'ion', name: 'ETC Ion · 3D', app: 'Gear 3D', group: 'Utilities', description: 'Original Ion console with selectable controls and an internal inspector. Requires access to Ion Workbench.', minW: 5, minH: 5 },
  { type: 'gear:smartfade1248', key: 'smartfade1248', name: 'ETC SmartFade 1248 · 3D prototype', app: 'Gear 3D', group: 'Utilities', description: '28 physical sliders and separately inspectable keys. Rear layout and travel are provisional; no practice output.', minW: 5, minH: 5 },
  { type: 'gear:smartfade1248-second', key: 'smartfade1248-second', name: 'ETC SmartFade 1248 · Second instance', app: 'Gear 3D', group: 'Utilities', description: 'An independent copy of the same prototype model, with its own selection and physical positions. No show patch is assigned.', minW: 5, minH: 5 },
  { type: 'gear:wing', key: 'wing', name: 'Universal 2×20 · 3D', app: 'Gear 3D', group: 'Utilities', description: '40 physical faders in four banks of ten, with local practice levels.', minW: 5, minH: 5 },
];
export const gearHref = (gear: string) => gear.startsWith('smartfade1248') ? `${ION_VIEWER_ORIGIN}/?gear=smartfade1248#sf1248.fader.01` : `${ION_VIEWER_ORIGIN}/#${gear === 'wing' ? 'wing-upper-01-fader' : 'ion-about'}`;

export function GearViewerPanel({ viewId, panelId, gear, theme }: { viewId: string; panelId: string; gear: Gear; theme: string }) {
  const node = useRef<HTMLDivElement>(null), host = useRef<GearPanelHost | undefined>(undefined);
  const currentTheme = useRef(theme); currentTheme.current = theme;
  const [storageProblem, setStorageProblem] = useState(false);
  useEffect(() => {
    if (!node.current) return;
    const equipment = gear.startsWith('smartfade1248') ? SMARTFADE : EQUIPMENT;
    const key = stateKey(viewId, panelId, equipment);
    let saved;
    try { saved = readState(localStorage, key, equipment); } catch { /* Restricted browser storage. */ }
    const panel = mountGearPanel({ src: gear.startsWith('smartfade1248') ? `${ION_VIEWER_ORIGIN}/?gear=smartfade1248` : undefined, workspaceView: viewId, panelInstanceId: panelId, container: node.current, initialState: saved || { version: 1, equipment, assembly: gear === 'ion' || gear === 'wing' ? gear : 'smartfade1248', selected: gear.startsWith('smartfade1248') ? 'sf1248.fader.01' : gear === 'wing' ? 'wing-upper-01-fader' : 'ion-about', inspector: false }, theme: currentTheme.current,
      onState: state => { try { if (!storeState(localStorage, key, state)) setStorageProblem(true); } catch { setStorageProblem(true); } },
    });
    host.current = panel;
    return () => { panel.dispose(); host.current = undefined; };
  }, [viewId, panelId, gear]);
  useEffect(() => { host.current?.setTheme(theme); }, [theme]);
  return <div className="suite-gear-panel"><div className="gear-panel-mount" ref={node} />{storageProblem && <p role="status">View changes are available for this visit; browser storage is unavailable.</p>}</div>;
}
