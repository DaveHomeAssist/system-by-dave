import { ENTRIES } from './model';
import type { Entry } from './model';

// Host presentation data for the splash. The shared catalog carries no discipline or preview fields,
// so they live here until the catalog owns them. Previews are renders of approximate models, never product photographs.
export const DISCIPLINES = [
  { id: 'all', label: 'All equipment', short: 'All' },
  { id: 'audio', label: 'Audio', short: 'Audio' },
  { id: 'dj', label: 'DJ', short: 'DJ' },
  { id: 'lighting', label: 'Lighting & effects', short: 'Lighting' },
  { id: 'video', label: 'Video & PTZ', short: 'Video' },
  { id: 'camera', label: 'Camera & support', short: 'Camera' },
] as const;
export type Discipline = typeof DISCIPLINES[number]['id'];

const DISCIPLINE_OF: Record<string, Exclude<Discipline, 'all'>> = {
  N01: 'audio', N02: 'audio', N03: 'audio', N04: 'audio', N09: 'audio', N10: 'audio', N16: 'audio',
  N05: 'dj', N06: 'dj', N07: 'dj', N08: 'dj',
  N11: 'lighting', N12: 'lighting', N13: 'lighting', N14: 'lighting', N15: 'lighting', I01: 'lighting', I02: 'lighting', I03: 'lighting',
  F01: 'video', F02: 'video', F03: 'video', F04: 'video',
};

const PREVIEW_ROOT = '/equipment-lab/previews/';
const PREVIEWS: Record<string, string> = {
  N01: 'nnc-s181.jpg', N02: 'nnc-zlx-15bt.jpg', N03: 'nnc-gx7.jpg', N04: 'nnc-gx5.jpg', N05: 'nnc-cdj-3000.jpg', N06: 'nnc-djm-a9.jpg',
  N07: 'nnc-xdj-xz.jpg', N08: 'nnc-prime-4.jpg', N09: 'nnc-cva-118.jpg', N10: 'nnc-ekx-15sp.jpg', N11: 'nnc-j-six.jpg', N12: 'nnc-vertigo-tri-led.jpg',
  N13: 'nnc-haze-1dx.jpg', N14: 'nnc-lasercube-2w.jpg', N15: 'nnc-tl60.jpg', N16: 'nnc-sm58.jpg',
  F01: 'atem-hd8-iso.jpg', F02: 'ccu4.jpg', F03: 'p240.jpg', F04: 'superjoy-g1.jpg',
  I03: 'smartfade-1248.jpg', C01: 'fujinon-digipower66.jpg', C02: 'cartoni-maxima30.jpg',
};
// Assembly renders, shared by every entry that opens in the same viewer.
const SHARED_PREVIEWS: Record<string, { file: string; pos: string }> = {
  'https://housevideo.app/fmp/rig/index.html': { file: 'fmp-rig.jpg', pos: '50% 38%' },
  'https://ion-workbench.davein4k.chatgpt.site/camera/': { file: 'camera-rig.jpg', pos: '50% 45%' },
};
// Qualified against the reference checklist shipped in its model package.
const REFERENCE = new Set(['C02']);

export interface Card {
  entry: Entry;
  discipline: Exclude<Discipline, 'all'>;
  image: { src: string; shared: boolean; pos: string } | null;
  viewer: string;
  members: Entry[];
  practice: boolean;
  generic: boolean;
  native: boolean;
  reference: boolean;
}

const viewerOf = (entry: Entry) => entry.viewUrl.replace(/#.*$/, '');

export const CARDS: Card[] = ENTRIES.map(entry => {
  const viewer = viewerOf(entry), own = PREVIEWS[entry.inventoryId], shared = SHARED_PREVIEWS[viewer];
  return {
    entry,
    discipline: DISCIPLINE_OF[entry.inventoryId] || 'camera',
    image: own ? { src: PREVIEW_ROOT + own, shared: false, pos: entry.inventoryId === 'C02' ? '50% 42%' : '50% 50%' } : shared ? { src: PREVIEW_ROOT + shared.file, shared: true, pos: shared.pos } : null,
    viewer,
    members: ENTRIES.filter(other => viewerOf(other) === viewer),
    practice: /practice|simulation/i.test(entry.role),
    generic: entry.geometryConfidence === 'generic',
    native: entry.representation.kind === 'glb',
    reference: REFERENCE.has(entry.inventoryId),
  };
});

export const VIEWER_COUNT = new Set(CARDS.map(card => card.viewer)).size;
export const disciplineLabel = (id: Discipline) => DISCIPLINES.find(item => item.id === id)!.label;
export const matches = (card: Card, query: string) => {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const text = `${card.entry.name} ${card.entry.role} ${card.entry.inventoryId}`.toLowerCase();
  return tokens.every(token => text.includes(token));
};
