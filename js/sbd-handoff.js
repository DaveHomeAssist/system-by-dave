/* System by Dave — cross-tool show-data handoff (schema sbd.handoff.v1).

   THE ENVELOPE CONTRACT
   Every AV tool already exports and imports one JSON shape:
     { schema:'system-by-dave.<tool>.v1', meta:{...}, items:[...] }
   A handoff stages exactly that shape FOR THE TARGET TOOL in localStorage,
   so "Send to X" is just: build X's import payload, stage it, navigate.
   The target consumes it on load through its normal normalizeState() path —
   no new import code, no field drift.

   Staged record (one per target tool, key 'sbd.handoff.<targetToolId>.v1'):
     { schema:'sbd.handoff.v1', createdAt:ISO,
       from:{tool,label,show}, to:{tool},
       payload:{ schema:'system-by-dave.<target>.v1', meta:{...}, items:[...] } }

   Source tool:  SBD_HANDOFF.stage('crew-time-log', payload, {tool:'crew-call',
                 label:'Crew Call', show:meta.showName})
                 → location.href = SBD_HANDOFF.carryContext('crew-time-log.html')
   Target tool:  var staged = SBD_HANDOFF.peek('crew-time-log');  // on load
                 confirm → state = normalizeState(staged.payload); saveState();
                 SBD_HANDOFF.take('crew-time-log');  // always consume

   carryContext() forwards the AV Suite show-context URL params (sbdShow,
   sbdVenue, sbdDate, sbdOperator, sbdPhase) so the context dock follows the
   handoff. */
(function(root){
  'use strict';
  var VERSION='sbd.handoff.v1';
  var CONTEXT_PARAMS=['sbdShow','sbdVenue','sbdDate','sbdOperator','sbdPhase'];

  function storageKey(target){return 'sbd.handoff.'+String(target||'').trim()+'.v1';}

  function available(){
    try{var probe='sbd-handoff-probe';root.localStorage.setItem(probe,probe);root.localStorage.removeItem(probe);return true;}
    catch(e){return false;}
  }

  function stage(targetToolId,payload,from){
    if(!available()||!targetToolId) return false;
    try{
      root.localStorage.setItem(storageKey(targetToolId),JSON.stringify({
        schema:VERSION,
        createdAt:new Date().toISOString(),
        from:from||{},
        to:{tool:String(targetToolId)},
        payload:payload||{}
      }));
      return true;
    }catch(e){return false;}
  }

  function peek(targetToolId){
    if(!available()) return null;
    try{
      var raw=root.localStorage.getItem(storageKey(targetToolId));
      if(!raw) return null;
      var parsed=JSON.parse(raw);
      if(!parsed||parsed.schema!==VERSION||!parsed.payload||typeof parsed.payload!=='object') return null;
      return parsed;
    }catch(e){return null;}
  }

  function take(targetToolId){
    var found=peek(targetToolId);
    if(available()){try{root.localStorage.removeItem(storageKey(targetToolId));}catch(e){}}
    return found;
  }

  function carryContext(href){
    try{
      var url=new URL(href,root.location.href);
      var params=new URLSearchParams(root.location.search);
      CONTEXT_PARAMS.forEach(function(name){
        var value=params.get(name);
        if(value) url.searchParams.set(name,value);
      });
      return url.pathname.split('/').pop()+url.search+url.hash;
    }catch(e){return href;}
  }

  root.SBD_HANDOFF={version:VERSION,stage:stage,peek:peek,take:take,carryContext:carryContext};
})(typeof window!=='undefined'?window:this);
