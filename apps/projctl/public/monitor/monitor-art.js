// Feed art for the Monitor multiview: the Coronation, Winter and Ice Palace looks drawn onto each
// lane's real projection surface at Walnut Street Theatre. Shapes follow the house work-light photos
// (Nov 2026): tall, pointed crystal portals with an outer spike pillar and a frameless rosemaling
// flower between two folk snowflakes, A (SL) and D (SR) as exact mirrors, and an X-truss header with
// diamond snowflake panels around a round rosemaling medallion. Colours follow the Nov 15 runthrough
// (palettes from the frozen-monitor-refine covers): Coronation is coral stencil light on slate indigo,
// Winter is pale blue over a diamond ice lattice, Ice Palace is luminous ice on cobalt. Art is
// illustrative only and never reflects what a projector is showing.

export const LOOKS = ['coronation', 'winter', 'icepalace'];
export const LOOK_NAMES = { coronation: 'Coronation', winter: 'Winter', icepalace: 'Ice Palace' };

const PALETTE = {
  coronation: {
    sky: ['#100c14', '#12132a'], fieldTop: '#2a2d5c', fieldBottom: '#1c1e42', lattice: '#4a4e88', latticeOn: 0,
    frame: ['#f09a7a', '#c45040'], seam: '#5e2420', spike: '#f6c4b0', spikeEdge: '#c45040',
    flake: '#f09a7a', flakeOpacity: 1, glow: '#e87860', petal: ['#f6c4b0', '#e07058', '#c45040'], petalLine: '#6e2820',
    ring: '#e07058', medallionField: '#1c1e42', snow: 0,
    upstage: ['#2a1820', '#140c12'], wave: '#c47870', pilaster: ['#3a2a38', '#c47870'],
    floral: ['#e8a0a8', '#c06070', '#f0c8c0'], leaf: '#5a7a4a', floor: ['#5a3220', '#8a5a38', '#c4a070'],
  },
  winter: {
    sky: ['#040616', '#05081c'], fieldTop: '#102060', fieldBottom: '#071030', lattice: '#5a82d0', latticeOn: 1,
    frame: ['#b8cce0', '#4a6ab8'], seam: '#1a2a60', spike: '#e0e8f8', spikeEdge: '#6a8ad0',
    flake: '#b8ccf0', flakeOpacity: .7, glow: '#5a7ad0', petal: ['#e0e8f8', '#8aa8e0', '#4a6ab8'], petalLine: '#1a2a60',
    ring: '#8aa8e0', medallionField: '#071030', snow: 1,
    upstage: ['#122050', '#060a22'], wave: '#5a82d0', pilaster: ['#1a2a60', '#6a8ad0'], ice: '#8aa8e0', iceGlow: '#5a7ad0',
    floor: ['#0a1028', '#1a2a50', '#3a58a0'], stairs: 0, aurora: 0,
  },
  icepalace: {
    sky: ['#081028', '#0a1438'], fieldTop: '#2a58a8', fieldBottom: '#12245a', lattice: '#7eb4e8', latticeOn: 0,
    frame: ['#e8f2fc', '#7aacd8'], seam: '#2a4a80', spike: '#f7fbff', spikeEdge: '#7eb4e8',
    flake: '#f7fbff', flakeOpacity: 1, glow: '#7eb4e8', petal: ['#f7fbff', '#d0e4f8', '#7aacd8'], petalLine: '#2a4a80',
    ring: '#d0e4f8', medallionField: '#12245a', snow: 0,
    upstage: ['#1e3a70', '#0c1838'], wave: '#8ab4dc', pilaster: ['#2a4a80', '#a8d0ec'], ice: '#d0e4f8', iceGlow: '#7eb4e8',
    floor: ['#1a3058', '#3a68a0', '#a8c8e8'], stairs: 1, aurora: 1,
  },
};

const n = v => Math.round(v * 10) / 10;

// An eight-armed folk snowflake, as stencilled on the house portals: two pairs of branches and a
// diamond tip on each arm.
function snowflake(cx, cy, r, color, glow, opacity = 1) {
  const arm = `M0 0V${n(-r)}M0 ${n(-r * .38)}l${n(r * .26)} ${n(-r * .2)}M0 ${n(-r * .38)}l${n(-r * .26)} ${n(-r * .2)}M0 ${n(-r * .66)}l${n(r * .2)} ${n(-r * .16)}M0 ${n(-r * .66)}l${n(-r * .2)} ${n(-r * .16)}`;
  const tip = `M0 ${n(-r * 1.08)}l${n(r * .07)} ${n(r * .1)}l${n(-r * .07)} ${n(r * .1)}l${n(-r * .07)} ${n(-r * .1)}Z`;
  const arms = [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<g transform="rotate(${a})"><path d="${arm}"/><path d="${tip}" fill="${color}" stroke="none"/></g>`).join('');
  const sw = Math.max(1.2, r * .07);
  return `<g transform="translate(${n(cx)} ${n(cy)})" fill="none" stroke-linecap="round" opacity="${opacity}">`
    + `<g stroke="${glow}" stroke-width="${n(sw * 3)}" opacity=".28">${arms}</g>`
    + `<g stroke="${color}" stroke-width="${n(sw)}">${arms}</g>`
    + `<circle r="${n(r * .12)}" fill="${color}"/></g>`;
}

// A Norwegian rosemaling flower medallion: a central bud, two curling heart petals, a tulip base,
// leaf sprigs and dots, inside a double ring (the header medallion). Drawn in a unit circle and scaled.
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

// The portal rosemaling flower as painted on the house portals: frameless, wider than tall, a
// five-petal rosette with a heart centre, big scrolling leaves to each side, curling tendrils and
// small leaf sprigs above and below. Unit width is about +-1, height about +-.8; w is half-width.
function rosemaling(cx, cy, w, P, id) {
  const petal = '<path d="M0-.12C.24-.18.3-.5.08-.6.04-.54 0-.53 0-.53S-.04-.54-.08-.6C-.3-.5-.24-.18 0-.12Z"/>';
  const rosette = [0, 72, 144, 216, 288].map(a => `<g transform="rotate(${a})">${petal}</g>`).join('');
  const heart = '<path d="M0 .15C-.22-.01-.2-.22-.06-.21-.02-.2 0-.17 0-.15 0-.17.02-.2.06-.21.2-.22.22-.01 0 .15Z"/>';
  const side = '<path d="M.42 .02C.56-.26.86-.36 1.02-.14.88-.15.76-.08.72.04.67.18.52.2.42.02Z"/>'
    + '<path d="M.4 .2C.54.44.84.5 .98.3.84.31.72.25.64.17.56.11.47.13.4.2Z"/>'
    + '<path d="M.46-.3C.48-.5.66-.6.8-.5.68-.47.6-.4.58-.3.55-.24.5-.24.46-.3Z"/>';
  const curls = '<path d="M.7-.16C.84-.34.74-.56.56-.56.44-.56.4-.44.48-.38.54-.34.6-.4.56-.45M.62.36C.72.6.58.74.44.7.34.66.36.54.44.54.5.54.52.6.48.63M.2-.56C.3-.7.24-.8.14-.78"/>';
  const sprig = '<path d="M0-.58C.08-.66.08-.76 0-.82-.08-.76-.08-.66 0-.58Z"/><path d="M.03-.6C.14-.62.2-.7.18-.78.1-.76.04-.7.03-.6Z"/><path d="M-.03-.6C-.14-.62-.2-.7-.18-.78-.1-.76-.04-.7-.03-.6Z"/>';
  const dots = [[.3, -.42], [.92, .08], [.86, -.36], [.3, .5], [.8, .5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".035"/><circle cx="${-x}" cy="${y}" r=".035"/>`).join('');
  const half = side + `<g fill="none" stroke="${P.petal[1]}" stroke-width=".045" stroke-linecap="round">${curls}</g>`;
  return `<g transform="translate(${n(cx)} ${n(cy)}) scale(${n(w)})">`
    + `<ellipse rx="1.05" ry=".78" fill="${P.glow}" opacity=".16"/>`
    + `<g fill="url(#${id}-petal)" stroke="${P.petalLine}" stroke-width=".022" stroke-linejoin="round">`
    + `${half}<g transform="scale(-1 1)">${half}</g>${sprig}<g transform="scale(1 -1) translate(0 -.04)">${sprig}</g>`
    + `${rosette}<circle r=".2" fill="${P.petal[2]}"/><g fill="${P.petal[0]}">${heart}</g></g>`
    + `<g fill="${P.petal[0]}">${dots}</g></g>`;
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
    + `<pattern id="${id}-lat" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0H14M0 0V14" stroke="${P.lattice}" stroke-width="2.4" fill="none"/></pattern>`
    + `<radialGradient id="${id}-up" cx=".5" cy=".85" r=".75"><stop offset="0" stop-color="${P.upstage[0]}"/><stop offset="1" stop-color="${P.upstage[1]}"/></radialGradient></defs>`;
}

// Portal, drawn for the SL portal (A, house right). The apex sits just outboard of centre so both
// shoulders slope down, with the spike pillar on the outer (right) side.
// D, the SR portal, is the exact mirror image, as built in the house.
function portal(lane, look) {
  const P = PALETTE[look], id = `fm-art-${lane}-${look}`;
  const outer = '112,6 194,92 188,350 128,414 14,358 6,104';
  const inner = '111,28 180,98 175,343 126,396 27,348 20,112';
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
    + (P.latticeOn ? `<rect width="230" height="420" fill="url(#${id}-lat)" opacity=".55"/>` : '')
    + `<circle cx="100" cy="210" r="96" fill="${P.glow}" opacity=".1"/>${P.snow ? snow(200, 420, 46, lane === 'A' ? 7 : 11) : ''}</g>`
    + snowflake(100, 110, 44, P.flake, P.glow, P.flakeOpacity) + rosemaling(100, 210, 58, P, id) + snowflake(100, 308, 44, P.flake, P.glow, P.flakeOpacity)
    + spike(112, 8, 26, 7, 6, P) + spike(193, 93, 20, 6, 70, P) + spike(7, 106, 18, 6, -66, P)
    + spike(128, 412, 18, 6, 180, P) + spike(187, 348, 14, 5, 120, P) + spike(15, 356, 14, 5, -120, P);
  const flip = lane === 'D' ? ' transform="translate(230 0) scale(-1 1)"' : '';
  return svg('0 0 230 420', 'xMidYMid meet', defs(id, P) + `<g${flip}>${art}</g>`);
}

// Header (B): the X-truss with diamond snowflake panels and the central rosemaling medallion.
function header(look) {
  const P = PALETTE[look], id = `fm-art-B-${look}`;
  const beam = d => `<path d="${d}" stroke="${P.frame[0]}" stroke-width="8" opacity=".92" stroke-linecap="round"/><path d="${d}" stroke="${P.seam}" stroke-width="1.2" stroke-dasharray="7 5" opacity=".8"/>`;
  const diamond = x => `<path d="M${x} 24L${x + 52} 62 ${x} 100 ${x - 52} 62Z" fill="url(#${id}-field)" stroke="url(#${id}-frame)" stroke-width="5" stroke-linejoin="round"/>`
    + (P.latticeOn ? `<path d="M${x} 27L${x + 47} 62 ${x} 97 ${x - 47} 62Z" fill="url(#${id}-lat)" opacity=".5"/>` : '');
  const art = `<rect width="400" height="124" fill="url(#${id}-sky)"/>${P.snow ? snow(400, 124, 40, 5) : ''}`
    + `<g fill="none">${beam('M12 28Q200 10 388 28')}${beam('M24 100H376')}`
    + `${beam('M18 30L192 102')}${beam('M18 100L192 22')}${beam('M382 30L208 102')}${beam('M382 100L208 22')}`
    + `${beam('M4 46L70 8')}${beam('M396 46L330 8')}</g>`
    + diamond(102) + diamond(298)
    + snowflake(102, 62, 27, P.flake, P.glow, P.flakeOpacity) + snowflake(298, 62, 27, P.flake, P.glow, P.flakeOpacity)
    + medallion(200, 62, 33, P, id)
    + spike(8, 64, 18, 6, -90, P) + spike(392, 64, 18, 6, 90, P) + spike(200, 14, 14, 5, 0, P) + spike(200, 112, 12, 5, 180, P)
    + spike(40, 18, 14, 5, -35, P) + spike(360, 18, 14, 5, 35, P)
    + star(150, 40, 6, P) + star(250, 40, 6, P) + star(150, 86, 6, P) + star(250, 86, 6, P) + star(102, 24, 5, P) + star(298, 24, 5, P);
  return svg('0 0 400 124', 'xMidYMid meet', defs(id, P) + art);
}

// Stage (C): the inner opening seen from the house, under the wavy soffit and between wavy pilasters.
// Coronation shows the floral arches on the wood floor; Winter and Ice Palace show the gothic ice
// arches with the upstage bridge (Ice Palace adds the stairs and the aurora, as in the runthrough).
const wave = (y, amp, P) => `<path d="M0 ${y}${Array.from({ length: 16 }, (_, i) => `q12.5 ${i % 2 ? amp : -amp} 25 0`).join('')}" fill="none" stroke="${P.wave}" stroke-width="2.4"/>`;
function pilaster(x, P, phase) {
  const pts = Array.from({ length: 23 }, (_, i) => `${n(x + Math.sin(i * .9 + phase) * 4)} ${26 + i * 8}`).join(' ');
  return `<rect x="${x - 8}" y="24" width="16" height="176" fill="${P.pilaster[0]}" opacity=".85"/><polyline points="${pts}" fill="none" stroke="${P.pilaster[1]}" stroke-width="1.6"/>`;
}
function floralArch(cx, P) {
  let out = '';
  for (let i = 0; i <= 18; i++) {
    const t = Math.PI * (1 - i / 18), x = cx + Math.cos(t) * 52, y = 196 - Math.sin(t) * 92;
    const c = P.floral[i % 3];
    out += `<circle cx="${n(x)}" cy="${n(y)}" r="6.2" fill="${c}"/><circle cx="${n(x)}" cy="${n(y)}" r="2" fill="${P.floral[1]}"/>`;
    if (i % 3 === 1) out += `<ellipse cx="${n(x + 7)}" cy="${n(y + 4)}" rx="2.4" ry="5" fill="${P.leaf}" transform="rotate(35 ${n(x + 7)} ${n(y + 4)})"/>`;
  }
  return out;
}
function gothicArch(x0, x1, yTop, P, w) {
  // A pointed lancet: each side rises straight, then curves in to meet at a sharp apex.
  const cx = (x0 + x1) / 2, half = (x1 - x0) / 2, spring = yTop + half * 1.5, h = spring - yTop;
  const d = `M${x0} 200V${n(spring)}C${x0} ${n(yTop + h * .45)} ${n(cx - half * .3)} ${n(yTop + h * .12)} ${cx} ${yTop}`
    + `C${n(cx + half * .3)} ${n(yTop + h * .12)} ${x1} ${n(yTop + h * .45)} ${x1} ${n(spring)}V200`;
  return `<path d="${d}" fill="none" stroke="${P.iceGlow}" stroke-width="${w * 2.6}" opacity=".35"/>`
    + `<path d="${d}" fill="none" stroke="${P.ice}" stroke-width="${w}" stroke-linejoin="miter"/>`
    + `<path d="M${cx - 3} ${yTop + 4}L${cx} ${yTop + 22} ${cx + 3} ${yTop + 4}Z" fill="${P.ice}"/>`;
}
function stage(look) {
  const P = PALETTE[look], id = `fm-art-C-${look}`;
  const sides = pilaster(18, P, 0) + pilaster(40, P, 1.2) + pilaster(360, P, 2.1) + pilaster(382, P, .6);
  const planks = (top, P) => `<rect y="${top}" width="400" height="${220 - top}" fill="${P.floor[0]}"/>` + [0, 1, 2, 3].map(i => `<path d="M0 ${top + 4 + i * 5}H400" stroke="${P.floor[i % 2 ? 1 : 2]}" stroke-width="1.2" opacity=".6"/>`).join('');
  let body;
  if (look === 'coronation') {
    body = floralArch(128, P) + floralArch(272, P)
      + `<path d="M336 196V150l12-16 12 16V196" fill="none" stroke="${P.wave}" stroke-width="1.6" opacity=".8"/>` + planks(198, P);
  } else {
    const bridge = `<rect x="150" y="150" width="100" height="5" fill="${P.ice}"/><rect x="150" y="128" width="100" height="22" fill="none" stroke="${P.ice}" stroke-width="2"/>`
      + Array.from({ length: 5 }, (_, i) => `<path d="M${150 + i * 20} 128l20 22M${170 + i * 20} 128l-20 22" stroke="${P.ice}" stroke-width="1" opacity=".75"/>`).join('');
    const stairs = P.stairs ? Array.from({ length: 6 }, (_, i) => `<rect x="${246 + i * 8}" y="${155 + i * 7.4}" width="${46 - i * 3}" height="3.2" fill="${P.floor[2]}"/>`).join('') : '';
    const aurora = P.aurora ? `<path d="M40 70C110 20 170 90 230 50S340 40 380 80" fill="none" stroke="#3fd2b4" stroke-width="22" opacity=".18" stroke-linecap="round"/><path d="M60 92C130 50 190 110 250 70S350 66 380 98" fill="none" stroke="#2fa8c8" stroke-width="12" opacity=".16" stroke-linecap="round"/>` : '';
    body = aurora + gothicArch(70, 150, 70, P, 3.4) + gothicArch(250, 330, 70, P, 3.4) + gothicArch(132, 268, 32, P, 4.4)
      + bridge + stairs + (P.snow ? snow(400, 200, 70, 3) : '') + planks(198, P);
  }
  const art = `<rect width="400" height="220" fill="url(#${id}-up)"/>` + body + sides
    + `<rect width="400" height="24" fill="${P.sky[0]}"/>` + wave(12, 5, P) + wave(19, 4, P);
  return svg('0 0 400 220', 'xMidYMid meet', defs(id, P) + art);
}

// The letterbox colour around the art comes from CSS (.fm-art-house[data-look]); the page CSP
// forbids inline style attributes.
const svg = (box, fit, body) => `<svg class="fm-art-svg" viewBox="${box}" preserveAspectRatio="${fit}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

export function artSVG(lane, look = 'coronation') {
  const l = LOOKS.includes(look) ? look : 'coronation';
  return lane === 'B' ? header(l) : lane === 'C' ? stage(l) : portal(lane, l);
}
