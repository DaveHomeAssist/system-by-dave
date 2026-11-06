import fs from 'node:fs';
import path from 'node:path';

// WST is published by its managed Worker, whose same-origin Stage imports are
// intentional. The portfolio copy must lead to that canonical running surface.
const MIRRORS = {
  'wst/index.html': 'https://wst.housevideo.app/',
  'wst/stage/index.html': 'https://wst.housevideo.app/stage/index.html',
};
export function applyManagedSiteMirrors(stagedRoot) {
  const replaced = [];
  for (const [relative, target] of Object.entries(MIRRORS)) {
    const file = path.join(stagedRoot, relative);
    if (!fs.existsSync(file)) continue;
    const title = relative.includes('/stage/') ? 'Frozen public Stage' : 'Frozen workspace';
    const description = 'Open the canonical Frozen workspace, public projection plot and room planning at Walnut Street Theatre.';
    fs.writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>${title}</title><meta name="description" content="${description}"><meta name="theme-color" content="#edf5fb"><link rel="canonical" href="${target}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${target}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'"><meta http-equiv="refresh" content="0;url=${target}"></head><body><p>Frozen is available at <a href="${target}">${target}</a>.</p></body></html>\n`);
    replaced.push(relative);
  }
  return replaced;
}
