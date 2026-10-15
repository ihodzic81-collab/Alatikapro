/* =========================================================
   ALATIKA PRO — back-button-v6.js
   Verzija: 8.0 — radi i u PWA i u browseru
   Cilj: back dugme ne izbacuje iz aplikacije.
   ========================================================= */

(function (global) {
  'use strict';

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
    /* 1. Ako je modal otvoren — zatvori ga i blokiraj navigaciju */
    if (hasOpenModal()) {
      closeOpenModal();
      pushGuard();
      return;
    }

    /* 2. Ako nismo na home — vrati se na home i blokiraj */
    if (!isOnHome()) {
      if (global.router && global.router.navigate) {
        global.router.navigate('home');
      }
      pushGuard();
      return;
    }

    /* 3. Na home smo — dodaj JOŠ jedan guard da sprečimo izlaz */
    pushGuard();
  }

  function watchModals() {
    let wasOpen = false;
    const observer = new MutationObserver(function () {
      const nowOpen = hasOpenModal();
      if (nowOpen && !wasOpen) {
        wasOpen = true;
        pushGuard();
      } else if (!nowOpen && wasOpen) {
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

  function watchRoutes() {
    if (global.router && global.router.onRouteChange) {
      global.router.onRouteChange(function (route) {
        if (route !== 'home') {
          pushGuard();
        }
      });
    }
  }

  function init() {
    try {
      history.replaceState({ app: 'alatikapro', screen: 'home', guard: 0 }, '');
    } catch (e) {}

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
