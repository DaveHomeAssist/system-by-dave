import catalog from '../../../equipment-lab/data/catalog.json';
import definition from '../../../equipment-lab/data/models/cartoni.maxima30.reference/cartoni.maxima30.definition.json';
// Named imports keep the projector's long surface and material lists out of the bundle.
import { native as projector, componentMap as projectorMap, evidence as projectorEvidence } from '../../../equipment-lab/data/models/barco.udm4k22.inspection/barco.udm4k22.definition.json';
import { files as projectorFiles } from '../../../equipment-lab/data/models/barco.udm4k22.inspection/barco.udm4k22.manifest.json';
import type { PanelDef, View } from '../../shared/av-console/layout';
export const CATALOG = catalog;
export const ENTRIES = catalog.entries;
export type Entry = typeof ENTRIES[number];
export const CONTROLS = definition.native.components;
export const HEAD_IDS = Object.keys(definition.componentMap);

export interface Control { id: string; label: string; purpose: string; action: string; assembly?: string; position?: string; basis?: string }
export interface ViewPreset { id: string; label: string; direction: number[]; up?: number[] }
/* A native model package: what the inspector needs beside the catalog row. The control list is
   bundled so it stays available when WebGL or the package itself cannot load. */
export interface ModelPackage {
  id: string;
  /* Short name for status text, and the word for one selectable item. */
  label: string;
  noun: 'control' | 'part';
  ids: string[];
  controls: Control[];
  /* The item a bare link opens on, and how the unknown-link notice names it. */
  first: string;
  firstName: string;
  views: ViewPreset[];
  /* Orbit limits in metres. */
  distance: [number, number];
  /* Assembly labels, when the list is long enough to group. */
  groups?: Record<string, string>;
  /* Reference panel content for packages without their own copy. */
  reference?: { scope: string; files: { label: string; name: string }[]; sources: { label: string; url: string }[]; unknowns: string[] };
}
const PROJECTOR_VIEWS: Record<string, string> = { overview: 'Overview', front: 'Front', io: 'Connectors', rear: 'Rear', left: 'Left', top: 'Top' };
const PACKAGES: Record<string, ModelPackage> = {
  C02: {
    id: 'C02', label: 'Cartoni', noun: 'control', ids: HEAD_IDS, controls: CONTROLS, first: 'head.tiltDrag', firstName: 'tilt drag', distance: [.18, 3],
    views: [{ id: 'overview', label: 'Overview', direction: [.85, .65, 1] }, { id: 'front', label: 'Front', direction: [0, .35, 1] }, { id: 'rear', label: 'Rear', direction: [0, .35, -1] }, { id: 'side', label: 'Side', direction: [1, .3, 0] }],
  },
  /* Opens on a small part: selecting the whole body would tint the entire projector with the highlight. */
  P01: {
    id: 'P01', label: 'Barco', noun: 'part', ids: Object.keys(projectorMap), controls: projector.components, first: 'io.keypad', firstName: 'the local keypad', distance: [.5, 6],
    views: Object.entries(projector.views as Record<string, { label: string; direction: number[]; up?: number[] }>).map(([id, view]) => ({ id, label: PROJECTOR_VIEWS[id] || view.label, direction: view.direction, up: view.up })),
    groups: { body: 'Body', io: 'Input and communication', lens: 'Lens' },
    reference: {
      scope: 'This package is not qualified. Barco publishes the body size, the mass and the face that carries each part. Sizes and positions within each face, the keypad, the connector order, the feet and the lens are approximate or assumed.',
      files: [{ label: 'Download Barco GLB', name: projectorFiles.model.name }, { label: 'Download part definition', name: projectorFiles.definition.name }],
      sources: Object.values(projector.sources),
      unknowns: projectorEvidence.unknowns,
    },
  },
};
/* Where a native package is served from, read from the catalog row. */
export const packageBase = (entry: Entry) => entry.representation.kind === 'glb' ? `/equipment-lab/data/${entry.representation.base}` : '';
export const packageOf = (entry: Entry): ModelPackage | undefined => entry.representation.kind === 'glb' ? PACKAGES[entry.inventoryId] : undefined;

export const LIBRARY: PanelDef[] = [
  { type: 'library', name: 'Equipment library', group: 'Utilities', description: `Search all ${ENTRIES.length} equipment and accessory entries.`, minW: 3, minH: 3, lit: true },
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
  const id = query.get('equipment') || 'C02', found = ENTRIES.find(entry => entry.inventoryId === id);
  const entry = found || ENTRIES.find(entry => entry.inventoryId === 'C02')!, pack = packageOf(entry), asked = query.get('component') || '';
  const known = Boolean(pack && pack.ids.includes(asked));
  const issue = !found ? 'Unknown equipment link. Showing the Cartoni reference; choose equipment from the library.' : pack && query.has('component') && !known ? `Unknown ${pack.noun} link. Showing ${pack.firstName}; choose a ${pack.noun} from the list.` : '';
  return { issue, entry, component: pack ? known ? asked : pack.first : '' };
}
