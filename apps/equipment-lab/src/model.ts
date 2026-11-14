import catalog from '../../../equipment-lab/data/catalog.json';
import definition from '../../../equipment-lab/data/models/cartoni.maxima30.reference/cartoni.maxima30.definition.json';
// Named imports keep the projector's long surface and material lists out of the bundle.
import { native as projector, componentMap as projectorMap, evidence as projectorEvidence } from '../../../equipment-lab/data/models/barco.udm4k22.inspection/barco.udm4k22.definition.json';
import { files as projectorFiles } from '../../../equipment-lab/data/models/barco.udm4k22.inspection/barco.udm4k22.manifest.json';
import { native as lampProjector, componentMap as lampProjectorMap, evidence as lampProjectorEvidence, rig as lampProjectorRig } from '../../../equipment-lab/data/models/panasonic.ptdw830.inspection/panasonic.ptdw830.definition.json';
import { files as lampProjectorFiles } from '../../../equipment-lab/data/models/panasonic.ptdw830.inspection/panasonic.ptdw830.manifest.json';
import { native as laserProjector, componentMap as laserProjectorMap, evidence as laserProjectorEvidence } from '../../../equipment-lab/data/models/panasonic.ptrz970.inspection/panasonic.ptrz970.definition.json';
import { files as laserProjectorFiles } from '../../../equipment-lab/data/models/panasonic.ptrz970.inspection/panasonic.ptrz970.manifest.json';
import type { PanelDef, View } from '../../shared/av-console/layout';
export const CATALOG = catalog;
export const ENTRIES = catalog.entries;
export type Entry = typeof ENTRIES[number];
export const CONTROLS = definition.native.components;
export const HEAD_IDS = Object.keys(definition.componentMap);

/* `state` names the model state that shows an item which is hidden while the equipment is closed. */
export interface Control { id: string; label: string; purpose: string; action: string; assembly?: string; position?: string; basis?: string; state?: string }
export interface ViewPreset { id: string; label: string; direction: number[]; up?: number[] }
/* A service joint: a hinge turns its nodes about `axis` through `pivot` by degrees; a slide moves them along `axis` by millimetres. */
export interface Joint { kind: string; label: string; axis: number[]; pivot?: number[]; units: string; range: number[]; rest: number }
/* A named set of joint values, with the view that shows it. The first state is the one the package is exported in. */
export interface ModelState { id: string; label: string; note: string; view: string; joints: Record<string, number> }
export interface Step { text: string; part: string; state: string }
export interface Procedure { id: string; label: string; source: string; pages: string; summary: string; before: string[]; steps: Step[]; after: string[] }
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
  /* The view a bare link opens on, when it is not the first. */
  firstView?: string;
  /* Service joints, the states that set them, and the maker's procedures that walk through them. A package without them never moves. */
  joints?: Record<string, Joint>;
  states?: ModelState[];
  procedures?: Procedure[];
  procedureSources?: Record<string, { label: string; url: string }>;
  /* Assembly labels, when the list is long enough to group. */
  groups?: Record<string, string>;
  /* Reference panel content for packages without their own copy. */
  reference?: { scope: string; files: { label: string; name: string }[]; sources: { label: string; url: string }[]; unknowns: string[] };
}
type PackageViews = Record<string, { label: string; direction: number[]; up?: number[] }>;
const PROJECTOR_VIEWS: Record<string, string> = { overview: 'Overview', front: 'Front', io: 'Connectors', rear: 'Rear', left: 'Left', top: 'Top' };
const PANASONIC_VIEWS: Record<string, string> = { ...PROJECTOR_VIEWS, io: 'Right side', bottom: 'Bottom', lampBay: 'Lamp bay' };
const presets = (views: PackageViews, labels: Record<string, string>): ViewPreset[] => Object.entries(views).map(([id, view]) => ({ id, label: labels[id] || view.label, direction: view.direction, up: view.up }));
const downloads = (name: string, files: { model: { name: string }; definition: { name: string } }) => [{ label: `Download ${name} GLB`, name: files.model.name }, { label: 'Download part definition', name: files.definition.name }];
const PACKAGES: Record<string, ModelPackage> = {
  C02: {
    id: 'C02', label: 'Cartoni', noun: 'control', ids: HEAD_IDS, controls: CONTROLS, first: 'head.tiltDrag', firstName: 'tilt drag', distance: [.18, 3],
    views: [{ id: 'overview', label: 'Overview', direction: [.85, .65, 1] }, { id: 'front', label: 'Front', direction: [0, .35, 1] }, { id: 'rear', label: 'Rear', direction: [0, .35, -1] }, { id: 'side', label: 'Side', direction: [1, .3, 0] }],
  },
  /* Opens on a small part: selecting the whole body would tint the entire projector with the highlight. */
  P01: {
    id: 'P01', label: 'Barco', noun: 'part', ids: Object.keys(projectorMap), controls: projector.components, first: 'io.keypad', firstName: 'the local keypad', distance: [.5, 6],
    views: presets(projector.views as PackageViews, PROJECTOR_VIEWS),
    groups: { body: 'Body', io: 'Input and communication', lens: 'Lens' },
    reference: {
      scope: 'This package is not qualified. Barco publishes the body size, the mass and the face that carries each part. Sizes and positions within each face, the keypad, the connector order, the feet and the lens are approximate or assumed.',
      files: [{ label: 'Download Barco GLB', name: projectorFiles.model.name }, { label: 'Download part definition', name: projectorFiles.definition.name }],
      sources: Object.values(projector.sources),
      unknowns: projectorEvidence.unknowns,
    },
  },
  /* Opens on the lamp unit cover, seen from the rear: lamp and filter access is what this entry is for. */
  P02: {
    id: 'P02', label: 'PT-DW830', noun: 'part', ids: Object.keys(lampProjectorMap), controls: lampProjector.components, first: 'lamp.cover', firstName: 'the lamp unit cover', firstView: 'rear', distance: [.4, 6],
    views: presets(lampProjector.views as PackageViews, PANASONIC_VIEWS),
    groups: lampProjector.assemblies,
    joints: lampProjectorRig.joints as Record<string, Joint>,
    states: Object.entries(lampProjector.states as Record<string, Omit<ModelState, 'id'>>).map(([id, state]) => ({ id, ...state })),
    procedures: lampProjector.procedures,
    procedureSources: lampProjector.sources,
    reference: {
      scope: 'This package is not qualified. Panasonic prints the cabinet size, the mass, the foot spacing and the lens centre height, and names every part drawn here. The front and the terminal side are placed from its CAD outline for the sibling PT-RZ970 series; the rear, the left side and the bottom are scaled from illustrations. Inside the lamp bay, which part is where and which way it moves are Panasonic\'s; sizes, depths, the 100 degree opening of the cover and each travel are approximate or assumed.',
      files: downloads('PT-DW830', lampProjectorFiles),
      sources: Object.values(lampProjector.sources),
      unknowns: lampProjectorEvidence.unknowns,
    },
  },
  P03: {
    id: 'P03', label: 'PT-RZ970', noun: 'part', ids: Object.keys(laserProjectorMap), controls: laserProjector.components, first: 'panel.plate', firstName: 'the control panel', distance: [.4, 6],
    views: presets(laserProjector.views as PackageViews, PANASONIC_VIEWS),
    groups: laserProjector.assemblies,
    reference: {
      scope: 'This package is not qualified. Panasonic prints the cabinet size, the mass, the foot spacing and the lens centre, and names every part drawn here. The position of each part is measured from its six-view CAD outline for the series at about one millimetre per reading. Surface shape, finish, connector bodies and the lens are stand-ins.',
      files: downloads('PT-RZ970', laserProjectorFiles),
      sources: Object.values(laserProjector.sources),
      unknowns: laserProjectorEvidence.unknowns,
    },
  },
};
/* The state a package rests in, and the one a link may ask for. */
export const restState = (pack?: ModelPackage) => pack?.states?.[0]?.id || '';
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
  const component = pack ? known ? asked : pack.first : '';
  /* A link may name a state. Otherwise the item it names decides: one that is hidden while closed opens the state that shows it. */
  const wanted = query.get('state') || '', shown = pack?.controls.find(control => control.id === component)?.state || '';
  const state = pack?.states?.some(item => item.id === wanted) ? wanted : known && pack?.states?.some(item => item.id === shown) ? shown : restState(pack);
  return { issue, entry, component, state };
}
