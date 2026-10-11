/* =========================================================
   ALATIKA PRO — app.js
   Glavna tačka pokretanja aplikacije.
   ========================================================= */

(function (global) {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function initLanguage() {
    if (!global.i18n) return;
    global.i18n.init();

    const langBtn = document.getElementById('langToggle');
    const langLabel = document.getElementById('langLabel');

    if (langLabel) langLabel.textContent = global.i18n.getLangLabel();

    if (langBtn && !langBtn.dataset.bound) {
      langBtn.dataset.bound = '1';
      langBtn.addEventListener('click', function () {
        global.i18n.toggleLang();
        if (langLabel) langLabel.textContent = global.i18n.getLangLabel();
      });
    }

    global.addEventListener('alatikapro:langchange', function () {
      if (langLabel) langLabel.textContent = global.i18n.getLangLabel();
    });
  }

  function initTheme() {
    if (!global.appState) return;
    global.appState.initTheme();

    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn && !themeBtn.dataset.bound) {
      themeBtn.dataset.bound = '1';
      themeBtn.addEventListener('click', function () {
        global.appState.toggleTheme();
      });
    }
  }

  function initSettings() {
    const btn = document.getElementById('settingsBtn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      if (global.settings && global.settings.open) {
        global.settings.open();
      }
    });
  }

  function initRouter() {
    if (!global.router) return;
    global.router.init();
  }

  function initHome() {
    if (global.home && global.home.init) {
      global.home.init();
    }
  }

  function applyInitialState() {
    if (!global.appState) return;
    const s = global.appState.state;
    s.lang = global.i18n ? global.i18n.getLang() : 'sr';
    s.loaded = true;
  }

  function logStatus() {
    if (!global.console || !console.info) return;
    console.info(
      '%cAlatika Pro%c v1.0.0 — sesija 2 spremna.',
      'background:#6C5CE7;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700;',
      'color:#6C5CE7;font-weight:600;'
    );
  }

  ready(function () {
    try {
      initTheme();
      initLanguage();
      initSettings();
      initRouter();
      initHome();
      applyInitialState();
      logStatus();
    } catch (err) {
      if (global.console && console.error) {
        console.error('Alatika Pro — greška pri pokretanju:', err);
      }
    }
  });

  global.alatikaPro = {
    version: '1.0.0',
    ready: ready
  };
})(window);
