import fs from 'node:fs';
import path from 'node:path';

// WST is published by its managed Worker, whose same-origin Stage imports are
// intentional. The portfolio copy must lead to that canonical running surface.
//
// The Projctl, Frozen Monitor and Frozen Startup pages under apps/ are the
// source of apps that run on the theatre's own computers. Served from this
// public site they cannot reach their relay and only show a disconnected shell,
// so the staged copies lead to the public workspace instead (closeout,
// 2026-11-19). The tracked source under apps/ is never changed by this step.
const WORKSPACE = 'https://wst.housevideo.app/';
const HANDOFF = 'https://wst.housevideo.app/handoff.html';
const MIRRORS = {
  'wst/index.html': [WORKSPACE, 'Frozen workspace'],
  'wst/stage/index.html': ['https://wst.housevideo.app/stage/index.html', 'Frozen public Stage'],
  'wst/handoff.html': [HANDOFF, 'Frozen house handoff'],
  'apps/projctl/public/workspace/index.html': [WORKSPACE, 'Frozen workspace'],
  'apps/projctl/public/workspace/handoff.html': [HANDOFF, 'Frozen house handoff'],
  'apps/projctl/public/index.html': [WORKSPACE, 'Frozen projector control'],
  'apps/projctl/public/login.html': [WORKSPACE, 'Frozen projector control'],
  'apps/projctl/public/show.html': [WORKSPACE, 'Frozen projector control'],
  'apps/projctl/public/power.html': [WORKSPACE, 'Frozen projector control'],
  'apps/projctl/public/monitor/index.html': [WORKSPACE, 'Frozen Monitor'],
  'apps/projctl/public/monitor/calendar.html': [WORKSPACE, 'Frozen Monitor'],
  'apps/projctl/public/monitor/cues.html': [WORKSPACE, 'Frozen Monitor'],
  'apps/projctl/public/monitor/network.html': [WORKSPACE, 'Frozen Monitor'],
  'apps/projctl/public/monitor/notes.html': [WORKSPACE, 'Frozen Monitor'],
  'apps/projctl/public/monitor/rig.html': [WORKSPACE, 'Frozen Monitor'],
  'apps/frozen-startup/checks-app/web/index.html': [WORKSPACE, 'Frozen Startup Checks'],
};
export const MANAGED_MIRRORS = Object.freeze(Object.fromEntries(Object.entries(MIRRORS).map(([k, [target]]) => [k, target])));
export function applyManagedSiteMirrors(stagedRoot) {
  const replaced = [];
  for (const [relative, [target, title]] of Object.entries(MIRRORS)) {
    const file = path.join(stagedRoot, relative);
    if (!fs.existsSync(file)) continue;
    const description = 'Open the canonical Frozen workspace, public projection plot and room planning at Walnut Street Theatre.';
    fs.writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>${title}</title><meta name="description" content="${description}"><meta name="theme-color" content="#edf5fb"><link rel="canonical" href="${target}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${target}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'"><meta http-equiv="refresh" content="0;url=${target}"></head><body><p>Frozen is available at <a href="${target}">${target}</a>.</p></body></html>\n`);
    replaced.push(relative);
  }
  return replaced;
}
