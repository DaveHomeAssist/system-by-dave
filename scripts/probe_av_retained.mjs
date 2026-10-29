import { spawn } from 'node:child_process';
import { serveFamilies } from './av-family-probe.mjs';

// Private build fixtures preserve the original domain and recovery regressions.
// Public-family entry points separately test their packs in the shared console.
const server = await serveFamilies({ retained: true });
const files = ['../the-shop/probe', 'probe_av_video', 'probe_av_video_graph', 'probe_av_video_displays', 'probe_av_console', 'probe_av_console_recovery', 'probe_av_video_sequences', 'probe_av_audio_connector', 'probe_av_video_rail', 'probe_av_audio_flow', 'probe_show_control_console', 'probe_show_ops_console', 'probe_front_office_console', 'probe_the_shop_console', 'probe_infrastructure_console', 'probe_av_lighting_console'];
const env = { ...process.env, AV_RETAINED_HOST: '1' };
for (const key of ['AV_VIDEO_BASE', 'AV_AUDIO_BASE', 'AUDIO_BASE', 'SHOW_CONTROL_BASE', 'SHOW_OPS_BASE', 'SHOW_OPS_BASE_URL', 'OFFICE_BASE', 'SHOP_BASE', 'INFRA_BASE', 'LIGHTING_BASE']) env[key] = server.base;
try {
  const start = process.env.AV_RETAINED_FROM ? files.indexOf(process.env.AV_RETAINED_FROM) : 0;
  if (start < 0) throw Error('Unknown retained probe start');
  for (const file of files.slice(start)) await new Promise((done, reject) => {
    const child = spawn(process.execPath, [`scripts/${file}.mjs`, '--no-sandbox'], { env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? done() : reject(Error(`${file} exited ${code}`)));
  });
} finally { await server.close(); }
