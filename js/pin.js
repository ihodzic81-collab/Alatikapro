/* =========================================================
   ALATIKA PRO — pin.js
   PIN zaštita: postavljanje, provera, zaključavanje kartica.
   PIN se čuva kao SHA-256 hash (Web Crypto API), ne kao tekst.
   ========================================================= */

(function (global) {
  'use strict';

  const LS_PIN_HASH = 'pin.hash';
  const LS_PIN_SALT = 'pin.salt';
  const LS_LOCKED = 'pin.locked';
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
    /* Fallback: veoma slab, ali bolji nego ništa. */
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

  /* ---------- STANJE ---------- */

  function isPinSet() {
    return !!global.storage.lsGet(LS_PIN_HASH, null);
  }

  function getLockedModules() {
    return global.storage.lsGet(LS_LOCKED, {}) || {};
  }

  function isModuleLocked(moduleName) {
    if (!isPinSet()) return false;
    const locked = getLockedModules();
    return !!locked[moduleName];
  }

  function setModuleLocked(moduleName, locked) {
    if (MODULES.indexOf(moduleName) === -1) return;
    const current = getLockedModules();
    current[moduleName] = !!locked;
    global.storage.lsSet(LS_LOCKED, current);
    try {
      global.dispatchEvent(new CustomEvent('alatikapro:pinchange', {
        detail: { module: moduleName, locked: !!locked }
      }));
    } catch (e) {
      const ev = document.createEvent('Event');
      ev.initEvent('alatikapro:pinchange', true, true);
      ev.detail = { module: moduleName, locked: !!locked };
      global.dispatchEvent(ev);
    }
  }

  /* ---------- POSTAVLJANJE / PROMENA / UKLANJANJE ---------- */

  function setPin(pin) {
    if (!/^\d{4}$/.test(pin)) {
      return Promise.reject(new Error('PIN mora imati tačno 4 cifre.'));
    }
    const salt = randomSalt();
    return hashPin(pin, salt).then(function (hash) {
      global.storage.lsSet(LS_PIN_SALT, salt);
      global.storage.lsSet(LS_PIN_HASH, hash);
      global.storage.lsSet(LS_FAILS, 0);
      global.storage.lsRemove(LS_LOCK_UNTIL);
      return true;
    });
  }

  function verifyPin(pin) {
    if (!/^\d{4}$/.test(pin)) {
      return Promise.resolve(false);
    }
    const until = global.storage.lsGet(LS_LOCK_UNTIL, null);
    if (until && Date.now() < until) {
      return Promise.resolve(false);
    }
    const hash = global.storage.lsGet(LS_PIN_HASH, null);
    const salt = global.storage.lsGet(LS_PIN_SALT, null);
    if (!hash || !salt) return Promise.resolve(false);

    return hashPin(pin, salt).then(function (candidate) {
      if (candidate === hash) {
        global.storage.lsSet(LS_FAILS, 0);
        global.storage.lsRemove(LS_LOCK_UNTIL);
        return true;
      }
      const fails = (global.storage.lsGet(LS_FAILS, 0) || 0) + 1;
      global.storage.lsSet(LS_FAILS, fails);
      if (fails >= MAX_FAILS) {
        global.storage.lsSet(LS_LOCK_UNTIL, Date.now() + LOCKOUT_MINUTES * 60000);
      }
      return false;
    });
  }

  function changePin(oldPin, newPin) {
    return verifyPin(oldPin).then(function (ok) {
      if (!ok) throw new Error('Stari PIN nije ispravan.');
      return setPin(newPin);
    });
  }

  function removePin() {
    global.storage.lsRemove(LS_PIN_HASH);
    global.storage.lsRemove(LS_PIN_SALT);
    global.storage.lsRemove(LS_LOCKED);
    global.storage.lsRemove(LS_FAILS);
    global.storage.lsRemove(LS_LOCK_UNTIL);
    return true;
  }

  function getRemainingLockSeconds() {
    const until = global.storage.lsGet(LS_LOCK_UNTIL, null);
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

  /* ---------- SESIJA (koje je kartice korisnik otključao) ---------- */

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
    isPinSet: isPinSet,
    setPin: setPin,
    verifyPin: verifyPin,
    changePin: changePin,
    removePin: removePin,

    isModuleLocked: isModuleLocked,
    setModuleLocked: setModuleLocked,
    getLockedModules: getLockedModules,

    getRemainingLockSeconds: getRemainingLockSeconds,
    getAutoLockMinutes: getAutoLockMinutes,
    setAutoLockMinutes: setAutoLockMinutes,

    markUnlocked: markUnlocked,
    isUnlockedThisSession: isUnlockedThisSession,
    clearSession: clearSession,
    lockModuleNow: lockModuleNow
  };
})(window);
