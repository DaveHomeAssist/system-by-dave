/* Shared AV domain views.
   Progressive enhancement: reads the currently rendered table rows and builds
   operator-first cards without touching each tool's storage format. */
(function () {
  'use strict';

  var CONFIGS = {
    'signal-flow.html': {
      id: 'routeChainView',
      bodySelector: '#routeBody',
      insertBefore: '.workspace',
      eyebrow: 'Route chain',
      title: 'Signal Flow Route Chain',
      summary: 'Source, processor, destination, status, and backup path in one scan.',
      countLabel: 'visible routes',
      fields: ['route', 'system', 'source', 'format', 'connector', 'processor', 'destination', 'status', 'backup', 'notes'],
      empty: 'No visible routes to map. Clear filters or add a signal route.',
      card: signalFlowCard
    },
    'audio-patch.html': {
      id: 'audioPatchView',
      bodySelector: '#itemBody',
      insertBefore: '.workspace',
      eyebrow: 'Console strip',
      title: 'Audio Patch Operator View',
      summary: 'Channel, source, stagebox, console, destination, and monitor sends in scan order.',
      countLabel: 'visible channels',
      fields: ['channel', 'source', 'type', 'console', 'stagebox', 'input', 'phantom', 'gain', 'destination', 'monitor', 'status', 'notes'],
      empty: 'No visible audio channels. Clear filters or add a channel.',
      card: audioPatchCard
    },
    'input-list.html': {
      id: 'inputListView',
      bodySelector: '#sheetBody',
      insertBefore: '.workspace',
      eyebrow: 'Input rail',
      title: 'Input List Patch View',
      summary: 'Channel sources, patch points, phantom power, owners, and line-check state as operator cards.',
      countLabel: 'visible inputs',
      fields: ['ch', 'source', 'type', 'patch', 'conn', 'phantom', 'stand', 'monitor', 'owner', 'status', 'notes'],
      readers: { ch: readNumCell },
      empty: 'No visible inputs. Clear filters or load the sample input list.',
      card: inputListCard
    },
    'line-check.html': {
      id: 'lineCheckView',
      bodySelector: '#itemBody',
      insertBefore: '.workspace',
      eyebrow: 'Line check',
      title: 'Line Check Run Rail',
      summary: 'Patch, tech, destination, talkback, problem, and pass state for fast room calls.',
      countLabel: 'visible lines',
      fields: ['channel', 'source', 'type', 'location', 'tech', 'console', 'input', 'destination', 'talkback', 'status', 'problem', 'notes'],
      empty: 'No visible line-check items. Clear filters or add a line.',
      card: lineCheckCard
    },
    'power-plan.html': {
      id: 'powerPlanView',
      bodySelector: '#circuitBody',
      insertBefore: '.workspace',
      eyebrow: 'Power map',
      title: 'Power Load View',
      summary: 'Circuits, sources, locations, draw, headroom, backups, and issue state as load cards.',
      countLabel: 'visible circuits',
      fields: ['circuit', 'location', 'load', 'source', 'voltage', 'capacity', 'draw', 'status', 'backup', 'notes'],
      empty: 'No visible circuits. Clear filters or add a power circuit.',
      card: powerPlanCard
    },
    'network-plan.html': {
      id: 'networkPlanView',
      bodySelector: '#deviceBody',
      insertBefore: '.workspace',
      eyebrow: 'Network map',
      title: 'Network Address View',
      summary: 'Device, VLAN, IP method, switch port, backup path, and online state in one scan.',
      countLabel: 'visible devices',
      fields: ['device', 'role', 'zone', 'network', 'ip', 'method', 'vlan', 'port', 'status', 'backup', 'notes'],
      empty: 'No visible network devices. Clear filters or add a device.',
      card: networkPlanCard
    },
    'rf-coordination.html': {
      id: 'rfCoordinationView',
      bodySelector: '#unitBody',
      insertBefore: '.workspace',
      eyebrow: 'RF map',
      title: 'RF Frequency View',
      summary: 'Wireless units, owners, frequencies, bands, channels, conflicts, and backups as scan cards.',
      countLabel: 'visible units',
      fields: ['unit', 'type', 'owner', 'zone', 'frequency', 'band', 'channel', 'status', 'backup', 'notes'],
      empty: 'No visible RF units. Clear filters or add a wireless unit.',
      card: rfCoordinationCard
    },
    'gear-prep.html': {
      id: 'gearPrepView',
      bodySelector: '#itemBody',
      insertBefore: '.workspace',
      eyebrow: 'Gear pull',
      title: 'Gear Prep Pull View',
      summary: 'Items, quantities, cases, locations, owners, pack state, and issue notes as pull cards.',
      countLabel: 'visible items',
      fields: ['item', 'category', 'qty', 'caseId', 'location', 'owner', 'status', 'notes'],
      empty: 'No visible gear items. Clear filters or add a pull item.',
      card: gearPrepCard
    },
    'truck-pack.html': {
      id: 'truckPackView',
      bodySelector: '#itemBody',
      insertBefore: '.workspace',
      eyebrow: 'Truck map',
      title: 'Truck Pack Load View',
      summary: 'Cases, zones, load order, unload order, owner, weight, and issues as load cards.',
      countLabel: 'visible cases',
      fields: ['department', 'caseId', 'contents', 'truckZone', 'loadOrder', 'unloadOrder', 'weight', 'owner', 'status', 'issue', 'notes'],
      empty: 'No visible truck cases. Clear filters or add a case.',
      card: truckPackCard
    },
    'load-in-plan.html': {
      id: 'loadInView',
      bodySelector: '#itemBody',
      insertBefore: '.workspace',
      eyebrow: 'Load in',
      title: 'Load In Delivery View',
      summary: 'Truck, dock, destination, owner, due time, blocker, and build state as delivery cards.',
      countLabel: 'visible items',
      fields: ['department', 'item', 'truck', 'dock', 'destination', 'owner', 'due', 'status', 'blocker', 'notes'],
      empty: 'No visible load-in items. Clear filters or add a delivery item.',
      card: loadInCard
    },
    'strike-plan.html': {
      id: 'strikePlanView',
      bodySelector: '#itemBody',
      insertBefore: '.workspace',
      eyebrow: 'Strike map',
      title: 'Strike Packout View',
      summary: 'Departments, gear, locations, cases, destinations, owners, and missing items as packout cards.',
      countLabel: 'visible items',
      fields: ['department', 'item', 'location', 'owner', 'caseId', 'destination', 'status', 'issue', 'notes'],
      empty: 'No visible strike items. Clear filters or add a packout item.',
      card: strikePlanCard
    },
    'room-check.html': {
      id: 'roomCheckView',
      bodySelector: '#itemBody',
      insertBefore: '.workspace',
      eyebrow: 'Room checks',
      title: 'Room Readiness View',
      summary: 'Area checks, owners, due times, priorities, blockers, and readiness state as room cards.',
      countLabel: 'visible checks',
      fields: ['area', 'check', 'owner', 'due', 'priority', 'status', 'blocker', 'notes'],
      empty: 'No visible room checks. Clear filters or add a check.',
      card: roomCheckCard
    },
    'breakout-room-matrix.html': {
      id: 'breakoutRoomView',
      bodySelector: '#roomBody',
      insertBefore: '.workspace',
      eyebrow: 'Breakout map',
      title: 'Breakout Room Run View',
      summary: 'Rooms, tracks, sessions, techs, producers, AV needs, risk, blockers, and status as room cards.',
      countLabel: 'visible rooms',
      fields: ['room', 'track', 'session', 'start', 'end', 'tech', 'producer', 'audio', 'video', 'network', 'power', 'status', 'risk', 'blocker', 'notes'],
      empty: 'No visible breakout rooms. Clear filters or add a room.',
      card: breakoutRoomCard
    },
    'camera-shot-list.html': {
      id: 'cameraShotView',
      bodySelector: '#shotBody',
      insertBefore: '.workspace',
      eyebrow: 'Camera rail',
      title: 'Camera Shot Run View',
      summary: 'Shot number, cue, camera, subject, framing, movement, preset, and take state as show-calling cards.',
      countLabel: 'visible shots',
      fields: ['number', 'cue', 'camera', 'type', 'subject', 'framing', 'movement', 'preset', 'status', 'notes'],
      empty: 'No visible camera shots. Clear filters or load the sample plan.',
      card: cameraShotCard
    }
  };

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function pageName() {
    var path = window.location.pathname.split('/').pop();
    return path || 'index.html';
  }

  function init() {
    var config = CONFIGS[pageName()];
    var body = config && document.querySelector(config.bodySelector);
    if (!config || !body) return;

    var view = ensureView(config);
    var scheduled = false;

    function schedule() {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        render(config, body, view);
      });
    }

    render(config, body, view);
    document.addEventListener('input', function (event) {
      if (event.target && event.target.closest(config.bodySelector)) schedule();
    });
    document.addEventListener('change', function (event) {
      if (event.target && event.target.closest(config.bodySelector)) schedule();
    });
    view.addEventListener('click', function (event) {
      var card = event.target.closest('.av-domain-card[data-row-id]');
      var rowId;
      var row;
      if (!card) return;
      rowId = card.getAttribute('data-row-id');
      row = body.querySelector('tr[data-id="' + cssEscape(rowId) + '"]');
      if (!row) return;
      row.click();
      window.requestAnimationFrame(function () {
        var activeRow = body.querySelector('tr[data-id="' + cssEscape(rowId) + '"]');
        var focusTarget = activeRow && activeRow.querySelector('input, select, textarea, button');
        if (!activeRow) return;
        activeRow.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
        if (focusTarget) focusTarget.focus({ preventScroll: true });
      });
      schedule();
    });

    if (window.MutationObserver) {
      new MutationObserver(schedule).observe(body, { childList: true, subtree: true });
    }
  }

  function ensureView(config) {
    var existing = document.getElementById(config.id);
    var target;
    var view;
    if (existing) return existing;
    target = document.querySelector(config.insertBefore);
    view = document.createElement('section');
    view.id = config.id;
    view.className = 'panel av-domain-view';
    view.setAttribute('aria-label', config.title);
    view.innerHTML = [
      '<div class="av-domain-head">',
        '<div class="av-domain-copy">',
          '<p class="av-domain-eyebrow">' + escapeHtml(config.eyebrow) + '</p>',
          '<h2 class="av-domain-title">' + escapeHtml(config.title) + '</h2>',
          '<p class="av-domain-summary">' + escapeHtml(config.summary) + '</p>',
        '</div>',
        '<div class="av-domain-count" data-domain-count>0 ' + escapeHtml(config.countLabel) + '</div>',
      '</div>',
      '<div class="av-domain-deck" data-domain-deck></div>'
    ].join('');
    if (target && target.parentNode) target.parentNode.insertBefore(view, target);
    else document.querySelector('main').appendChild(view);
    return view;
  }

  function render(config, body, view) {
    var rows = Array.prototype.slice.call(body.querySelectorAll('tr[data-id]'));
    var deck = view.querySelector('[data-domain-deck]');
    var count = view.querySelector('[data-domain-count]');
    var data = rows.map(function (row) {
      return readRow(config, row);
    });

    count.textContent = data.length + ' ' + config.countLabel;
    deck.innerHTML = data.length ? data.map(function (row) {
      return config.card(row);
    }).join('') : '<div class="av-domain-empty">' + escapeHtml(config.empty) + '</div>';
  }

  function readRow(config, row) {
    var data = {
      id: row.getAttribute('data-id') || '',
      selected: row.classList.contains('selected')
    };
    config.fields.forEach(function (field) {
      var reader = config.readers && config.readers[field];
      var control;
      if (reader) {
        data[field] = String(reader(row) || '').trim();
        return;
      }
      control = row.querySelector('[data-field="' + field + '"]');
      data[field] = control ? String(control.value || control.textContent || '').trim() : '';
    });
    return data;
  }

  function signalFlowCard(route) {
    var status = normalizeToken(route.status || 'pending');
    var system = route.system || 'system';
    var format = [route.format, route.connector].filter(Boolean).join(' / ') || 'Format open';
    var backup = route.backup ? 'Backup: ' + route.backup : 'No backup path assigned';
    var notes = route.notes || '';
    return [
      '<button class="av-domain-card is-' + escapeAttr(status) + (route.selected ? ' is-selected' : '') + '" type="button" data-row-id="' + escapeAttr(route.id) + '" aria-label="' + escapeAttr('Open route ' + (route.route || route.source || route.destination || 'row')) + '">',
        '<span class="av-domain-card-top">',
          '<span class="av-domain-kicker">' + escapeHtml(route.route || 'Route') + '</span>',
          '<span class="av-domain-badge">' + escapeHtml(titleCase(system)) + '</span>',
          '<span class="av-domain-status is-' + escapeAttr(status) + '">' + escapeHtml(titleCase(route.status || 'pending')) + '</span>',
        '</span>',
        '<span class="av-domain-chain">',
          chainNode('Source', route.source || 'Unassigned'),
          '<span class="av-domain-chain-hop" aria-hidden="true">to</span>',
          chainNode('Processor', route.processor || 'Direct'),
          '<span class="av-domain-chain-hop" aria-hidden="true">to</span>',
          chainNode('Destination', route.destination || 'Unassigned'),
        '</span>',
        '<span class="av-domain-meta">' + escapeHtml(format + ' | ' + backup) + '</span>',
        notes ? '<span class="av-domain-note">' + escapeHtml(notes) + '</span>' : '',
      '</button>'
    ].join('');
  }

  function audioPatchCard(item) {
    var status = normalizeToken(item.status || 'planned');
    var patch = [item.console, item.stagebox, item.input].filter(Boolean).join(' / ') || 'Patch open';
    var power = [item.phantom ? 'Phantom ' + item.phantom : '', item.gain ? 'Gain ' + item.gain : ''].filter(Boolean).join(' | ');
    return channelCard({
      id: item.id,
      selected: item.selected,
      status: status,
      aria: 'Open audio channel ' + (item.channel || item.source || 'row'),
      kicker: 'Ch ' + (item.channel || '?'),
      badge: titleCase(item.type || 'source'),
      source: item.source || 'Unassigned source',
      middleLabel: 'Patch',
      middle: patch,
      endLabel: 'Output',
      end: item.destination || item.monitor || 'Destination open',
      meta: [power, item.monitor ? 'Monitor: ' + item.monitor : 'No monitor send'].filter(Boolean).join(' | '),
      note: item.notes || ''
    });
  }

  function inputListCard(item) {
    var status = normalizeToken(item.status || 'open');
    var patch = [item.patch, item.conn].filter(Boolean).join(' / ') || 'Patch open';
    return channelCard({
      id: item.id,
      selected: item.selected,
      status: status,
      aria: 'Open input ' + (item.ch || item.source || 'row'),
      kicker: 'Ch ' + (item.ch || '?'),
      badge: titleCase(item.type || 'input'),
      source: item.source || 'Unassigned source',
      middleLabel: 'Patch',
      middle: patch,
      endLabel: 'Owner',
      end: item.owner || 'Owner open',
      meta: [item.phantom ? 'Phantom ' + item.phantom : '', item.monitor ? 'Monitor: ' + item.monitor : '', item.stand ? 'Stand: ' + item.stand : ''].filter(Boolean).join(' | '),
      note: item.notes || ''
    });
  }

  function lineCheckCard(item) {
    var status = normalizeToken(item.status || 'pending');
    var patch = [item.console, item.input].filter(Boolean).join(' / ') || 'Patch open';
    return channelCard({
      id: item.id,
      selected: item.selected,
      status: status,
      aria: 'Open line check ' + (item.channel || item.source || 'row'),
      kicker: 'Ch ' + (item.channel || '?'),
      badge: titleCase(item.type || 'line'),
      source: item.source || 'Unassigned source',
      middleLabel: 'Patch',
      middle: patch,
      endLabel: 'Tech',
      end: item.tech || item.location || 'Tech open',
      meta: [item.destination ? 'Destination: ' + item.destination : '', item.talkback ? 'Talkback: ' + item.talkback : ''].filter(Boolean).join(' | '),
      note: item.problem || item.notes || ''
    });
  }

  function powerPlanCard(item) {
    var status = normalizeToken(item.status || 'planned');
    var feed = [item.location, titleCase(item.source || '')].filter(Boolean).join(' / ') || 'Feed open';
    var load = [item.draw ? item.draw + 'A draw' : '', item.capacity ? item.capacity + 'A capacity' : ''].filter(Boolean).join(' / ') || 'Load open';
    return channelCard({
      id: item.id,
      selected: item.selected,
      status: status,
      aria: 'Open power circuit ' + (item.circuit || item.load || 'row'),
      kicker: item.circuit || 'Circuit',
      badge: titleCase(item.source || 'power'),
      startLabel: 'Load',
      source: item.load || 'Unassigned load',
      middleLabel: 'Feed',
      middle: feed,
      endLabel: 'Draw',
      end: load,
      meta: [item.voltage || '', item.backup ? 'Backup: ' + item.backup : 'No backup feed'].filter(Boolean).join(' | '),
      note: item.notes || ''
    });
  }

  function networkPlanCard(item) {
    var status = normalizeToken(item.status || 'planned');
    var address = [item.ip || 'IP open', item.vlan ? 'VLAN ' + item.vlan : 'VLAN open'].join(' / ');
    return channelCard({
      id: item.id,
      selected: item.selected,
      status: status,
      aria: 'Open network device ' + (item.device || item.role || 'row'),
      kicker: item.device || 'Device',
      badge: titleCase(item.network || 'network'),
      startLabel: 'Role',
      source: item.role || 'Role open',
      middleLabel: 'Address',
      middle: address,
      endLabel: 'Port',
      end: item.port || 'Port open',
      meta: [item.zone ? 'Zone: ' + item.zone : '', item.method ? 'Method: ' + item.method : '', item.backup ? 'Backup: ' + item.backup : 'No backup path'].filter(Boolean).join(' | '),
      note: item.notes || ''
    });
  }

  function rfCoordinationCard(item) {
    var status = normalizeToken(item.status || 'planned');
    var frequency = [item.frequency ? item.frequency + ' MHz' : 'Frequency open', titleCase(item.band || '')].filter(Boolean).join(' / ');
    var zone = [item.zone || 'Zone open', item.channel || 'Channel open'].join(' / ');
    return channelCard({
      id: item.id,
      selected: item.selected,
      status: status,
      aria: 'Open RF unit ' + (item.unit || item.owner || 'row'),
      kicker: item.unit || 'Unit',
      badge: titleCase(item.type || 'rf'),
      startLabel: 'Owner',
      source: item.owner || 'Owner open',
      middleLabel: 'Frequency',
      middle: frequency,
      endLabel: 'Zone',
      end: zone,
      meta: item.backup ? 'Backup: ' + item.backup : 'No backup unit',
      note: item.notes || ''
    });
  }

  function gearPrepCard(item) {
    var status = normalizeToken(item.status || 'needed');
    return channelCard({
      id: item.id,
      selected: item.selected,
      status: status,
      aria: 'Open gear item ' + (item.item || item.caseId || 'row'),
      kicker: item.caseId || 'Gear',
      badge: titleCase(item.category || 'gear'),
      startLabel: 'Item',
      source: [item.qty ? item.qty + 'x' : '', item.item || 'Item open'].filter(Boolean).join(' '),
      middleLabel: 'Location',
      middle: item.location || 'Location open',
      endLabel: 'Owner',
      end: item.owner || 'Owner open',
      meta: item.caseId ? 'Case: ' + item.caseId : 'No case ID',
      note: item.notes || ''
    });
  }

  function truckPackCard(item) {
    var status = normalizeToken(item.status || 'planned');
    var order = ['Load ' + (item.loadOrder || '?'), 'Unload ' + (item.unloadOrder || '?')].join(' / ');
    return channelCard({
      id: item.id,
      selected: item.selected,
      status: status,
      aria: 'Open truck case ' + (item.caseId || item.contents || 'row'),
      kicker: item.caseId || 'Case',
      badge: titleCase(item.department || 'truck'),
      startLabel: 'Contents',
      source: item.contents || 'Contents open',
      middleLabel: 'Zone',
      middle: [titleCase(item.truckZone || ''), order].filter(Boolean).join(' / '),
      endLabel: 'Owner',
      end: item.owner || 'Owner open',
      meta: item.weight ? 'Weight: ' + item.weight + ' lb' : 'No weight',
      note: item.issue || item.notes || ''
    });
  }

  function loadInCard(item) {
    var status = normalizeToken(item.status || 'planned');
    return channelCard({
      id: item.id,
      selected: item.selected,
      status: status,
      aria: 'Open load-in item ' + (item.item || item.destination || 'row'),
      kicker: item.due || 'Load in',
      badge: titleCase(item.department || 'load'),
      startLabel: 'Item',
      source: item.item || 'Item open',
      middleLabel: 'Route',
      middle: [item.truck || 'Truck open', item.dock || 'Dock open'].join(' / '),
      endLabel: 'Destination',
      end: item.destination || 'Destination open',
      meta: item.owner ? 'Owner: ' + item.owner : 'Owner open',
      note: item.blocker || item.notes || ''
    });
  }

  function strikePlanCard(item) {
    var status = normalizeToken(item.status || 'pending');
    return channelCard({
      id: item.id,
      selected: item.selected,
      status: status,
      aria: 'Open strike item ' + (item.item || item.caseId || 'row'),
      kicker: item.caseId || 'Strike',
      badge: titleCase(item.department || 'strike'),
      startLabel: 'Item',
      source: item.item || 'Item open',
      middleLabel: 'From',
      middle: item.location || 'Location open',
      endLabel: 'To',
      end: item.destination || 'Destination open',
      meta: item.owner ? 'Owner: ' + item.owner : 'Owner open',
      note: item.issue || item.notes || ''
    });
  }

  function roomCheckCard(item) {
    var status = normalizeToken(item.status || 'pending');
    return channelCard({
      id: item.id,
      selected: item.selected,
      status: status,
      aria: 'Open room check ' + (item.check || item.area || 'row'),
      kicker: item.due || 'Room',
      badge: titleCase(item.area || 'room'),
      startLabel: 'Check',
      source: item.check || 'Check open',
      middleLabel: 'Owner',
      middle: item.owner || 'Owner open',
      endLabel: 'Priority',
      end: titleCase(item.priority || 'normal'),
      meta: item.blocker ? 'Blocker: ' + item.blocker : 'No blocker',
      note: item.notes || ''
    });
  }

  function breakoutRoomCard(room) {
    var status = normalizeToken(room.status || 'planned');
    return channelCard({
      id: room.id,
      selected: room.selected,
      status: status,
      aria: 'Open breakout room ' + (room.room || room.session || 'row'),
      kicker: room.room || 'Room',
      badge: titleCase(room.risk || 'normal') + ' risk',
      startLabel: 'Session',
      source: room.session || 'Session open',
      middleLabel: 'Crew',
      middle: [room.tech || 'Tech open', room.producer || 'Producer open'].join(' / '),
      endLabel: 'Schedule',
      end: [room.start || '?', room.end || '?'].join(' - '),
      meta: [room.audio ? 'Audio: ' + room.audio : '', room.video ? 'Video: ' + room.video : '', room.network ? 'Network: ' + room.network : ''].filter(Boolean).join(' | '),
      note: room.blocker || room.notes || ''
    });
  }

  function cameraShotCard(shot) {
    var status = normalizeToken(shot.status || 'hold');
    return channelCard({
      id: shot.id,
      selected: shot.selected,
      status: status,
      aria: 'Open camera shot ' + (shot.number || shot.subject || 'row'),
      kicker: shot.number || 'Shot',
      badge: shot.camera || 'Camera',
      startLabel: 'Subject',
      source: shot.subject || 'Subject open',
      middleLabel: 'Frame',
      middle: shot.framing || 'Framing open',
      endLabel: 'Move',
      end: [shot.movement || 'Move open', shot.preset ? 'Preset ' + shot.preset : 'No preset'].join(' / '),
      meta: [shot.cue ? 'Cue: ' + shot.cue : '', shot.type ? 'Type: ' + shot.type : ''].filter(Boolean).join(' | '),
      note: shot.notes || ''
    });
  }

  function channelCard(options) {
    return [
      '<button class="av-domain-card is-' + escapeAttr(options.status) + (options.selected ? ' is-selected' : '') + '" type="button" data-row-id="' + escapeAttr(options.id) + '" aria-label="' + escapeAttr(options.aria) + '">',
        '<span class="av-domain-card-top">',
          '<span class="av-domain-kicker">' + escapeHtml(options.kicker) + '</span>',
          '<span class="av-domain-badge">' + escapeHtml(options.badge) + '</span>',
          '<span class="av-domain-status is-' + escapeAttr(options.status) + '">' + escapeHtml(titleCase(options.status)) + '</span>',
        '</span>',
        '<span class="av-domain-chain">',
          chainNode(options.startLabel || 'Source', options.source),
          '<span class="av-domain-chain-hop" aria-hidden="true">to</span>',
          chainNode(options.middleLabel, options.middle),
          '<span class="av-domain-chain-hop" aria-hidden="true">to</span>',
          chainNode(options.endLabel, options.end),
        '</span>',
        options.meta ? '<span class="av-domain-meta">' + escapeHtml(options.meta) + '</span>' : '',
        options.note ? '<span class="av-domain-note">' + escapeHtml(options.note) + '</span>' : '',
      '</button>'
    ].join('');
  }

  function chainNode(label, value) {
    return [
      '<span class="av-domain-chain-node">',
        '<span class="av-domain-chain-label">' + escapeHtml(label) + '</span>',
        '<strong>' + escapeHtml(value) + '</strong>',
      '</span>'
    ].join('');
  }

  function readNumCell(row) {
    var cell = row.querySelector('.num-cell');
    return cell ? cell.textContent : '';
  }

  function titleCase(value) {
    return String(value || '').replace(/\b\w/g, function (letter) {
      return letter.toUpperCase();
    });
  }

  function normalizeToken(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pending';
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value || '').replace(/"/g, '\\"');
  }

  ready(init);
})();
