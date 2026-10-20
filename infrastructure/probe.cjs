// The native probe retains the original stale-save, malformed/oversized import,
// legacy-source, theme and viewport assertions, plus working-panel acceptance.
import('../scripts/probe_infrastructure_console.mjs').catch(error => { console.error(error); process.exitCode = 1; });
