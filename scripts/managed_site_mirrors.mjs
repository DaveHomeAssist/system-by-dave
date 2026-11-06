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
    fs.writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><link rel="canonical" href="${target}"><meta http-equiv="refresh" content="0;url=${target}"><title>Frozen workspace</title></head><body><p>Frozen is available at <a href="${target}">${target}</a>.</p></body></html>\n`);
    replaced.push(relative);
  }
  return replaced;
}
