/* Redirect stub behavior for pages that moved to another configured origin.
   scripts/stage_domain_sites.mjs writes a stub in place of each moved page at
   cutover. With no saved data for the site in this browser, the stub goes
   straight to the same path on the new domain. Otherwise it offers to move the
   data first (a popup on the new domain receives it by postMessage), to
   download a backup, or to continue without moving. Nothing here is deleted.
   Requires js/domain-move-sites.js and js/domain-storage.js. */
(function(){
  'use strict';

  var script = document.currentScript;
  var siteId = script && script.getAttribute('data-site');
  var site = (window.SBD_DOMAIN_MOVES || {})[siteId];
  var storage = window.SBD_DOMAIN_STORAGE;
  if(!site || !storage) return;

  var target = site.origin + location.pathname + location.search + location.hash;
  var FLAG = 'sbd.domainMove.' + siteId + '.v1';
  var policy = { site: siteId, keys: site.keys, prefixes: site.prefixes, indexedDB: site.indexedDB };

  function go(){ location.replace(target); }

  function readFlag(){
    try{ return JSON.parse(localStorage.getItem(FLAG) || 'null'); }catch(e){ return null; }
  }

  function writeFlag(state, detail){
    try{ localStorage.setItem(FLAG, JSON.stringify({ state: state, at: new Date().toISOString(), detail: detail || null })); }catch(e){
      // Without storage the choice cannot be remembered; the stub asks again next time.
    }
  }

  function whenReady(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function say(text){
    var status = document.getElementById('moveStatus');
    if(status) status.textContent = text;
  }

  function el(tag, className, text){
    var node = document.createElement(tag);
    if(className) node.className = className;
    if(text != null) node.textContent = text;
    return node;
  }

  function plural(count, word){ return count + ' ' + word + (count === 1 ? '' : 's'); }

  function move(data, buttons){
    var popup = window.open(site.origin + '/transfer.html', 'sbd-domain-transfer', 'popup=yes,width=560,height=720');
    if(!popup){
      say('Your browser blocked the transfer window. Allow pop-ups for ' + location.host + ' and try again, or download a backup.');
      return;
    }
    buttons.forEach(function(button){ button.disabled = true; });
    say('Moving your data to ' + site.domain + '. Keep the new window open until it finishes.');
    var finished = false;
    var timer = setTimeout(function(){
      if(finished) return;
      buttons.forEach(function(button){ button.disabled = false; });
      say('The transfer window did not answer. Close it and try again, or download a backup.');
    }, 30000);
    function finish(){
      finished = true;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    }
    function onMessage(event){
      if(event.origin !== site.origin || event.source !== popup) return;
      var message = event.data || {};
      if(message.type === 'sbd-domain-transfer-ready'){
        popup.postMessage({
          type: 'sbd-domain-transfer-payload',
          payload: { schema: storage.SCHEMA, site: siteId, source: location.origin, localStorage: data.localStorage, indexedDB: data.indexedDB }
        }, site.origin);
      }else if(message.type === 'sbd-domain-transfer-result'){
        finish();
        writeFlag('moved', { imported: message.imported, kept: message.kept });
        say('Moved ' + plural(Number(message.imported) || 0, 'item') + ' to ' + site.domain + '.'
          + (message.kept ? ' ' + plural(Number(message.kept), 'item') + ' already there were kept; the transfer window lists them.' : '')
          + ' Opening ' + site.domain + '.');
        setTimeout(go, 1500);
      }else if(message.type === 'sbd-domain-transfer-error'){
        finish();
        buttons.forEach(function(button){ button.disabled = false; });
        say('The move did not finish: ' + String(message.message || 'unknown error') + ' Nothing was removed here. Try again or download a backup.');
      }
    }
    window.addEventListener('message', onMessage);
  }

  function download(data){
    say('Preparing your backup.');
    storage.encodeBackup(siteId, location.origin, data).then(function(json){
      var link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      link.download = 'systembydave-' + siteId + '-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function(){ URL.revokeObjectURL(link.href); }, 10000);
      say('Backup downloaded. To restore it, open ' + site.domain + '/transfer.html and choose the file.');
    }, function(error){
      say('The backup could not be prepared: ' + String(error && error.message || error));
    });
  }

  function render(data){
    var panel = document.getElementById('movePanel');
    if(!panel){ go(); return; }
    panel.textContent = '';
    panel.appendChild(el('h2', '', 'Your saved data is still on ' + location.host));
    panel.appendChild(el('p', '', 'This browser has ' + plural(data.count, 'saved item') + ' from ' + site.name
      + ' on ' + location.host + '. Browsers keep saved data per website, so move it to ' + site.domain
      + ' to see it there. Nothing is deleted here.'));
    var actions = el('div', 'sbd-move-actions');
    var moveButton = el('button', 'sbd-move-button primary', 'Move my data and continue');
    var backupButton = el('button', 'sbd-move-button', 'Download a backup');
    var skipButton = el('button', 'sbd-move-button', 'Continue without moving');
    [moveButton, backupButton, skipButton].forEach(function(button){
      button.type = 'button';
      actions.appendChild(button);
    });
    panel.appendChild(actions);
    panel.hidden = false;
    var buttons = [moveButton, backupButton, skipButton];
    moveButton.addEventListener('click', function(){ move(data, buttons); });
    backupButton.addEventListener('click', function(){ download(data); });
    skipButton.addEventListener('click', function(){
      writeFlag('skipped');
      go();
    });
    moveButton.focus();
  }

  if(readFlag()){
    go();
    return;
  }
  function readData(){
    // A read failure is not proof of an empty source. Keep the operator here
    // until they can retry or explicitly choose to leave without moving data.
    Promise.resolve().then(function(){ return storage.collect(policy); }).then(function(data){
      if(!data.count){ go(); return; }
      whenReady(function(){ render(data); });
    }).catch(function(error){
      whenReady(function(){
        say('Saved data could not be read: ' + String(error && error.message || error) + ' Nothing was removed.');
        var panel = document.getElementById('movePanel');
        if(!panel) return;
        panel.textContent = '';
        panel.hidden = false;
        var retry = el('button', 'sbd-move-button primary', 'Try reading saved data again');
        retry.type = 'button';
        retry.addEventListener('click', function(){ retry.disabled = true; readData(); });
        panel.appendChild(retry);
        var skip = el('button', 'sbd-move-button', 'Continue without moving');
        skip.type = 'button';
        skip.addEventListener('click', function(){ writeFlag('skipped'); go(); });
        panel.appendChild(skip);
        retry.focus();
      });
    });
  }
  readData();
})();
