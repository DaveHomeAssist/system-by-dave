import { useEffect, useRef, useState } from 'react';
import type { PanelDef } from '../../../shared/av-console/layout';
import { mountGearPanel, ION_VIEWER_ORIGIN, type GearPanelHost } from './panel-host';
import { EQUIPMENT, readState, stateKey, storeState } from './state';
import './panel-host.css';

export const GEAR_PANELS: PanelDef[] = [
  { type: 'gear:ion', key: 'ion', name: 'ETC Ion · 3D', app: 'Gear 3D', group: 'Utilities', description: 'Original Ion console with selectable controls and an internal inspector. Requires access to Ion Workbench.', minW: 5, minH: 5 },
  { type: 'gear:wing', key: 'wing', name: 'Universal 2×20 · 3D', app: 'Gear 3D', group: 'Utilities', description: '40 physical faders in four banks of ten, with local practice levels.', minW: 5, minH: 5 },
];
export const gearHref = (gear: string) => `${ION_VIEWER_ORIGIN}/#${gear === 'wing' ? 'wing-upper-01-fader' : 'ion-about'}`;

export function GearViewerPanel({ viewId, panelId, gear, theme }: { viewId: string; panelId: string; gear: 'ion' | 'wing'; theme: string }) {
  const node = useRef<HTMLDivElement>(null), host = useRef<GearPanelHost | undefined>(undefined);
  const currentTheme = useRef(theme); currentTheme.current = theme;
  const [storageProblem, setStorageProblem] = useState(false);
  useEffect(() => {
    if (!node.current) return;
    const key = stateKey(viewId, panelId);
    let saved;
    try { saved = readState(localStorage, key); } catch { /* Restricted browser storage. */ }
    const panel = mountGearPanel({ container: node.current, initialState: saved || { version: 1, equipment: EQUIPMENT, assembly: gear, selected: gear === 'wing' ? 'wing-upper-01-fader' : 'ion-about', inspector: false }, theme: currentTheme.current,
      onState: state => { try { if (!storeState(localStorage, key, state)) setStorageProblem(true); } catch { setStorageProblem(true); } },
    });
    host.current = panel;
    return () => { panel.dispose(); host.current = undefined; };
  }, [viewId, panelId, gear]);
  useEffect(() => { host.current?.setTheme(theme); }, [theme]);
  return <div className="suite-gear-panel"><div className="gear-panel-mount" ref={node} />{storageProblem && <p role="status">View changes are available for this visit; browser storage is unavailable.</p>}</div>;
}
