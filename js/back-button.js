/* =========================================================
   ALATIKA PRO — back-button.js
   ONEMOGUĆENO — hash routing sam rešava back navigaciju.
   ========================================================= */

(function (global) {
  'use strict';

  /* Ne radimo ništa — pustimo browser da prirodno upravlja
     back dugmetom preko hash routing-a (#home, #reminders...). */

  global.backButton = {
    init: function () {},
    pushHistory: function () {},
    hasOpenModal: function () {
      return !!document.querySelector('.modal-overlay.show, .pin-overlay.show, .help-modal-overlay.show');
    },
    closeOpenModal: function () {
      const modal = document.querySelector('.modal-overlay.show, .pin-overlay.show, .help-modal-overlay.show');
      if (!modal) return false;
      const closeBtn = modal.querySelector(
        '#detailClose, #rateDetailClose, #checkDetailClose, #itemDetailClose, ' +
        '#txDetailClose, #convClose, #helpCloseBtn, #remCancel, #billCancel, ' +
        '#rateCancel, #checkCancel, #itemCancel, #moneyCancel, #budgetCancel, ' +
        '#pinCancel, #receiptCancel, #receiptDetailClose, #settingsClose, ' +
        '#profileClose, #locationCancel, #editorCancel'
      );
      if (closeBtn) {
        try { closeBtn.click(); return true; } catch (e) {}
      }
      try { modal.click(); return true; } catch (e) {}
      return false;
    },
    notifyUIChanged: function () {}
  };
})(window);
