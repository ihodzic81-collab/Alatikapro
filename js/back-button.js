/* =========================================================
   ALATIKA PRO — back-button.js
   Verzija: 4.0 — minimalna i funkcionalna
   Cilj: back dugme zatvara modal pre nego što browser
   promeni hash. Ne izbacuje iz aplikacije dok si u modulu.
   ========================================================= */

(function (global) {
  'use strict';

  let modalOpen = false;

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

  /**
   * Kada se otvori modal, dodaj history entry.
   * Kada se zatvori, ne diraj history — ostavi ga kao guard.
   */
  function watchModals() {
    const observer = new MutationObserver(function () {
      const nowOpen = hasOpenModal();
      if (nowOpen && !modalOpen) {
        /* Modal se upravo otvorio — dodaj history entry */
        modalOpen = true;
        try {
          history.pushState({ app: 'alatikapro', modal: true, ts: Date.now() }, '');
        } catch (e) {}
      } else if (!nowOpen && modalOpen) {
        /* Modal se upravo zatvorio — ostavi history entry kao guard */
        modalOpen = false;
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
   * Kada korisnik pritisne back:
   * - Ako je modal otvoren → zatvori ga i zaustavi navigaciju (ostani na istoj ruti).
   * - Ako nije modal, pusti browser da radi svoje (vrati na prethodni hash).
   */
  function onPopState() {
    /* Ako je modal otvoren u trenutku back-a, zatvori ga i vrati se napred */
    if (hasOpenModal()) {
      closeOpenModal();
      /* Vrati history entry da browser ne bi otišao nazad */
      try {
        history.pushState({ app: 'alatikapro', modal: false, ts: Date.now() }, '');
      } catch (e) {}
    }
    /* Ako nema modala, pusti browser da izvrši normalnu navigaciju kroz hash */
  }

  function init() {
    /* Prvi state */
    try {
      history.replaceState({ app: 'alatikapro', screen: 'home' }, '');
    } catch (e) {}

    window.addEventListener('popstate', onPopState);
    watchModals();
  }

  global.backButton = {
    init: init,
    hasOpenModal: hasOpenModal,
    closeOpenModal: closeOpenModal
  };
})(window);
