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
    addSuiteReturn();
  }

  function suiteHref(){
    var url = new URL('av-suite.html', window.location.href);
    if(context.showName) url.searchParams.set('sbdShow', context.showName);
    if(context.venue) url.searchParams.set('sbdVenue', context.venue);
    if(context.showDate) url.searchParams.set('sbdDate', context.showDate);
    if(context.operator) url.searchParams.set('sbdOperator', context.operator);
    if(context.phase) url.searchParams.set('sbdPhase', context.phase);
    return url.pathname.split('/').pop() + url.search + url.hash;
  }

  function addSuiteReturn(){
    if(document.querySelector('[data-sbd-suite-return]')) return;
    var style = document.createElement('style');
    style.textContent = [
      '.sbd-suite-return{position:fixed;left:14px;bottom:14px;z-index:9999;display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:9px 12px;border:1px solid rgba(114,244,233,.62);border-radius:8px;background:rgba(8,13,20,.9);color:#f4f8ff;font:700 13px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;text-decoration:none;box-shadow:0 10px 28px rgba(0,0,0,.34);backdrop-filter:blur(12px);transition:transform 140ms ease,background 140ms ease,border-color 140ms ease}',
      '.sbd-suite-return:hover{background:rgba(22,34,49,.96);border-color:#72f4e9;transform:translateY(-1px)}',
      '.sbd-suite-return:active{transform:translateY(1px) scale(.98)}',
      '.sbd-suite-return:focus-visible{outline:2px solid #72b8ff;outline-offset:3px}',
      '@media (max-width:680px){.sbd-suite-return{left:10px;bottom:10px;max-width:calc(100vw - 20px)}}',
      '@media print{.sbd-suite-return{display:none!important}}'
    ].join('');
    var link = document.createElement('a');
    link.className = 'sbd-suite-return';
    link.href = suiteHref();
    link.textContent = 'AV Suite';
    link.setAttribute('data-sbd-suite-return', 'true');
    link.setAttribute('aria-label', 'Return to AV Suite with this show context');
    document.head.appendChild(style);
    document.body.appendChild(link);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){setTimeout(hydrate, 0);});
  }else{
    setTimeout(hydrate, 0);
  }
})();
