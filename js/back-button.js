/* =========================================================
   ALATIKA PRO — back-button.js
   Android back dugme: mrvice + pitanje za izlaz.
   Verzija: 2.0 — ručno brojanje koraka, ne oslanja se na e.state.
   ========================================================= */

(function (global) {
  'use strict';

  /* Naš interni brojač koraka:
     0 = home
     1 = modul (reminders, bills, items, money)
     2 = modal otvoren (bilo koji)
  */
  let step = 0;
  let isExitPromptOpen = false;
  let lastModalState = false;

  function t(key, fallback) {
    return (global.i18n && global.i18n.t) ? global.i18n.t(key, fallback) : (fallback || key);
  }

  function pushGuard() {
    try {
      history.pushState({ app: 'alatikapro', guard: true, step: step, ts: Date.now() }, '');
    } catch (e) {}
  }

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
      '#profileClose, #locationCancel, #editorCancel'
    );
    if (closeBtn) {
      try { closeBtn.click(); return true; } catch (e) {}
    }

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
    if (isExitPromptOpen) return Promise.resolve(false);
    isExitPromptOpen = true;

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

      function cleanup() {
        if (overlay.parentNode) document.body.removeChild(overlay);
        isExitPromptOpen = false;
      }

      overlay.querySelector('#exitNo').addEventListener('click', function () {
        cleanup();
        resolve(false);
      });
      overlay.querySelector('#exitYes').addEventListener('click', function () {
        cleanup();
        resolve(true);
      });
    });
  }

  /**
   * Ažurira interni step na osnovu trenutnog stanja UI-ja.
   * Poziva se pre svake odluke u onPopState.
   */
  function updateStepFromUI() {
    const modalOpen = hasOpenModal();
    const onHome = isOnHome();

    if (modalOpen) {
      step = 2;
    } else if (!onHome) {
      step = 1;
    } else {
      step = 0;
    }
  }

  function onPopState(e) {
    /* Ako je otvoren exit prompt — ignoriši */
    if (isExitPromptOpen) {
      pushGuard();
      return;
    }

    /* Ažuriraj step na osnovu trenutnog UI stanja */
    updateStepFromUI();

    /* 1. Ako je modal otvoren (step 2) — zatvori ga, ostani u modulu */
    if (step === 2) {
      closeOpenModal();
      /* Sada je step 1 (modul) */
      step = 1;
      pushGuard();
      return;
    }

    /* 2. Ako smo u modulu (step 1) — idi na home */
    if (step === 1) {
      goHome();
      step = 0;
      pushGuard();
      return;
    }

    /* 3. Na home (step 0) — pitaj za izlaz */
    confirmExit().then(function (shouldExit) {
      if (shouldExit) {
        try { window.close(); } catch (err) {}
        setTimeout(function () {
          try { history.back(); } catch (err) {}
        }, 100);
      } else {
        pushGuard();
      }
    });
  }

  /**
   * Javna funkcija — poziva se kada god se promeni UI stanje (ušli u modul,
   * otvorili modal, zatvorili modal) da bismo ažurirali step i dodali guard.
   */
  function notifyUIChanged() {
    updateStepFromUI();
    pushGuard();
  }

  function init() {
    /* Prvi history entry */
    try {
      history.replaceState({ app: 'alatikapro', screen: 'home', step: 0 }, '');
    } catch (e) {}

    pushGuard();

    window.addEventListener('popstate', onPopState);

    /* Prati promene ruta */
    if (global.router && global.router.onRouteChange) {
      global.router.onRouteChange(function (route) {
        updateStepFromUI();
        pushGuard();
      });
    }

    /* Prati otvaranje/zatvaranje modala preko MutationObserver */
    const observer = new MutationObserver(function () {
      const modalOpen = hasOpenModal();
      if (modalOpen !== lastModalState) {
        lastModalState = modalOpen;
        updateStepFromUI();
        pushGuard();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  global.backButton = {
    init: init,
    pushHistory: pushGuard,
    hasOpenModal: hasOpenModal,
    closeOpenModal: closeOpenModal,
    notifyUIChanged: notifyUIChanged
  };
})(window);
