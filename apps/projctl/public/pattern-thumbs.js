// Pattern thumbnails: small pictures of the projector's internal test patterns, drawn from
// the pattern names the driver reports. Colours here depict projected output, not UI state.
// An unrecognized name gets a neutral frame rather than a guessed picture.
const W = 48, H = 30;
const SOLID = { white: '#ffffff', black: '#000000', red: '#e0262b', green: '#22a347', blue: '#2148c4', cyan: '#2ec5d3', magenta: '#c43aa8', yellow: '#f2d630' };
const BARS = ['#ffffff', '#f2d630', '#2ec5d3', '#22a347', '#c43aa8', '#e0262b', '#2148c4'];

export function patternKind(name) {
  const n = String(name ?? '').trim().toLowerCase();
  if (/colou?r ?bars?.*side|side.*bars/.test(n)) return 'bars-side';
  if (/colou?r ?bars?|smpte|\bbars\b/.test(n)) return 'bars';
  const focus = n.match(/^focus(?:\s*\((\w+)\))?$/);
  if (focus) return SOLID[focus[1]] ? `focus-${focus[1]}` : 'focus-white';
  const solid = n.match(/^(white|black|red|green|blue|cyan|magenta|yellow)(?:\s+(?:raster|field|screen))?$/);
  if (solid) return `solid-${solid[1]}`;
  if (/cross ?hatch|grid|convergence|alignment/.test(n)) return 'grid';
  if (/(reversed|inverted|negative) flag/.test(n)) return 'flag-reversed';
  if (/flag|checker/.test(n)) return 'flag';
  if (/(reversed|inverted|negative) window/.test(n)) return 'window-reversed';
  if (/window|border|frame/.test(n)) return 'window';
  if (/\b\d+(?:\.\d+)?\s*:\s*\d+\b/.test(n)) return 'aspect';
  if (/cw index|colou?r wheel/.test(n)) return 'steps';
  if (/ramp|gr[ae]y|gradient|scale|step/.test(n)) return 'ramp';
  return 'unknown';
}

const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
function gridLines(color, step = 6) {
  let lines = '';
  for (let x = step; x < W; x += step) lines += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
  for (let y = step; y < H; y += step) lines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
  return `<g stroke="${color}" stroke-width="1">${lines}</g>`;
}
function checker(a, b) {
  let cells = rect(0, 0, W, H, a);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) if ((row + col) % 2) cells += rect(col * 12, row * 10, 12, 10, b);
  return cells;
}

function body(kind) {
  if (kind === 'bars') return BARS.map((fill, i) => rect(i * W / 7, 0, W / 7 + .2, H, fill)).join('');
  if (kind === 'bars-side') return BARS.map((fill, i) => rect(0, i * H / 7, W, H / 7 + .2, fill)).join('');
  if (kind.startsWith('solid-')) return rect(0, 0, W, H, SOLID[kind.slice(6)]);
  if (kind.startsWith('focus-')) return rect(0, 0, W, H, '#000000') + gridLines(SOLID[kind.slice(6)], 4);
  if (kind === 'grid') return rect(0, 0, W, H, '#000000') + gridLines('#ffffff');
  if (kind === 'flag') return checker('#ffffff', '#000000');
  if (kind === 'flag-reversed') return checker('#000000', '#ffffff');
  if (kind === 'window') return rect(0, 0, W, H, '#000000') + rect(14, 9, 20, 12, '#ffffff');
  if (kind === 'window-reversed') return rect(0, 0, W, H, '#ffffff') + rect(14, 9, 20, 12, '#000000');
  if (kind === 'aspect') return rect(0, 0, W, H, '#000000') + '<g fill="none" stroke="#ffffff" stroke-width="1.5"><rect x="2" y="3" width="44" height="24"/><rect x="11" y="3" width="26" height="24"/></g>';
  if (kind === 'steps') return ['#ffffff', '#f2d630', '#2ec5d3', '#22a347', '#c43aa8', '#e0262b', '#2148c4', '#000000'].map((fill, i) => rect(i * 6, 0, 6.2, H, fill)).join('');
  if (kind === 'ramp') return Array.from({ length: 8 }, (_, i) => { const v = Math.round(i * 255 / 7).toString(16).padStart(2, '0'); return rect(i * 6, 0, 6.2, H, `#${v}${v}${v}`); }).join('');
  return rect(0, 0, W, H, '#5d6570') + '<g stroke="#a7b0bc" stroke-width="1"><line x1="0" y1="0" x2="48" y2="30"/><line x1="48" y1="0" x2="0" y2="30"/></g>';
}

export function patternThumb(name) {
  const kind = patternKind(name);
  return `<svg class="pj-thumb" data-thumb="${kind}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${body(kind)}</svg>`;
}
