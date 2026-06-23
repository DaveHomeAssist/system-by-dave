/* Literary Agent Finder — build notebook
 * Standalone implementation of the Claude Design prototype.
 * No proprietary runtime: plain DOM + localStorage. Six horizontally
 * snapping panels, count-up stats, and an editable kanban task board.
 */
(function () {
  'use strict';

  // ---- Static configuration (mirrors the design's data) -------------------
  var KEY = 'laf-portal-v1';
  var N = 6;
  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var STATUSES = [
    { key: 'backlog',  label: 'Backlog',  emoji: '📥' },
    { key: 'building', label: 'Building', emoji: '🔨' },
    { key: 'review',   label: 'Review',   emoji: '🔍' },
    { key: 'shipped',  label: 'Shipped',  emoji: '✅' },
  ];
  var OWNERS = ['you', 'connor', 'both'];
  var OWNER_META = {
    you:    { label: 'You',    emoji: '🖊️', color: '#b23a30', note: '#fbe1c8', edge: '#e7c39e' },
    connor: { label: 'Connor', emoji: '📖', color: '#2f5d7c', note: '#d6e6f2', edge: '#a9c6dd' },
    both:   { label: 'Both',   emoji: '🤝', color: '#5a7052', note: '#dde9cf', edge: '#bcd0a6' },
  };
  var SECTIONS = [
    { label: 'Overview',  emoji: '🧭' },
    { label: 'Landscape', emoji: '📚' },
    { label: 'Blueprint', emoji: '🗂️' },
    { label: 'Features',  emoji: '✨' },
    { label: 'Roadmap',   emoji: '🧱' },
    { label: 'Board',     emoji: '🎯' },
  ];
  var PHASES = [
    { key: 'P0', title: 'Foundations' },
    { key: 'P1', title: 'Search & Profiles' },
    { key: 'P2', title: 'Match Engine' },
    { key: 'P3', title: 'Query Tracker' },
    { key: 'P4', title: 'Composer & Intel' },
    { key: 'P5', title: 'Polish & Launch' },
  ];
  var FEATURES = [
    { emoji: '📇', phase: 'P1', title: 'Agent Database & Search', blurb: 'Filter the roster by genre, agency, open/closed status and typical response time.' },
    { emoji: '🎯', phase: 'P2', title: 'Match Engine', blurb: 'Score agents on genre fit, comp-title overlap, deal recency, and how open they are now.' },
    { emoji: '📬', phase: 'P3', title: 'Query Tracker', blurb: 'A kanban of every submission, deadlines, and a 90-day nudge when an agent goes quiet.' },
    { emoji: '✒️', phase: 'P4', title: 'Submission Composer', blurb: 'A letter builder with per-agent tokens — pull MSWL and recent deals into the salutation.' },
    { emoji: '📈', phase: 'P4', title: 'Agent Intel', blurb: 'A live deals feed, parsed MSWL keywords, and crowd-sourced response-time stats.' },
    { emoji: '📖', phase: 'P1', title: 'Author Profile', blurb: 'Manuscript metadata, comps, bio and materials — the input the match engine reads.' },
  ];
  var RIVALS = [
    { emoji: '🗂️', name: 'QueryTracker',           gap: 'Dated UI, freemium gates, no real matching — a ledger, not a guide.', db: true,  match: false, track: true,  dark: false },
    { emoji: '💬', name: 'Manuscript Wish List',   gap: 'Unstructured prose, not filterable, goes stale, half of it lives on X.', db: false, match: false, track: false, dark: false },
    { emoji: '📈', name: 'Publishers Marketplace', gap: '$25/mo, built for agents & editors — overkill for a querying author.', db: true,  match: false, track: false, dark: false },
    { emoji: '🎲', name: 'Duotrope',               gap: 'Strongest on short fiction; the agent side is thin, subscription-only.', db: true,  match: false, track: false, dark: false },
    { emoji: '🦈', name: 'AgentQuery + Shark',     gap: 'Static lists, irregular updates, zero tracking once you hit send.', db: true,  match: false, track: false, dark: false },
    { emoji: '🖋️', name: 'Agent Finder (us)',      gap: 'Fresh filterable database + a real match engine + a tracker that nudges.', db: true,  match: true,  track: true,  dark: true },
  ];
  var FLOW = ['Onboarding','Profile','Search','Agent','Match','Tracker','Composer','Dashboard'];
  var SEED = [
    { id: 't1',  title: 'Define agent + query data schema',        phase: 'P0', owner: 'both',   status: 'shipped' },
    { id: 't2',  title: 'Set up repo, CI & deploy pipeline',       phase: 'P0', owner: 'you',    status: 'shipped' },
    { id: 't3',  title: 'Seed curated agent set from official agency pages', phase: 'P0', owner: 'connor', status: 'building' },
    { id: 't4',  title: 'Agent search filters',                    phase: 'P1', owner: 'you',    status: 'review' },
    { id: 't5',  title: 'Agent profile page',                      phase: 'P1', owner: 'connor', status: 'building' },
    { id: 't6',  title: 'Author manuscript profile form',          phase: 'P1', owner: 'you',    status: 'backlog' },
    { id: 't7',  title: 'Match scoring algorithm v1',              phase: 'P2', owner: 'both',   status: 'backlog' },
    { id: 't8',  title: 'Comp-title overlap analysis',             phase: 'P2', owner: 'connor', status: 'backlog' },
    { id: 't9',  title: 'Recent-deal recency weighting',           phase: 'P2', owner: 'you',    status: 'backlog' },
    { id: 't10', title: 'Query kanban tracker',                    phase: 'P3', owner: 'you',    status: 'backlog' },
    { id: 't11', title: 'Submission deadline & 90-day nudges',     phase: 'P3', owner: 'connor', status: 'backlog' },
    { id: 't12', title: 'Response-time stats per agent',           phase: 'P3', owner: 'you',    status: 'backlog' },
    { id: 't13', title: 'Query-letter composer + tokens',          phase: 'P4', owner: 'you',    status: 'backlog' },
    { id: 't14', title: 'MSWL parser & intel feed',                phase: 'P4', owner: 'connor', status: 'backlog' },
    { id: 't15', title: 'Deals feed integration',                  phase: 'P4', owner: 'both',   status: 'backlog' },
    { id: 't16', title: 'Accounts + auth',                         phase: 'P5', owner: 'connor', status: 'backlog' },
    { id: 't17', title: 'Onboarding flow',                         phase: 'P5', owner: 'you',    status: 'backlog' },
    { id: 't18', title: 'Mobile responsive polish',               phase: 'P5', owner: 'you',    status: 'backlog' },
    { id: 't19', title: 'Beta launch checklist',                  phase: 'P5', owner: 'both',   status: 'backlog' },
  ];

  // ---- Small helpers --------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function now() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }

  // ---- State ----------------------------------------------------------------
  var tasks = load();
  var cur = 0;
  var animatingScroll = false;
  var scrollRaf = null;
  var els = {};

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (Array.isArray(p) && p.length) return p;
      }
    } catch (e) {}
    return SEED.map(function (t) { return Object.assign({}, t); });
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch (e) {} }
  function commit(next) { tasks = next; persist(); renderDynamic(); }

  // ---- Task mutations -------------------------------------------------------
  function move(id, dir) {
    var order = STATUSES.map(function (s) { return s.key; });
    commit(tasks.map(function (t) {
      if (t.id !== id) return t;
      var i = clamp(order.indexOf(t.status) + dir, 0, order.length - 1);
      return Object.assign({}, t, { status: order[i] });
    }));
  }
  function cycleOwner(id) {
    commit(tasks.map(function (t) {
      if (t.id !== id) return t;
      var i = OWNERS.indexOf(t.owner);
      return Object.assign({}, t, { owner: OWNERS[(i + 1) % OWNERS.length] });
    }));
  }
  function del(id) { commit(tasks.filter(function (t) { return t.id !== id; })); }
  function addTask(status) {
    var title = (window.prompt('New task') || '').trim();
    if (!title) return;
    commit(tasks.concat([{ id: 'u' + Date.now(), title: title, phase: '—', owner: 'you', status: status }]));
  }
  function reset() {
    if (window.confirm('Reset the board to the original plan? Your changes will be lost.'))
      commit(SEED.map(function (t) { return Object.assign({}, t); }));
  }

  // ---- Derived values -------------------------------------------------------
  function derive() {
    var total = tasks.length;
    var shipped = tasks.filter(function (t) { return t.status === 'shipped'; }).length;
    var inFlight = tasks.filter(function (t) { return t.status === 'building' || t.status === 'review'; }).length;
    var pct = total ? Math.round((shipped / total) * 100) : 0;
    return {
      total: total, shipped: shipped, inFlight: inFlight, pct: pct,
      ringOffset: 326.7 * (1 - pct / 100),
    };
  }

  function capStyle(on, dark) {
    var base = "font-family:'Special Elite',monospace;font-size:0.48rem;letter-spacing:0.04em;border-radius:2px;padding:2px 6px;border:1.5px solid ";
    if (on) return base + '#b23a30;background:#b23a30;color:#fffdf8;';
    return base + (dark
      ? 'rgba(255,253,248,0.35);background:transparent;color:rgba(255,253,248,0.5);'
      : '#c9bda0;background:transparent;color:#b6aa8e;');
  }

  // ---- Static panels (rendered once) ---------------------------------------
  function renderStatic() {
    // Landscape — rival cards
    els.rivalGrid.innerHTML = RIVALS.map(function (r) {
      var bg = r.dark ? '#283648' : '#fffdf8';
      var titleColor = r.dark ? '#e7c45c' : '#283648';
      var bodyColor = r.dark ? '#dfe4ea' : '#6a6f78';
      var caps = [
        { label: 'DB',    style: capStyle(r.db, r.dark) },
        { label: 'MATCH', style: capStyle(r.match, r.dark) },
        { label: 'TRACK', style: capStyle(r.track, r.dark) },
      ].map(function (c) {
        return '<span style="' + c.style + '">' + c.label + '</span>';
      }).join('');
      return '' +
        '<div style="background:' + bg + ';border:1.5px solid #283648;border-radius:3px;padding:14px;box-shadow:3px 4px 0 rgba(40,54,72,0.10);">' +
          '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:18px;">' + r.emoji + '</span>' +
          '<span style="font-family:\'Spectral\',serif;font-weight:600;font-size:1.06rem;color:' + titleColor + ';line-height:1.08;">' + esc(r.name) + '</span></div>' +
          '<p style="margin:8px 0 10px;font-size:0.86rem;line-height:1.45;color:' + bodyColor + ';">' + esc(r.gap) + '</p>' +
          '<div style="display:flex;gap:5px;">' + caps + '</div>' +
        '</div>';
    }).join('');

    // Blueprint — screen flow chips
    var flowBase = "background:#f6f1e4;border:1.5px solid #283648;border-radius:2px;padding:4px 9px;font-family:'Special Elite',monospace;font-size:0.62rem;color:#283648;";
    var flowLast = "background:#283648;border:1.5px solid #283648;border-radius:2px;padding:4px 9px;font-family:'Special Elite',monospace;font-size:0.62rem;color:#f6f1e4;";
    els.flowSteps.innerHTML = FLOW.map(function (label, i) {
      var last = i === FLOW.length - 1;
      return '<span style="' + (last ? flowLast : flowBase) + '">' + esc(label) + '</span>' +
        '<span style="color:#b23a30;font-weight:700;font-size:0.8rem;">' + (last ? '' : '→') + '</span>';
    }).join('');

    // Features — spec cards
    els.featureGrid.innerHTML = FEATURES.map(function (f) {
      return '' +
        '<div style="background:#fffdf8;border:1.5px solid #283648;border-radius:3px;padding:15px;box-shadow:3px 4px 0 rgba(40,54,72,0.10);">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;"><span style="font-size:19px;">' + f.emoji + '</span>' +
          '<span style="font-family:\'Special Elite\',monospace;font-size:0.52rem;letter-spacing:0.05em;text-transform:uppercase;color:#5a7052;border:1.5px solid #5a7052;border-radius:2px;padding:2px 6px;transform:rotate(2deg);">' + f.phase + '</span></div>' +
          '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:1.14rem;color:#283648;margin-top:9px;">' + esc(f.title) + '</div>' +
          '<p style="margin:6px 0 0;font-size:0.9rem;line-height:1.48;color:#5a6473;">' + esc(f.blurb) + '</p>' +
        '</div>';
    }).join('');

    // Bottom nav
    els.navItems.innerHTML = SECTIONS.map(function (s, i) {
      return '' +
        '<button type="button" data-nav="' + i + '" style="position:relative;z-index:1;flex:1;display:flex;flex-direction:column;align-items:safe center;gap:4px;border:none;cursor:pointer;padding:10px 4px 9px;background:transparent;color:#46505f;border-right:1px solid rgba(40,54,72,0.10);">' +
          '<span style="font-size:18px;line-height:1;">' + s.emoji + '</span>' +
          '<span style="font-family:\'Special Elite\',monospace;font-size:0.62rem;letter-spacing:0.05em;text-transform:uppercase;">' + s.label + '</span>' +
        '</button>';
    }).join('');
  }

  // ---- Dynamic content (re-rendered on every commit) -----------------------
  function renderDynamic() {
    var d = derive();

    // Header
    els.hdrPct.textContent = d.pct + '%';
    els.hdrBar.style.width = d.pct + '%';

    // Overview stats + ring (data-count holds the target for the mount animation)
    setStat(els.ringPct, d.pct, '%');
    setStat(els.statTasks, d.total, '');
    setStat(els.statShipped, d.shipped, '');
    setStat(els.statInflight, d.inFlight, '');
    els.ringCircle.setAttribute('stroke-dashoffset', d.ringOffset);

    // Roadmap — bars + cards
    var phases = PHASES.map(function (p) {
      var ts = tasks.filter(function (t) { return t.phase === p.key; });
      var done = ts.filter(function (t) { return t.status === 'shipped'; }).length;
      var tot = ts.length;
      var pct = tot ? Math.round((done / tot) * 100) : 0;
      return { key: p.key, title: p.title, done: done, total: tot, pct: pct,
        barH: Math.max(3, Math.round(pct * 0.85)) + '%' };
    });
    els.roadmapBars.innerHTML = phases.map(function (p) {
      return '' +
        '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:5px;">' +
          '<span style="font-family:\'Caveat\',cursive;font-weight:700;font-size:1rem;color:#b23a30;line-height:1;">' + p.pct + '%</span>' +
          '<div style="width:100%;max-width:46px;height:' + p.barH + ';min-height:3px;background:repeating-linear-gradient(45deg,#5a7052 0,#5a7052 5px,#6b8260 5px,#6b8260 10px);border:1.5px solid #283648;border-radius:2px 2px 0 0;transition:height 0.6s cubic-bezier(0.16,1,0.3,1);"></div>' +
          '<span style="font-family:\'Special Elite\',monospace;font-size:0.58rem;color:#283648;">' + p.key + '</span>' +
        '</div>';
    }).join('');
    els.roadmapCards.innerHTML = phases.map(function (p) {
      return '' +
        '<div style="display:flex;align-items:center;gap:11px;background:#fffdf8;border:1.5px solid #283648;border-radius:3px;padding:9px 12px;box-shadow:2px 3px 0 rgba(40,54,72,0.10);">' +
          '<div style="width:34px;height:34px;flex:none;border:1.5px solid #283648;border-radius:3px;background:#f6f1e4;color:#283648;font-family:\'Caveat\',cursive;font-weight:700;font-size:1.05rem;display:flex;align-items:safe center;justify-content:safe center;transform:rotate(-3deg);">' + p.key + '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;"><span style="font-family:\'Spectral\',serif;font-weight:600;font-size:0.9rem;color:#283648;">' + esc(p.title) + '</span>' +
            '<span style="font-family:\'Special Elite\',monospace;font-size:0.58rem;color:#5a7052;flex:none;">' + p.done + '/' + p.total + '</span></div>' +
            '<div style="margin-top:5px;height:7px;background:#f6f1e4;border:1.5px solid #283648;border-radius:2px;overflow:hidden;padding:1px;"><div style="height:100%;width:' + p.pct + '%;background:#5a7052;transition:width 0.6s cubic-bezier(0.16,1,0.3,1);"></div></div>' +
          '</div>' +
        '</div>';
    }).join('');

    // Board — columns of sticky-note task cards
    var byStatus = {};
    STATUSES.forEach(function (s) { byStatus[s.key] = []; });
    tasks.forEach(function (t) { (byStatus[t.status] || byStatus.backlog).push(t); });
    var tilts = [-1.6, 1.3, -0.8, 1.8, -1.2];

    els.boardGrid.innerHTML = STATUSES.map(function (s) {
      var cards = byStatus[s.key].map(function (t, ti) {
        var om = OWNER_META[t.owner] || OWNER_META.you;
        var tilt = tilts[ti % tilts.length];
        var noteStyle = 'position:relative;background:' + om.note + ';border:none;border-bottom:3px solid ' + om.edge +
          ';border-radius:2px;padding:15px 13px 12px;box-shadow:0 6px 13px rgba(40,54,72,0.16),0 1px 0 rgba(255,255,255,0.5) inset;transform:rotate(' + tilt + 'deg);flex:none;';
        return '' +
          '<div style="' + noteStyle + '">' +
            '<div style="position:absolute;top:-9px;left:50%;width:58px;height:17px;margin-left:-29px;background:rgba(231,209,158,0.55);border:1px solid rgba(180,150,90,0.30);transform:rotate(-2.5deg);box-shadow:0 1px 2px rgba(40,54,72,0.10);"></div>' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">' +
              '<span style="font-family:\'Special Elite\',monospace;font-size:0.58rem;letter-spacing:0.04em;text-transform:uppercase;color:#5a6473;border:1px solid rgba(40,54,72,0.28);border-radius:2px;padding:1px 7px;flex:none;background:rgba(255,255,255,0.35);">' + esc(t.phase) + '</span>' +
              '<button type="button" data-act="del" data-id="' + t.id + '" title="Delete" style="border:none;background:transparent;cursor:pointer;color:rgba(40,54,72,0.4);font-size:0.82rem;line-height:1;padding:0 2px;">✕</button>' +
            '</div>' +
            '<div style="font-family:\'Spectral\',serif;font-weight:500;font-size:1rem;line-height:1.36;color:#283648;margin:9px 0 11px;">' + esc(t.title) + '</div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">' +
              '<button type="button" data-act="owner" data-id="' + t.id + '" title="Reassign" style="display:flex;align-items:center;gap:5px;cursor:pointer;background:rgba(255,255,255,0.45);border:1.5px solid ' + om.color + ';border-radius:999px;padding:2px 11px 2px 7px;">' +
                '<span style="font-size:13px;">' + om.emoji + '</span><span style="font-family:\'Caveat\',cursive;font-size:1.08rem;font-weight:700;color:' + om.color + ';line-height:1;">' + om.label + '</span>' +
              '</button>' +
              '<div style="display:flex;gap:5px;flex:none;">' +
                '<button type="button" data-act="regress" data-id="' + t.id + '" title="Move back" style="width:27px;height:27px;border-radius:3px;border:1.5px solid #283648;background:rgba(255,255,255,0.55);color:#283648;cursor:pointer;font-size:0.74rem;display:flex;align-items:safe center;justify-content:safe center;">◀</button>' +
                '<button type="button" data-act="advance" data-id="' + t.id + '" title="Move forward" style="width:27px;height:27px;border-radius:3px;border:1.5px solid #283648;background:#283648;color:#fffdf8;cursor:pointer;font-size:0.74rem;display:flex;align-items:safe center;justify-content:safe center;">▶</button>' +
              '</div>' +
            '</div>' +
          '</div>';
      }).join('');

      return '' +
        '<div style="background:rgba(255,253,248,0.5);border:1.5px dashed rgba(40,54,72,0.32);border-radius:3px;padding:10px;display:flex;flex-direction:column;min-height:0;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:1px 3px 8px;flex:none;">' +
            '<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:13px;">' + s.emoji + '</span>' +
            '<span style="font-family:\'Special Elite\',monospace;font-size:0.58rem;letter-spacing:0.06em;text-transform:uppercase;color:#283648;">' + s.label + '</span>' +
            '<span style="font-family:\'Special Elite\',monospace;font-size:0.56rem;color:#fffdf8;background:#5a7052;border-radius:2px;min-width:17px;text-align:center;padding:1px 5px;">' + byStatus[s.key].length + '</span></div>' +
            '<button type="button" data-act="add" data-status="' + s.key + '" title="Add task" style="border:none;background:transparent;cursor:pointer;color:#b23a30;font-size:1rem;line-height:1;font-weight:700;padding:1px 3px;">＋</button>' +
          '</div>' +
          '<div class="laf-col" style="flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:15px;padding:11px 6px 6px;">' + cards + '</div>' +
        '</div>';
    }).join('');
  }

  // Write a stat's final value and keep data-count in sync for the mount animation.
  function setStat(el, value, suffix) {
    el.setAttribute('data-count', value);
    el.setAttribute('data-suffix', suffix);
    el.textContent = value + suffix;
  }

  // ---- Navigation -----------------------------------------------------------
  function W() { return els.scroller ? els.scroller.clientWidth : 0; }

  function setIndicator(n) {
    cur = n;
    els.navInd.style.transform = 'translateX(' + (n * 100) + '%)';
  }

  function goTo(i) {
    var n = clamp(i, 0, N - 1);
    var sc = els.scroller;
    if (!sc) return;
    setIndicator(n);

    var target = n * W();
    var start = sc.scrollLeft;
    var dist = target - start;

    if (prefersReduced || dist === 0) {
      sc.scrollLeft = target;
      animPanel(n);
      return;
    }

    // Drive scrollLeft directly with an eased rAF tween, snap disabled meanwhile,
    // so scroll-snap and the programmatic glide never fight.
    animatingScroll = true;
    sc.style.scrollSnapType = 'none';
    var t0 = now();
    var dur = 380;
    var ease = function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };

    function step() {
      var p = Math.min(1, (now() - t0) / dur);
      sc.scrollLeft = start + dist * ease(p);
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        sc.scrollLeft = target;
        sc.style.scrollSnapType = 'x mandatory';
        animatingScroll = false;
        animPanel(n);
      }
    }
    requestAnimationFrame(step);
  }
  function next() { goTo(cur + 1); }
  function prev() { goTo(cur - 1); }

  function syncFromScroll() {
    if (!els.scroller || animatingScroll) return;
    var w = W();
    if (!w) return;
    var n = clamp(Math.round(els.scroller.scrollLeft / w), 0, N - 1);
    if (n !== cur) { setIndicator(n); animPanel(n); }
  }

  // ---- Reveal + count-up animations ----------------------------------------
  function animPanel(n) {
    var panel = els.scroller.children[n];
    if (!panel) return;
    var nodes = panel.querySelectorAll('[data-anim]');
    if (prefersReduced) {
      nodes.forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; });
      return;
    }
    nodes.forEach(function (el, idx) {
      el.style.transition = 'none';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      var delay = idx * 55;
      var shown = false;
      var show = function () {
        if (shown) return;
        shown = true;
        el.style.transition = 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.16,1,0.3,1)';
        el.style.opacity = '1';
        el.style.transform = 'none';
      };
      // Stagger the reveal; double-rAF lets the initial state paint first.
      setTimeout(function () { requestAnimationFrame(show); }, delay);
      // Hard guarantee of a visible end state even if a frame/timer is throttled.
      setTimeout(function () { shown = false; show(); el.style.opacity = '1'; el.style.transform = 'none'; }, delay + 600);
    });
  }

  function runCounts() {
    var nodes = els.scroller.querySelectorAll('[data-count]');
    nodes.forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      if (prefersReduced) { el.textContent = Math.round(end) + suffix; return; }
      var dur = 950;
      var t0 = now();
      function step() {
        var p = Math.min(1, (now() - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(end * e) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = Math.round(end) + suffix;
      }
      requestAnimationFrame(step);
    });
  }

  // ---- Wiring ---------------------------------------------------------------
  function init() {
    ['scroller', 'navItems', 'navInd', 'hdrPct', 'hdrBar', 'btnReset', 'btnPrev', 'btnNext',
     'ringPct', 'ringCircle', 'statTasks', 'statShipped', 'statInflight',
     'rivalGrid', 'flowSteps', 'featureGrid', 'roadmapBars', 'roadmapCards', 'boardGrid']
      .forEach(function (id) { els[id] = $(id); });

    renderStatic();
    renderDynamic();

    // Header / arrow controls
    els.btnReset.addEventListener('click', reset);
    els.btnPrev.addEventListener('click', prev);
    els.btnNext.addEventListener('click', next);

    // Bottom nav (delegated)
    els.navItems.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-nav]');
      if (btn) goTo(parseInt(btn.getAttribute('data-nav'), 10));
    });

    // Board actions (delegated)
    els.boardGrid.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      var id = btn.getAttribute('data-id');
      if (act === 'add') addTask(btn.getAttribute('data-status'));
      else if (act === 'del') del(id);
      else if (act === 'owner') cycleOwner(id);
      else if (act === 'advance') move(id, 1);
      else if (act === 'regress') move(id, -1);
    });

    // Keep indicator in sync with manual swipe/scroll.
    els.scroller.addEventListener('scroll', function () {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(function () { scrollRaf = null; syncFromScroll(); });
    }, { passive: true });

    // Keyboard arrows
    window.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    });

    // Reflow scroll position on resize so the current panel stays aligned.
    window.addEventListener('resize', function () {
      if (animatingScroll) return;
      els.scroller.scrollLeft = cur * W();
    });

    // Initial mount: land on panel 0, run the count-up + reveal.
    setIndicator(0);
    runCounts();
    animPanel(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
