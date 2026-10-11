/* =========================================================
   ALATIKA PRO — state.js
   Globalno stanje aplikacije u memoriji.
   Drži trenutnu rutu, temu, jezik, i osnovne listove podataka.
   ========================================================= */

(function (global) {
  'use strict';

  const STORAGE_THEME = 'theme';

  const state = {
    route: 'home',
    theme: 'light',
    lang: 'sr',
    loaded: false,
    reminders: [],
    bills: [],
    items: [],
    transactions: [],
    budgets: [],
    rates: null,
    ratesUpdatedAt: null,
    settings: {
      showRemindersOnHome: true,
      showBillsOnHome: true,
      showItemsOnHome: true,
      showMoneyOnHome: true,
      showRatesOnHome: true
    }
  };

  const listeners = {};

  function on(event, handler) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(handler);
    return function off() {
      listeners[event] = (listeners[event] || []).filter(function (h) {
        return h !== handler;
      });
    };
  }

  function emit(event, payload) {
    const list = listeners[event];
    if (!list) return;
    list.slice().forEach(function (handler) {
      try { handler(payload); } catch (e) {}
    });
  }

  function set(key, value) {
    state[key] = value;
    emit('change', { key: key, value: value });
    emit('change:' + key, value);
  }

  function get(key) {
    return state[key];
  }

  function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem('alatikapro.' + STORAGE_THEME);
    } catch (e) {}

    if (saved !== 'light' && saved !== 'dark') {
      const prefersDark = global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches;
      saved = prefersDark ? 'dark' : 'light';
    }

    state.theme = saved;
    document.documentElement.setAttribute('data-theme', saved);
  }

  function toggleTheme() {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    state.theme = next;
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('alatikapro.' + STORAGE_THEME, next);
    } catch (e) {}
    emit('change:theme', next);
    return next;
  }

  function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('alatikapro.' + STORAGE_THEME, theme);
    } catch (e) {}
    emit('change:theme', theme);
  }

  global.appState = {
    state: state,
    on: on,
    emit: emit,
    set: set,
    get: get,
    initTheme: initTheme,
    toggleTheme: toggleTheme,
    setTheme: setTheme
  };
})(window);
