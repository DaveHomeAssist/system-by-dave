import { probeFamily } from './av-family-probe.mjs';

// Crew copy/import regressions are part of probe_show_ops_console.mjs in the
// retained fixture suite. This public entry verifies the shared Show Ops pack.
await probeFamily('show-ops', process.env.SHOW_OPS_BASE_URL || process.env.SHOW_OPS_BASE);
