/* =========================================================
   ALATIKA PRO — app.js
   Glavna tačka pokretanja aplikacije.
   + Android back dugme zatvara modale.
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

  function initHome() { if (global.home && global.home.init) global.home.init(); }
  function initReminders() { if (global.reminders && global.reminders.init) global.reminders.init(); }
  function initBills() { if (global.bills && global.bills.init) global.bills.init(); }
  function initItems() { if (global.items && global.items.init) global.items.init(); }
  function initMoney() { if (global.money && global.money.init) global.money.init(); }

  function initBackButtons() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-back]');
      if (!btn) return;
      e.preventDefault();
      if (global.router && global.router.navigate) {
        global.router.navigate('home');
      }
    });
  }

  /**
   * ANDROID BACK DUGME — zatvara modale umesto izlaska iz aplikacije.
   *
   * Logika:
   * - Kada korisnik otvori bilo koji modal, dodajemo history entry (pushState)
   * - Kada pritisne Android back, browser emituje 'popstate'
   * - Na 'popstate', tražimo otvoreni modal i zatvaramo ga
   * - Ako nema modala, onda browser normalno radi back (izlazak)
   */
  function initAndroidBackButton() {
    /* Pratimo da li je back već registrovan */
    let backGuardActive = false;

    /* Kada se otvori modal (bilo koji .modal-overlay.show), dodaj history entry */
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          /* Provera da li je modal */
          if (node.classList && (node.classList.contains('modal-overlay') ||
              node.classList.contains('pin-overlay') ||
              node.classList.contains('help-modal-overlay'))) {
            /* Dodaj history entry da back dugme ima šta da "pojede" */
            try {
              history.pushState({ modalOpen: true, ts: Date.now() }, '');
              backGuardActive = true;
            } catch (e) {}
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: false });

    /* Na popstate — zatvori modal ako postoji */
    window.addEventListener('popstate', function (e) {
      /* Pronađi otvoreni modal */
      const openModal = document.querySelector('.modal-overlay.show') ||
                        document.querySelector('.pin-overlay.show') ||
                        document.querySelector('.help-modal-overlay.show');

      if (openModal) {
        /* Zatvori modal na klik na overlay pozadinu (to rade svi modali) */
        const clickEvent = new MouseEvent('click', { bubbles: true });
        openModal.dispatchEvent(clickEvent);
        /* Ako modal ima posebno dugme za zatvaranje, klikni ga */
        const closeBtn = openModal.querySelector('#detailClose, #rateDetailClose, #checkDetailClose, #itemDetailClose, #txDetailClose, #convClose, #helpCloseBtn, #remCancel, #billCancel, #rateCancel, #checkCancel, #itemCancel, #moneyCancel, #budgetCancel, #pinCancel');
        if (closeBtn) {
          try { closeBtn.click(); } catch (e) {}
        }
        /* Dodaj novi history entry da ostane u aplikaciji */
        try {
          history.pushState({ appGuard: true, ts: Date.now() }, '');
        } catch (e) {}
        return;
      }

      /* Ako nema modala, ništa ne radimo — browser izlazi ili ide nazad */
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
      initBackButtons();
      initRouter();
      initHome();
      initReminders();
      initBills();
      initItems();
      initMoney();
      initAndroidBackButton();
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
