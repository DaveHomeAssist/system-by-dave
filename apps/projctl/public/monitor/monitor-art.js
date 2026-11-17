// Feed art for the Monitor multiview: the Coronation and Winter looks drawn onto each lane's real
// projection surface at Walnut Street Theatre. Shapes follow the house photos (Nov 2026), not the
// earlier concept renders: the portals are tall, pointed, asymmetric ice crystals with a rosemaling
// medallion between two snowflakes; A (SL) and D (SR) are mirror images in one palette; the header
// is an X-truss with diamond snowflake panels and a round rosemaling medallion. Art is illustrative
// only and never reflects what a projector is showing.

export const LOOKS = ['coronation', 'winter'];
export const LOOK_NAMES = { coronation: 'Coronation', winter: 'Winter' };

const PALETTE = {
  coronation: {
    sky: ['#1a1440', '#2a2168'], fieldTop: '#3f2d8c', fieldBottom: '#2a4c9c', lattice: '#8f86e0',
    frame: ['#f0c870', '#b07a30'], seam: '#6e4515', spike: '#fbe6ad', spikeEdge: '#c08a3a',
    flake: '#fff1cf', glow: '#f6b54a', petal: ['#ffcf6b', '#e8862a', '#b9561a'], petalLine: '#7a3410',
    ring: '#d39a44', medallionField: '#2c2470', snow: 0,
    upstage: ['#5b2a4a', '#1c1238'], warmth: '#f09a4c', trunk: '#efdcb8', leg: '#121b3c', legFlower: '#5d8fe0',
  },
  winter: {
    sky: ['#050b16', '#0b1a2c'], fieldTop: '#16294a', fieldBottom: '#0c1a30', lattice: '#5d7fa8',
    frame: ['#eef4fb', '#8ea2b8'], seam: '#55687e', spike: '#e4f7ff', spikeEdge: '#6fc4dc',
    flake: '#f4faff', glow: '#9fdcf2', petal: ['#f2f8ff', '#b9cde3', '#7f9cbc'], petalLine: '#4c6688',
    ring: '#b9c8d8', medallionField: '#10213a', snow: 1,
    upstage: ['#173052', '#060d1a'], warmth: '#7fb6e6', trunk: '#dbe9f7', leg: '#0b1428', legFlower: '#4d7bc4',
  },
};

const n = v => Math.round(v * 10) / 10;

// A six-armed snowflake with two pairs of branches and a diamond tip on each arm.
function snowflake(cx, cy, r, color, glow) {
  const arm = `M0 0V${n(-r)}M0 ${n(-r * .38)}l${n(r * .26)} ${n(-r * .2)}M0 ${n(-r * .38)}l${n(-r * .26)} ${n(-r * .2)}M0 ${n(-r * .66)}l${n(r * .2)} ${n(-r * .16)}M0 ${n(-r * .66)}l${n(-r * .2)} ${n(-r * .16)}`;
  const tip = `M0 ${n(-r * 1.08)}l${n(r * .07)} ${n(r * .1)}l${n(-r * .07)} ${n(r * .1)}l${n(-r * .07)} ${n(-r * .1)}Z`;
  const arms = [0, 60, 120, 180, 240, 300].map(a => `<g transform="rotate(${a})"><path d="${arm}"/><path d="${tip}" fill="${color}" stroke="none"/></g>`).join('');
  const sw = Math.max(1.2, r * .07);
  return `<g transform="translate(${n(cx)} ${n(cy)})" fill="none" stroke-linecap="round">`
    + `<g stroke="${glow}" stroke-width="${n(sw * 3)}" opacity=".28">${arms}</g>`
    + `<g stroke="${color}" stroke-width="${n(sw)}">${arms}</g>`
    + `<circle r="${n(r * .12)}" fill="${color}"/></g>`;
}

// A Norwegian rosemaling flower medallion: a central bud, two curling heart petals, a tulip base,
// leaf sprigs and dots, inside a double ring. Drawn in a unit circle and scaled.
function medallion(cx, cy, r, P, id) {
  // Five rounded petals around a heart-shaped centre, C-scroll leaves between them.
  const petal = '<path d="M0-.2C.34-.3.42-.74.12-.88.06-.8 0-.78 0-.78S-.06-.8-.12-.88C-.42-.74-.34-.3 0-.2Z"/>';
  const petals = [0, 72, 144, 216, 288].map(a => `<g transform="rotate(${a})">${petal}</g>`).join('');
  const leaves = [36, 108, 180, 252, 324].map(a => `<path transform="rotate(${a})" d="M0-.5C.16-.62.1-.8-.04-.84.05-.72.02-.62 0-.5Z"/>`).join('');
  const heart = '<path d="M0 .2C-.3-.02-.26-.3-.08-.28-.02-.27 0-.22 0-.2 0-.22.02-.27.08-.28.26-.3.3-.02 0 .2Z"/>';
  const dots = [0, 72, 144, 216, 288].map(a => { const t = (a - 90) * Math.PI / 180; return `<circle cx="${n(Math.cos(t) * .5)}" cy="${n(Math.sin(t) * .5)}" r=".045"/>`; }).join('');
  return `<g transform="translate(${n(cx)} ${n(cy)})">`
    + `<circle r="${n(r * 1.12)}" fill="${P.glow}" opacity=".22"/>`
    + `<circle r="${n(r)}" fill="${P.medallionField}" stroke="${P.ring}" stroke-width="${n(r * .09)}"/>`
    + `<circle r="${n(r * .86)}" fill="none" stroke="${P.ring}" stroke-width="${n(r * .025)}" opacity=".8"/>`
    + `<g transform="scale(${n(r * .82)})" fill="url(#${id}-petal)" stroke="${P.petalLine}" stroke-width=".035" stroke-linejoin="round">${leaves}${petals}<circle r=".3" fill="${P.petal[2]}"/><g fill="${P.petal[0]}">${heart}</g><g fill="${P.petalLine}" stroke="none">${dots}</g></g></g>`;
}

// A pointed crystal spike: base at (x,y), pointing along angle (degrees, 0 = up).
const spike = (x, y, len, w, angle, P) => `<path transform="translate(${n(x)} ${n(y)}) rotate(${angle})" d="M0 ${n(-len)}L${n(w)} 0 0 ${n(len * .28)} ${n(-w)} 0Z" fill="${P.spike}" stroke="${P.spikeEdge}" stroke-width="1"/>`;
const star = (x, y, s, P) => `<path transform="translate(${n(x)} ${n(y)})" d="M0 ${-s}L${n(s * .22)} ${n(-s * .22)} ${s} 0 ${n(s * .22)} ${n(s * .22)} 0 ${s} ${n(-s * .22)} ${n(s * .22)} ${-s} 0 ${n(-s * .22)} ${n(-s * .22)}Z" fill="${P.spike}" stroke="${P.spikeEdge}" stroke-width=".8"/>`;

function snow(w, h, count, seed) {
  let s = seed, out = '';
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < count; i++) out += `<circle cx="${n(rnd() * w)}" cy="${n(rnd() * h)}" r="${n(.6 + rnd() * 1.3)}" opacity="${n(.35 + rnd() * .6)}"/>`;
  return `<g fill="#f4faff">${out}</g>`;
}

function defs(id, P) {
  return `<defs><linearGradient id="${id}-field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.fieldTop}"/><stop offset="1" stop-color="${P.fieldBottom}"/></linearGradient>`
    + `<linearGradient id="${id}-frame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.frame[0]}"/><stop offset="1" stop-color="${P.frame[1]}"/></linearGradient>`
    + `<linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[0]}"/><stop offset="1" stop-color="${P.sky[1]}"/></linearGradient>`
    + `<radialGradient id="${id}-petal" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="${P.petal[0]}"/><stop offset=".6" stop-color="${P.petal[1]}"/><stop offset="1" stop-color="${P.petal[2]}"/></radialGradient>`
    + `<radialGradient id="${id}-up" cx=".5" cy=".85" r=".75"><stop offset="0" stop-color="${P.upstage[0]}"/><stop offset="1" stop-color="${P.upstage[1]}"/></radialGradient></defs>`;
}

// Portal, drawn for the SL portal (A, house right) with its peak on the outer (right) side.
// D, the SR portal, is the exact mirror image, as built in the house.
function portal(lane, look) {
  const P = PALETTE[look], id = `fm-art-${lane}-${look}`;
  const outer = '150,8 194,96 188,350 128,414 14,358 6,118';
  const inner = '148,30 180,102 175,343 126,396 27,348 20,126';
  const lattice = [110, 210, 308].map(y => `<path d="M100 ${y - 58}L172 ${y}L100 ${y + 58}L28 ${y}Z"/>`).join('');
  // The tall crystal spike pillar that stands on each portal's outer side in the house.
  const pillar = `<polygon points="207,404 207,64 215,2 223,64 223,404" fill="url(#${id}-frame)" stroke="${P.seam}" stroke-width="1.2" stroke-linejoin="round"/>`
    + `<path d="M215 70V398" stroke="${P.seam}" stroke-width="1" stroke-dasharray="4 4" opacity=".7"/>`;
  const art = `<rect width="230" height="420" fill="url(#${id}-sky)"/>${pillar}`
    + `<polygon points="${outer}" fill="url(#${id}-frame)" stroke="${P.seam}" stroke-width="1.5" stroke-linejoin="round"/>`
    + `<polygon points="${outer}" fill="none" stroke="${P.seam}" stroke-width="1" stroke-dasharray="5 4" transform="translate(100 211) scale(.965) translate(-100 -211)" opacity=".7"/>`
    + `<polygon points="${inner}" fill="url(#${id}-field)" stroke="${P.seam}" stroke-width="2" stroke-linejoin="round"/>`
    + `<clipPath id="${id}-clip"><polygon points="${inner}"/></clipPath>`
    + `<g clip-path="url(#${id}-clip)"><g fill="none" stroke="${P.lattice}" stroke-width="1.4" opacity=".55">${lattice}</g>`
    + `<circle cx="100" cy="210" r="96" fill="${P.glow}" opacity=".08"/>${P.snow ? snow(200, 420, 46, lane === 'A' ? 7 : 11) : ''}</g>`
    + snowflake(100, 110, 44, P.flake, P.glow) + medallion(100, 210, 40, P, id) + snowflake(100, 308, 44, P.flake, P.glow)
    + spike(150, 10, 26, 7, 18, P) + spike(193, 97, 20, 6, 70, P) + spike(7, 120, 18, 6, -66, P)
    + spike(128, 412, 18, 6, 180, P) + spike(187, 348, 14, 5, 120, P) + spike(15, 356, 14, 5, -120, P);
  const flip = lane === 'D' ? ' transform="translate(230 0) scale(-1 1)"' : '';
  return svg('0 0 230 420', 'xMidYMid meet', defs(id, P) + `<g${flip}>${art}</g>`);
}

// Header (B): the X-truss with diamond snowflake panels and the central rosemaling medallion.
function header(look) {
  const P = PALETTE[look], id = `fm-art-B-${look}`;
  const beam = d => `<path d="${d}" stroke="${P.frame[0]}" stroke-width="8" opacity=".92" stroke-linecap="round"/><path d="${d}" stroke="${P.seam}" stroke-width="1.2" stroke-dasharray="7 5" opacity=".8"/>`;
  const diamond = x => `<path d="M${x} 24L${x + 52} 62 ${x} 100 ${x - 52} 62Z" fill="url(#${id}-field)" stroke="url(#${id}-frame)" stroke-width="5" stroke-linejoin="round"/>`;
  const art = `<rect width="400" height="124" fill="url(#${id}-sky)"/>${P.snow ? snow(400, 124, 40, 5) : ''}`
    + `<g fill="none">${beam('M12 28Q200 10 388 28')}${beam('M24 100H376')}`
    + `${beam('M18 30L192 102')}${beam('M18 100L192 22')}${beam('M382 30L208 102')}${beam('M382 100L208 22')}`
    + `${beam('M4 46L70 8')}${beam('M396 46L330 8')}</g>`
    + diamond(102) + diamond(298)
    + snowflake(102, 62, 27, P.flake, P.glow) + snowflake(298, 62, 27, P.flake, P.glow)
    + medallion(200, 62, 33, P, id)
    + spike(8, 64, 18, 6, -90, P) + spike(392, 64, 18, 6, 90, P) + spike(200, 14, 14, 5, 0, P) + spike(200, 112, 12, 5, 180, P)
    + spike(40, 18, 14, 5, -35, P) + spike(360, 18, 14, 5, 35, P)
    + star(150, 40, 6, P) + star(250, 40, 6, P) + star(150, 86, 6, P) + star(250, 86, 6, P) + star(102, 24, 5, P) + star(298, 24, 5, P);
  return svg('0 0 400 124', 'xMidYMid meet', defs(id, P) + art);
}

// Stage (C): the inner opening as seen from the house, with the zigzag header trim, ice-tree trunks,
// folk-pattern legs and the upstage chapel gables.
function stage(look) {
  const P = PALETTE[look], id = `fm-art-C-${look}`;
  const zig = Array.from({ length: 41 }, (_, i) => `${i * 10} ${i % 2 ? 30 : 24}`).join(' ');
  const leg = x => `<rect x="${x}" y="28" width="30" height="170" fill="${P.leg}"/>`
    + Array.from({ length: 7 }, (_, i) => { const y = 44 + i * 23; return `<g fill="${P.legFlower}"><circle cx="${x + 15}" cy="${y - 5}" r="3.4"/><circle cx="${x + 15}" cy="${y + 5}" r="3.4"/><circle cx="${x + 10}" cy="${y}" r="3.4"/><circle cx="${x + 20}" cy="${y}" r="3.4"/></g><circle cx="${x + 15}" cy="${y}" r="2" fill="${P.leg}"/>`; }).join('');
  const tree = (x, w, s) => `<g stroke="${P.trunk}" stroke-linecap="round" fill="none"><path d="M${x} 200V40" stroke-width="${w}"/>`
    + `<path d="M${x} 118l${-22 * s} -44M${x - 22 * s} 74l${-6 * s} -22M${x} 96l${20 * s} -40M${x} 72l${-16 * s} -30M${x} 140l${18 * s} -34M${x + 20 * s} 56l${8 * s} -18" stroke-width="${n(w * .45)}"/></g>`;
  const gables = `<path d="M168 168V132l12-20 12 20V168M188 168V122l12-24 12 24V168M208 168V132l12-20 12 20V168" fill="${P.upstage[1]}" stroke="${P.warmth}" stroke-width="1.6" opacity=".9"/>`;
  const art = `<rect width="400" height="220" fill="url(#${id}-up)"/>`
    + `<ellipse cx="200" cy="170" rx="150" ry="60" fill="${P.warmth}" opacity=".16"/>`
    + gables + (P.snow ? snow(400, 200, 70, 3) : '')
    + tree(118, 7, 1) + tree(282, 7, -1) + tree(84, 4, -.7) + tree(316, 4, .7)
    + leg(30) + leg(340)
    + `<rect width="400" height="28" fill="url(#${id}-frame)"/><polyline points="${zig}" fill="none" stroke="${P.seam}" stroke-width="2"/>`
    + `<path d="M0 198H400V220H0Z" fill="${P.sky[0]}"/><path d="M40 220L120 198M140 220L170 198M260 220L230 198M360 220L280 198" stroke="${P.lattice}" stroke-width="1" opacity=".5"/>`;
  return svg('0 0 400 220', 'xMidYMin slice', defs(id, P) + art);
}

// The letterbox colour around the art comes from CSS (.fm-art-house[data-look]); the page CSP
// forbids inline style attributes.
const svg = (box, fit, body) => `<svg class="fm-art-svg" viewBox="${box}" preserveAspectRatio="${fit}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

export function artSVG(lane, look = 'coronation') {
  const l = LOOKS.includes(look) ? look : 'coronation';
  return lane === 'B' ? header(l) : lane === 'C' ? stage(l) : portal(lane, l);
}
