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
