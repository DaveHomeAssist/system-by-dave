/* Saved-data helpers for pages that moved from systembydave.com to their own
   domains (scripts/domain-sites.json). js/domain-move.js reads a site's data on
   systembydave.com; js/domain-transfer.js writes it on the new domain. Only keys
   and IndexedDB databases named by the site's storage policy ever cross, and
   nothing is deleted on either side. Exposes window.SBD_DOMAIN_STORAGE. */
(function(){
  'use strict';

  var SCHEMA = 'system-by-dave.domain-transfer.v1';
  var BINARY_VIEWS = ['Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array', 'DataView'];

  function matches(policy, key){
    if(typeof key !== 'string' || !key) return false;
    if(policy.keys.indexOf(key) >= 0) return true;
    for(var i = 0; i < policy.prefixes.length; i++){
      if(key.indexOf(policy.prefixes[i]) === 0) return true;
    }
    return false;
  }

  function readLocal(policy){
    var out = {};
    try{
      for(var i = 0; i < localStorage.length; i++){
        var key = localStorage.key(i);
        if(matches(policy, key)) out[key] = localStorage.getItem(key);
      }
    }catch(e){
      // Storage can be disabled; there is then nothing to move.
    }
    return out;
  }

  function presentDatabases(names){
    if(!names.length || !window.indexedDB) return Promise.resolve([]);
    if(typeof indexedDB.databases !== 'function') return Promise.resolve(names.slice());
    return indexedDB.databases().then(function(list){
      var present = list.map(function(db){ return db.name; });
      return names.filter(function(name){ return present.indexOf(name) >= 0; });
    }, function(){ return names.slice(); });
  }

  // Resolves null instead of creating a database that does not exist yet.
  function openExisting(name){
    return new Promise(function(resolve){
      var created = false;
      var request;
      try{ request = indexedDB.open(name); }catch(e){ resolve(null); return; }
      request.onupgradeneeded = function(){
        created = true;
        request.transaction.abort();
      };
      request.onsuccess = function(){
        if(created){ request.result.close(); resolve(null); }
        else resolve(request.result);
      };
      request.onerror = function(event){
        if(event && event.preventDefault) event.preventDefault();
        resolve(null);
      };
      request.onblocked = function(){ resolve(null); };
    });
  }

  function exportDatabase(name){
    return openExisting(name).then(function(db){
      if(!db) return null;
      var storeNames = Array.prototype.slice.call(db.objectStoreNames);
      var result = { name: name, version: db.version, stores: [] };
      if(!storeNames.length){ db.close(); return result; }
      return new Promise(function(resolve, reject){
        var tx = db.transaction(storeNames, 'readonly');
        storeNames.forEach(function(storeName){
          var store = tx.objectStore(storeName);
          var info = { name: storeName, keyPath: store.keyPath, autoIncrement: store.autoIncrement, indexes: [], records: [] };
          Array.prototype.forEach.call(store.indexNames, function(indexName){
            var index = store.index(indexName);
            info.indexes.push({ name: index.name, keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry });
          });
          result.stores.push(info);
          var cursor = store.openCursor();
          cursor.onsuccess = function(){
            var current = cursor.result;
            if(!current) return;
            info.records.push({ key: current.primaryKey, value: current.value });
            current.continue();
          };
        });
        tx.oncomplete = function(){ db.close(); resolve(result); };
        tx.onerror = tx.onabort = function(){
          db.close();
          reject(tx.error || new Error('Could not read ' + name + '.'));
        };
      });
    });
  }

  function recordCount(db){
    return db ? db.stores.reduce(function(sum, store){ return sum + store.records.length; }, 0) : 0;
  }

  function collect(policy){
    var local = readLocal(policy);
    return presentDatabases(policy.indexedDB).then(function(names){
      return Promise.all(names.map(function(name){
        return exportDatabase(name).catch(function(){ return null; });
      }));
    }).then(function(dbs){
      dbs = dbs.filter(function(db){ return recordCount(db) > 0; });
      var count = Object.keys(local).length + dbs.reduce(function(sum, db){ return sum + recordCount(db); }, 0);
      return { localStorage: local, indexedDB: dbs, count: count };
    });
  }

  function importLocal(policy, entries, replaceKeys){
    var result = { imported: [], same: [], conflicts: [], failed: [] };
    Object.keys(entries || {}).sort().forEach(function(key){
      var incoming = entries[key];
      if(!matches(policy, key) || typeof incoming !== 'string') return;
      var existing = localStorage.getItem(key);
      if(existing === incoming){ result.same.push(key); return; }
      if(existing !== null && !(replaceKeys && replaceKeys.indexOf(key) >= 0)){ result.conflicts.push(key); return; }
      try{
        localStorage.setItem(key, incoming);
        result.imported.push(key);
      }catch(e){
        result.failed.push(key);
      }
    });
    return result;
  }

  function createDatabase(dbExport){
    return new Promise(function(resolve, reject){
      var request = indexedDB.open(dbExport.name, Math.max(1, dbExport.version || 1));
      request.onupgradeneeded = function(){
        var db = request.result;
        dbExport.stores.forEach(function(storeExport){
          if(db.objectStoreNames.contains(storeExport.name)) return;
          var options = { autoIncrement: Boolean(storeExport.autoIncrement) };
          if(storeExport.keyPath !== null && storeExport.keyPath !== undefined) options.keyPath = storeExport.keyPath;
          var store = db.createObjectStore(storeExport.name, options);
          (storeExport.indexes || []).forEach(function(index){
            store.createIndex(index.name, index.keyPath, { unique: Boolean(index.unique), multiEntry: Boolean(index.multiEntry) });
          });
        });
      };
      request.onsuccess = function(){ resolve(request.result); };
      request.onerror = function(){ reject(request.error || new Error('Could not create ' + dbExport.name + '.')); };
    });
  }

  function writeRecords(db, dbExport){
    var names = dbExport.stores.map(function(store){ return store.name; }).filter(function(name){
      return db.objectStoreNames.contains(name);
    });
    var counts = { imported: 0, kept: 0 };
    if(!names.length) return Promise.resolve(counts);
    return new Promise(function(resolve, reject){
      var tx = db.transaction(names, 'readwrite');
      dbExport.stores.forEach(function(storeExport){
        if(names.indexOf(storeExport.name) < 0) return;
        var store = tx.objectStore(storeExport.name);
        storeExport.records.forEach(function(record){
          var probe = store.count(record.key);
          probe.onsuccess = function(){
            if(probe.result > 0){ counts.kept += 1; return; }
            if(store.keyPath !== null) store.add(record.value);
            else store.add(record.value, record.key);
            counts.imported += 1;
          };
        });
      });
      tx.oncomplete = function(){ resolve(counts); };
      tx.onerror = tx.onabort = function(){ reject(tx.error || new Error('Could not write ' + dbExport.name + '.')); };
    });
  }

  function importDatabase(policy, dbExport){
    if(!dbExport || policy.indexedDB.indexOf(dbExport.name) < 0 || !window.indexedDB) return Promise.resolve({ imported: 0, kept: 0 });
    return openExisting(dbExport.name).then(function(db){
      return db || createDatabase(dbExport);
    }).then(function(db){
      return writeRecords(db, dbExport).then(function(counts){
        db.close();
        return counts;
      }, function(error){
        db.close();
        throw error;
      });
    });
  }

  function importPayload(policy, payload){
    if(!payload || payload.schema !== SCHEMA) return Promise.reject(new Error('This is not a System by Dave data transfer.'));
    if(payload.site !== policy.site) return Promise.reject(new Error('This data belongs to a different site.'));
    var local = importLocal(policy, payload.localStorage);
    var dbs = Array.isArray(payload.indexedDB) ? payload.indexedDB : [];
    return dbs.reduce(function(chain, dbExport){
      return chain.then(function(totals){
        return importDatabase(policy, dbExport).then(function(counts){
          totals.imported += counts.imported;
          totals.kept += counts.kept;
          return totals;
        });
      });
    }, Promise.resolve({ imported: 0, kept: 0 })).then(function(records){
      return {
        local: local,
        records: records,
        imported: local.imported.length + records.imported,
        kept: local.conflicts.length + records.kept,
        conflicts: local.conflicts,
        failed: local.failed
      };
    });
  }

  // Backup files are JSON, so binary values (walk photos, PixelForge images)
  // are stored as base64 and restored to the same types on import.
  function encodeValue(value){
    if(value instanceof Blob){
      return new Promise(function(resolve, reject){
        var reader = new FileReader();
        reader.onload = function(){
          resolve({ __sbdType: 'blob', type: value.type, name: value.name || null, lastModified: value.lastModified || null, data: String(reader.result).split(',')[1] || '' });
        };
        reader.onerror = function(){ reject(reader.error); };
        reader.readAsDataURL(value);
      });
    }
    if(value instanceof Date) return Promise.resolve({ __sbdType: 'date', value: value.toISOString() });
    if(value instanceof ArrayBuffer || ArrayBuffer.isView(value)){
      var bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      var binary = '';
      for(var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return Promise.resolve({ __sbdType: value instanceof ArrayBuffer ? 'arraybuffer' : value.constructor.name, data: btoa(binary) });
    }
    if(Array.isArray(value)) return Promise.all(value.map(encodeValue));
    if(value && typeof value === 'object'){
      var keys = Object.keys(value);
      return Promise.all(keys.map(function(key){ return encodeValue(value[key]); })).then(function(values){
        var out = {};
        keys.forEach(function(key, index){ out[key] = values[index]; });
        return out;
      });
    }
    return Promise.resolve(value);
  }

  function decodeBytes(data){
    var binary = atob(data || '');
    var bytes = new Uint8Array(binary.length);
    for(var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function decodeValue(value){
    if(Array.isArray(value)) return value.map(decodeValue);
    if(!value || typeof value !== 'object') return value;
    if(value.__sbdType === 'blob'){
      var blob = new Blob([decodeBytes(value.data)], { type: value.type || '' });
      if(value.name && typeof File === 'function') return new File([blob], value.name, { type: value.type || '', lastModified: value.lastModified || Date.now() });
      return blob;
    }
    if(value.__sbdType === 'date') return new Date(value.value);
    if(value.__sbdType === 'arraybuffer') return decodeBytes(value.data).buffer;
    // Backup files are user-supplied, so only known binary views are rebuilt.
    if(BINARY_VIEWS.indexOf(value.__sbdType) >= 0 && typeof window[value.__sbdType] === 'function'){
      return new window[value.__sbdType](decodeBytes(value.data).buffer);
    }
    var out = {};
    Object.keys(value).forEach(function(key){ out[key] = decodeValue(value[key]); });
    return out;
  }

  function encodeBackup(site, source, data){
    return encodeValue(data.indexedDB).then(function(indexedDB){
      return JSON.stringify({
        schema: SCHEMA,
        site: site,
        source: source,
        exportedAt: new Date().toISOString(),
        localStorage: data.localStorage,
        indexedDB: indexedDB
      });
    });
  }

  function decodeBackup(text){
    var parsed = JSON.parse(text);
    if(!parsed || parsed.schema !== SCHEMA) throw new Error('This is not a System by Dave backup file.');
    parsed.indexedDB = decodeValue(parsed.indexedDB || []);
    return parsed;
  }

  window.SBD_DOMAIN_STORAGE = {
    SCHEMA: SCHEMA,
    collect: collect,
    importPayload: importPayload,
    importLocal: importLocal,
    encodeBackup: encodeBackup,
    decodeBackup: decodeBackup
  };
})();
