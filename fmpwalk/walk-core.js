// Walk inventory and route compatibility. No DOM, storage, or network access.
// A classic script keeps the existing synchronous boot and browser bridge intact.
globalThis.FMPWalkCore = (function(){
"use strict";

/* ══════════════════════ seed data ══════════════════════
   Values come from the FMP docs and dated operator corrections. Where the docs do not
   establish a fact, the field is left blank and marked, never guessed.
   ═══════════════════════════════════════════════════════ */

const BOWL = [
  {id:"FLK-SR",env:"A",kind:"led",name:"Stage right flanking wall",zone:"Pavilion",
   spec:[["Ctrl","VX4S stage right"],["Pitch","10 mm"],["In2","DVI"]],base:"20%",level:false},
  {id:"FLK-SL",env:"A",kind:"led",name:"Stage left flanking wall",zone:"Pavilion",
   spec:[["Ctrl","VX4S stage left"],["Pitch","10 mm"],["In2","SDI"]],base:"20%",level:false},
  {id:"DLY-1",env:"A",kind:"led",name:"Lawn delay wall 1",zone:"Lawn",
   spec:[["Ctrl","VX4S lawn 1/2"],["Pitch","7 mm"],["In2","DVI"]],base:"20%",level:true},
  {id:"DLY-2",env:"A",kind:"led",name:"Lawn delay wall 2",zone:"Lawn",
   spec:[["Ctrl","VX4S lawn 1/2"],["Pitch","7 mm"],["In2","DVI"]],base:"20%",level:true},
  {id:"DLY-3",env:"A",kind:"led",name:"Lawn delay wall 3",zone:"Lawn",
   spec:[["Ctrl","VX4S lawn 3/4"],["Pitch","7 mm"],["In2","HDMI"]],base:"20%",level:true},
  {id:"DLY-4",env:"A",kind:"led",name:"Lawn delay wall 4",zone:"Lawn",
   spec:[["Ctrl","VX4S lawn 3/4"],["Pitch","7 mm"],["In2","HDMI"]],base:"20%",level:true}
];

/* IPs .20 to .23 are the documented range for the four MCTRL660 PRO units.
   Which IP belongs to which unit is NOT established. Left blank on purpose. */
const SPEC = [
  {id:"SPC-TP",env:"C",kind:"spec",name:"Tower · primary",zone:"Building advertising LED",
   spec:[["Plate","TOWER PRIMARY"],["Sticker","TOWER LEADER"]],base:"4%"},
  {id:"SPC-TB",env:"C",kind:"spec",name:"Tower · backup",zone:"Building advertising LED",
   spec:[["Plate","TOWER BACKUP"],["Sticker","TOWER FOLLOWER"]],base:"0% 🔴"},
  {id:"SPC-WP",env:"C",kind:"spec",name:"Wall · primary",zone:"Building advertising LED",
   spec:[["Plate","WALL PRIMARY"],["Sticker","WALL LEADER"]],base:"3%"},
  {id:"SPC-WB",env:"C",kind:"spec",name:"Wall · backup",zone:"Building advertising LED",
   spec:[["Plate","WALL BACKUP"],["Sticker","WALL FOLLOWER"]],base:"3%"}
];

/* Historical ConcertVision keys, retained for saved-route migration.
   The uncertain VIP keys below are retired from the active route.
   Device IDs are not established for these positions, so they are captured, not assumed. */
const CV = [
  {id:"CV-WWL-ED",zone:"Walt Whitman Lobby",key:"ENTRANCE DOORS",qty:4},
  {id:"CV-WWL-CA",zone:"Walt Whitman Lobby",key:"CAROUSEL",qty:3},
  {id:"CV-WWL-MR",zone:"Walt Whitman Lobby",key:"MERCH",qty:2},
  {id:"CV-BFL-CA",zone:"Ben Franklin Lobby",key:"CAROUSEL",qty:4,note:"🔵 Fourth unit not yet identified in the inventory."},
  {id:"CV-BFL-MR",zone:"Ben Franklin Lobby",key:"MERCH",qty:2},
  {id:"CV-WWP-EA",zone:"Walt Whitman Plaza",key:"EA BAR LOUNGE",qty:2},
  {id:"CV-VIP-ST",zone:"VIP Club",key:"STREET SIDE",qty:2,note:"🟡 Legacy key reads VIP. Confirm on foot whether this is VIP Club or Black Box VIP. They are separate spaces."},
  {id:"CV-VIP-LB",zone:"VIP Club",key:"LOBBY SIDE",qty:2,note:"🟡 Legacy key reads VIP. Confirm the space on foot."}
];

/* Tier 2 zones. Counts are deliberately unknown: recording them is the point. */
const TIER2 = [
  {id:"BLK-WWL",name:"Walt Whitman Lobby",hint:"Count TVs and record any missing device labels."},
  {id:"BLK-WWP",name:"Walt Whitman Plaza",hint:"Count TVs and check for weather damage."},
  {id:"BLK-BFL",name:"Ben Franklin Lobby",hint:"Count TVs and record any missing device labels."},
  {id:"BLK-BFP",name:"Ben Franklin Plaza",hint:"Recount TVs to confirm the plaza total."},
  {id:"BLK-LWN",name:"Lawn",hint:"Complete the lawn count before the October 15 changeover."},
  {id:"BLK-VIP",name:"Black Box VIP · Patio · VIP Club",hint:"⛔ Three separate spaces. Record them separately, never merged."},
  {id:"BLK-BST",name:"Backstage and admin",hint:"Check the dressing room and admin SDI branch."},
  {id:"BLK-CON",name:"Concessions · WALT CON recount",hint:"Recount WALT CON TVs. The recorded total and device list differ."}
];

/* Optional area requested by the operator. Room/device totals are not yet established. */
const DRESSING = {id:"DR-ROOMS",env:"B",kind:"tv",name:"Dressing Rooms",zone:"Dressing Rooms",
  hint:"Record room names and display counts on foot. No room or device count is assumed. The broader Backstage and admin check is separate; note any overlap rather than treating the two counts as additive.",
  spec:[["Feed","Dressing room SDI branch"],["Count","record on foot"]]};

// Dave's September 27 correction: five indoor TVs, none on the Black Box patio.
// Older VIP keys covered uncertain or combined spaces; never relabel their readings.
const RETIRED_IDS = ["CV-VIP-ST","CV-VIP-LB","BLK-VIP"];
const EA_MENU = {id:"EA-WWP-MENU",env:"B",kind:"tv",tier:1,name:"EA Lounge VIP · bar menu TVs",zone:"Walt Whitman Plaza",stop:"EA Lounge VIP",qty:4,
  hint:"4 bar menu TVs. The 2 seating-area ConcertVision TVs have their own check in this same stop (6 TVs total).",
  spec:[["Bar menus","4 TVs"],["EA Lounge total","6 TVs: 4 menus + 2 seating ConcertVision"]]};
const BLACK_BOX = {id:"BBX-INDOOR",env:"B",kind:"tv",tier:2,name:"Black Box VIP",zone:"Walt Whitman Lobby",stop:"Black Box VIP",qty:5,
  hint:"5 indoor TVs: 4 ConcertVision in the seating area and 1 menu TV behind the bar. No TVs on the Black Box patio. Count the indoor TVs checked.",
  spec:[["Seating area","4 ConcertVision TVs"],["Behind the bar","1 menu TV"],["Patio","No TVs"]]};

/* ══════════════════════ station builder ══════════════════════ */
const ROUTE_VERSION = 2;
const LEGACY_ZONE_ORDER = ["Pavilion","Lawn","Building advertising LED","Walt Whitman Lobby","Walt Whitman Plaza","Ben Franklin Lobby","VIP Club","Ben Franklin Plaza","Black Box VIP · Patio · VIP Club","Backstage and admin","Concessions · WALT CON recount","Dressing Rooms"];
const ZONE_ORDER = ["Ben Franklin Lobby","Ben Franklin Plaza","Pavilion","Lawn","Walt Whitman Plaza","Walt Whitman Lobby","Backstage and admin","Concessions · WALT CON recount","Dressing Rooms"];
// Operator-confirmed walking stops, separate from the historical equipment labels.
const SPECIAL_STOPS = {
  "SPC-TP": {zone:"Ben Franklin Plaza",stop:"Tower spectacular"},
  "SPC-TB": {zone:"Ben Franklin Plaza",stop:"Tower spectacular"},
  "FLK-SR": {zone:"Pavilion",stop:"Outboard LEDs (2)"},
  "FLK-SL": {zone:"Pavilion",stop:"Outboard LEDs (2)"},
  "DLY-1": {zone:"Lawn",stop:"Delay LEDs (4)"},
  "DLY-2": {zone:"Lawn",stop:"Delay LEDs (4)"},
  "DLY-3": {zone:"Lawn",stop:"Delay LEDs (4)"},
  "DLY-4": {zone:"Lawn",stop:"Delay LEDs (4)"},
  "SPC-WP": {zone:"Walt Whitman Plaza",stop:"Wall spectacular"},
  "SPC-WB": {zone:"Walt Whitman Plaza",stop:"Wall spectacular"},
  "CV-WWP-EA": {zone:"Walt Whitman Plaza",stop:"EA Lounge VIP",name:"EA Lounge VIP · seating area",hint:"2 ConcertVision TVs in the seating area. The 4 bar menu TVs have their own check within this stop (6 TVs total)."}
};
function visualItems(s){
  if(s.kind !== "led") return [];
  let items = [
    {key:"powered",label:"Powered and showing content"},
    {key:"brightness",label:"Brightness matches the partner wall by eye"},
    {key:"modules",label:"No dead cabinets or modules"},
    {key:"colour",label:"No colour shift across the display"}
  ];
  if(s.level) items.push({key:"level",label:"Level against the fixed horizontal reference"});
  return items;
}
function positionLabel(s){
  return s.name + (s.key ? " · " + s.key : "");
}
function zoneLabel(zone){
  return zone === "Building advertising LED" ? "Building spectaculars" : zone;
}
function cvStation(c){
  return {id:c.id,env:"B",kind:"tv",tier:1,name:c.zone,zone:c.zone,key:c.key,qty:c.qty,note:c.note,
    spec:[["Key",c.key],["Positions",String(c.qty)],["Tech","ConcertVision DMP, wired HDMI"]]};
}
function tier2Station(item){
  return {id:item.id,env:"B",kind:"tv",tier:2,name:item.name,zone:item.name,hint:item.hint,
    spec:[["Check","Area count"],["Count","record on foot"]]};
}
function knownStation(id){
  return BOWL.concat(SPEC,CV,TIER2,[DRESSING,BLACK_BOX,EA_MENU]).some(function(item){ return item.id === id; });
}
/* One-time compatibility only: find the operator's current station in saves made
   before the all-zones route, then discard the old selector value. */
function previousRoute(meta){
  let m = meta || {}, checks = m.checks || null, sections = m.sections || {};
  let out = [];
  BOWL.forEach(function(s){ if(!(m.cfg === "winter" && s.zone === "Lawn")) out.push(s); });
  SPEC.forEach(function(s){ out.push(s); });
  CV.forEach(function(s){ out.push(cvStation(s)); });
  out.push(DRESSING);
  let selected = TIER2.find(function(item){ return item.id === m.block; });
  if(selected && !(m.cfg === "winter" && selected.id === "BLK-LWN")) out.push(tier2Station(selected));
  function enabled(s){
    if(checks && typeof checks[s.id] === "boolean") return checks[s.id];
    if(s.id === DRESSING.id) return false;
    if(BOWL.some(function(item){ return item.id === s.id; })) return sections.bowl !== false;
    if(SPEC.some(function(item){ return item.id === s.id; })) return sections.spec !== false;
    if(CV.some(function(item){ return item.id === s.id; })) return sections.cv !== false;
    return sections.tier2 !== false;
  }
  let filtered = out.filter(enabled);
  if(!checks) return filtered;
  let oldOrder = ["Pavilion","Lawn","Building advertising LED","Walt Whitman Lobby","Walt Whitman Plaza",
    "Ben Franklin Lobby","Ben Franklin Plaza","VIP Club","Black Box VIP · Patio · VIP Club","Dressing Rooms","Backstage and admin","Concessions · WALT CON recount"];
  return oldOrder.flatMap(function(zone){
    return filtered.filter(function(s){ return s.zone === zone; });
  });
}
function prepareMeta(meta){
  let m = Object.assign({date:"",show:"",op:"",cfg:"summer"}, meta);
  let legacy = m.sections || {};
  // Keep exclusions at check level so a legacy mixed zone is not silently expanded.
  m.checks = Object.assign({}, m.checks);
  [[BOWL,"bowl"],[SPEC,"spec"],[CV,"cv"]].forEach(function(group){
    group[0].forEach(function(s){
      if(typeof m.checks[s.id] !== "boolean") m.checks[s.id] = legacy[group[1]] !== false;
    });
  });
  TIER2.forEach(function(s){ delete m.checks[s.id]; });
  // New optional coverage must not silently change a saved route or its completion.
  if(typeof m.checks[DRESSING.id] !== "boolean") m.checks[DRESSING.id] = false;
  if(typeof m.checks[EA_MENU.id] !== "boolean") m.checks[EA_MENU.id] = m.checks["CV-WWP-EA"];
  delete m.sections;
  delete m.block;
  delete m.nextBlock;
  delete m.rotationBlock;
  m.routeVersion = ROUTE_VERSION;
  return m;
}
function restoreWalk(state, o){
  let oldPolicy = Object.prototype.hasOwnProperty.call(o.meta,"block") ||
    TIER2.some(function(s){ return o.meta.checks && Object.prototype.hasOwnProperty.call(o.meta.checks,s.id); });
  const routeChanged = oldPolicy || o.meta.routeVersion !== ROUTE_VERSION;
  const oldRoute = oldPolicy ? previousRoute(o.meta) : routeChanged ? legacyRoute(o.meta) : [];
  const oldCurrent = oldRoute[o.idx];
  const oldComplete = routeChanged && oldRoute.length > 0 && o.idx >= oldRoute.length;
  state.meta = prepareMeta(o.meta);
  state.res = o.res || {}; state.faults = o.faults || []; state.draft = o.draft || null;
  state.idx = Math.max(0, Number.isInteger(o.idx) ? o.idx : 0);
  state.faults.forEach(function(fault){
    if(fault.station && knownStation(fault.station) && !(state.res[fault.station] || {}).status){
      let result = state.res[fault.station] || {};
      result.status = "flag"; result.ts = fault.ts || new Date().toISOString();
      state.res[fault.station] = result;
    }
  });
  const route = stations(state.meta);
  if(routeChanged){
    const currentId = oldCurrent && (RETIRED_IDS.includes(oldCurrent.id) ? BLACK_BOX.id : oldCurrent.id);
    state.idx = currentId ? route.findIndex(function(s){ return s.id === currentId; }) : oldComplete ? route.length : 0;
    // The newly clarified indoor check has no inherited completion evidence.
    if(oldComplete){
      const pending = route.findIndex(function(s){ return [EA_MENU.id,BLACK_BOX.id].includes(s.id) && !(state.res[s.id] || {}).status; });
      if(pending >= 0) state.idx = pending;
    }
  }
  state.idx = Math.max(0, Math.min(state.idx, route.length));
}
function availableStations(meta, includeLegacy){
  let out = [], m = meta;
  for(let i=0;i<BOWL.length;i++){
    let w = BOWL[i];
    if(m.cfg === "winter" && w.zone === "Lawn") continue;
    out.push(w);
  }
  for(let j=0;j<SPEC.length;j++) out.push(SPEC[j]);
  for(let k=0;k<CV.length;k++) out.push(cvStation(CV[k]));
  out.push(DRESSING);
  for(let q=0;q<TIER2.length;q++) out.push(tier2Station(TIER2[q]));
  return includeLegacy ? out : out.filter(function(s){ return !RETIRED_IDS.includes(s.id); }).concat([EA_MENU,BLACK_BOX]);
}
function legacyRoute(meta){
  const prepared = prepareMeta(meta);
  const available = availableStations(prepared, true);
  return LEGACY_ZONE_ORDER.flatMap(function(zone){
    return available.filter(function(s){ return s.zone === zone && (s.tier === 2 || prepared.checks[s.id]); });
  });
}
const STOP_ORDER = ["Tower spectacular","Outboard LEDs (2)","Delay LEDs (4)","Wall spectacular","EA Lounge VIP","Black Box VIP"];
function stopOrder(station){ return station.stop ? STOP_ORDER.indexOf(station.stop) + 1 : 0; }
function zoneGroups(meta){
  const available = availableStations(meta).map(function(s){
    return SPECIAL_STOPS[s.id] ? Object.assign({}, s, SPECIAL_STOPS[s.id]) : s;
  });
  return ZONE_ORDER.map(function(zone){
    const checks = available.filter(function(s){ return s.zone === zone; });
    checks.sort(function(a,b){ return stopOrder(a) - stopOrder(b); });
    return {zone:zone,checks:checks};
  }).filter(function(group){ return group.checks.length; });
}
function stations(meta){
  return zoneGroups(meta).flatMap(function(group){
    return group.checks.filter(function(s){ return s.tier === 2 || meta.checks[s.id]; });
  });
}

function historicalReadings(state){
  return availableStations({cfg:"summer"}, true).filter(function(s){
    return RETIRED_IDS.includes(s.id) && state.res[s.id];
  }).map(function(s){ return {station:s,result:state.res[s.id]}; });
}

return Object.freeze({
  BOWL, SPEC, CV, TIER2, DRESSING, BLACK_BOX, EA_MENU, RETIRED_IDS, historicalReadings, knownStation, visualItems, positionLabel, zoneLabel, prepareMeta, restoreWalk, availableStations, zoneGroups, stations
});
})();
