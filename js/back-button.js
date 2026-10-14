/* =========================================================
   ALATIKA PRO — back-button.js
   Verzija: 5.0 — potpuno nova logika
   Cilj: back dugme ne izbacuje iz aplikacije.
   ========================================================= */

(function (global) {
  'use strict';

  /* Broj aktivnih "guard" entry-ja u history-ju.
     Svaki put kada uđemo u modul ili otvorimo modal,
     povećamo broj. Kada pritisnemo back, smanjimo.
     Kada je broj 0, browser sme da izađe. */
  let guardCount = 0;

  function hasOpenModal() {
    return !!document.querySelector('.modal-overlay.show, .pin-overlay.show, .help-modal-overlay.show');
  }

  function closeOpenModal() {
    const modal = document.querySelector('.modal-overlay.show, .pin-overlay.show, .help-modal-overlay.show');
    if (!modal) return false;

    const closeBtn = modal.querySelector(
      '#detailClose, #rateDetailClose, #checkDetailClose, #itemDetailClose, ' +
      '#txDetailClose, #convClose, #helpCloseBtn, #remCancel, #billCancel, ' +
      '#rateCancel, #checkCancel, #itemCancel, #moneyCancel, #budgetCancel, ' +
      '#pinCancel, #receiptCancel, #receiptDetailClose, #settingsClose, ' +
      '#profileClose, #locationCancel, #editorCancel, #exitNo'
    );
    if (closeBtn) {
      try { closeBtn.click(); return true; } catch (e) {}
    }

    try { modal.click(); return true; } catch (e) {}
    return false;
  }

  function pushGuard() {
    guardCount++;
    try {
      history.pushState({ app: 'alatikapro', guard: guardCount, ts: Date.now() }, '');
    } catch (e) {}
  }

  function isOnHome() {
    const route = global.router && global.router.current ? global.router.current() : 'home';
    return route === 'home';
  }

  function onPopState() {
    /* Ako je modal otvoren — zatvori ga i blokiraj navigaciju */
    if (hasOpenModal()) {
      closeOpenModal();
      pushGuard();
      return;
    }

    /* Ako nismo na home — vrati se na home i blokiraj */
    if (!isOnHome()) {
      if (global.router && global.router.navigate) {
        global.router.navigate('home');
      }
      pushGuard();
      return;
    }

    /* Na home smo — pusti browser da izađe (normalno ponašanje) */
    /* Ne radimo ništa, browser će izaći iz sajta */
  }

  /**
   * Kada se otvori modal, dodaj guard entry.
   * Kada se zatvori, ne diraj — guard ostaje.
   */
  function watchModals() {
    let wasOpen = false;
    const observer = new MutationObserver(function () {
      const nowOpen = hasOpenModal();
      if (nowOpen && !wasOpen) {
        /* Modal se upravo otvorio */
        wasOpen = true;
        pushGuard();
      } else if (!nowOpen && wasOpen) {
        /* Modal se upravo zatvorio */
        wasOpen = false;
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  /**
   * Kada uđemo u modul, dodaj guard entry.
   */
  function watchRoutes() {
    if (global.router && global.router.onRouteChange) {
      global.router.onRouteChange(function (route) {
        /* Ako nismo na home, dodaj guard */
        if (route !== 'home') {
          pushGuard();
        }
      });
    }
  }

  function init() {
    /* Prvi state */
    try {
      history.replaceState({ app: 'alatikapro', screen: 'home', guard: 0 }, '');
    } catch (e) {}

    /* Dodaj inicijalni guard da back na home ne izađe odmah */
    pushGuard();

    window.addEventListener('popstate', onPopState);
    watchModals();
    watchRoutes();
  }

  global.backButton = {
    init: init,
    hasOpenModal: hasOpenModal,
    closeOpenModal: closeOpenModal,
    pushGuard: pushGuard
  };
})(window);
