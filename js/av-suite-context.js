(function(){
  var params = new URLSearchParams(window.location.search);
  var context = {
    showName: clean(params.get('sbdShow'), 120),
    venue: clean(params.get('sbdVenue'), 120),
    showDate: clean(params.get('sbdDate'), 20),
    operator: clean(params.get('sbdOperator'), 80),
    phase: clean(params.get('sbdPhase'), 30)
  };
  if(!context.showName && !context.venue && !context.showDate && !context.operator) return;
  var PHASE_LABELS={advance:'Advance',prep:'Prep',loadin:'Load In',show:'Show',strike:'Strike',closeout:'Closeout'};
  var PHASE_TOOLS={
    advance:[
      {name:'Show Advance',href:'show-advance.html'},
      {name:'Site Survey',href:'site-survey.html'},
      {name:'Breakout Room Matrix',href:'breakout-room-matrix.html'},
      {name:'Crew Call',href:'crew-call.html'},
      {name:'PlotForge',href:'plotforge.html'},
      {name:'Input List',href:'input-list.html'}
    ],
    prep:[
      {name:'Gear Prep',href:'gear-prep.html'},
      {name:'Truck Pack Plan',href:'truck-pack.html'},
      {name:'CueForge',href:'cueforge.html'},
      {name:'Teleprompter',href:'teleprompter.html'},
      {name:'Playback Check',href:'playback-check.html'},
      {name:'Audio Patch',href:'audio-patch.html'},
      {name:'Video Patch',href:'video-patch.html'},
      {name:'Network Plan',href:'network-plan.html'}
    ],
    loadin:[
      {name:'Load In Plan',href:'load-in-plan.html'},
      {name:'Room Check',href:'room-check.html'},
      {name:'Power Plan',href:'power-plan.html'},
      {name:'Line Check',href:'line-check.html'},
      {name:'Display Plan',href:'display-plan.html'},
      {name:'Projection Plan',href:'projection-plan.html'},
      {name:'Speaker Plan',href:'speaker-plan.html'},
      {name:'Show Task Board',href:'show-task-board.html'}
    ],
    show:[
      {name:'Teleprompter',href:'teleprompter.html'},
      {name:'Show Timer',href:'show-timer.html'},
      {name:'CueForge',href:'cueforge.html'},
      {name:'Show Task Board',href:'show-task-board.html'},
      {name:'Breakout Room Matrix',href:'breakout-room-matrix.html'},
      {name:'Record Log',href:'record-log.html'},
      {name:'Comms Check',href:'comms-check.html'},
      {name:'Camera Shot List',href:'camera-shot-list.html'}
    ],
    strike:[
      {name:'Strike Plan',href:'strike-plan.html'},
      {name:'Truck Pack Plan',href:'truck-pack.html'},
      {name:'Cable Plan',href:'cable-plan.html'},
      {name:'Show Task Board',href:'show-task-board.html'},
      {name:'Crew Time Log',href:'crew-time-log.html'}
    ],
    closeout:[
      {name:'Show Handoff',href:'show-handoff.html'},
      {name:'Show Report',href:'show-report.html'},
      {name:'Client Sign Off',href:'client-signoff.html'},
      {name:'Change Order',href:'change-order.html'},
      {name:'Record Log',href:'record-log.html'},
      {name:'Crew Time Log',href:'crew-time-log.html'}
    ]
  };
  var ROUTE_ALIASES={'cue-sheet.html':'cueforge.html','stage-plot.html':'plotforge.html'};

  function clean(value, limit){
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
  }

  function byId(id){
    return document.getElementById(id);
  }

  function setInput(id, value){
    var input = byId(id);
    if(!input || !value) return false;
    if(input.value === value) return false;
    input.value = value;
    input.dispatchEvent(new Event('input', {bubbles:true}));
    input.dispatchEvent(new Event('change', {bubbles:true}));
    return true;
  }

  function firstExisting(ids, value){
    return ids.some(function(id){return setInput(id, value);});
  }

  function hydrate(){
    var applied = false;
    applied = firstExisting(['showName', 'showTitle'], context.showName) || applied;
    applied = firstExisting(['venue', 'venueName'], context.venue) || applied;
    applied = firstExisting(['showDate'], context.showDate) || applied;
    applied = firstExisting([
      'operator',
      'preparedBy',
      'lead',
      'playbackOp',
      'recordOp',
      'streamOp',
      'videoLead',
      'audioLead',
      'tdName',
      'crewLead',
      'techLead',
      'designerName',
      'producer'
    ], context.operator) || applied;
    if(applied) document.documentElement.dataset.sbdContextApplied = 'true';
    addSuiteDock();
  }

  function contextHref(href){
    var url = new URL(href, window.location.href);
    if(context.showName) url.searchParams.set('sbdShow', context.showName);
    if(context.venue) url.searchParams.set('sbdVenue', context.venue);
    if(context.showDate) url.searchParams.set('sbdDate', context.showDate);
    if(context.operator) url.searchParams.set('sbdOperator', context.operator);
    if(context.phase) url.searchParams.set('sbdPhase', context.phase);
    return url.pathname.split('/').pop() + url.search + url.hash;
  }

  function suiteHref(){
    return contextHref('av-suite.html');
  }

  function currentRoute(){
    var file = window.location.pathname.split('/').pop() || '';
    return ROUTE_ALIASES[file] || file;
  }

  function phaseTools(){
    return PHASE_TOOLS[context.phase] || [];
  }

  function adjacentTool(offset){
    var tools = phaseTools();
    var route = currentRoute();
    var index = -1;
    if(!tools.length) return null;
    tools.some(function(tool, toolIndex){
      if(tool.href === route){
        index = toolIndex;
        return true;
      }
      return false;
    });
    if(index < 0) return offset > 0 ? tools[0] : tools[tools.length - 1];
    if(tools.length < 2) return null;
    return tools[(index + offset + tools.length) % tools.length];
  }

  function phaseText(){
    var label = PHASE_LABELS[context.phase] || 'Current';
    var count = phaseTools().length;
    return label + (count ? ' ' + count : '');
  }

  function makeLink(className, href, text, label){
    var link = document.createElement('a');
    link.className = className;
    link.href = href;
    link.textContent = text;
    if(label) link.setAttribute('aria-label', label);
    return link;
  }

  function addPhaseLink(dock, tool, direction){
    var link;
    if(!tool) return;
    link = makeLink(
      'sbd-suite-link sbd-suite-step',
      contextHref(tool.href),
      direction + ' ' + tool.name,
      direction + ' phase tool: ' + tool.name
    );
    link.title = direction + ' phase tool: ' + tool.name;
    dock.appendChild(link);
  }

  function addSuiteDock(){
    var tools = phaseTools();
    var prev = adjacentTool(-1);
    var next = adjacentTool(1);
    var dock;
    if(document.querySelector('[data-sbd-suite-dock]')) return;
    var style = document.createElement('style');
    style.textContent = [
      '.sbd-suite-dock{position:fixed;left:14px;bottom:14px;z-index:9999;display:flex;align-items:center;gap:6px;max-width:calc(100vw - 28px);padding:6px;border:1px solid rgba(114,244,233,.45);border-radius:10px;background:rgba(8,13,20,.92);box-shadow:0 10px 28px rgba(0,0,0,.34);backdrop-filter:blur(12px);font:700 12px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}',
      '.sbd-suite-link,.sbd-suite-phase{display:inline-flex;align-items:center;justify-content:center;min-height:34px;border:1px solid rgba(73,97,120,.78);border-radius:8px;padding:8px 10px;color:#f4f8ff;background:rgba(22,34,49,.88);text-decoration:none;white-space:nowrap;transition:transform 140ms ease,background 140ms ease,border-color 140ms ease}',
      '.sbd-suite-link:hover{background:rgba(27,43,60,.98);border-color:#72f4e9;transform:translateY(-1px)}',
      '.sbd-suite-link:active{transform:translateY(1px) scale(.98)}',
      '.sbd-suite-link:focus-visible{outline:2px solid #72f4e9;outline-offset:2px}',
      '.sbd-suite-main{border-color:rgba(114,244,233,.72);color:#dffffc}',
      '.sbd-suite-phase{color:#aab8ca;font-family:"SFMono-Regular","Cascadia Code","Liberation Mono",Menlo,monospace;text-transform:uppercase;letter-spacing:.06em;font-size:10px}',
      '.sbd-suite-step{max-width:180px;overflow:hidden;text-overflow:ellipsis}',
      '@media (max-width:680px){.sbd-suite-dock{left:10px;right:10px;bottom:10px;display:grid;grid-template-columns:1fr 1fr;align-items:stretch}.sbd-suite-phase{grid-column:1/-1}.sbd-suite-main{grid-column:1/-1}.sbd-suite-link,.sbd-suite-phase{min-width:0}.sbd-suite-step{max-width:none}}',
      '@media print{.sbd-suite-dock{display:none!important}}'
    ].join('');
    dock = document.createElement('nav');
    dock.className = 'sbd-suite-dock';
    dock.setAttribute('data-sbd-suite-dock', 'true');
    dock.setAttribute('aria-label', 'AV Suite context navigation');
    var suiteLink = makeLink('sbd-suite-link sbd-suite-main', suiteHref(), 'AV Suite', 'Return to AV Suite with this show context');
    suiteLink.setAttribute('data-sbd-suite-return', 'true');
    dock.appendChild(suiteLink);
    if(tools.length){
      var phase = document.createElement('span');
      phase.className = 'sbd-suite-phase';
      phase.textContent = phaseText();
      dock.appendChild(phase);
      addPhaseLink(dock, prev, 'Prev');
      addPhaseLink(dock, next, 'Next');
    }
    document.head.appendChild(style);
    document.body.appendChild(dock);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){setTimeout(hydrate, 0);});
  }else{
    setTimeout(hydrate, 0);
  }
})();
