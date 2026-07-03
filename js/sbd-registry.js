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
    {id:'teleprompter',name:'Teleprompter',href:'teleprompter.html',dept:'Show Flow',phases:['prep','show'],tag:'Script',desc:'Script reader with formatting, saved scripts, cues, remote mode, rundown, and a compact read view.',storageKeys:[{key:'teleprompter.v1',label:'Teleprompter state'},{key:'teleprompter.script.v1',label:'Teleprompter script'},{key:'teleprompter.preferences.v1',label:'Teleprompter preferences'},{key:'teleprompter.savedScripts.v1',label:'Teleprompter saved scripts'},{key:'teleprompter.savedFormats.v1',label:'Teleprompter saved looks'},{key:'teleprompter.customColors.v1',label:'Teleprompter custom colors'}]},
    {id:'show-timer',name:'Show Timer',href:'show-timer.html',dept:'Show Flow',phases:['prep','show'],tag:'Clock',desc:'Countdown, count up, clock mode, stage view, warning states, and keyboard control.',storageKeys:[{key:'showTimer.preferences.v1',label:'Show Timer preferences'}]},
    {id:'cueforge',name:'CueForge',href:'cueforge.html',dept:'Show Flow',phases:['advance','prep','show'],tag:'Cues',desc:'Run of show cue control with next actions, status tracking, print, JSON, and CSV.',storageKeys:[{key:'cueSheet.v1',label:'CueForge cue sheet'}]},
    {id:'playback-check',name:'Playback Check',href:'playback-check.html',dept:'Playback',phases:['prep','show'],tag:'Media',desc:'Playback file checklist with routes, backups, duration, ready state, and export.',storageKeys:[{key:'playback-check.v1',label:'Playback Check'}]},
    {id:'record-log',name:'Record Log',href:'record-log.html',dept:'Playback',phases:['show','closeout'],tag:'Record',desc:'Program records, camera ISOs, audio captures, media destinations, backup status, and handoff notes.',storageKeys:[{key:'record-log.v1',label:'Record Log'}]},
    {id:'stream-plan',name:'Stream Plan',href:'stream-plan.html',dept:'Streaming',phases:['advance','prep','show'],tag:'Stream',desc:'Encoder, platform, destination, bitrate, audio, record, backup, and test tracking.',storageKeys:[{key:'sbd.streamPlan.v1',label:'Stream Plan'}]},
    {id:'show-advance',name:'Show Advance',href:'show-advance.html',dept:'Planning',phases:['advance'],tag:'Advance',desc:'Contacts, access, schedule, power, network, labor, deliverables, risks, and open questions.',storageKeys:[{key:'show-advance.v1',label:'Show Advance'}]},
    {id:'site-survey',name:'Site Survey',href:'site-survey.html',dept:'Planning',phases:['advance'],tag:'Venue',desc:'Venue access, loading, rooms, power, rigging, network, safety, contacts, and findings.',storageKeys:[{key:'site-survey.v1',label:'Site Survey'}]},
    {id:'crew-call',name:'Crew Call',href:'crew-call.html',dept:'Labor',phases:['advance','prep','show'],tag:'Crew',desc:'Departments, names, roles, call times, locations, meal breaks, release times, and phone numbers.',storageKeys:[{key:'crew-call.v1',label:'Crew Call'}]},
    {id:'crew-time-log',name:'Crew Time Log',href:'crew-time-log.html',dept:'Labor',phases:['show','closeout'],tag:'Time',desc:'Actual check in, meals, release times, hour totals, issues, and export.',storageKeys:[{key:'crew-time-log.v1',label:'Crew Time Log'}]},
    {id:'room-check',name:'Room Check',href:'room-check.html',dept:'Rooms',phases:['loadin','show'],tag:'Rooms',desc:'Room readiness by area, owner, priority, deadline, status, blocker, and notes.',storageKeys:[{key:'room-check.v1',label:'Room Check'}]},
    {id:'breakout-room-matrix',name:'Breakout Room Matrix',href:'breakout-room-matrix.html',dept:'Rooms',phases:['advance','prep','show'],tag:'Matrix',desc:'Breakout schedules, tracks, techs, producers, audio, video, network, power, readiness, and blockers.',storageKeys:[{key:'breakout-room-matrix.v1',label:'Breakout Room Matrix'}]},
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
    {id:'lighting-patch',name:'Lighting Patch',href:'lighting-patch.html',dept:'Lighting',phases:['advance','prep','loadin','show'],tag:'LX',desc:'Fixtures, positions, modes, universes, addresses, channels, dimmers, colors, focus notes, and status.',storageKeys:[{key:'lighting-patch.v1',label:'Lighting Patch'}]},
    {id:'cable-plan',name:'Cable Plan',href:'cable-plan.html',dept:'Build',phases:['prep','loadin','strike'],tag:'Cable',desc:'Cable types, lengths, source, destination, path, labels, owners, pull status, trip, and slack issues.',storageKeys:[{key:'cable-plan.v1',label:'Cable Plan'}]},
    {id:'rf-coordination',name:'RF Coordination',href:'rf-coordination.html',dept:'Comms',phases:['advance','prep','show'],tag:'RF',desc:'Wireless mics, IEM, IFB, comms packs, receivers, frequencies, bands, conflicts, and backups.',storageKeys:[{key:'rf-coordination.v1',label:'RF Coordination'}]},
    {id:'comms-check',name:'Comms Check',href:'comms-check.html',dept:'Comms',phases:['prep','show'],tag:'Comms',desc:'Intercom, radio, and IFB assignments with channels, devices, battery, backups, and issue flags.',storageKeys:[{key:'comms-check.v1',label:'Comms Check'}]},
    {id:'camera-shot-list',name:'Camera Shot List',href:'camera-shot-list.html',dept:'Camera',phases:['advance','prep','show'],tag:'Camera',desc:'Camera plan with shot rows, framing, movement, presets, ready and problem status, and take next.',storageKeys:[{key:'camera-shot-list.v1',label:'Camera Shot List'}]},
    {id:'plotforge',name:'PlotForge',href:'plotforge.html',dept:'Planning',phases:['advance','prep','loadin'],tag:'Plot',desc:'Room layout planner with draggable stages, screens, cameras, speakers, mics, tables, power, and cable paths.',storageKeys:[{key:'stage-plot.v1',label:'PlotForge stage plot'}]},
    {id:'gear-prep',name:'Gear Prep',href:'gear-prep.html',dept:'Logistics',phases:['prep'],tag:'Gear',desc:'Pull sheets, case IDs, quantities, departments, owners, test, pack, load, issues, and open items.',storageKeys:[{key:'gear-prep.v1',label:'Gear Prep'}]},
    {id:'truck-pack',name:'Truck Pack Plan',href:'truck-pack.html',dept:'Logistics',phases:['prep','loadin','strike'],tag:'Truck',desc:'Cases, truck zones, load order, unload order, weights, owners, pack status, and issues.',storageKeys:[{key:'truck-pack.v1',label:'Truck Pack Plan'}]},
    {id:'load-in-plan',name:'Load In Plan',href:'load-in-plan.html',dept:'Logistics',phases:['loadin'],tag:'Load In',desc:'Trucks, docks, destinations, departments, items, owners, due times, build status, blockers, and gaps.',storageKeys:[{key:'load-in-plan.v1',label:'Load In Plan'}]},
    {id:'strike-plan',name:'Strike Plan',href:'strike-plan.html',dept:'Logistics',phases:['strike'],tag:'Strike',desc:'Departments, strike items, locations, owners, case IDs, destinations, load out status, missing gear, and issues.',storageKeys:[{key:'strike-plan.v1',label:'Strike Plan'}]},
    {id:'av-calculator',name:'AV Calculator',href:'av-calculator.html',dept:'Utility',phases:['advance','prep','loadin','show'],tag:'Math',desc:'Audio delay, projection throw, record storage, and power load checks with copyable summaries.',storageKeys:[{key:'avCalculator.v1',label:'AV Calculator'}]}
  ];

  /* Per-phase recommendations shown by the console and the context dock. */
  var RECOMMENDED={
    advance:['show-advance','site-survey','breakout-room-matrix','crew-call','plotforge','input-list'],
    prep:['gear-prep','truck-pack','cueforge','teleprompter','playback-check','audio-patch','video-patch','network-plan'],
    loadin:['load-in-plan','room-check','power-plan','line-check','display-plan','projection-plan','speaker-plan','show-task-board'],
    show:['teleprompter','show-timer','cueforge','show-task-board','breakout-room-matrix','record-log','comms-check','camera-shot-list'],
    strike:['strike-plan','truck-pack','cable-plan','show-task-board','crew-time-log'],
    closeout:['show-handoff','show-report','client-signoff','change-order','record-log','crew-time-log']
  };

  /* Universal-nav grouping (matches the homepage + All Tools directory).
     Coarser than tool.dept on purpose — ten browseable groups. */
  var NAV_DEPARTMENTS=[
    {label:'Run of show',toolIds:['teleprompter','show-timer','cueforge','playback-check','comms-check']},
    {label:'Audio',toolIds:['audio-patch','line-check','input-list','signal-flow','speaker-plan','rf-coordination']},
    {label:'Video',toolIds:['video-patch','display-plan','projection-plan','stream-plan','record-log','camera-shot-list']},
    {label:'Lighting',toolIds:['lighting-patch']},
    {label:'Power & data',toolIds:['power-plan','network-plan','cable-plan']},
    {label:'Spaces & staging',toolIds:['plotforge','room-check','breakout-room-matrix','site-survey']},
    {label:'Logistics',toolIds:['gear-prep','truck-pack','load-in-plan','strike-plan','show-advance']},
    {label:'Crew',toolIds:['crew-call','crew-time-log']},
    {label:'Show docs & client',toolIds:['show-handoff','show-report','show-task-board','change-order','client-signoff']},
    {label:'Calculators',toolIds:['av-calculator']}
  ];

  /* Route aliases. `cueforge.html` is the branded route that forwards to the
     cue-sheet app; `plotforge.html` forwards to the external PlotForge beta
     (stage-plot.html remains the local legacy layout tool). Nav treats the
     legacy file as the branded route for prev/next purposes. */
  var ALIASES={'cue-sheet.html':'cueforge.html','stage-plot.html':'plotforge.html'};
  var ALIAS_FILES=['./cue-sheet.html','./stage-plot.html'];

  /* Shared shell assets every offline session needs. */
  var BASE_ASSETS=[
    './av-suite.html',
    './av-suite-worker.js',
    './js/sbd-registry.js',
    './js/av-suite-context.js',
    './js/sbd-nav.js',
    './js/sbd-handoff.js',
    './js/responsive-tables.js',
    './js/av-domain-views.js',
    './css/responsive-tables.css',
    './css/av-domain-views.css',
    './css/fonts.css',
    './svg/system_by_dave_logo_rust.svg',
    './img/card-cover-banner-wide.png',
    './manifest.json',
    './fonts/dm-sans.woff2',
    './fonts/dm-serif-display.woff2',
    './fonts/dm-serif-display-italic.woff2',
    './fonts/jetbrains-mono.woff2'
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

  function toolById(id){
    for(var i=0;i<TOOLS.length;i++){if(TOOLS[i].id===id) return TOOLS[i];}
    return null;
  }

  root.SBD_REGISTRY={
    /* Bump on any registry/tool change — rolls the service-worker cache. */
    version:'v20260703-power-network-rf',
    phases:PHASES,
    tools:TOOLS,
    recommended:RECOMMENDED,
    navDepartments:NAV_DEPARTMENTS,
    aliases:ALIASES,
    baseAssets:BASE_ASSETS,
    offlineAssets:offlineAssets,
    toolById:toolById
  };
})(typeof self!=='undefined'?self:this);
