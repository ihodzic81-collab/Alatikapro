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

  function initProfileButton() {
    const btn = document.getElementById('profileBtn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      if (global.profile && global.profile.openModal) {
        global.profile.openModal();
      }
    });
  }

  function initRouter() {
    if (!global.router) return;
    global.router.init();
  }

  function initHome() { if (global.home && global.home.init) global.home.init(); }
  function initReminders() { if (global.reminders && global.reminders.init) global.reminders.init(); }
  function initBills() { if (global.bills && global.bills.init) global.bills.init(); }
  function initItems() { if (global.items && global.items.init) global.items.init(); }
  function initMoney() { if (global.money && global.money.init) global.money.init(); }

  /**
   * POPRAVLJENO: initBackButtons
   * Sada se vezuje ISKLJUČIVO na elemente koji imaju klasu .back-btn
   * ili atribut data-back, ali isključivo unutar modula (ne na globalne kartice).
   */
  function initBackButtons() {
    document.addEventListener('click', function (e) {
      // Tražimo najbliži element sa klasom .back-btn ili atributom data-back
      const btn = e.target.closest('.back-btn, [data-back]');
      
      // Ako nema takvog elementa, prekidamo
      if (!btn) return;

      // Dodatna sigurnosna provera: ako je kliknut element unutar glavnog menija (home cards/widgets),
      // ignorišemo ga da ne bi došlo do slučajnog zatvaranja.
      if (btn.closest('#homeCards') || btn.closest('#homeWidgets')) {
        return;
      }

      e.preventDefault();
      if (global.router && global.router.navigate) {
        global.router.navigate('home');
      }
    });
  }

  function startChecksAutoRealize() {
    if (!global.bills || !global.bills.autoRealizeChecks) return;
    global.bills.autoRealizeChecks().then(function (changed) {
      if (changed > 0 && global.bills.loadAll) global.bills.loadAll();
    });
    setInterval(function () {
      global.bills.autoRealizeChecks();
    }, 30 * 60 * 1000);
  }

  function startRatesRefresh() {
    if (!global.nbs) return;
    function refresh() {
      global.nbs.getRates().catch(function () {});
    }
    refresh();
    setInterval(refresh, 6 * 60 * 60 * 1000);
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
      '%cAlatika Pro%c v1.0.0',
      'background:#6C5CE7;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700;',
      'color:#6C5CE7;font-weight:600;'
    );
  }

  function bindMoneyEvents() {
    global.addEventListener('alatikapro:moneychange', function () {
      if (global.home && global.home.refresh) global.home.refresh();
    });
  }

  ready(function () {
    try {
      initTheme();
      initLanguage();
      initSettings();
      initProfileButton();
      initBackButtons();
      initRouter();
      initHome();
      initReminders();
      initBills();
      initItems();
      initMoney();

      /* Profil (mora posle home-a) */
      if (global.profile && global.profile.init) global.profile.init();

      /* Back dugme (mora na kraju) */
      if (global.backButton && global.backButton.init) global.backButton.init();

      applyInitialState();
      startChecksAutoRealize();
      startRatesRefresh();
      bindMoneyEvents();
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
