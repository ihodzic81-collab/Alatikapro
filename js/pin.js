/* =========================================================
   ALATIKA PRO — pin.js
   PIN zaštita po kartici (različit PIN za svaku karticu).
   ========================================================= */

(function (global) {
  'use strict';

  const LS_MODULE_PINS = 'pin.modules';
  const LS_FAILS = 'pin.fails';
  const LS_LOCK_UNTIL = 'pin.lockUntil';
  const LS_AUTO_LOCK = 'pin.autoLockMinutes';

  const MAX_FAILS = 5;
  const LOCKOUT_MINUTES = 5;
  const MODULES = ['reminders', 'bills', 'items', 'money'];

  /* ---------- KRIPTOGRAFIJA ---------- */

  function randomSalt() {
    const bytes = new Uint8Array(16);
    if (global.crypto && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    let s = '';
    for (let i = 0; i < bytes.length; i++) {
      s += bytes[i].toString(16).padStart(2, '0');
    }
    return s;
  }

  function bufToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      out += bytes[i].toString(16).padStart(2, '0');
    }
    return out;
  }

  function sha256Hex(text) {
    if (global.crypto && global.crypto.subtle && global.TextEncoder) {
      const enc = new TextEncoder();
      const data = enc.encode(text);
      return global.crypto.subtle.digest('SHA-256', data).then(bufToHex);
    }
    let h = 0;
    for (let i = 0; i < text.length; i++) {
      h = ((h << 5) - h) + text.charCodeAt(i);
      h |= 0;
    }
    return Promise.resolve('fb' + (h >>> 0).toString(16));
  }

  function hashPin(pin, salt) {
    return sha256Hex(salt + ':' + pin + ':' + salt);
  }

  /* ---------- STORAGE ---------- */

  function getModulePins() {
    return global.storage.lsGet(LS_MODULE_PINS, {}) || {};
  }

  function saveModulePins(obj) {
    global.storage.lsSet(LS_MODULE_PINS, obj);
  }

  function getFails() {
    return global.storage.lsGet(LS_FAILS, {}) || {};
  }

  function saveFails(obj) {
    global.storage.lsSet(LS_FAILS, obj);
  }

  function getLockUntil() {
    return global.storage.lsGet(LS_LOCK_UNTIL, {}) || {};
  }

  function saveLockUntil(obj) {
    global.storage.lsSet(LS_LOCK_UNTIL, obj);
  }

  /* ---------- STATUS ---------- */

  function isModuleLocked(moduleName) {
    const pins = getModulePins();
    return !!pins[moduleName];
  }

  function isAnyModuleLocked() {
    const pins = getModulePins();
    return Object.keys(pins).some(function (k) { return !!pins[k]; });
  }

  function getLockedModules() {
    return getModulePins();
  }

  /* ---------- POSTAVLJANJE / PROMENA / UKLANJANJE ---------- */

  function setModulePin(moduleName, pin) {
    if (!/^\d{4}$/.test(pin)) {
      return Promise.reject(new Error('PIN mora imati tačno 4 cifre.'));
    }
    const salt = randomSalt();
    return hashPin(pin, salt).then(function (hash) {
      const pins = getModulePins();
      pins[moduleName] = { hash: hash, salt: salt, setAt: Date.now() };
      saveModulePins(pins);

      /* Reset fails za taj modul */
      const fails = getFails();
      delete fails[moduleName];
      saveFails(fails);

      const until = getLockUntil();
      delete until[moduleName];
      saveLockUntil(until);

      try {
        global.dispatchEvent(new CustomEvent('alatikapro:pinchange', {
          detail: { module: moduleName, locked: true }
        }));
      } catch (e) {}
      return true;
    });
  }

  function verifyModulePin(moduleName, pin) {
    if (!/^\d{4}$/.test(pin)) return Promise.resolve(false);

    const untilMap = getLockUntil();
    const until = untilMap[moduleName];
    if (until && Date.now() < until) return Promise.resolve(false);

    const pins = getModulePins();
    const rec = pins[moduleName];
    if (!rec) return Promise.resolve(false);

    return hashPin(pin, rec.salt).then(function (candidate) {
      if (candidate === rec.hash) {
        const fails = getFails();
        delete fails[moduleName];
        saveFails(fails);
        const until2 = getLockUntil();
        delete until2[moduleName];
        saveLockUntil(until2);
        return true;
      }
      const fails = getFails();
      fails[moduleName] = (fails[moduleName] || 0) + 1;
      saveFails(fails);
      if (fails[moduleName] >= MAX_FAILS) {
        const until2 = getLockUntil();
        until2[moduleName] = Date.now() + LOCKOUT_MINUTES * 60000;
        saveLockUntil(until2);
      }
      return false;
    });
  }

  function removeModulePin(moduleName) {
    const pins = getModulePins();
    delete pins[moduleName];
    saveModulePins(pins);
    const fails = getFails();
    delete fails[moduleName];
    saveFails(fails);
    const until = getLockUntil();
    delete until[moduleName];
    saveLockUntil(until);

    /* Ukloni iz sesije */
    delete sessionUnlocked[moduleName];

    try {
      global.dispatchEvent(new CustomEvent('alatikapro:pinchange', {
        detail: { module: moduleName, locked: false }
      }));
    } catch (e) {}
    return true;
  }

  function removeAllPins() {
    global.storage.lsRemove(LS_MODULE_PINS);
    global.storage.lsRemove(LS_FAILS);
    global.storage.lsRemove(LS_LOCK_UNTIL);
    MODULES.forEach(function (m) { delete sessionUnlocked[m]; });
  }

  function getRemainingLockSeconds(moduleName) {
    const untilMap = getLockUntil();
    const until = untilMap[moduleName];
    if (!until) return 0;
    const left = until - Date.now();
    return left > 0 ? Math.ceil(left / 1000) : 0;
  }

  /* ---------- AUTO LOCK ---------- */

  function getAutoLockMinutes() {
    const v = global.storage.lsGet(LS_AUTO_LOCK, 5);
    return typeof v === 'number' && v >= 0 ? v : 5;
  }

  function setAutoLockMinutes(min) {
    global.storage.lsSet(LS_AUTO_LOCK, Number(min) || 0);
  }

  /* ---------- SESIJA ---------- */

  const sessionUnlocked = {};

  function markUnlocked(moduleName) {
    sessionUnlocked[moduleName] = Date.now();
  }

  function isUnlockedThisSession(moduleName) {
    const t = sessionUnlocked[moduleName];
    if (!t) return false;
    const min = getAutoLockMinutes();
    if (min <= 0) return true;
    return (Date.now() - t) < min * 60000;
  }

  function clearSession() {
    Object.keys(sessionUnlocked).forEach(function (k) {
      delete sessionUnlocked[k];
    });
  }

  function lockModuleNow(moduleName) {
    delete sessionUnlocked[moduleName];
  }

  /* ---------- EXPORT ---------- */

  global.pin = {
    MODULES: MODULES.slice(),
    isModuleLocked: isModuleLocked,
    isAnyModuleLocked: isAnyModuleLocked,
    getLockedModules: getLockedModules,
    setModulePin: setModulePin,
    verifyModulePin: verifyModulePin,
    removeModulePin: removeModulePin,
    removeAllPins: removeAllPins,
    getRemainingLockSeconds: getRemainingLockSeconds,
    getAutoLockMinutes: getAutoLockMinutes,
    setAutoLockMinutes: setAutoLockMinutes,
    markUnlocked: markUnlocked,
    isUnlockedThisSession: isUnlockedThisSession,
    clearSession: clearSession,
    lockModuleNow: lockModuleNow
  };
})(window);
