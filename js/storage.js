/* =========================================================
   ALATIKA PRO — storage.js
   Sloj za čuvanje podataka.
   - localStorage: podešavanja, jezik, tema, PIN hash
   - IndexedDB: glavni podaci (podsetnici, računi, dokumenta, novac)
   ========================================================= */

(function (global) {
  'use strict';

  const DB_NAME = 'alatikapro';
  const DB_VERSION = 1;

  const STORES = {
    reminders: 'reminders',
    bills: 'bills',
    items: 'items',
    transactions: 'transactions',
    budgets: 'budgets',
    files: 'files',
    meta: 'meta'
  };

  const LS_PREFIX = 'alatikapro.';

  /* ---------- LOCALSTORAGE ---------- */

  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function lsSet(key, value) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function lsRemove(key) {
    try {
      localStorage.removeItem(LS_PREFIX + key);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- INDEXEDDB ---------- */

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise(function (resolve, reject) {
      if (!global.indexedDB) {
        reject(new Error('IndexedDB nije podržan u ovom pregledaču.'));
        return;
      }

      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = function (event) {
        const db = event.target.result;

        Object.keys(STORES).forEach(function (name) {
          const storeName = STORES[name];
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            if (storeName !== STORES.meta) {
              store.createIndex('createdAt', 'createdAt', { unique: false });
              store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
          }
        });
      };

      req.onsuccess = function () {
        resolve(req.result);
      };

      req.onerror = function () {
        reject(req.error || new Error('Greška pri otvaranju baze.'));
      };
    });

    return dbPromise;
  }

  function tx(storeName, mode) {
    return openDB().then(function (db) {
      const transaction = db.transaction(storeName, mode);
      return transaction.objectStore(storeName);
    });
  }

  function put(storeName, record) {
    return tx(storeName, 'readwrite').then(function (store) {
      return new Promise(function (resolve, reject) {
        const now = new Date().toISOString();
        if (!record.id) {
          record.id = generateId();
        }
        if (!record.createdAt) {
          record.createdAt = now;
        }
        record.updatedAt = now;

        const req = store.put(record);
        req.onsuccess = function () { resolve(record); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function get(storeName, id) {
    return tx(storeName, 'readonly').then(function (store) {
      return new Promise(function (resolve, reject) {
        const req = store.get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function getAll(storeName) {
    return tx(storeName, 'readonly').then(function (store) {
      return new Promise(function (resolve, reject) {
        const req = store.getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function remove(storeName, id) {
    return tx(storeName, 'readwrite').then(function (store) {
      return new Promise(function (resolve, reject) {
        const req = store.delete(id);
        req.onsuccess = function () { resolve(true); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function clear(storeName) {
    return tx(storeName, 'readwrite').then(function (store) {
      return new Promise(function (resolve, reject) {
        const req = store.clear();
        req.onsuccess = function () { resolve(true); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function generateId() {
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 10);
    return t + '-' + r;
  }

  /* ---------- EXPORT ---------- */

  global.storage = {
    STORES: STORES,

    /* localStorage */
    lsGet: lsGet,
    lsSet: lsSet,
    lsRemove: lsRemove,

    /* IndexedDB */
    put: put,
    get: get,
    getAll: getAll,
    remove: remove,
    clear: clear,

    /* util */
    generateId: generateId,

    /* convenience shortcuts */
    save: function (storeName, record) { return put(storeName, record); },
    load: function (storeName, id) { return get(storeName, id); },
    loadAll: function (storeName) { return getAll(storeName); },
    delete: function (storeName, id) { return remove(storeName, id); }
  };
})(window);
