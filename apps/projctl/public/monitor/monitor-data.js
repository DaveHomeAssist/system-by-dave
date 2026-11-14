// Frozen Monitor recorded facts. Each value here is a dated record, never a live reading.
// Live projector state, addresses, slots, the command log and health reports come from this relay.
// Sources: wst/projectors.json (2026-11-07), the R4 handoff packet and the project hub as read on
// 2026-11-14. Private relay and lighting-network addresses stay in the project hub, not in this file.

export const HUB = 'https://app.notion.com/p/410255fc8f44811c8d80c85bedbcede7';
export const RECORDS_READ = 'Nov 14, 2026';
export const OPENING = '2026-11-25';
const DOCS = 'https://wst.housevideo.app/documents/';

export const LANES = [
  { lane: 'A', surface: 'SL Portal', role: 'Stage left portal', prod: 'P1', native: '1280 × 800', raster: '12′5″ × 19′11″',
    route: 'PJLink :4352', lensFlag: 'Plot record · barrel not confirmed', model: 'Panasonic PT-DW830U', orientation: 'Portrait',
    lens: 'ET-DLE170 · 1.80–2.54:1 (projection plot record)', light: 'Lamp 1 on · Lamp 2 FAILED · Nov 13 snapshot' },
  { lane: 'B', surface: 'Top Portal', role: 'Portal header', prod: 'P2', native: '1920 × 1200', raster: '29′5″ × 18′4″',
    route: 'PJLink :4352', lensFlag: 'Plot lists 085 · verify the label', model: 'Panasonic PT-RZ970', orientation: 'Landscape',
    lens: 'ET-DLE080 (recorded)', light: 'Laser light source' },
  { lane: 'C', surface: 'Stage', role: 'Main stage', prod: 'P3', native: '2560 × 1600 · 4K output 3840 × 2400', raster: '32′5″ × 20′3″',
    route: 'Pulse :9090 or PJLink :4352', lensFlag: 'Fitted lens unknown · case label only', model: 'Barco UDM 4K22', orientation: 'Landscape',
    lens: 'TLD+ zoom 0.71–0.93:1 (4K), recorded', light: 'Not in the records read' },
  { lane: 'D', surface: 'SR Portal', role: 'Stage right portal', prod: 'P4', native: '1280 × 800', raster: '12′5″ × 19′11″',
    route: 'PJLink :4352', lensFlag: 'Plot record · barrel not confirmed', model: 'Panasonic PT-DW830U', orientation: 'Portrait',
    lens: 'ET-DLE170 · 1.80–2.54:1 (projection plot record)', light: 'Both lamps on · Nov 13 snapshot' },
];

export const ALERTS = [
  { st: 'blocked', title: 'A · Lamp 2 FAILED', detail: 'Lamp 1 on, Lamp 2 off with DUAL selected.', when: 'Self test snapshot · Nov 13, 2:26 PM EST' },
  { st: 'waiting', title: 'A and D · Horizontal tilt warning', detail: 'Fan and temperature self tests passed.', when: 'Same snapshot · Nov 13, 2:26 PM EST' },
  { st: 'active', title: 'Portals · 37 control disconnects in one hour', detail: 'No lost pings. 36 back at the next 5 s check, one took 15 s.', when: 'Monitoring entry · Nov 12' },
];

export const RELAYS = {
  macbook: { name: 'MacBook relay', role: 'Control surface', build: '87e844b + PR 478 driver overlay', poll: '5 s', note: 'Working controller as of Nov 13.' },
  studio: { name: 'Studio relay', role: 'Health Logs reporting', build: 'Older build', poll: '60 s selected · change pending', note: 'Kept on by decision RELAY-1, Nov 13.' },
};

export const MILESTONES = [
  { date: '2026-11-15', label: 'Final dress', time: '7pm to 10pm' },
  { date: '2026-11-17', label: 'First preview', time: '7:30pm' },
  { date: '2026-11-25', label: 'Opening night', time: '7:00pm' },
  { date: '2026-11-26', label: 'Thanksgiving', time: 'No shows' },
];

export const CHECKLIST = [
  { title: 'Test window', text: 'Confirm date and time, released feeds, and whether reconnects, standby and a Studio reboot are allowed.' },
  { title: 'Service results', text: "Electrical clearance for the pixel PSU and distribution. Technician findings on A's Lamp 2 fault and the A and D portrait setup." },
  { title: 'People', text: 'Name the house primary, backup, technical support contact and stage management decision maker. Agree the handoff time.' },
  { title: 'Show files', text: 'Record approved projection and pixel file names and paths, backups, startup and login steps, and the walk-in and opening looks.' },
  { title: 'Cue details', text: 'Lighting and A1 confirm the MIDI route and messages, one safe test cue, the reset action and a recovery that will not replay sound.' },
  { title: 'Control access', text: 'Confirm the permanent KVM position. Bring the mini PC, test monitor and label maker. Arrange venue Wi-Fi access.' },
  { title: 'Photos and readbacks', text: 'B and C lens labels, extender model and EDID switches, decoder port settings, six strip mapping, received resolution and refresh per projector.' },
];

// The 16 crew-workbook acceptance checks (R4 pages 12 to 16). No result is recorded yet.
export const CHECKS = [
  { id: 'backup', scope: 'rig', text: 'Original EDIDs, overrides, show files and mapping backed up' },
  { id: 'mapping', scope: 'A–D', text: 'Physical surface, port and Millumin destination witnessed' },
  { id: 'midi', scope: 'A–D', text: 'Exact cue or message and response recorded' },
  { id: 'pjlink', scope: 'A–D', text: 'Projector command path; record Pulse or PJLink for C' },
  { id: 'preset', scope: 'A–D', text: 'Agreed preset or look and restoration witnessed' },
  { id: 'temperature', scope: 'A–D', text: 'Full report, sample time, limit basis and faults', legacy: true },
  { id: 'shutdown', scope: 'A–D', text: 'Actual power-off, cooldown and startup state witnessed', legacy: true },
  { id: 'reboot', scope: 'A–D', text: 'Studio reboot and automatic recovery' },
  { id: 'standby', scope: 'A–D', text: 'Studio sleep and wake and automatic recovery' },
  { id: 'usb', scope: 'A–D', text: 'USB reconnect and automatic recovery' },
  { id: 'hdmi', scope: 'A–D', text: 'HDMI reconnect and automatic recovery' },
  { id: 'betterdisplay', scope: 'rig', text: 'Login startup and protection settings' },
  { id: 'aten', scope: 'A–D', text: 'Model, position, learned source and retention' },
  { id: 'shutdown-report', scope: 'rig', text: 'Report trigger matched to actual shutdown evidence' },
  { id: 'delivery', scope: 'rig', text: 'Expected destination and human readback' },
  { id: 'show-restored', scope: 'rig', text: 'Opening and show state restored and witnessed' },
];

export const CUES = [
  { cue: 'Projection playback', msg: 'Gio MIDI message · TBD', dest: 'Millumin on the M5 Studio', route: 'Gio → mioXL → network MIDI' },
  { cue: 'Pixel playback', msg: 'Gio MIDI message · TBD', dest: 'Millumin on the M1 Studio', route: 'Gio → mioXL → network MIDI' },
  { cue: 'Power and shutter · A, B, D', msg: 'Millumin mapping · TBD', dest: 'Projectors A, B and D', route: 'PJLink :4352' },
  { cue: 'Power and shutter · C', msg: 'Millumin mapping · TBD', dest: 'Projector C', route: 'Pulse :9090 or PJLink :4352 · record which' },
  { cue: 'One safe test cue', msg: 'TBD · lighting and A1 to confirm', dest: 'Both playback systems', route: 'TBD' },
  { cue: 'Opening reset', msg: 'TBD', dest: 'Both playback systems', route: 'TBD' },
  { cue: 'Repeat without replaying sound', msg: 'TBD', dest: 'Projection or pixels alone', route: 'TBD' },
  { cue: 'Walk-in and opening looks', msg: 'TBD · approved show files', dest: 'Projection and pixels', route: 'TBD' },
];

// From apps/projctl/server/osc.js and the README: OSC on UDP 9000, a text line on TCP 9001.
export const OSC = { ports: 'OSC on UDP 9000 · text line on TCP 9001', forms: ['/proj/P4/shutter 1', '/proj/all/power 0', '/proj/preset/preshow'] };

export const PIXELS = [
  { k: 'Deck strips', v: '6 physical · 3 downstage, 3 upstage · 12 mapping slices' },
  { k: 'Deck patch', v: 'Port 1 downstage · universe 221, ch 1 · Port 2 upstage · universe 227, ch 1 (Nov 12 record)' },
  { k: 'Deck decoder', v: 'DMXking LeDMX2 per Dave, Nov 13 · Katy calls it Max2 · compare the unit label' },
  { k: 'Deck protocol', v: 'Unverified · Art-Net or sACN (Katy, Nov 14)' },
  { k: 'Deck routing', v: 'Cat5 to the Jump Top Luminex · injection at SR, CSR and CSL (reported, not traced)' },
  { k: 'Portal pixels', v: 'Elation Pixel Driver V2 · Art-Net (reported by Katy, Nov 14)' },
];

export const POWER = [
  { k: 'A, B, D', v: 'NORMAL standby accepted · checks pending' },
  { k: 'C', v: 'Barco shutdown sequence to agree · read back' },
  { k: 'Reports', v: 'Power-off report before a shutdown pass' },
];

export const LINK_HEALTH = [
  { st: 'active', title: '37 portal control disconnects in one hour', detail: 'Nov 12 · no lost pings · 36 back at the next 5 s check, one took 15 s · cause open' },
  { st: 'waiting', title: 'Slow the Studio relay to one poll a minute', detail: 'RELAY-1 · Nov 13 · both relays were polling on Nov 12 · do it at a break' },
];

export const DOCUMENTS = [
  { tag: 'Current issue · 5 pages', title: 'Signal flow R5', text: 'Larger AV1 labels and clearer connections. CU1, CT1, PX1 and PW1 keep the R4 content.', href: DOCS + 'frozen-signal-flow-r5.pdf' },
  { tag: '17 pages', title: 'Projection handoff R4', text: 'One packet with clickable contents and bookmarks. Private network addresses are left out of this public copy.', href: DOCS + 'frozen-handoff-r4.pdf' },
  { tag: 'Pages 2 to 6', title: 'Illustrated overview', text: 'Projection lanes, display recovery, cueing, pixels and house handoff.', href: DOCS + 'frozen-handoff-r4.pdf#page=2' },
  { tag: 'Pages 12 to 16', title: 'Crew acceptance', text: 'Blank field workbook with 16 check IDs. Results need a witness.', href: DOCS + 'frozen-handoff-r4.pdf#page=12' },
  { tag: 'Page 17', title: 'Source reference key', text: 'Source records and manufacturer references. Notion links may need sign-in.', href: DOCS + 'frozen-handoff-r4.pdf#page=17' },
];

export const RECORDS = [
  { title: 'Project hub', href: HUB },
  { title: 'Action Items', href: 'https://app.notion.com/p/606cce77af6f4d21a0391a71b4f413b3' },
  { title: 'House Show Operations Guide', href: 'https://app.notion.com/p/416255fc8f44804983b4c3a997a717e4' },
  { title: 'House Handoff Walkthrough', href: 'https://app.notion.com/p/0ea774b6d7c74c459f957d6223ca18ff' },
  { title: 'Projector Health Logs', href: 'https://app.notion.com/p/4cb4011cf0344eeb942b653b196ec25b' },
  { title: 'Projector Signal and Equipment', href: 'https://app.notion.com/p/40d255fc8f448089a269d124a1c204c3' },
];

export const SCHEDULE_PDF = 'https://wst.housevideo.app/frozen-tech-schedule.pdf';
export const WORKBOOK = DOCS + 'frozen-handoff-r4.pdf#page=12';
export const SHARED_BOARD = 'https://wst.housevideo.app/';

// Rows for a coverage grid: one square per lane plus the rig, one state circle at the end.
export function checkRows(ids) {
  return CHECKS.filter(c => !ids || ids.includes(c.id)).map(c => {
    const byLane = c.scope !== 'rig';
    const v = c.legacy ? 'legacy' : 'empty';
    const say = c.legacy ? 'Earlier pass, verify again' : 'Not tested';
    return { id: c.id, text: c.text, lane: byLane ? v : 'na', rig: byLane ? 'na' : 'empty', laneSay: byLane ? say : 'Not applicable', rigSay: byLane ? 'Not applicable' : 'Not tested' };
  });
}

// Same call grouping as the Planning calendar; meals, breaks and meetings are side entries.
export const isSide = label => /(Lunch|dinner|break|Meeting|Pizza notes)/i.test(label);
