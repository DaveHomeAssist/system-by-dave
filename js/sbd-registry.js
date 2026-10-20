/* System by Dave — canonical AV tool registry (single source of truth).
   Consumed by: av/ (the AV by Dave console shell), js/sbd-nav.js (universal tool
   nav), js/av-suite-context.js (show-context dock), av-suite-worker.js (offline
   cache manifest, via importScripts), and scripts/gen_sitemap.py (sitemap).

   Adding a tool: add ONE entry to `tools` (and, if it belongs in the universal
   nav, list its id in `navDepartments`), then bump `version` so the service
   worker rolls its cache. Nothing else to edit.

   Worker-safe: no DOM/window access — attaches to self (worker) or window. */
(function(root){
  'use strict';

  var PHASES=[
    {id:'advance',label:'Advance'},
    {id:'prep',label:'Prep'},
    {id:'loadin',label:'Load In'},
    {id:'show',label:'Show'},
    {id:'strike',label:'Strike'},
    {id:'closeout',label:'Closeout'}
  ];

  /* dept = console grouping (fine-grained). storageKeys = localStorage keys the
     tool writes (used by saved-data scan + show-package export/import). */
  var TOOLS=[
    {id:'av-video',name:'AV Video',href:'av-video/',dept:'Video',phases:['advance','prep','loadin','show'],tag:'Application',desc:'Signal Flow, Video Patch, Displays and Projection: connected routes, destination plans, checks, and optional modules.',storageKeys:[{key:'sbd.avVideo.v1',label:'AV Video plan'},{key:'sbd.avVideo.draft.v1',label:'AV Video unsaved draft'},{key:'sbd.avVideo.layout.v1',label:'AV Video panel layout'}]},
    {id:'av-audio',name:'Audio',href:'av-audio/',dept:'Audio',phases:['advance','prep','loadin','show'],tag:'Application',desc:'Inputs, patch, line checks and speaker zones in one saved Audio plan.',storageKeys:[{key:'sbd.avAudio.v1',label:'Audio plan'}]},
    {id:'show-control',name:'Show Control',href:'show-control/',dept:'Show Flow',phases:['prep','show'],tag:'Application',desc:'Configurable calling, rundown, notes and log panels; CueForge remains the executable show-control product.',storageKeys:[{key:'sbd.showControl.v1',label:'Show Control run'},{key:'sbd.showControl.draft.v1',label:'Show Control recovery draft'},{key:'sbd.showControl.layout.v1',label:'Show Control device layout'}]},
    {id:'show-ops',name:'Show Ops',href:'show-ops/',dept:'Rooms',phases:['advance','prep','loadin','show','closeout'],tag:'Application',desc:'Room readiness, crew calls, tasks and show handoff in one saved workspace.',storageKeys:[{key:'sbd.showOps.document.v1',label:'Show Ops document'},{key:'sbd.showOps.draft.v1',label:'Show Ops unsaved draft'},{key:'sbd.showOps.layout.v1',label:'Show Ops device layout'}]},
    {id:'front-office',name:'Front Office',href:'front-office/',dept:'Client',phases:['advance','prep','show','closeout'],tag:'Application',desc:'Working client, venue, job and advance panels with explicit Save and an independent local document.',storageKeys:[{key:'sbd.frontOffice.document.v1',label:'Front Office document'},{key:'sbd.frontOffice.draft.v1',label:'Front Office recovery draft'},{key:'sbd.frontOffice.layout.v1',label:'Front Office device layout'}]},
    {id:'the-shop',name:'The Shop',href:'the-shop/',dept:'Logistics',phases:['prep','loadin','strike'],tag:'Application',desc:'Configurable worklist, item inspector, plan/import and backup panels with source-preserving copies.',storageKeys:[{key:'sbd.shop.v1',label:'The Shop plan'},{key:'sbd.shop.draft.v1',label:'The Shop recovery draft'},{key:'sbd.shop.layout.v1',label:'The Shop device layout'}]},
    {id:'infrastructure',name:'Infrastructure',href:'infrastructure/',dept:'Power',phases:['advance','prep','loadin'],tag:'Application',desc:'Working power, network, cable and issue panels with compatible imports and explicit Save.',storageKeys:[{key:'sbd.infrastructure.v1',label:'Infrastructure plan'},{key:'sbd.infrastructure.draft.v1',label:'Infrastructure recovery draft'},{key:'sbd.infrastructure.layout.v1',label:'Infrastructure device layout'}]},
    {id:'av-lighting',name:'Lighting',href:'av-lighting/',dept:'Lighting',phases:['advance','prep','loadin','show'],tag:'Application',desc:'Working fixture, patch, focus and import panels; PlotForge remains the full lighting-plot product.',storageKeys:[{key:'sbd.avLighting.v1',label:'Lighting plan'},{key:'sbd.avLighting.draft.v1',label:'Lighting recovery draft'},{key:'sbd.avLighting.layout.v1',label:'Lighting device layout'}]},
    {id:'teleprompter',name:'Teleprompter',href:'teleprompter.html',dept:'Show Flow',phases:['prep','show'],tag:'Script',desc:'Script reader with formatting, saved scripts, cues, remote mode, rundown, and a compact read view.',storageKeys:[{key:'teleprompter.v1',label:'Teleprompter state'},{key:'teleprompter.script.v1',label:'Teleprompter script'},{key:'teleprompter.preferences.v1',label:'Teleprompter preferences'},{key:'teleprompter.savedScripts.v1',label:'Teleprompter saved scripts'},{key:'teleprompter.savedFormats.v1',label:'Teleprompter saved looks'},{key:'teleprompter.pacePresets.v1',label:'Teleprompter saved paces'},{key:'teleprompter.bookmarks.v1',label:'Teleprompter bookmarks'},{key:'teleprompter.customColors.v1',label:'Teleprompter custom colors'}]},
    {id:'show-timer',name:'Show Timer',href:'show-timer.html',dept:'Show Flow',phases:['prep','show'],tag:'Clock',desc:'Countdown, count up, clock mode, stage view, warning states, and keyboard control.',storageKeys:[{key:'showTimer.preferences.v1',label:'Show Timer preferences'}]},
    {id:'cue-sheet',name:'Cue Sheet',href:'cue-sheet.html',dept:'Show Flow',phases:['advance','prep','show'],tag:'Cues',desc:'Browser based rundown control with preview, lightweight layered playback, monitor output, capture inputs, print, JSON, and CSV.',storageKeys:[{key:'cueSheet.v1',label:'Cue Sheet state'}]},
    {id:'playback-check',retired:'video',name:'Playback Check',href:'playback-check.html',dept:'Playback',phases:['prep','show'],tag:'Media',desc:'Playback file checklist with routes, backups, duration, ready state, and export.',storageKeys:[{key:'playback-check.v1',label:'Playback Check'}]},
    {id:'pixelforge',name:'PixelForge',href:'pixelforge/',dept:'Graphics',phases:['advance','prep','show','closeout'],tag:'Graphics',desc:'Raster, vector, text, and image-editing workspace for show graphics, signage fixes, simple overlays, and PNG export.',storageKeys:[{key:'PixelForge.prefs.v1',label:'PixelForge preferences'},{key:'pf:palettes:v1',label:'PixelForge palettes'}]},
    {id:'record-log',retired:'video',name:'Record Log',href:'record-log.html',dept:'Playback',phases:['show','closeout'],tag:'Record',desc:'Program records, camera ISOs, audio captures, media destinations, backup status, and handoff notes.',storageKeys:[{key:'record-log.v1',label:'Record Log'}]},
    {id:'stream-plan',retired:'video',name:'Stream Plan',href:'stream-plan.html',dept:'Streaming',phases:['advance','prep','show'],tag:'Stream',desc:'Encoder, platform, destination, bitrate, audio, record, backup, and test tracking.',storageKeys:[{key:'sbd.streamPlan.v1',label:'Stream Plan'}]},
    {id:'show-advance',retired:'front-office',name:'Show Advance',href:'show-advance.html',dept:'Planning',phases:['advance'],tag:'Advance',desc:'Contacts, access, schedule, power, network, labor, deliverables, risks, and open questions.',storageKeys:[{key:'show-advance.v1',label:'Show Advance'}]},
    {id:'site-survey',retired:'front-office',name:'Site Survey',href:'site-survey.html',dept:'Planning',phases:['advance'],tag:'Venue',desc:'Venue access, loading, rooms, power, rigging, network, safety, contacts, and findings.',storageKeys:[{key:'site-survey.v1',label:'Site Survey'}]},
    {id:'crew-call',retired:'show-ops',name:'Crew Call',href:'crew-call.html',dept:'Labor',phases:['advance','prep','show'],tag:'Crew',desc:'Departments, names, roles, call times, locations, meal breaks, release times, and phone numbers.',storageKeys:[{key:'crew-call.v1',label:'Crew Call'}]},
    {id:'crew-time-log',retired:'show-ops',name:'Crew Time Log',href:'crew-time-log.html',dept:'Labor',phases:['show','closeout'],tag:'Time',desc:'Actual check in, meals, release times, hour totals, issues, and export.',storageKeys:[{key:'crew-time-log.v1',label:'Crew Time Log'}]},
    {id:'room-check',retired:'show-ops',name:'Room Check',href:'room-check.html',dept:'Rooms',phases:['loadin','show'],tag:'Rooms',desc:'Room readiness by area, owner, priority, deadline, status, blocker, and notes.',storageKeys:[{key:'room-check.v1',label:'Room Check'}]},
    {id:'breakout-room-matrix',retired:'show-ops',name:'Breakout Room Matrix',href:'breakout-room-matrix.html',dept:'Rooms',phases:['advance','prep','show'],tag:'Matrix',desc:'Breakout schedules, tracks, techs, producers, audio, video, network, power, readiness, and blockers.',storageKeys:[{key:'breakout-room-matrix.v1',label:'Breakout Room Matrix'}]},
    {id:'show-board',retired:'show-ops',name:'Show Board',href:'show-board.html',dept:'Rooms',phases:['prep','loadin','show'],tag:'Live Rooms',desc:'Timeline-first room-turn board with readiness checks, active issues, pinch windows, sign-text import, and rolling local backups.',storageKeys:[]},
    {id:'show-task-board',retired:'show-ops',name:'Show Task Board',href:'show-task-board.html',dept:'Rooms',phases:['loadin','show','strike'],tag:'Tasks',desc:'Show day tasks, area, owner, priority, due time, source, blocker, status counts, and handoff summaries.',storageKeys:[{key:'show-task-board.v1',label:'Show Task Board'}]},
    {id:'show-handoff',retired:'show-ops',name:'Show Handoff',href:'show-handoff.html',dept:'Closeout',phases:['show','closeout'],tag:'Handoff',desc:'A concise show transfer builder for status, signal flow, crew notes, risks, and next actions.',storageKeys:[{key:'show-handoff.v1',label:'Show Handoff'}]},
    {id:'show-report',retired:'show-ops',name:'Show Report',href:'show-report.html',dept:'Closeout',phases:['closeout'],tag:'Report',desc:'Timeline, issues, client requests, decisions, crew notes, follow ups, severity, and status.',storageKeys:[{key:'show-report.v1',label:'Show Report'}]},
    {id:'change-order',retired:'front-office',name:'Change Order',href:'change-order.html',dept:'Client',phases:['show','closeout'],tag:'Change',desc:'Client scope requests, approval, cost impact, owners, due times, issue state, and notes.',storageKeys:[{key:'change-order.v1',label:'Change Order'}]},
    {id:'client-signoff',retired:'front-office',name:'Client Sign Off',href:'client-signoff.html',dept:'Client',phases:['closeout'],tag:'Signoff',desc:'Acceptance items, approvers, signed times, exceptions, follow ups, owners, and notes.',storageKeys:[{key:'client-signoff.v1',label:'Client Sign Off'}]},
    {id:'input-list',retired:'audio',name:'Input List',href:'input-list.html',dept:'Audio',phases:['advance','prep','show'],tag:'Inputs',desc:'Input list and patch prep with channels, line checks, filters, print, JSON, and CSV.',storageKeys:[{key:'input-list.v1',label:'Input List'}]},
    {id:'audio-patch',retired:'audio',name:'Audio Patch',href:'audio-patch.html',dept:'Audio',phases:['prep','loadin','show'],tag:'Audio',desc:'Console channels, sources, stageboxes, inputs, phantom, gain, destinations, monitor sends, and gaps.',storageKeys:[{key:'audio-patch.v1',label:'Audio Patch'}]},
    {id:'line-check',retired:'audio',name:'Line Check',href:'line-check.html',dept:'Audio',phases:['loadin','show'],tag:'Check',desc:'Channels, sources, locations, techs, console labels, destinations, talkback, problems, and status.',storageKeys:[{key:'line-check.v1',label:'Line Check'}]},
    {id:'speaker-plan',retired:'audio',name:'Speaker Plan',href:'speaker-plan.html',dept:'Audio',phases:['advance','prep','loadin'],tag:'PA',desc:'Zones, loudspeakers, processor outputs, amps, cable paths, trim, delay, coverage, and backup routes.',storageKeys:[{key:'sbd.speakerPlan.v1',label:'Speaker Plan'}]},
    {id:'power-plan',retired:'infrastructure',name:'Power Plan',href:'power-plan.html',dept:'Power',phases:['advance','prep','loadin'],tag:'Power',desc:'Circuits, sources, room locations, load estimates, capacity, draw, headroom, backups, and issues.',storageKeys:[{key:'power-plan.v1',label:'Power Plan'}]},
    {id:'network-plan',retired:'infrastructure',name:'Network Plan',href:'network-plan.html',dept:'Network',phases:['advance','prep','loadin','show'],tag:'Network',desc:'Show control, audio, video, comms, internet, IPs, VLANs, switch ports, backups, and issues.',storageKeys:[{key:'network-plan.v1',label:'Network Plan'}]},
    {id:'signal-flow',retired:'video',consolidatedInto:'av-video',name:'Signal Flow',href:'signal-flow.html',dept:'Video',phases:['advance','prep','loadin'],tag:'Routes',desc:'Sources, processors, destinations, formats, connectors, backups, route status, and issues.',storageKeys:[{key:'signal-flow.v1',label:'Signal Flow'}]},
    {id:'video-patch',retired:'video',consolidatedInto:'av-video',name:'Video Patch',href:'video-patch.html',dept:'Video',phases:['prep','loadin','show'],tag:'Video',desc:'Sources, formats, connectors, switcher inputs, converters, destinations, routes, backups, and tests.',storageKeys:[{key:'sbd.videoPatch.v1',label:'Video Patch'}]},
    {id:'display-plan',retired:'video',name:'Display Plan',href:'display-plan.html',dept:'Video',phases:['advance','prep','loadin'],tag:'Displays',desc:'Displays, inputs, processors, resolutions, aspect ratios, refresh rates, routes, backups, and status.',storageKeys:[{key:'display-plan.v1',label:'Display Plan'}]},
    {id:'projection-plan',retired:'video',name:'Projection Plan',href:'projection-plan.html',dept:'Video',phases:['advance','prep','loadin'],tag:'Projection',desc:'Screens, surfaces, projectors, lenses, throw, positions, routes, blends, backup paths, and alignment.',storageKeys:[{key:'sbd.projectionPlan.v1',label:'Projection Plan'}]},
    {id:'throwline',name:'Throwline',href:'ProjectorThrow/',dept:'Video',phases:['advance','prep','loadin','show'],tag:'Projection',desc:'Offline projector throw, fit, field commissioning, spatial room planning, calculated multi-projector layouts, dimensioned views, and show handoff.',storageKeys:[{key:'throwline:lenses:v2',label:'Throwline custom lenses'},{key:'throwline:jobs:v2',label:'Throwline saved jobs'},{key:'throwline:shift-profiles:v1',label:'Throwline shift profiles'},{key:'throwline:inventory:v1',label:'Throwline crew inventory'},{key:'throwline:show:v1',label:'Throwline current show'},{key:'throwline:stage-scene:v1',label:'Throwline Stage scenes'},{key:'throwline:stage-onboarding:v1',label:'Throwline Stage onboarding'},{key:'throwline:stage-units:v1',label:'Throwline Stage measurement units'},{key:'throwline:theme:v1',label:'Throwline theme'}]},
    {id:'lighting-patch',retired:'lighting',name:'Lighting Patch',href:'lighting-patch.html',dept:'Lighting',phases:['advance','prep','loadin','show'],tag:'LX',desc:'Fixtures, positions, modes, universes, addresses, channels, dimmers, colors, focus notes, and status.',storageKeys:[{key:'lighting-patch.v1',label:'Lighting Patch'}]},
    {id:'cable-plan',retired:'infrastructure',name:'Cable Plan',href:'cable-plan.html',dept:'Build',phases:['prep','loadin','strike'],tag:'Cable',desc:'Cable types, lengths, source, destination, path, labels, owners, pull status, trip, and slack issues.',storageKeys:[{key:'cable-plan.v1',label:'Cable Plan'}]},
    {id:'rf-coordination',retired:'audio',name:'RF Coordination',href:'rf-coordination.html',dept:'Comms',phases:['advance','prep','show'],tag:'RF',desc:'Wireless mics, IEM, IFB, comms packs, receivers, frequencies, bands, conflicts, and backups.',storageKeys:[{key:'rf-coordination.v1',label:'RF Coordination'}]},
    {id:'comms-check',retired:'audio',name:'Comms Check',href:'comms-check.html',dept:'Comms',phases:['prep','show'],tag:'Comms',desc:'Intercom, radio, and IFB assignments with channels, devices, battery, backups, and issue flags.',storageKeys:[{key:'comms-check.v1',label:'Comms Check'}]},
    {id:'camera-shot-list',retired:'video',name:'Camera Shot List',href:'camera-shot-list.html',dept:'Camera',phases:['advance','prep','show'],tag:'Camera',desc:'Camera plan with shot rows, framing, movement, presets, ready and problem status, and take next.',storageKeys:[{key:'camera-shot-list.v1',label:'Camera Shot List'}]},
    {id:'stageplotter',name:'StagePlotter',href:'stage-plot.html',dept:'Planning',phases:['advance','prep','loadin'],tag:'Room Plot',desc:'Offline-capable room layout sketcher with illustrated stages, screens, cameras, speakers, mics, furniture, power, people, and cable paths.',storageKeys:[{key:'stage-plot.v1',label:'StagePlotter'}]},
    {id:'gear-prep',retired:'shop',name:'Gear Prep',href:'gear-prep.html',dept:'Logistics',phases:['prep'],tag:'Gear',desc:'Pull sheets, case IDs, quantities, departments, owners, test, pack, load, issues, and open items.',storageKeys:[{key:'gear-prep.v1',label:'Gear Prep'}]},
    {id:'gear-reference',name:'Gear Reference',href:'gear-reference.html',dept:'Logistics',phases:['prep','loadin'],tag:'Reference',desc:'Offline per-device field sheets with specifications, schematics, procedures, consumables, intake checks, and source confidence.',storageKeys:[]},
    {id:'truck-pack',retired:'shop',name:'Truck Pack Plan',href:'truck-pack.html',dept:'Logistics',phases:['prep','loadin','strike'],tag:'Truck',desc:'Cases, truck zones, load order, unload order, weights, owners, pack status, and issues.',storageKeys:[{key:'truck-pack.v1',label:'Truck Pack Plan'}]},
    {id:'load-in-plan',retired:'shop',name:'Load In Plan',href:'load-in-plan.html',dept:'Logistics',phases:['loadin'],tag:'Load In',desc:'Trucks, docks, destinations, departments, items, owners, due times, build status, blockers, and gaps.',storageKeys:[{key:'load-in-plan.v1',label:'Load In Plan'}]},
    {id:'strike-plan',retired:'shop',name:'Strike Plan',href:'strike-plan.html',dept:'Logistics',phases:['strike'],tag:'Strike',desc:'Departments, strike items, locations, owners, case IDs, destinations, load out status, missing gear, and issues.',storageKeys:[{key:'strike-plan.v1',label:'Strike Plan'}]},
    {id:'av-calculator',name:'AV Calculator',href:'av-calculator.html',dept:'Utility',phases:['advance','prep','loadin','show'],tag:'Math',desc:'Working calculation and summary panels with named field sets and configurable views.',storageKeys:[{key:'avCalculator.v1',label:'AV Calculator'},{key:'avCalculator.fieldSets.v1',label:'AV Calculator field sets'},{key:'avCalculator.views.v1',label:'AV Calculator stored views'},{key:'avCalculator.layout.v1',label:'AV Calculator device layout'}]},
    {id:'led-wall-calculator',name:'LED Wall Calculator',href:'led-wall-calculator.html',dept:'Utility',phases:['advance','prep','loadin','show'],tag:'LED',desc:'Cabinet-aware wall geometry, native raster, content fit, processor port, viewing, and power planning.',storageKeys:[{key:'avCalculator.ledProfiles.v1',label:'LED wall cabinet profiles'}]},
    {id:'ontrack',name:'OnTrack',href:'ontrack.html',dept:'Music',phases:['prep','show','closeout'],tag:'DJ',desc:'DJ set intelligence — rekordbox library import, planned vs played sets, tags, and per-track debrief notes.',storageKeys:[{key:'ontrack_v1',label:'OnTrack library, sets, and notes'}]}
  ];

  /* Per-phase recommendations shown by the console and the context dock. */
  var RECOMMENDED={
    advance:['show-advance','site-survey','breakout-room-matrix','crew-call','throwline','stageplotter','pixelforge','input-list'],
    prep:['gear-prep','gear-reference','truck-pack','cue-sheet','teleprompter','playback-check','pixelforge','audio-patch','video-patch','network-plan'],
    loadin:['load-in-plan','gear-reference','room-check','show-board','power-plan','line-check','display-plan','projection-plan','throwline','speaker-plan','show-task-board'],
    show:['teleprompter','show-timer','cue-sheet','show-board','show-task-board','breakout-room-matrix','pixelforge','record-log','comms-check','camera-shot-list'],
    strike:['strike-plan','truck-pack','cable-plan','show-task-board','crew-time-log'],
    closeout:['show-handoff','show-report','client-signoff','change-order','record-log','crew-time-log']
  };

  /* Universal-nav grouping (matches the homepage + All Tools directory).
     Coarser than tool.dept on purpose — ten browseable groups. */
  var NAV_DEPARTMENTS=[
    {label:'Show planning',toolIds:['show-advance','show-ops','show-task-board','show-handoff','show-report']},
    {label:'Run of show',toolIds:['show-control','teleprompter','show-timer','cue-sheet','playback-check','comms-check']},
    {label:'Graphics',toolIds:['pixelforge','playback-check','display-plan','projection-plan']},
    {label:'Audio',toolIds:['av-audio','audio-patch','line-check','input-list','speaker-plan','rf-coordination']},
    {label:'Video',toolIds:['av-video','display-plan','projection-plan','throwline','stream-plan','record-log','camera-shot-list']},
    {label:'Lighting',toolIds:['av-lighting','lighting-patch']},
    {label:'Power & data',toolIds:['infrastructure','power-plan','network-plan','cable-plan']},
    {label:'Spaces & staging',toolIds:['show-board','stageplotter','room-check','breakout-room-matrix','site-survey']},
    {label:'Logistics',toolIds:['the-shop','gear-prep','gear-reference','truck-pack','load-in-plan','strike-plan','show-advance']},
    {label:'Crew',toolIds:['crew-call','crew-time-log']},
    {label:'Show docs & client',toolIds:['front-office','show-handoff','show-report','show-task-board','change-order','client-signoff']},
    {label:'Calculators',toolIds:['av-calculator','led-wall-calculator']},
    {label:'Music',toolIds:['ontrack']}
  ];

  /* Compatibility routes normalize to their canonical local applications. */
  var ALIASES={};
  var ALIAS_FILES=['./plotforge.html'];

  /* Persisted suite state used `cueforge` before the browser tool was correctly
     separated from the Electron app. Normalize that legacy id on read only. */
  var ID_ALIASES={'cueforge':'cue-sheet','plotforge':'stageplotter'};

  /* Shared shell assets every offline session needs. */
  var BASE_ASSETS=[
    './av-suite-worker.js',
    './js/sbd-registry.js',
    './js/av-suite-context.js',
    './js/sbd-nav.js',
    './js/sbd-public-nav.js',
    './js/av-theme.js',
    './js/av-theme-mode.js',
    './js/sbd-handoff.js',
    './js/responsive-tables.js',
    './js/av-calculator.js',
    './js/av-calculator-viewport.js',
    './js/av-viewport.js',
    './js/av-stage-viewport.js',
    './css/av-stage-viewport.css',
    './js/av-logistics-viewport.js',
    './css/av-logistics-viewport.css',
    './js/av-cue-viewport.js',
    './css/av-cue-viewport.css',
    './js/av-worksheet-viewport.js',
    './css/av-worksheet-viewport.css',
    './js/av-board-viewport.js',
    './css/av-board-viewport.css',
    './css/av-viewport.css',
    './css/av-calculator-viewport.css',
    './js/led-workspace.js',
    './js/led-wall-viewer.js',
    './data/led-cabinet-catalog.v1.json',
    './js/vendor/gsap.min.js',
    './css/av-calculator.css',
    './ProjectorThrow/index.html',
    './ProjectorThrow/Stage3D.html',
    './ProjectorThrow/throwline-scene-state.js',
    './ProjectorThrow/three-d-stage.js',
    './ProjectorThrow/vendor/three/three.module.min.js',
    './ProjectorThrow/vendor/three/three.core.min.js',
    './ProjectorThrow/vendor/three/addons/controls/OrbitControls.js',
    './ProjectorThrow/vendor/three/addons/exporters/OBJExporter.js',
    './ProjectorThrow/vendor/three/addons/exporters/GLTFExporter.js',
    './ProjectorThrow/vendor/qrcode-generator/qrcode.js',
    './css/sbd-public-nav.css',
    './css/av-theme.css',
    './css/sbd-rail.css',
    './css/sbd-rail-dialogs.css',
    './js/sbd-rail.js',
    './js/sbd-rail-dialogs.js',
    './js/sbd-rail-mount.js',
    './js/av-offline.js',
    './css/responsive-tables.css',
    './css/fonts.css',
    './data/gear/index.json',
    './data/gear/epson-powerlite-x39.json',
    './data/gear/blackmagic-ursa-broadcast-g2.json',
    './data/gear/fujinon-4k-broadcast-zoom.json',
    './data/gear/blackmagic-camera-fiber-converter.json',
    './data/gear/blackmagic-studio-fiber-converter.json',
    './data/gear/blackmagic-atem-television-studio-hd8-iso.json',
    './data/gear/blackmagic-atem-camera-control-panel.json',
    './data/gear/birddog-p240.json',
    './data/gear/ptzoptics-superjoy-g1.json',
    './data/gear/figures/x39-chassis.svg',
    './data/gear/figures/x39-io.svg',
    './av/index.html',
    './av/assets/av-suite.js',
    './av/assets/av-suite.css',
    './av-video/index.html',
    './av-video/assets/av-video.js',
    './av-video/assets/av-video.css',
    './av-audio/index.html',
    './av-audio/assets/av-audio.js',
    './av-audio/assets/index.css',
    './show-control/index.html',
    './show-control/app.mjs',
    './show-control/model.mjs',
    './show-control/style.css',
    './show-control/assets/show-control.js',
    './show-control/assets/index.css',
    './show-ops/index.html',
    './show-ops/app.mjs',
    './show-ops/model.mjs',
    './show-ops/style.css',
    './show-ops/assets/show-ops.js',
    './show-ops/assets/index.css',
    './front-office/index.html',
    './front-office/theme-init.js',
    './front-office/app.mjs',
    './front-office/model.mjs',
    './front-office/style.css',
    './front-office/assets/front-office.js',
    './front-office/assets/index.css',
    './the-shop/index.html',
    './the-shop/shop.mjs',
    './the-shop/model.mjs',
    './the-shop/shop.css',
    './the-shop/assets/the-shop.js',
    './the-shop/assets/index.css',
    './infrastructure/index.html',
    './infrastructure/app.mjs',
    './infrastructure/model.mjs',
    './infrastructure/style.css',
    './infrastructure/assets/infrastructure.js',
    './infrastructure/assets/index.css',
    './av-lighting/index.html',
    './av-lighting/lighting.js',
    './av-lighting/lighting.css',
    './av-lighting/assets/av-lighting.js',
    './av-lighting/assets/index.css',
    './js/av-calculator-field-sets.js',
    './av-calculator/assets/av-calculator.js',
    './av-calculator/assets/main.css',
    './pixelforge/',
    './pixelforge/index.html',
    './pixelforge/editor.html',
    './pixelforge/home.html',
    './pixelforge/templates.html',
    './pixelforge/guide.html',
    './pixelforge/onboarding.html',
    './pixelforge/brand.html',
    './pixelforge/og-image.svg',
    './pixelforge/assets/favicon-DcoFR1vW.svg',
    './pixelforge/assets/imageEffectsWorker-DYpHDSGw.js',
    './pixelforge/assets/index-CrzKMytk.css',
    './pixelforge/assets/index-DmbrXj61.js',
    './pixelforge/assets/ai-CBLG0OHf.js',
    './pixelforge/assets/sdk-B-fUwnrA.js',
    './svg/system_by_dave_logo_rust.svg',
    './img/card-cover-banner-wide.png',
    './manifest.json',
    './fonts/dm-sans.woff2',
    './fonts/dm-serif-display.woff2',
    './fonts/dm-serif-display-italic.woff2',
    './fonts/jetbrains-mono.woff2',
    './fonts/syne-800.woff2',
    './fonts/space-grotesk.woff2',
    './fonts/space-mono.woff2',
    './fonts/space-mono-bold.woff2'
  ];

  /* Application identities recovered from AV Suite Prototype v3. Availability
     means that the published primary application can be opened from the Rail;
     it does not imply physical-device or operator acceptance. */
  var CONSOLES=[
    {id:'av-video',prototypeId:'video',label:'AV Video',availability:'available',toolId:'av-video',panelGroup:'Common',draftKey:'sbd.avVideo.draft.v1',layoutKey:'sbd.avVideo.layout.v1',icon:['m16 9 5-3v12l-5-3z','M3 6h13v12H3z']},
    {id:'audio',prototypeId:'audio',label:'Audio',availability:'available',toolId:'av-audio',panelGroup:'Common',icon:['M4 10v4','M8 6v12','M12 3v18','M16 7v10','M20 10v4']},
    {id:'show-control',prototypeId:'showcontrol',label:'Show Control',availability:'available',toolId:'show-control',panelGroup:'Common',icon:['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z','M10 8.5v7l5.5-3.5z']},
    {id:'show-ops',prototypeId:'showops',label:'Show Ops',availability:'available',toolId:'show-ops',panelGroup:'Common',draftKey:'sbd.showOps.draft.v1',layoutKey:'sbd.showOps.layout.v1',icon:['M3 5h18v16H3z','M3 10h18','M8 3v4','M16 3v4','M7 14h5','M10 17h7']},
    {id:'front-office',prototypeId:'office',label:'Front Office',availability:'available',toolId:'front-office',panelGroup:'Planning',draftKey:'sbd.frontOffice.draft.v1',layoutKey:'sbd.frontOffice.layout.v1',icon:['M5 4h14v17H5z','M9 4V2h6v2','m9 13 2 2 4-4']},
    {id:'shop',prototypeId:'shop',label:'The Shop',availability:'available',toolId:'the-shop',panelGroup:'Planning',draftKey:'sbd.shop.draft.v1',layoutKey:'sbd.shop.layout.v1',icon:['M4 4h16v13H4z','M4 9h16','M10 12h4','M8 18.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z','M16 18.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z']},
    {id:'infrastructure',prototypeId:'infra',label:'Infrastructure',availability:'available',toolId:'infrastructure',panelGroup:'Planning',draftKey:'sbd.infrastructure.draft.v1',layoutKey:'sbd.infrastructure.layout.v1',icon:['M13 2 4 14h7l-1 8 9-12h-7z']},
    {id:'lighting',prototypeId:'lighting',label:'Lighting',availability:'available',toolId:'av-lighting',panelGroup:'Utilities',draftKey:'sbd.avLighting.draft.v1',layoutKey:'sbd.avLighting.layout.v1',icon:['M9 18h6','M10 21h4','M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.6 1 2.5h6c0-.9.2-1.7 1-2.5A6 6 0 0 0 12 3z']},
    {id:'av-calculator',prototypeId:'calc',label:'AV Calculator',availability:'available',toolId:'av-calculator',panelGroup:'Utilities',icon:['M5 3h14v18H5z','M8 7h8v3H8z','M8 14h2','M11 14h2','M14 14h2','M8 17.5h2','M11 17.5h2','M14 17.5h2']}
  ];

  var RAIL={
    defaultPinned:[
      'console:av-video',
      'console:audio',
      'console:show-control',
      'console:show-ops',
      'console:front-office',
      'console:shop',
      'console:infrastructure',
      'console:lighting',
      'console:av-calculator'
    ]
  };

  /* External product identities never enter the tool inventory. A handoff has
     a verified destination; a status record is intentionally non-navigable. */
  var EXTERNALS=[
    {id:'cueforge',label:'CueForge',kind:'handoff',destination:'https://systembydave.com/cueforge.html',badge:'Desktop app'},
    {id:'plotforge',label:'PlotForge',kind:'handoff',destination:'plotforge.html',badge:'Own app'},
    {id:'housevideo',label:'House Video / FMP',kind:'handoff',destination:'https://housevideo.app/',badge:'Link out'},
    {id:'arenaops',label:'Arena Ops',kind:'status',badge:'API pending'},
    {id:'deckforge',label:'DeckForge + Stream Deck',kind:'status',badge:'Control surface'}
  ];

  function offlineAssets(){
    var seen={};
    /* Retired sheet pages are redirect stubs (docs/av-suite-shell.md): reachable
       online, not part of the offline suite. */
    return BASE_ASSETS
      .concat(TOOLS.filter(function(tool){return !tool.retired;}).map(function(tool){return './'+tool.href;}))
      .concat(ALIAS_FILES)
      .filter(function(asset){
        asset=String(asset||'').trim();
        if(!asset||seen[asset]) return false;
        seen[asset]=true;
        return true;
      });
  }

  function normalizeToolId(id){
    id=String(id||'');
    return ID_ALIASES[id]||id;
  }

  function toolById(id){
    id=normalizeToolId(id);
    for(var i=0;i<TOOLS.length;i++){if(TOOLS[i].id===id) return TOOLS[i];}
    return null;
  }

  function externalById(id){
    id=String(id||'');
    for(var i=0;i<EXTERNALS.length;i++){if(EXTERNALS[i].id===id) return EXTERNALS[i];}
    return null;
  }

  root.SBD_REGISTRY={
    /* Bump on any registry/tool asset change — rolls the service-worker cache. */
    version:'v20261018-visibility-compatibility',
    phases:PHASES,
    tools:TOOLS,
    recommended:RECOMMENDED,
    navDepartments:NAV_DEPARTMENTS,
    consoles:CONSOLES,
    rail:RAIL,
    externals:EXTERNALS,
    aliases:ALIASES,
    idAliases:ID_ALIASES,
    baseAssets:BASE_ASSETS,
    offlineAssets:offlineAssets,
    toolById:toolById,
    normalizeToolId:normalizeToolId,
    externalById:externalById
  };
})(typeof self!=='undefined'?self:this);
