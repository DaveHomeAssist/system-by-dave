/* wiring-shared.js — Metagrid electrical suite shared rules + project store
 * ---------------------------------------------------------------------------
 * Classic (non-module) script so it loads over file:// without CORS issues.
 * Exposes a single global: window.WiringShared. Also exports for Node tests.
 *
 * HARD RULES honored here:
 *   - No backend, no build, no external deps. Pure vanilla.
 *   - localStorage only, every access wrapped in try/catch (private-mode safe),
 *     writes debounced.
 *   - ONE namespaced key for shared project data: metagrid.project.v1
 *
 * REGRESSION CONTRACT:
 *   - boxFill()     ports NEC 314.16 arithmetic VERBATIM from
 *                   residential-wiring-reference.html calc() (lines ~1077-1115).
 *   - loadEstimate() ports the NEC 220.83 VA/demand math VERBATIM from
 *                   panel-schedule-56HA.html (loadVA + renderCapacity/renderPlanner).
 *   The two functions above MUST stay output-identical to those inline versions;
 *   they are oracle-tested in Node (see wiring-shared.test.js style harness).
 *
 *   - spacingCheck() and bom() have NO inline original. They are new pure
 *     helpers. Their geometric outputs are SCHEMATIC / [ASSUMED] — derived feet
 *     are not measured values.
 */
(function (global) {
  "use strict";

  /* ======================================================================
   * NEC 314.16(B) — Box fill (per-gauge mixed-gauge model)
   * VERBATIM port of residential-wiring-reference.html calc() (current
   * cond14/cond12/cond10 implementation). Each insulated conductor counts at
   * its own gauge's allowance; grounds/clamps/devices count at the LARGEST
   * conductor present (NEC 314.16(B)(5)). Inline source:
   *   var insulatedVolume = cond14*U.cond14 + cond12*U.cond12 + cond10*U.cond10;
   *   var present = keys with count>0; largestKey = present[present.length-1] || 'cond12';
   *   var groundVolume = (grounds>0?1:0)*U[largestKey];  // clampVolume same; deviceUnits=devices*2
   *   var required = insulatedVolume + groundVolume + clampVolume + deviceVolume;
   *   var fit = smallestFit(required);   // BOX_SIZES = [18,20.3,22.5,30.3,42]
   * ==================================================================== */
  var BOX_SIZES = [18, 20.3, 22.5, 30.3, 42];
  var AWG_UNITS = { cond14: 2.0, cond12: 2.25, cond10: 2.5 };

  function smallestFit(req) {
    for (var i = 0; i < BOX_SIZES.length; i++) {
      if (BOX_SIZES[i] >= req) return BOX_SIZES[i];
    }
    return null;
  }

  // num(): mirror the inline `num()` coercion — parseFloat, NaN -> 0.
  function num(v) {
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  /**
   * boxFill(conductors) — NEC 314.16(B) per-gauge volume tally.
   * @param {Object} c
   *   c.cond14   count of 14 AWG insulated conductors (allowance 2.00 cu in)
   *   c.cond12   count of 12 AWG insulated conductors (allowance 2.25 cu in)
   *   c.cond10   count of 10 AWG insulated conductors (allowance 2.50 cu in)
   *   c.devices  device yokes          (each = 2 units, at largest-conductor allowance)
   *   c.grounds  equipment grounds      (all combined = 1 unit, at largest allowance)
   *   c.clamps   internal cable clamps  (all combined = 1 unit, at largest allowance)
   *   c.boxsize  optional target box volume (cu in) to evaluate ok/headroom
   * @returns {Object} per-gauge breakdown + { totalUnits, required, fit, target, ok, headroom, mixedGauge }
   */
  function boxFill(c) {
    c = c || {};
    var cond14 = num(c.cond14);
    var cond12 = num(c.cond12);
    var cond10 = num(c.cond10);
    var devices = num(c.devices);
    var grounds = num(c.grounds);
    var clamps = num(c.clamps);

    // --- VERBATIM arithmetic from calc() (per-gauge mixed-gauge model) ---
    var counts = { cond14: cond14, cond12: cond12, cond10: cond10 };
    var insulatedVolume = cond14 * AWG_UNITS.cond14 + cond12 * AWG_UNITS.cond12 + cond10 * AWG_UNITS.cond10;
    var present = Object.keys(counts).filter(function (k) {
      return counts[k] > 0;
    });
    var largestKey = present.length ? present[present.length - 1] : "cond12";
    var largestUnit = AWG_UNITS[largestKey];
    var groundUnit = grounds > 0 ? 1 : 0;
    var clampUnit = clamps > 0 ? 1 : 0;
    var deviceUnits = devices * 2;
    var groundVolume = groundUnit * largestUnit;
    var clampVolume = clampUnit * largestUnit;
    var deviceVolume = deviceUnits * largestUnit;
    var totalUnits = cond14 + cond12 + cond10 + groundUnit + clampUnit + deviceUnits;
    var required = insulatedVolume + groundVolume + clampVolume + deviceVolume;
    var fit = smallestFit(required);
    // --- end verbatim ---

    var target = c.boxsize != null && c.boxsize !== "" ? num(c.boxsize) : null;
    var ok = target != null ? target >= required : null;
    var headroom = target != null ? target - required : null;

    return {
      cond14: cond14,
      cond12: cond12,
      cond10: cond10,
      insulatedVolume: insulatedVolume,
      largestKey: largestKey,
      largestUnit: largestUnit,
      groundUnit: groundUnit,
      clampUnit: clampUnit,
      deviceUnits: deviceUnits,
      groundVolume: groundVolume,
      clampVolume: clampVolume,
      deviceVolume: deviceVolume,
      totalUnits: totalUnits,
      required: required,
      fit: fit,
      target: target,
      ok: ok,
      headroom: headroom,
      mixedGauge: present.length >= 2,
    };
  }

  /* ======================================================================
   * NEC 220.83 — VA / demand load estimate
   * VERBATIM port of panel-schedule-56HA.html.
   * Inline source (for reference / oracle):
   *   const VA_BY_NAME = {...};
   *   const VA_BY_KIND = {light:120, outlet:180, net:100, appl:1000, hvac:3500, pump:800, unk:0};
   *   const loadVA = l => VA_BY_NAME[l.load] ?? VA_BY_KIND[l.kind] ?? 150;
   *   // connected:  total = sum(loadVA);  connA = Math.round(total/240)
   *   // demand 220.83: Math.round((10000 + 0.4*Math.max(0, totalVA-10000)) / 240)
   * ==================================================================== */
  var VA_BY_NAME = {
    "Electric dryer": 5000,
    "A/C condenser": 3500,
    "Refrigerator": 700,
    "Microwave": 1500,
    "Dishwasher": 1400,
    "Coffee pot": 1000,
    "Washing machine (likely)": 1200,
    "Oven": 300,
    "Sump pump #2": 800,
  };
  var VA_BY_KIND = { light: 120, outlet: 180, net: 100, appl: 1000, hvac: 3500, pump: 800, unk: 0 };

  // loadVA — VERBATIM (?? chain: name, then kind, then 150 fallback).
  function loadVA(l) {
    l = l || {};
    var byName = VA_BY_NAME[l.load];
    if (byName !== undefined && byName !== null) return byName;
    var byKind = VA_BY_KIND[l.kind];
    if (byKind !== undefined && byKind !== null) return byKind;
    return 150;
  }

  // NEC 220.83 demand: 10kVA at 100%, remainder at 40%, to amps @ 240V.
  // VERBATIM formula from renderPlanner().
  function demandAmps(totalVA) {
    return Math.round((10000 + 0.4 * Math.max(0, totalVA - 10000)) / 240);
  }

  /**
   * loadEstimate(loads) — connected VA + NEC 220.83 demand.
   * @param {Array} loads  array of { load, kind, ... } (panel LOADS[] shape)
   * @returns {Object} { totalVA, connectedA, demandA, count }
   */
  function loadEstimate(loads) {
    loads = Array.isArray(loads) ? loads : [];
    var totalVA = 0;
    for (var i = 0; i < loads.length; i++) {
      totalVA += loadVA(loads[i]);
    }
    return {
      totalVA: totalVA,
      connectedA: Math.round(totalVA / 240),
      demandA: demandAmps(totalVA),
      count: loads.length,
    };
  }

  /* ======================================================================
   * NEC 210.52(A) — Receptacle spacing (6 ft / 12 ft rule)
   * NEW helper (no inline original). SCHEMATIC / [ASSUMED] geometry.
   *
   * Rule modeled: along each wall run, no point may be more than 6 ft from a
   * receptacle, i.e. the first/last receptacle is <= 6 ft from each end and
   * consecutive receptacles are <= 12 ft apart. Wall runs < 2 ft are exempt
   * (210.52(A)(2)).
   *
   * Coordinates are in FEET. Receptacles are projected onto each wall segment.
   * ==================================================================== */
  var SPACING = { MAX_FROM_END_FT: 6, MAX_BETWEEN_FT: 12, MIN_WALL_FT: 2 };

  function _projectOntoSegment(px, py, x1, y1, x2, y2) {
    // returns { t, distPerp } where t is fractional position [0..1] along seg
    var dx = x2 - x1,
      dy = y2 - y1;
    var len2 = dx * dx + dy * dy;
    if (len2 === 0) return { t: 0, distPerp: Math.hypot(px - x1, py - y1) };
    var t = ((px - x1) * dx + (py - y1) * dy) / len2;
    var ct = Math.max(0, Math.min(1, t));
    var cx = x1 + ct * dx,
      cy = y1 + ct * dy;
    return { t: t, distPerp: Math.hypot(px - cx, py - cy) };
  }

  /**
   * spacingCheck(items, walls)
   * @param {Array} items receptacles as { x, y } in FEET (filter to outlets before calling)
   * @param {Array} walls wall segments as { x1, y1, x2, y2} in FEET (optionally {label})
   * @param {Object} [opts] { perpToleranceFt: how close a recep must be to a wall to count (default 1.5) }
   * @returns {Object} { ok, walls:[{label, lengthFt, receptacles, gaps:[...], violations:[...]}], violations:[...] }
   *   NOTE: schematic — gaps are [ASSUMED] from drawing geometry, not measured.
   */
  function spacingCheck(items, walls, opts) {
    items = Array.isArray(items) ? items : [];
    walls = Array.isArray(walls) ? walls : [];
    opts = opts || {};
    var perpTol = opts.perpToleranceFt != null ? opts.perpToleranceFt : 1.5;

    var wallResults = [];
    var allViolations = [];

    for (var w = 0; w < walls.length; w++) {
      var seg = walls[w];
      var lengthFt = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
      var label = seg.label || "wall " + (w + 1);

      // Project nearby receptacles onto this wall, keep those within tolerance.
      var ts = [];
      for (var i = 0; i < items.length; i++) {
        var pr = _projectOntoSegment(items[i].x, items[i].y, seg.x1, seg.y1, seg.x2, seg.y2);
        if (pr.t >= -0.001 && pr.t <= 1.001 && pr.distPerp <= perpTol) {
          ts.push(Math.max(0, Math.min(1, pr.t)) * lengthFt);
        }
      }
      ts.sort(function (a, b) {
        return a - b;
      });

      var gaps = [];
      var violations = [];

      if (lengthFt >= SPACING.MIN_WALL_FT) {
        if (ts.length === 0) {
          violations.push({ wall: label, type: "no-receptacle", lengthFt: round2(lengthFt) });
        } else {
          // gap from start
          var startGap = ts[0];
          gaps.push(round2(startGap));
          if (startGap > SPACING.MAX_FROM_END_FT) {
            violations.push({ wall: label, type: "start-gap", gapFt: round2(startGap), limitFt: SPACING.MAX_FROM_END_FT });
          }
          // gaps between consecutive receptacles
          for (var k = 1; k < ts.length; k++) {
            var g = ts[k] - ts[k - 1];
            gaps.push(round2(g));
            if (g > SPACING.MAX_BETWEEN_FT) {
              violations.push({ wall: label, type: "between-gap", gapFt: round2(g), limitFt: SPACING.MAX_BETWEEN_FT });
            }
          }
          // gap to end
          var endGap = lengthFt - ts[ts.length - 1];
          gaps.push(round2(endGap));
          if (endGap > SPACING.MAX_FROM_END_FT) {
            violations.push({ wall: label, type: "end-gap", gapFt: round2(endGap), limitFt: SPACING.MAX_FROM_END_FT });
          }
        }
      }

      wallResults.push({
        label: label,
        lengthFt: round2(lengthFt),
        receptacles: ts.length,
        gaps: gaps,
        violations: violations,
      });
      for (var v = 0; v < violations.length; v++) allViolations.push(violations[v]);
    }

    return { ok: allViolations.length === 0, walls: wallResults, violations: allViolations, schematic: true };
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  /* ======================================================================
   * Bill of materials — count placed items by type/layer.
   * NEW helper (no inline original).
   * ==================================================================== */
  /**
   * bom(items, opts)
   * @param {Array} items planner items: { type, layer, floor, ... }
   * @param {Object} [opts] { labels: { type -> human label } }
   * @returns {Object} { total, byType:[{type, layer, count, label}], byFloor:{} }
   */
  function bom(items, opts) {
    items = Array.isArray(items) ? items : [];
    opts = opts || {};
    var labels = opts.labels || {};
    var map = {};
    var byFloor = {};
    for (var i = 0; i < items.length; i++) {
      var it = items[i] || {};
      var type = it.type != null ? String(it.type) : "unknown";
      var layer = it.layer != null ? String(it.layer) : "";
      var floor = it.floor != null ? it.floor : "basement";
      var key = layer + " " + type;
      if (!map[key]) map[key] = { type: type, layer: layer, count: 0, label: labels[type] || type };
      map[key].count++;
      byFloor[floor] = (byFloor[floor] || 0) + 1;
    }
    var byType = Object.keys(map).map(function (k) {
      return map[k];
    });
    byType.sort(function (a, b) {
      if (a.layer !== b.layer) return a.layer < b.layer ? -1 : 1;
      return a.type < b.type ? -1 : a.type > b.type ? 1 : 0;
    });
    return { total: items.length, byType: byType, byFloor: byFloor };
  }

  /* ======================================================================
   * Project store — ONE namespaced key: metagrid.project.v1
   * Versioned, read-modify-write partial updates (so each app only touches
   * its owned slice), debounced writes, private-mode safe.
   *
   * Ownership (confirmed contract):
   *   Panel   owns circuits[] / loads[]
   *   Planner owns items[]      (join on circuitId)
   *   Reference reads only.
   * ==================================================================== */
  var PROJECT_KEY = "metagrid.project.v1";
  var PROJECT_VERSION = 1;

  function _ls() {
    try {
      return global.localStorage || null;
    } catch (e) {
      return null;
    }
  }

  function emptyProject() {
    return { v: PROJECT_VERSION, updatedAt: 0, circuits: [], loads: [], items: [], meta: {} };
  }

  function loadProject() {
    var ls = _ls();
    if (!ls) return emptyProject();
    try {
      var raw = ls.getItem(PROJECT_KEY);
      if (!raw) return emptyProject();
      var d = JSON.parse(raw);
      if (!d || d.v !== PROJECT_VERSION) return emptyProject();
      var base = emptyProject();
      base.updatedAt = d.updatedAt || 0;
      base.circuits = Array.isArray(d.circuits) ? d.circuits : [];
      base.loads = Array.isArray(d.loads) ? d.loads : [];
      base.items = Array.isArray(d.items) ? d.items : [];
      base.meta = d.meta && typeof d.meta === "object" ? d.meta : {};
      return base;
    } catch (e) {
      return emptyProject();
    }
  }

  var _saveTimer = null;
  var _pending = null;

  function _writeNow(p) {
    var ls = _ls();
    if (!ls) return false;
    try {
      p.updatedAt = nowTs();
      ls.setItem(PROJECT_KEY, JSON.stringify(p));
      return true;
    } catch (e) {
      return false;
    }
  }

  function nowTs() {
    try {
      return Date.now();
    } catch (e) {
      return 0;
    }
  }

  /**
   * saveProject(project, immediate) — full write. Debounced (250ms) unless
   * immediate === true. Returns true if written synchronously.
   */
  function saveProject(project, immediate) {
    _pending = project;
    if (_saveTimer) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
    }
    if (immediate) {
      var ok = _writeNow(_pending);
      _pending = null;
      return ok;
    }
    _saveTimer = setTimeout(function () {
      _saveTimer = null;
      if (_pending) {
        _writeNow(_pending);
        _pending = null;
      }
    }, 250);
    return false;
  }

  function flushProject() {
    if (_saveTimer) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
    }
    if (_pending) {
      var ok = _writeNow(_pending);
      _pending = null;
      return ok;
    }
    return false;
  }

  /**
   * updateProject(patch, immediate) — read-modify-write a partial slice without
   * clobbering slices owned by other apps. patch may contain circuits/loads/
   * items/meta. Default immediate=true (bridge changes should be durable at once).
   * Returns the merged project.
   */
  function updateProject(patch, immediate) {
    patch = patch || {};
    var p = loadProject();
    if (Object.prototype.hasOwnProperty.call(patch, "circuits") && Array.isArray(patch.circuits)) p.circuits = patch.circuits;
    if (Object.prototype.hasOwnProperty.call(patch, "loads") && Array.isArray(patch.loads)) p.loads = patch.loads;
    if (Object.prototype.hasOwnProperty.call(patch, "items") && Array.isArray(patch.items)) p.items = patch.items;
    if (patch.meta && typeof patch.meta === "object") {
      for (var key in patch.meta) {
        if (Object.prototype.hasOwnProperty.call(patch.meta, key)) p.meta[key] = patch.meta[key];
      }
    }
    saveProject(p, immediate !== false);
    return p;
  }

  function resetProject() {
    var ls = _ls();
    if (_saveTimer) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
    }
    _pending = null;
    if (ls) {
      try {
        ls.removeItem(PROJECT_KEY);
      } catch (e) {}
    }
    return emptyProject();
  }

  /**
   * watch(cb) — re-read the project when another tab writes (storage event) or
   * this tab regains focus / becomes visible. Returns an unsubscribe function.
   */
  function watch(cb) {
    if (typeof cb !== "function" || !global.addEventListener) return function () {};
    var onStorage = function (e) {
      if (!e || e.key === PROJECT_KEY || e.key == null) cb(loadProject(), "storage");
    };
    var onFocus = function () {
      cb(loadProject(), "focus");
    };
    var onVis = function () {
      if (!global.document || global.document.visibilityState === "visible") cb(loadProject(), "visibility");
    };
    global.addEventListener("storage", onStorage);
    global.addEventListener("focus", onFocus);
    if (global.document && global.document.addEventListener) global.document.addEventListener("visibilitychange", onVis);
    return function () {
      global.removeEventListener("storage", onStorage);
      global.removeEventListener("focus", onFocus);
      if (global.document && global.document.removeEventListener) global.document.removeEventListener("visibilitychange", onVis);
    };
  }

  /* ======================================================================
   * Deep-link hash helpers — shared parse so the three apps agree on format:
   *   panel  / planner : #circuit=<id>
   *   reference        : #part<N> | #calc | #appendix | #contents
   * ==================================================================== */
  function parseHash(hash) {
    var h = (hash || "").replace(/^#/, "");
    if (!h) return null;
    var m = h.match(/^circuit=(.+)$/);
    if (m) {
      // In a URL *fragment* '+' is literal (NOT a space), so circuit ids like
      // "4+6" / "8+10" must be preserved. decodeURIComponent leaves '+' intact.
      var id;
      try {
        id = decodeURIComponent(m[1]);
      } catch (e) {
        id = m[1];
      }
      return { kind: "circuit", id: id };
    }
    return { kind: "anchor", id: h };
  }

  /* ======================================================================
   * Export
   * ==================================================================== */
  var WiringShared = {
    // NEC math
    boxFill: boxFill,
    smallestFit: smallestFit,
    BOX_SIZES: BOX_SIZES,
    AWG_UNITS: AWG_UNITS,
    loadEstimate: loadEstimate,
    loadVA: loadVA,
    demandAmps: demandAmps,
    VA_BY_NAME: VA_BY_NAME,
    VA_BY_KIND: VA_BY_KIND,
    spacingCheck: spacingCheck,
    SPACING: SPACING,
    bom: bom,
    // project store
    project: {
      KEY: PROJECT_KEY,
      VERSION: PROJECT_VERSION,
      empty: emptyProject,
      load: loadProject,
      save: saveProject,
      update: updateProject,
      flush: flushProject,
      reset: resetProject,
      watch: watch,
    },
    parseHash: parseHash,
  };

  // Browser global
  global.WiringShared = WiringShared;
  // Node / test export
  if (typeof module !== "undefined" && module.exports) module.exports = WiringShared;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
