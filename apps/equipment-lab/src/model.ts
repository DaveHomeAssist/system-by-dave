import catalog from '../../../equipment-lab/data/catalog.json';
import definition from '../../../equipment-lab/data/models/cartoni.maxima30.reference/cartoni.maxima30.definition.json';
import type { PanelDef, View } from '../../shared/av-console/layout';
export const CATALOG = catalog;
export const ENTRIES = catalog.entries;
export type Entry = typeof ENTRIES[number];
export const CONTROLS = definition.native.components;
export const HEAD_IDS = Object.keys(definition.componentMap);
export const LIBRARY: PanelDef[] = [
  { type: 'library', name: 'Equipment library', group: 'Utilities', description: 'Search all 43 equipment and accessory entries.', minW: 3, minH: 3, lit: true },
  { type: 'inspector', name: 'Model inspector', group: 'Utilities', description: 'Inspect geometry and select individual controls.', minW: 4, minH: 4 },
  { type: 'practice', name: 'Equipment practice', group: 'Utilities', description: 'Open the selected equipment practice and operating reference.', minW: 3, minH: 3 },
  { type: 'reference', name: 'Equipment reference', group: 'Utilities', description: 'Review model scope, provenance and downloadable packages.', minW: 3, minH: 3 },
];
export const DEFAULT_VIEWS: View[] = [
  { id: 'browse', name: 'Library', panels: [
    { id: 'library', type: 'library', x: 0, y: 0, w: 4, h: 8 },
    { id: 'inspector', type: 'inspector', x: 4, y: 0, w: 8, h: 8 },
  ] },
  { id: 'practice', name: 'Practice', panels: [{ id: 'practice', type: 'practice', x: 0, y: 0, w: 12, h: 8 }] },
  { id: 'reference', name: 'Reference', panels: [{ id: 'reference', type: 'reference', x: 0, y: 0, w: 12, h: 8 }] },
];
export function initialSelection(search = location.search) {
  const query = new URLSearchParams(search);
  const id = query.get('equipment') || 'C02';
  const issue = !ENTRIES.some(entry => entry.inventoryId === id) ? 'Unknown equipment link. Showing the Cartoni reference; choose equipment from the library.' : query.has('component') && !HEAD_IDS.includes(query.get('component') || '') ? 'Unknown control link. Showing tilt drag; choose a control from the list.' : '';
  return { issue, entry: ENTRIES.find(entry => entry.inventoryId === id) || ENTRIES.find(entry => entry.inventoryId === 'C02')!, component: HEAD_IDS.includes(query.get('component') || '') ? query.get('component')! : 'head.tiltDrag' };
}
