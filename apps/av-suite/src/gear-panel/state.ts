import type { GearViewState } from './panel-host';
export const EQUIPMENT = 'etc-ion-universal-2x20' as const;
export const SMARTFADE = 'etc-smartfade-1248' as const;
export type Equipment = typeof EQUIPMENT | typeof SMARTFADE;
export function stateKey(viewId: string, panelId: string, equipment: Equipment = EQUIPMENT) { return `sbd.avSuite.gear.v1:${JSON.stringify(equipment === EQUIPMENT ? [viewId, panelId] : [viewId, panelId, equipment])}`; }
export function readState(storage: Pick<Storage, 'getItem'>, key: string, equipment: Equipment = EQUIPMENT): GearViewState | undefined {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > 32768) return;
    const state = JSON.parse(raw);
    if (!state || state.version !== 1 || state.equipment !== equipment) return;
    return state; // The viewer validates every field against its actual component catalog.
  } catch { return; } // Leave an unreadable value in place; never migrate another tool's data.
}
export function storeState(storage: Pick<Storage, 'setItem'>, key: string, state: GearViewState): boolean {
  try { const raw = JSON.stringify(state); if (raw.length > 32768) return false; storage.setItem(key, raw); return true; } catch { return false; }
}
