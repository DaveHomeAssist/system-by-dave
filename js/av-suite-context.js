(function(){
  var params = new URLSearchParams(window.location.search);
  var context = {
    showName: clean(params.get('sbdShow'), 120),
    venue: clean(params.get('sbdVenue'), 120),
    showDate: clean(params.get('sbdDate'), 20),
    operator: clean(params.get('sbdOperator'), 80)
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
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){setTimeout(hydrate, 0);});
  }else{
    setTimeout(hydrate, 0);
  }
})();
