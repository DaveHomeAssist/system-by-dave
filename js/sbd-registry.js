/* System by Dave — canonical AV tool registry (single source of truth).
   Consumed by: av-suite.html (operator console), js/sbd-nav.js (universal tool
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
    {id:'av-workbook',name:'AV Workbook',href:'av-workbook/',dept:'Workbook',phases:['advance','prep','loadin','show','strike','closeout'],tag:'Show File',desc:'Shared show workbook for rooms, crew, gear, signal sources, patching, validation, and handoff state.',storageKeys:[{key:'system-by-dave.av-workbook.active.v1',label:'AV Workbook active workbook'},{key:'system-by-dave.av-workbook.fallback.v1',label:'AV Workbook fallback'}]},
    {id:'teleprompter',name:'Teleprompter',href:'teleprompter.html',dept:'Show Flow',phases:['prep','show'],tag:'Script',desc:'Script reader with formatting, saved scripts, cues, remote mode, rundown, and a compact read view.',storageKeys:[{key:'teleprompter.v1',label:'Teleprompter state'},{key:'teleprompter.script.v1',label:'Teleprompter script'},{key:'teleprompter.preferences.v1',label:'Teleprompter preferences'},{key:'teleprompter.savedScripts.v1',label:'Teleprompter saved scripts'},{key:'teleprompter.savedFormats.v1',label:'Teleprompter saved looks'},{key:'teleprompter.pacePresets.v1',label:'Teleprompter saved paces'},{key:'teleprompter.bookmarks.v1',label:'Teleprompter bookmarks'},{key:'teleprompter.customColors.v1',label:'Teleprompter custom colors'}]},
    {id:'show-timer',name:'Show Timer',href:'show-timer.html',dept:'Show Flow',phases:['prep','show'],tag:'Clock',desc:'Countdown, count up, clock mode, stage view, warning states, and keyboard control.',storageKeys:[{key:'showTimer.preferences.v1',label:'Show Timer preferences'}]},
    {id:'cue-sheet',name:'Cue Sheet',href:'cue-sheet.html',dept:'Show Flow',phases:['advance','prep','show'],tag:'Cues',desc:'Browser based rundown control with preview, lightweight layered playback, monitor output, capture inputs, print, JSON, and CSV.',storageKeys:[{key:'cueSheet.v1',label:'Cue Sheet state'}]},
    {id:'playback-check',name:'Playback Check',href:'playback-check.html',dept:'Playback',phases:['prep','show'],tag:'Media',desc:'Playback file checklist with routes, backups, duration, ready state, and export.',storageKeys:[{key:'playback-check.v1',label:'Playback Check'}]},
    {id:'pixelforge',name:'PixelForge',href:'pixelforge/',dept:'Graphics',phases:['advance','prep','show','closeout'],tag:'Graphics',desc:'Raster, vector, text, and image-editing workspace for show graphics, signage fixes, simple overlays, and PNG export.',storageKeys:[{key:'PixelForge.prefs.v1',label:'PixelForge preferences'},{key:'pf:palettes:v1',label:'PixelForge palettes'}],toolboxFeatured:true},
    {id:'record-log',name:'Record Log',href:'record-log.html',dept:'Playback',phases:['show','closeout'],tag:'Record',desc:'Program records, camera ISOs, audio captures, media destinations, backup status, and handoff notes.',storageKeys:[{key:'record-log.v1',label:'Record Log'}]},
    {id:'stream-plan',name:'Stream Plan',href:'stream-plan.html',dept:'Streaming',phases:['advance','prep','show'],tag:'Stream',desc:'Encoder, platform, destination, bitrate, audio, record, backup, and test tracking.',storageKeys:[{key:'sbd.streamPlan.v1',label:'Stream Plan'}]},
    {id:'show-advance',name:'Show Advance',href:'show-advance.html',dept:'Planning',phases:['advance'],tag:'Advance',desc:'Contacts, access, schedule, power, network, labor, deliverables, risks, and open questions.',storageKeys:[{key:'show-advance.v1',label:'Show Advance'}]},
    {id:'site-survey',name:'Site Survey',href:'site-survey.html',dept:'Planning',phases:['advance'],tag:'Venue',desc:'Venue access, loading, rooms, power, rigging, network, safety, contacts, and findings.',storageKeys:[{key:'site-survey.v1',label:'Site Survey'}]},
    {id:'crew-call',name:'Crew Call',href:'crew-call.html',dept:'Labor',phases:['advance','prep','show'],tag:'Crew',desc:'Departments, names, roles, call times, locations, meal breaks, release times, and phone numbers.',storageKeys:[{key:'crew-call.v1',label:'Crew Call'}]},
    {id:'crew-time-log',name:'Crew Time Log',href:'crew-time-log.html',dept:'Labor',phases:['show','closeout'],tag:'Time',desc:'Actual check in, meals, release times, hour totals, issues, and export.',storageKeys:[{key:'crew-time-log.v1',label:'Crew Time Log'}]},
    {id:'room-check',name:'Room Check',href:'room-check.html',dept:'Rooms',phases:['loadin','show'],tag:'Rooms',desc:'Room readiness by area, owner, priority, deadline, status, blocker, and notes.',storageKeys:[{key:'room-check.v1',label:'Room Check'}]},
    {id:'breakout-room-matrix',name:'Breakout Room Matrix',href:'breakout-room-matrix.html',dept:'Rooms',phases:['advance','prep','show'],tag:'Matrix',desc:'Breakout schedules, tracks, techs, producers, audio, video, network, power, readiness, and blockers.',storageKeys:[{key:'breakout-room-matrix.v1',label:'Breakout Room Matrix'}]},
    {id:'show-board',name:'Show Board',href:'show-board.html',dept:'Rooms',phases:['prep','loadin','show'],tag:'Live Rooms',desc:'Timeline-first room-turn board with readiness checks, active issues, pinch windows, sign-text import, and rolling local backups.',storageKeys:[]},
    {id:'show-task-board',name:'Show Task Board',href:'show-task-board.html',dept:'Rooms',phases:['loadin','show','strike'],tag:'Tasks',desc:'Show day tasks, area, owner, priority, due time, source, blocker, status counts, and handoff summaries.',storageKeys:[{key:'show-task-board.v1',label:'Show Task Board'}]},
    {id:'show-handoff',name:'Show Handoff',href:'show-handoff.html',dept:'Closeout',phases:['show','closeout'],tag:'Handoff',desc:'A concise show transfer builder for status, signal flow, crew notes, risks, and next actions.',storageKeys:[{key:'show-handoff.v1',label:'Show Handoff'}]},
    {id:'show-report',name:'Show Report',href:'show-report.html',dept:'Closeout',phases:['closeout'],tag:'Report',desc:'Timeline, issues, client requests, decisions, crew notes, follow ups, severity, and status.',storageKeys:[{key:'show-report.v1',label:'Show Report'}]},
    {id:'change-order',name:'Change Order',href:'change-order.html',dept:'Client',phases:['show','closeout'],tag:'Change',desc:'Client scope requests, approval, cost impact, owners, due times, issue state, and notes.',storageKeys:[{key:'change-order.v1',label:'Change Order'}]},
    {id:'client-signoff',name:'Client Sign Off',href:'client-signoff.html',dept:'Client',phases:['closeout'],tag:'Signoff',desc:'Acceptance items, approvers, signed times, exceptions, follow ups, owners, and notes.',storageKeys:[{key:'client-signoff.v1',label:'Client Sign Off'}]},
    {id:'input-list',name:'Input List',href:'input-list.html',dept:'Audio',phases:['advance','prep','show'],tag:'Inputs',desc:'Input list and patch prep with channels, line checks, filters, print, JSON, and CSV.',storageKeys:[{key:'input-list.v1',label:'Input List'}]},
    {id:'audio-patch',name:'Audio Patch',href:'audio-patch.html',dept:'Audio',phases:['prep','loadin','show'],tag:'Audio',desc:'Console channels, sources, stageboxes, inputs, phantom, gain, destinations, monitor sends, and gaps.',storageKeys:[{key:'audio-patch.v1',label:'Audio Patch'}]},
    {id:'line-check',name:'Line Check',href:'line-check.html',dept:'Audio',phases:['loadin','show'],tag:'Check',desc:'Channels, sources, locations, techs, console labels, destinations, talkback, problems, and status.',storageKeys:[{key:'line-check.v1',label:'Line Check'}]},
    {id:'speaker-plan',name:'Speaker Plan',href:'speaker-plan.html',dept:'Audio',phases:['advance','prep','loadin'],tag:'PA',desc:'Zones, loudspeakers, processor outputs, amps, cable paths, trim, delay, coverage, and backup routes.',storageKeys:[{key:'sbd.speakerPlan.v1',label:'Speaker Plan'}]},
    {id:'power-plan',name:'Power Plan',href:'power-plan.html',dept:'Power',phases:['advance','prep','loadin'],tag:'Power',desc:'Circuits, sources, room locations, load estimates, capacity, draw, headroom, backups, and issues.',storageKeys:[{key:'power-plan.v1',label:'Power Plan'}]},
    {id:'network-plan',name:'Network Plan',href:'network-plan.html',dept:'Network',phases:['advance','prep','loadin','show'],tag:'Network',desc:'Show control, audio, video, comms, internet, IPs, VLANs, switch ports, backups, and issues.',storageKeys:[{key:'network-plan.v1',label:'Network Plan'}]},
    {id:'signal-flow',name:'Signal Flow',href:'signal-flow.html',dept:'Video',phases:['advance','prep','loadin'],tag:'Routes',desc:'Sources, processors, destinations, formats, connectors, backups, route status, and issues.',storageKeys:[{key:'signal-flow.v1',label:'Signal Flow'}]},
    {id:'video-patch',name:'Video Patch',href:'video-patch.html',dept:'Video',phases:['prep','loadin','show'],tag:'Video',desc:'Sources, formats, connectors, switcher inputs, converters, destinations, routes, backups, and tests.',storageKeys:[{key:'sbd.videoPatch.v1',label:'Video Patch'}]},
    {id:'display-plan',name:'Display Plan',href:'display-plan.html',dept:'Video',phases:['advance','prep','loadin'],tag:'Displays',desc:'Displays, inputs, processors, resolutions, aspect ratios, refresh rates, routes, backups, and status.',storageKeys:[{key:'display-plan.v1',label:'Display Plan'}]},
    {id:'projection-plan',name:'Projection Plan',href:'projection-plan.html',dept:'Video',phases:['advance','prep','loadin'],tag:'Projection',desc:'Screens, surfaces, projectors, lenses, throw, positions, routes, blends, backup paths, and alignment.',storageKeys:[{key:'sbd.projectionPlan.v1',label:'Projection Plan'}]},
    {id:'throwline',name:'Throwline',href:'ProjectorThrow/',dept:'Video',phases:['advance','prep','loadin','show'],tag:'Projection',desc:'Offline projector throw, fit, brightness, field verification, spatial room planning, multi-projector layouts, drawings, and show handoff.',storageKeys:[{key:'throwline:lenses:v2',label:'Throwline custom lenses'},{key:'throwline:jobs:v2',label:'Throwline saved jobs'},{key:'throwline:shift-profiles:v1',label:'Throwline shift profiles'},{key:'throwline:inventory:v1',label:'Throwline crew inventory'},{key:'throwline:show:v1',label:'Throwline current show'},{key:'throwline:stage-scene:v1',label:'Throwline Stage scenes'},{key:'throwline:stage-onboarding:v1',label:'Throwline Stage onboarding'},{key:'throwline:theme:v1',label:'Throwline theme'}],toolboxFeatured:true},
    {id:'lighting-patch',name:'Lighting Patch',href:'lighting-patch.html',dept:'Lighting',phases:['advance','prep','loadin','show'],tag:'LX',desc:'Fixtures, positions, modes, universes, addresses, channels, dimmers, colors, focus notes, and status.',storageKeys:[{key:'lighting-patch.v1',label:'Lighting Patch'}]},
    {id:'cable-plan',name:'Cable Plan',href:'cable-plan.html',dept:'Build',phases:['prep','loadin','strike'],tag:'Cable',desc:'Cable types, lengths, source, destination, path, labels, owners, pull status, trip, and slack issues.',storageKeys:[{key:'cable-plan.v1',label:'Cable Plan'}]},
    {id:'rf-coordination',name:'RF Coordination',href:'rf-coordination.html',dept:'Comms',phases:['advance','prep','show'],tag:'RF',desc:'Wireless mics, IEM, IFB, comms packs, receivers, frequencies, bands, conflicts, and backups.',storageKeys:[{key:'rf-coordination.v1',label:'RF Coordination'}]},
    {id:'comms-check',name:'Comms Check',href:'comms-check.html',dept:'Comms',phases:['prep','show'],tag:'Comms',desc:'Intercom, radio, and IFB assignments with channels, devices, battery, backups, and issue flags.',storageKeys:[{key:'comms-check.v1',label:'Comms Check'}]},
    {id:'camera-shot-list',name:'Camera Shot List',href:'camera-shot-list.html',dept:'Camera',phases:['advance','prep','show'],tag:'Camera',desc:'Camera plan with shot rows, framing, movement, presets, ready and problem status, and take next.',storageKeys:[{key:'camera-shot-list.v1',label:'Camera Shot List'}]},
    {id:'stageplotter',name:'StagePlotter',href:'stage-plot.html',dept:'Planning',phases:['advance','prep','loadin'],tag:'Room Plot',desc:'Offline-capable room layout sketcher with illustrated stages, screens, cameras, speakers, mics, furniture, power, people, and cable paths.',storageKeys:[{key:'stage-plot.v1',label:'StagePlotter'}]},
    {id:'gear-prep',name:'Gear Prep',href:'gear-prep.html',dept:'Logistics',phases:['prep'],tag:'Gear',desc:'Pull sheets, case IDs, quantities, departments, owners, test, pack, load, issues, and open items.',storageKeys:[{key:'gear-prep.v1',label:'Gear Prep'}]},
    {id:'gear-reference',name:'Gear Reference',href:'gear-reference.html',dept:'Logistics',phases:['prep','loadin'],tag:'Reference',desc:'Offline per-device field sheets with specifications, schematics, procedures, consumables, intake checks, and source confidence.',storageKeys:[],toolboxFeatured:true},
    {id:'truck-pack',name:'Truck Pack Plan',href:'truck-pack.html',dept:'Logistics',phases:['prep','loadin','strike'],tag:'Truck',desc:'Cases, truck zones, load order, unload order, weights, owners, pack status, and issues.',storageKeys:[{key:'truck-pack.v1',label:'Truck Pack Plan'}]},
    {id:'load-in-plan',name:'Load In Plan',href:'load-in-plan.html',dept:'Logistics',phases:['loadin'],tag:'Load In',desc:'Trucks, docks, destinations, departments, items, owners, due times, build status, blockers, and gaps.',storageKeys:[{key:'load-in-plan.v1',label:'Load In Plan'}]},
    {id:'strike-plan',name:'Strike Plan',href:'strike-plan.html',dept:'Logistics',phases:['strike'],tag:'Strike',desc:'Departments, strike items, locations, owners, case IDs, destinations, load out status, missing gear, and issues.',storageKeys:[{key:'strike-plan.v1',label:'Strike Plan'}]},
    {id:'av-calculator',name:'AV Calculator',href:'av-calculator.html',dept:'Utility',phases:['advance','prep','loadin','show'],tag:'Math',desc:'Audio delay, projection throw, record storage, and power load checks with copyable summaries.',storageKeys:[{key:'avCalculator.v1',label:'AV Calculator'}],toolboxFeatured:true},
    {id:'ontrack',name:'OnTrack',href:'ontrack.html',dept:'Music',phases:['prep','show','closeout'],tag:'DJ',desc:'DJ set intelligence — rekordbox library import, planned vs played sets, tags, and per-track debrief notes.',storageKeys:[{key:'ontrack_v1',label:'OnTrack library, sets, and notes'}]}
  ];

  /* Per-phase recommendations shown by the console and the context dock. */
  var RECOMMENDED={
    advance:['av-workbook','show-advance','site-survey','breakout-room-matrix','crew-call','throwline','stageplotter','pixelforge','input-list'],
    prep:['av-workbook','gear-prep','gear-reference','truck-pack','cue-sheet','teleprompter','playback-check','pixelforge','audio-patch','video-patch','network-plan'],
    loadin:['av-workbook','load-in-plan','gear-reference','room-check','show-board','power-plan','line-check','display-plan','projection-plan','throwline','speaker-plan','show-task-board'],
    show:['av-workbook','teleprompter','show-timer','cue-sheet','show-board','show-task-board','breakout-room-matrix','pixelforge','record-log','comms-check','camera-shot-list'],
    strike:['av-workbook','strike-plan','truck-pack','cable-plan','show-task-board','crew-time-log'],
    closeout:['av-workbook','show-handoff','show-report','client-signoff','change-order','record-log','crew-time-log']
  };

  /* Universal-nav grouping (matches the homepage + All Tools directory).
     Coarser than tool.dept on purpose — ten browseable groups. */
  var NAV_DEPARTMENTS=[
    {label:'Workbook',toolIds:['av-workbook','show-advance','show-task-board','show-handoff','show-report']},
    {label:'Run of show',toolIds:['teleprompter','show-timer','cue-sheet','playback-check','comms-check']},
    {label:'Graphics',toolIds:['pixelforge','playback-check','display-plan','projection-plan']},
    {label:'Audio',toolIds:['audio-patch','line-check','input-list','signal-flow','speaker-plan','rf-coordination']},
    {label:'Video',toolIds:['video-patch','display-plan','projection-plan','throwline','stream-plan','record-log','camera-shot-list']},
    {label:'Lighting',toolIds:['lighting-patch']},
    {label:'Power & data',toolIds:['power-plan','network-plan','cable-plan']},
    {label:'Spaces & staging',toolIds:['show-board','stageplotter','room-check','breakout-room-matrix','site-survey']},
    {label:'Logistics',toolIds:['gear-prep','gear-reference','truck-pack','load-in-plan','strike-plan','show-advance']},
    {label:'Crew',toolIds:['crew-call','crew-time-log']},
    {label:'Show docs & client',toolIds:['show-handoff','show-report','show-task-board','change-order','client-signoff']},
    {label:'Calculators',toolIds:['av-calculator']},
    {label:'Music',toolIds:['ontrack']}
  ];

  /* Compatibility routes normalize to their canonical local applications. */
  var ALIASES={'av-workbook.html':'av-workbook/','av-workbook/index.html':'av-workbook/'};
  var ALIAS_FILES=['./plotforge.html'];

  /* Persisted suite state used `cueforge` before the browser tool was correctly
     separated from the Electron app. Normalize that legacy id on read only. */
  var ID_ALIASES={'cueforge':'cue-sheet','plotforge':'stageplotter'};

  /* Shared shell assets every offline session needs. */
  var BASE_ASSETS=[
    './av-suite.html',
    './av-suite-worker.js',
    './js/sbd-registry.js',
    './js/av-suite-context.js',
    './js/sbd-nav.js',
    './js/sbd-public-nav.js',
    './js/av-theme.js',
    './js/av-theme-mode.js',
    './js/sbd-handoff.js',
    './js/responsive-tables.js',
    './js/av-domain-views.js',
    './js/vendor/gsap.min.js',
    './ProjectorThrow/index.html',
    './ProjectorThrow/Stage3D.html',
    './ProjectorThrow/throwline-scene-state.js',
    './ProjectorThrow/three-d-stage.js',
    './ProjectorThrow/vendor/three/three.module.js',
    './ProjectorThrow/vendor/three/three.core.js',
    './ProjectorThrow/vendor/three/addons/controls/OrbitControls.js',
    './ProjectorThrow/vendor/three/addons/exporters/OBJExporter.js',
    './ProjectorThrow/vendor/three/addons/exporters/GLTFExporter.js',
    './css/sbd-public-nav.css',
    './css/av-theme.css',
    './css/responsive-tables.css',
    './css/av-domain-views.css',
    './css/fonts.css',
    './data/gear/index.json',
    './data/gear/epson-powerlite-x39.json',
    './data/gear/figures/x39-chassis.svg',
    './data/gear/figures/x39-io.svg',
    './av-workbook.html',
    './av-workbook/index.html',
    './av-workbook/assets/av-workbook.js',
    './av-workbook/assets/av-workbook.css',
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

  /* Console family taxonomy (av-suite.html rail navigation only — a coarser,
     14-group alternative to NAV_DEPARTMENTS above, purpose-built for the
     AV Suite console's left rail + "All tools" grid). av-workbook is
     deliberately NOT a member of any family — it renders as the console's
     always-visible "Show file / Spine" rail entry instead. `subs` (only on
     teleprompter, throwline, av-calculator) are informational mode/citation
     chips shown when a tool row is expanded — not separate routes. */
  var CONSOLE_FAMILIES=[
    {id:'planning',label:'Planning',depts:'Planning',icon:['M9 2h6v4H9z','M9 4H6a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-3','m9 13 2 2 4-4'],toolIds:['show-advance','site-survey','stageplotter','breakout-room-matrix']},
    {id:'runofshow',label:'Run of show',depts:'Show Flow',icon:['M8 5.14v14l11-7z'],toolIds:['cue-sheet','teleprompter','show-timer'],subs:{teleprompter:[{label:'Read view',kind:'Mode',source:'Saved looks, this browser'},{label:'Remote',kind:'Mode',source:'Second-screen driver'},{label:'Rundown',kind:'Mode',source:'WPM pace presets'},{label:'Bookmarks',kind:'Mode',source:'Marker set, per script'}]}},
    {id:'audio',label:'Audio',depts:'Audio',icon:['M2 12h1','M6 8v8','M10 4v16','M14 7v10','M18 10v4','M21 12h1'],toolIds:['input-list','audio-patch','line-check','speaker-plan']},
    {id:'video',label:'Video',depts:'Video · Streaming · Playback',icon:['m16 9 5-3v12l-5-3z','M3 6h13v12H3z'],toolIds:['signal-flow','video-patch','display-plan','projection-plan','throwline','stream-plan','record-log','playback-check','camera-shot-list'],subs:{throwline:[{label:'Throw & fit',kind:'Calc',source:'Manufacturer lens spec sheets'},{label:'Brightness',kind:'Calc',source:'ANSI/INFOCOMM 3M-2011 contrast'},{label:'Field verify',kind:'Check',source:'Measured on-site reading'},{label:'Drawings',kind:'Output',source:'ANSI D print validation'}]}},
    {id:'lighting',label:'Lighting',depts:'Lighting',icon:['M9 18h6','M10 22h4','M12 2a7 7 0 0 0-4 12.7c.6.6 1 1.4 1 2.3h6c0-.9.4-1.7 1-2.3A7 7 0 0 0 12 2z'],toolIds:['lighting-patch']},
    {id:'power',label:'Power & data',depts:'Power · Network · Build',icon:['M13 2 4 14h7l-1 8 9-12h-7z'],toolIds:['power-plan','network-plan','cable-plan']},
    {id:'comms',label:'Comms & RF',depts:'Comms',icon:['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z','M19 10v2a7 7 0 0 1-14 0v-2','M12 19v3'],toolIds:['rf-coordination','comms-check']},
    {id:'spaces',label:'Spaces',depts:'Rooms',icon:['M3 3h8v8H3z','M13 3h8v5h-8z','M13 10h8v11h-8z','M3 13h8v8H3z'],toolIds:['show-board','room-check']},
    {id:'logistics',label:'Logistics',depts:'Logistics',icon:['M3 6h11v10H3z','M14 9h4l3 3v4h-7z','M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z','M17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'],toolIds:['gear-prep','gear-reference','truck-pack','load-in-plan','strike-plan']},
    {id:'crew',label:'Crew',depts:'Labor',icon:['M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2','M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M22 20v-2a4 4 0 0 0-3-3.9','M16 3.1a4 4 0 0 1 0 7.8'],toolIds:['crew-call','crew-time-log']},
    {id:'docs',label:'Docs & client',depts:'Closeout · Client · Rooms',icon:['M15 2H6a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6z','M14 2v5h5','m9 14 2 2 4-4'],toolIds:['show-task-board','show-handoff','show-report','change-order','client-signoff']},
    {id:'graphics',label:'Graphics',depts:'Graphics',icon:['M3 4h18v16H3z','M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z','m21 15-5-5L3 20'],toolIds:['pixelforge']},
    {id:'calc',label:'Calculators',depts:'Utility',icon:['M5 2h14v20H5z','M8 6h8','M8 11h.01','M12 11h.01','M16 11h.01','M8 15h.01','M12 15h.01','M16 15v4'],toolIds:['av-calculator'],subs:{'av-calculator':[{label:'Audio delay',kind:'Calc',source:'343 m/s at 20°C, dry air'},{label:'Projection throw',kind:'Calc',source:'Manufacturer lens ratio'},{label:'Record storage',kind:'Calc',source:'Codec bitrate tables'},{label:'Power load',kind:'Calc',source:'NEC 210.20(A) 80% rule'}]}},
    {id:'music',label:'Music',depts:'Music · outside AV scope',icon:['M9 18V5l12-2v13','M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z','M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],toolIds:['ontrack']}
  ];

  function offlineAssets(){
    var seen={};
    return BASE_ASSETS
      .concat(TOOLS.map(function(tool){return './'+tool.href;}))
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

  root.SBD_REGISTRY={
    /* Bump on any registry/tool change — rolls the service-worker cache. */
    version:'v20260905-throwline-shift-catalog',
    phases:PHASES,
    tools:TOOLS,
    recommended:RECOMMENDED,
    navDepartments:NAV_DEPARTMENTS,
    consoleFamilies:CONSOLE_FAMILIES,
    aliases:ALIASES,
    idAliases:ID_ALIASES,
    baseAssets:BASE_ASSETS,
    offlineAssets:offlineAssets,
    toolById:toolById,
    normalizeToolId:normalizeToolId
  };
})(typeof self!=='undefined'?self:this);
