/* =========================================================
   ALATIKA PRO — settings.js
   Podešavanja:
   - Opšte: Format datuma (DD/MM/GGGG ili MM/DD/GGGG)
   - Privatnost i zaključavanje (PIN)
   - Zaključavanje pojedinačnih kartica
   - Automatsko zaključavanje
   ========================================================= */

(function (global) {
  'use strict';

  function t(key, fallback) {
    return (global.i18n && global.i18n.t) ? global.i18n.t(key, fallback) : (fallback || key);
  }

  function el(tag, attrs, children) {
    return global.utils.el(tag, attrs, children);
  }

  let overlay = null;

  function buildOverlay() {
    const node = document.createElement('div');
    node.className = 'modal-overlay';
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');
    node.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title" id="settingsTitle"></h3>',
      '  <div id="settingsBody"></div>',
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-secondary" id="settingsClose"></button>',
      '  </div>',
      '</div>'
    ].join('');
    return node;
  }

  function openSettings() {
    if (overlay) return;

    overlay = buildOverlay();
    document.body.appendChild(overlay);

    overlay.querySelector('#settingsTitle').textContent = t('settings.title', 'Podešavanja');
    overlay.querySelector('#settingsClose').textContent = t('common.close', 'Zatvori');

    overlay.querySelector('#settingsClose').addEventListener('click', closeSettings);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeSettings();
    });

    renderBody();

    requestAnimationFrame(function () {
      overlay.classList.add('show');
    });
  }

  function closeSettings() {
    if (!overlay) return;
    overlay.classList.remove('show');
    setTimeout(function () {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      overlay = null;
    }, 200);
  }

  function renderBody() {
    if (!overlay) return;
    const body = overlay.querySelector('#settingsBody');
    body.innerHTML = '';

    /* ================================================
       SEKCIJA 1: OPŠTE (Format datuma)
       ================================================ */
    const general = el('div', { class: 'card', style: 'margin-bottom: 0.75rem;' });

    general.appendChild(el('h4', {
      class: 'text-sm font-bold',
      text: t('settings.general', 'Opšte')
    }));

    /* Format datuma */
    const dateRow = el('div', { class: 'lock-row', style: 'margin-top: 0.5rem;' });
    dateRow.appendChild(el('span', {
      class: 'lock-row-label',
      text: t('settings.dateFormat', 'Format datuma')
    }));

    const dateSelect = el('select', {
      class: 'select',
      style: 'max-width: 200px; min-height: 40px; padding: 0.4rem 0.6rem;'
    });

    const currentFormat = global.utils.getDateFormat();
    const formats = [
      { v: 'DMY', label: t('settings.dateFormatDMY', 'Dan/Mesec/Godina (DD/MM/GGGG)') },
      { v: 'MDY', label: t('settings.dateFormatMDY', 'Mesec/Dan/Godina (MM/DD/GGGG)') }
    ];

    formats.forEach(function (f) {
      const opt = el('option', { value: f.v, text: f.label });
      if (f.v === currentFormat) opt.setAttribute('selected', 'selected');
      dateSelect.appendChild(opt);
    });

    dateSelect.addEventListener('change', function () {
      global.utils.setDateFormat(dateSelect.value);
      if (global.home && global.home.showToast) {
        global.home.showToast(t('settings.dateFormatChanged', 'Format datuma promenjen.'));
      }
      /* Osveži trenutni ekran */
      if (global.router) {
        const route = global.router.current();
        if (route === 'reminders' && global.reminders) {
          const v = document.getElementById('view-reminders');
          if (v) {
            v.innerHTML = '';
            global.reminders.init && global.reminders.init();
          }
        }
        if (route === 'bills' && global.bills) {
          const v = document.getElementById('view-bills');
          if (v) {
            v.innerHTML = '';
            global.bills.init && global.bills.init();
          }
        }
        if (route === 'items' && global.items) {
          const v = document.getElementById('view-items');
          if (v) {
            v.innerHTML = '';
            global.items.init && global.items.init();
          }
        }
      }
    });

    dateRow.appendChild(dateSelect);
    general.appendChild(dateRow);

    /* Hint ispod */
    general.appendChild(el('p', {
      class: 'form-hint',
      style: 'margin-top: 0.4rem;',
      text: t('settings.dateFormatHint', 'Primer: 25/12/2026 ili 12/25/2026')
    }));

    body.appendChild(general);

    /* ================================================
       SEKCIJA 2: PRIVATNOST I ZAKLJUČAVANJE
       ================================================ */
    const privacy = el('div', { class: 'card' });

    privacy.appendChild(el('h4', {
      class: 'text-sm font-bold',
      text: t('settings.privacy', 'Privatnost i zaključavanje')
    }));

    privacy.appendChild(el('p', {
      class: 'text-xs text-muted',
      style: 'margin: 0.25rem 0 0.75rem;',
      text: t('settings.privacyHint', 'Zaključaj pojedine kartice 4-cifrenim PIN-om.')
    }));

    /* PIN status + dugmad */
    const pinSet = global.pin && global.pin.isPinSet();

    const pinStatusRow = el('div', { class: 'lock-row' });
    pinStatusRow.appendChild(el('span', {
      class: 'lock-row-label',
      text: pinSet
        ? t('settings.pinSet', 'PIN je postavljen')
        : t('settings.pinNotSet', 'PIN nije postavljen')
    }));

    const pinBtn = el('button', {
      type: 'button',
      class: 'btn btn-primary',
      style: 'min-height: 36px; padding: 0.4rem 0.9rem; font-size: 0.85rem;',
      text: pinSet
        ? t('settings.changePin', 'Promeni PIN')
        : t('settings.setPin', 'Postavi PIN')
    });

    pinBtn.addEventListener('click', function () {
      if (!global.pinUI) return;
      if (pinSet) {
        global.pinUI.promptChangePin(function () {
          if (global.home) global.home.showToast(t('settings.pinChanged', 'PIN je promenjen.'));
          renderBody();
          if (global.home) global.home.refresh();
        });
      } else {
        global.pinUI.promptSetPin(function () {
          if (global.home) global.home.showToast(t('settings.pinSetOk', 'PIN je postavljen.'));
          renderBody();
          if (global.home) global.home.refresh();
        });
      }
    });

    pinStatusRow.appendChild(pinBtn);
    privacy.appendChild(pinStatusRow);

    /* Ako je PIN postavljen — lista kartica za zaključavanje */
    if (pinSet) {
      const list = el('div', { class: 'lock-list' });

      const modules = [
        { key: 'reminders', labelKey: 'nav.reminders', labelFallback: 'Podsetnici' },
        { key: 'bills', labelKey: 'nav.bills', labelFallback: 'Računi' },
        { key: 'items', labelKey: 'nav.items', labelFallback: 'Moje stvari' },
        { key: 'money', labelKey: 'nav.money', labelFallback: 'Novac' }
      ];

      modules.forEach(function (mod) {
        const row = el('div', { class: 'lock-row' });

        const label = el('span', { class: 'lock-row-label' });
        label.appendChild(el('span', { class: 'dot ' + mod.key }));
        label.appendChild(el('span', { text: t(mod.labelKey, mod.labelFallback) }));
        row.appendChild(label);

        const locked = global.pin.isModuleLocked(mod.key);

        const sw = el('label', { class: 'switch' });
        const input = el('input', { type: 'checkbox' });
        if (locked) input.setAttribute('checked', 'checked');
        input.addEventListener('change', function () {
          global.pin.setModuleLocked(mod.key, input.checked);
        });
        sw.appendChild(input);
        sw.appendChild(el('span', { class: 'slider' }));

        row.appendChild(sw);
        list.appendChild(row);
      });

      privacy.appendChild(list);

      /* Auto-lock selektor */
      const autoRow = el('div', { class: 'lock-row' });
      autoRow.appendChild(el('span', {
        class: 'lock-row-label',
        text: t('settings.autoLock', 'Automatsko zaključavanje')
      }));

      const select = el('select', { class: 'select', style: 'max-width: 130px; min-height: 40px; padding: 0.4rem 0.6rem;' });

      const options = [
        { v: 0, label: t('settings.autoLockOff', 'Isključeno') },
        { v: 1, label: t('settings.autoLock1', '1 min') },
        { v: 5, label: t('settings.autoLock5', '5 min') },
        { v: 15, label: t('settings.autoLock15', '15 min') },
        { v: 30, label: t('settings.autoLock30', '30 min') }
      ];
      const current = global.pin.getAutoLockMinutes();
      options.forEach(function (opt) {
        const o = el('option', { value: opt.v, text: opt.label });
        if (Number(opt.v) === Number(current)) o.setAttribute('selected', 'selected');
        select.appendChild(o);
      });
      select.addEventListener('change', function () {
        global.pin.setAutoLockMinutes(Number(select.value));
        global.pin.clearSession();
      });
      autoRow.appendChild(select);

      privacy.appendChild(autoRow);

      /* Uklanjanje PIN-a */
      const removeRow = el('div', { class: 'lock-row', style: 'margin-top: 0.5rem;' });
      removeRow.appendChild(el('span', {
        class: 'lock-row-label',
        text: t('settings.removePin', 'Ukloni PIN')
      }));
      const removeBtn = el('button', {
        type: 'button',
        class: 'btn btn-danger',
        style: 'min-height: 36px; padding: 0.4rem 0.9rem; font-size: 0.85rem;',
        text: t('common.delete', 'Obriši')
      });
      removeBtn.addEventListener('click', function () {
        if (!global.confirm) return;
        const ok = global.confirm(t('settings.removePinConfirm', 'Ukloniti PIN? Kartice više neće biti zaključane.'));
        if (!ok) return;
        global.pin.removePin();
        global.pin.clearSession();
        if (global.home) global.home.refresh();
        renderBody();
        if (global.home) global.home.showToast(t('settings.pinRemoved', 'PIN je uklonjen.'));
      });
      removeRow.appendChild(removeBtn);
      privacy.appendChild(removeRow);
    }

    body.appendChild(privacy);

    /* ================================================
       SEKCIJA 3: O APLIKACIJI
       ================================================ */
    const about = el('div', { class: 'card', style: 'margin-top: 0.75rem;' });
    about.appendChild(el('h4', {
      class: 'text-sm font-bold',
      text: t('settings.about', 'O aplikaciji')
    }));
    about.appendChild(el('p', {
      class: 'text-xs text-muted',
      style: 'margin-top: 0.25rem;',
      text: t('settings.version', 'Alatika Pro — verzija 1.0.0')
    }));
    body.appendChild(about);
  }

  global.settings = {
    open: openSettings,
    close: closeSettings
  };
})(window);
