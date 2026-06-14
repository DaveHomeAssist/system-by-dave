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
  var STORAGE_KEY = 'av-suite-dashboard.v1';
  var DEFAULT_FAVORITES = ['teleprompter', 'show-timer', 'cueforge'];
  var READINESS_LABELS = {pending:'Pending', ready:'Ready', issue:'Issue', skipped:'Skipped'};
  var READINESS_BUTTON_LABELS = {pending:'Pending', ready:'Ready', issue:'Issue', skipped:'Skip'};
  var READINESS_VALUES = ['pending', 'ready', 'issue', 'skipped'];
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

  function storageAvailable(){
    try{
      var key = 'av-suite-context-probe';
      localStorage.setItem(key, key);
      localStorage.removeItem(key);
      return true;
    }catch(e){
      return false;
    }
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

  function currentToolId(){
    var route = currentRoute();
    return route ? route.replace(/\.html$/i, '') : '';
  }

  function toolNameFromId(id){
    var route = id + '.html';
    var name = '';
    Object.keys(PHASE_TOOLS).some(function(phase){
      return PHASE_TOOLS[phase].some(function(tool){
        if(tool.href === route){
          name = tool.name;
          return true;
        }
        return false;
      });
    });
    return name || id.replace(/-/g, ' ').replace(/\b\w/g, function(letter){return letter.toUpperCase();});
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

  function defaultSuiteState(){
    return {
      schema:'system-by-dave.av-suite.v1',
      savedAt:new Date().toISOString(),
      showName:context.showName || 'AV Tool Suite',
      venue:context.venue || '',
      showDate:context.showDate || new Date().toISOString().slice(0, 10),
      operator:context.operator || '',
      phase:context.phase || 'show',
      favorites:DEFAULT_FAVORITES.slice(),
      recent:[],
      readiness:{},
      toolNotes:{},
      commandRecent:[],
      filters:{search:'', phase:'all', dept:'all', pin:'all'}
    };
  }

  function cleanObject(value){
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function readSuiteState(){
    var state = defaultSuiteState();
    var parsed;
    if(!storageAvailable()) return state;
    try{
      parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    }catch(e){
      parsed = {};
    }
    if(!parsed || typeof parsed !== 'object') parsed = {};
    state.schema = 'system-by-dave.av-suite.v1';
    state.showName = clean(parsed.showName || state.showName, 120);
    state.venue = clean(parsed.venue || state.venue, 120);
    state.showDate = clean(parsed.showDate || state.showDate, 20);
    state.operator = clean(parsed.operator || state.operator, 80);
    state.phase = clean(parsed.phase || state.phase, 30);
    state.favorites = Array.isArray(parsed.favorites) ? parsed.favorites.map(String).slice(0, 60) : state.favorites;
    state.recent = Array.isArray(parsed.recent) ? parsed.recent.map(String).slice(0, 12) : state.recent;
    state.readiness = cleanObject(parsed.readiness);
    state.toolNotes = cleanObject(parsed.toolNotes);
    state.commandRecent = Array.isArray(parsed.commandRecent) ? parsed.commandRecent.map(String).slice(0, 10) : state.commandRecent;
    state.filters = cleanObject(parsed.filters);
    if(!state.filters.search) state.filters.search = '';
    if(!state.filters.phase) state.filters.phase = 'all';
    if(!state.filters.dept) state.filters.dept = 'all';
    if(!state.filters.pin) state.filters.pin = 'all';
    return state;
  }

  function applyContextToSuiteState(state){
    if(context.showName) state.showName = context.showName;
    if(context.venue) state.venue = context.venue;
    if(context.showDate) state.showDate = context.showDate;
    if(context.operator) state.operator = context.operator;
    if(context.phase){
      state.phase = context.phase;
      state.filters = cleanObject(state.filters);
      state.filters.phase = context.phase;
    }
  }

  function saveSuiteState(state){
    if(!storageAvailable()) return false;
    state.savedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  }

  function toolReadiness(id){
    var value = String(readSuiteState().readiness[id] || 'pending');
    return READINESS_VALUES.indexOf(value) >= 0 ? value : 'pending';
  }

  function cleanNote(value){
    return clean(value, 240);
  }

  function toolNote(id){
    return cleanNote(readSuiteState().toolNotes[id] || '');
  }

  function setToolReadiness(value){
    var id = currentToolId();
    var state;
    if(!id || READINESS_VALUES.indexOf(value) < 0) return false;
    state = readSuiteState();
    applyContextToSuiteState(state);
    state.readiness = cleanObject(state.readiness);
    if(value === 'pending') delete state.readiness[id];
    else state.readiness[id] = value;
    return saveSuiteState(state);
  }

  function setToolNote(value){
    var id = currentToolId();
    var state;
    var note;
    if(!id) return false;
    state = readSuiteState();
    applyContextToSuiteState(state);
    state.toolNotes = cleanObject(state.toolNotes);
    note = cleanNote(value);
    if(note) state.toolNotes[id] = note;
    else delete state.toolNotes[id];
    return saveSuiteState(state);
  }

  function shortNote(note){
    if(!note) return 'No note';
    return note.length > 54 ? note.slice(0, 51) + '...' : note;
  }

  function setNoteEditorOpen(dock, open, focusEditor){
    var id = currentToolId();
    var editor = dock.querySelector('[data-sbd-suite-note-editor]');
    var input = dock.querySelector('[data-sbd-suite-note-input]');
    var noteButton = dock.querySelector('[data-sbd-suite-note-button]');
    if(!editor || !input) return;
    dock.setAttribute('data-sbd-suite-note-open', String(open));
    editor.hidden = !open;
    editor.setAttribute('data-open', String(open));
    noteButton && noteButton.setAttribute('aria-expanded', String(open));
    if(open){
      input.value = toolNote(id);
      input.setAttribute('aria-label', 'Readiness note for ' + toolNameFromId(id));
      if(focusEditor){
        setTimeout(function(){
          input.focus();
          input.select();
        }, 0);
      }
    }else if(focusEditor && noteButton){
      noteButton.focus();
    }
  }

  function saveNoteEditor(dock){
    var input = dock.querySelector('[data-sbd-suite-note-input]');
    var note = input ? cleanNote(input.value) : '';
    var saved = setToolNote(note);
    if(saved) setNoteEditorOpen(dock, false, false);
    updateReadinessControls(dock, saved, note ? 'Note saved' : 'Note cleared');
  }

  function toggleToolNoteEditor(dock){
    var open = dock.getAttribute('data-sbd-suite-note-open') === 'true';
    setNoteEditorOpen(dock, !open, true);
  }

  function clearNoteEditor(dock){
    var input = dock.querySelector('[data-sbd-suite-note-input]');
    if(input) input.value = '';
    saveNoteEditor(dock);
  }

  function updateReadinessControls(dock, saved, messageText){
    var id = currentToolId();
    var value = toolReadiness(id);
    var note = toolNote(id);
    var status = dock.querySelector('[data-sbd-suite-status]');
    var message = dock.querySelector('[data-sbd-suite-message]');
    var noteStatus = dock.querySelector('[data-sbd-suite-note-status]');
    var noteButton = dock.querySelector('[data-sbd-suite-note-button]');
    var noteInput = dock.querySelector('[data-sbd-suite-note-input]');
    dock.querySelectorAll('[data-sbd-suite-readiness]').forEach(function(button){
      var active = button.getAttribute('data-sbd-suite-readiness') === value;
      button.setAttribute('aria-pressed', String(active));
    });
    if(status){
      status.textContent = toolNameFromId(id) + ' ' + READINESS_LABELS[value];
      status.setAttribute('data-status', value);
    }
    if(noteStatus){
      noteStatus.textContent = shortNote(note);
      noteStatus.title = note || 'No readiness note';
      noteStatus.setAttribute('data-has-note', String(Boolean(note)));
    }
    if(noteButton){
      noteButton.setAttribute('aria-pressed', String(Boolean(note)));
      noteButton.title = note ? 'Edit readiness note: ' + note : 'Add readiness note';
    }
    if(noteInput && dock.getAttribute('data-sbd-suite-note-open') !== 'true'){
      noteInput.value = note;
    }
    if(message){
      message.textContent = saved === false ? 'Storage blocked' : (messageText || (saved ? 'Saved' : ''));
      if(saved) setTimeout(function(){message.textContent = '';}, 1500);
    }
  }

  function addReadinessControls(dock){
    var id = currentToolId();
    var group;
    var status;
    var noteButton;
    var noteStatus;
    var noteEditor;
    var noteInput;
    var saveButton;
    var clearButton;
    var cancelButton;
    var message;
    if(!id) return;
    group = document.createElement('div');
    group.className = 'sbd-suite-readiness';
    group.setAttribute('aria-label', 'AV Suite readiness for this tool');
    status = document.createElement('span');
    status.className = 'sbd-suite-status';
    status.setAttribute('data-sbd-suite-status', 'true');
    group.appendChild(status);
    READINESS_VALUES.forEach(function(value){
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'sbd-suite-button';
      button.textContent = READINESS_BUTTON_LABELS[value] || READINESS_LABELS[value];
      button.setAttribute('data-sbd-suite-readiness', value);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function(){
        updateReadinessControls(dock, setToolReadiness(value));
      });
      group.appendChild(button);
    });
    noteButton = document.createElement('button');
    noteButton.type = 'button';
    noteButton.className = 'sbd-suite-button sbd-suite-note-button';
    noteButton.textContent = 'Note';
    noteButton.setAttribute('data-sbd-suite-note-button', 'true');
    noteButton.setAttribute('aria-pressed', 'false');
    noteButton.setAttribute('aria-expanded', 'false');
    noteButton.addEventListener('click', function(){toggleToolNoteEditor(dock);});
    group.appendChild(noteButton);
    noteStatus = document.createElement('span');
    noteStatus.className = 'sbd-suite-note';
    noteStatus.setAttribute('data-sbd-suite-note-status', 'true');
    group.appendChild(noteStatus);
    noteEditor = document.createElement('div');
    noteEditor.className = 'sbd-suite-note-editor';
    noteEditor.setAttribute('data-sbd-suite-note-editor', 'true');
    noteEditor.setAttribute('data-open', 'false');
    noteEditor.hidden = true;
    noteInput = document.createElement('input');
    noteInput.className = 'sbd-suite-note-input';
    noteInput.type = 'text';
    noteInput.maxLength = 240;
    noteInput.placeholder = 'Note for readiness, owner, or blocker';
    noteInput.setAttribute('data-sbd-suite-note-input', 'true');
    noteInput.addEventListener('keydown', function(event){
      if(event.key === 'Enter'){
        event.preventDefault();
        saveNoteEditor(dock);
      }
      if(event.key === 'Escape'){
        event.preventDefault();
        setNoteEditorOpen(dock, false, true);
      }
    });
    noteEditor.appendChild(noteInput);
    saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'sbd-suite-button';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', function(){saveNoteEditor(dock);});
    noteEditor.appendChild(saveButton);
    clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'sbd-suite-button';
    clearButton.textContent = 'Clear';
    clearButton.addEventListener('click', function(){clearNoteEditor(dock);});
    noteEditor.appendChild(clearButton);
    cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'sbd-suite-button';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', function(){setNoteEditorOpen(dock, false, true);});
    noteEditor.appendChild(cancelButton);
    group.appendChild(noteEditor);
    message = document.createElement('span');
    message.className = 'sbd-suite-message';
    message.setAttribute('data-sbd-suite-message', 'true');
    message.setAttribute('aria-live', 'polite');
    group.appendChild(message);
    dock.appendChild(group);
    updateReadinessControls(dock, null);
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
      '.sbd-suite-dock[data-sbd-suite-note-open="true"]{flex-wrap:wrap}',
      '.sbd-suite-readiness{display:inline-flex;align-items:center;gap:4px;border-left:1px solid rgba(73,97,120,.65);padding-left:6px}',
      '.sbd-suite-status,.sbd-suite-message{display:inline-flex;align-items:center;min-height:28px;border-radius:999px;padding:5px 8px;color:#aab8ca;background:rgba(12,18,28,.8);white-space:nowrap;font-family:"SFMono-Regular","Cascadia Code","Liberation Mono",Menlo,monospace;font-size:10px;text-transform:uppercase;letter-spacing:.06em}',
      '.sbd-suite-status[data-status="ready"]{color:#baf7d0;background:rgba(31,110,72,.3)}',
      '.sbd-suite-status[data-status="issue"]{color:#ffd2da;background:rgba(133,46,66,.32)}',
      '.sbd-suite-status[data-status="skipped"]{color:#d8d3c4;background:rgba(98,86,58,.38)}',
      '.sbd-suite-note{display:inline-flex;align-items:center;min-height:28px;max-width:190px;border-radius:999px;padding:5px 8px;color:#aab8ca;background:rgba(12,18,28,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:700 10px "SFMono-Regular","Cascadia Code","Liberation Mono",Menlo,monospace;text-transform:uppercase;letter-spacing:.06em}',
      '.sbd-suite-note[data-has-note="true"]{color:#dffffc;background:rgba(37,92,94,.38)}',
      '.sbd-suite-note-editor{display:none;align-items:center;gap:5px;flex:1 1 100%;min-width:min(420px,calc(100vw - 44px));padding-top:6px;border-top:1px solid rgba(73,97,120,.65)}',
      '.sbd-suite-note-editor[data-open="true"]{display:flex}',
      '.sbd-suite-note-input{appearance:none;flex:1 1 220px;min-width:0;min-height:30px;border:1px solid rgba(73,97,120,.78);border-radius:7px;padding:6px 8px;color:#f4f8ff;background:rgba(12,18,28,.92);font:700 11px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;outline:none}',
      '.sbd-suite-note-input:focus{border-color:#72f4e9;box-shadow:0 0 0 2px rgba(114,244,233,.18)}',
      '.sbd-suite-button{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-height:28px;border:1px solid rgba(73,97,120,.78);border-radius:7px;padding:5px 8px;color:#f4f8ff;background:rgba(22,34,49,.88);font:700 11px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;cursor:pointer;transition:transform 140ms ease,background 140ms ease,border-color 140ms ease,color 140ms ease}',
      '.sbd-suite-button:hover{border-color:#72f4e9;background:rgba(27,43,60,.98)}',
      '.sbd-suite-button:active{transform:scale(.96)}',
      '.sbd-suite-button:focus-visible{outline:2px solid #72f4e9;outline-offset:2px}',
      '.sbd-suite-button[aria-pressed="true"]{border-color:#72f4e9;color:#dffffc;background:rgba(37,92,94,.72)}',
      '.sbd-suite-button[data-sbd-suite-readiness="ready"][aria-pressed="true"]{border-color:#72d69a;color:#ebfff1;background:rgba(31,110,72,.74)}',
      '.sbd-suite-button[data-sbd-suite-readiness="issue"][aria-pressed="true"]{border-color:#ff8fa6;color:#fff4f6;background:rgba(133,46,66,.78)}',
      '.sbd-suite-button[data-sbd-suite-readiness="skipped"][aria-pressed="true"]{border-color:#d8c78a;color:#fff9df;background:rgba(98,86,58,.78)}',
      '@media (max-width:900px){.sbd-suite-dock{display:grid;grid-template-columns:auto auto 1fr;align-items:stretch}.sbd-suite-readiness{grid-column:1/-1;border-left:0;border-top:1px solid rgba(73,97,120,.65);padding-left:0;padding-top:6px;flex-wrap:wrap}.sbd-suite-note-editor{grid-column:1/-1;min-width:0}.sbd-suite-step{max-width:none}}',
      '@media (max-width:680px){.sbd-suite-dock{left:10px;right:10px;bottom:10px;grid-template-columns:1fr 1fr}.sbd-suite-phase{grid-column:1/-1}.sbd-suite-main{grid-column:1/-1}.sbd-suite-readiness{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr}.sbd-suite-status,.sbd-suite-note,.sbd-suite-note-editor,.sbd-suite-message{grid-column:1/-1;justify-content:center;max-width:none}.sbd-suite-note-editor{grid-template-columns:1fr auto auto auto}.sbd-suite-note-input{flex-basis:100%;width:100%}.sbd-suite-link,.sbd-suite-phase,.sbd-suite-button{min-width:0}.sbd-suite-step{max-width:none}}',
      '@media print{.sbd-suite-dock{display:none!important}}'
    ].join('');
    dock = document.createElement('nav');
    dock.className = 'sbd-suite-dock';
    dock.setAttribute('data-sbd-suite-dock', 'true');
    dock.setAttribute('aria-label', 'AV Suite context navigation');
    var suiteLink = makeLink('sbd-suite-link sbd-suite-main', suiteHref(), 'AV Suite', 'Return to AV Suite with this show context');
    suiteLink.setAttribute('data-sbd-suite-return', 'true');
    dock.appendChild(suiteLink);
    addReadinessControls(dock);
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
