/* =========================================================
   ALATIKA PRO — back-button.js
   Android back dugme: mrvice + pitanje za izlaz.
   ========================================================= */

(function (global) {
  'use strict';

  const historyStack = [];
  let modalCheckInterval = null;

  function t(key, fallback) {
    return (global.i18n && global.i18n.t) ? global.i18n.t(key, fallback) : (fallback || key);
  }

  function pushHistory(entry) {
    try {
      history.pushState({ app: 'alatikapro', ...entry, ts: Date.now() }, '');
      historyStack.push(entry);
    } catch (e) {}
  }

  function popHistory() {
    if (historyStack.length > 0) historyStack.pop();
  }

  function hasOpenModal() {
    return document.querySelector('.modal-overlay.show') ||
           document.querySelector('.pin-overlay.show') ||
           document.querySelector('.help-modal-overlay.show');
  }

  function closeOpenModal() {
    const modal = hasOpenModal();
    if (!modal) return false;

    /* Pokušaj da nađeš dugme za zatvaranje */
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

    /* Fallback: klikni na overlay pozadinu */
    try {
      modal.click();
      return true;
    } catch (e) {}
    return false;
  }

  function isOnHome() {
    const route = global.router && global.router.current ? global.router.current() : 'home';
    return route === 'home';
  }

  function goHome() {
    if (global.router && global.router.navigate) {
      global.router.navigate('home');
    }
  }

  function confirmExit() {
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay show';
      overlay.style.zIndex = '9500';
      overlay.innerHTML = [
        '<div class="modal-sheet" style="max-width: 380px; text-align: center; padding: 1.5rem 1.25rem; border-radius: 20px; margin: auto;">',
        '  <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👋</div>',
        '  <h3 class="modal-title" style="margin-bottom: 0.5rem;">' + t('back.exitTitle', 'Izaći iz aplikacije?') + '</h3>',
        '  <p class="text-muted text-sm" style="margin-bottom: 1.25rem;">' + t('back.exitMsg', 'Da li stvarno želiš da zatvoriš Alatiku Pro?') + '</p>',
        '  <div class="modal-actions" style="margin-top: 0;">',
        '    <button type="button" class="btn btn-secondary" id="exitNo">' + t('common.no', 'Ne') + '</button>',
        '    <button type="button" class="btn btn-danger" id="exitYes">' + t('common.yes', 'Da, izađi') + '</button>',
        '  </div>',
        '</div>'
      ].join('');
      document.body.appendChild(overlay);
      requestAnimationFrame(function () { overlay.classList.add('show'); });

      overlay.querySelector('#exitNo').addEventListener('click', function () {
        document.body.removeChild(overlay);
        /* Ostani u aplikaciji — push history entry */
        pushHistory({ screen: 'home-guard' });
        resolve(false);
      });
      overlay.querySelector('#exitYes').addEventListener('click', function () {
        document.body.removeChild(overlay);
        resolve(true);
      });
    });
  }

  function onPopState(e) {
    const state = e.state;

    /* 1. Ako ima otvoren modal — zatvori ga */
    if (hasOpenModal()) {
      closeOpenModal();
      pushHistory({ modalGuard: true });
      return;
    }

    /* 2. Ako nismo na Početnoj — idi na Početnu */
    if (!isOnHome()) {
      goHome();
      pushHistory({ homeGuard: true });
      return;
    }

    /* 3. Na Početnoj — pitaj "Izaći?" */
    confirmExit().then(function (shouldExit) {
      if (shouldExit) {
        /* Pokušaj da zatvoriš aplikaciju */
        try { window.close(); } catch (err) {}
        /* Ako ne može — vrati se nazad */
        setTimeout(function () {
          try { history.back(); } catch (err) {}
        }, 100);
      }
    });
  }

  function interceptAnchorClicks() {
    /* Kada korisnik klikne na link koji vodi ka modulu/modal-u,
       dodaj history entry */
    document.addEventListener('click', function (e) {
      const target = e.target.closest('[data-nav], .module-card, .nav-btn, [data-module], [data-route]');
      if (target) {
        pushHistory({ click: target.className, ts: Date.now() });
      }
    }, true);
  }

  function init() {
    /* Prvi history entry — home */
    try {
      history.replaceState({ app: 'alatikapro', screen: 'home' }, '');
    } catch (e) {}

    /* Dodaj guard da back ima šta da "pojede" */
    pushHistory({ screen: 'home' });

    window.addEventListener('popstate', onPopState);
    interceptAnchorClicks();
  }

  global.backButton = {
    init: init,
    pushHistory: pushHistory,
    hasOpenModal: hasOpenModal,
    closeOpenModal: closeOpenModal
  };
})(window);
