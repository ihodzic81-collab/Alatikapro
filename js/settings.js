/* =========================================================
   ALATIKA PRO — settings.js
   Podešavanja: datum, PIN po kartici, profili.
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
    requestAnimationFrame(function () { overlay.classList.add('show'); });
  }

  function closeSettings() {
    if (!overlay) return;
    overlay.classList.remove('show');
    setTimeout(function () {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay = null;
    }, 200);
  }

  function renderBody() {
    if (!overlay) return;
    const body = overlay.querySelector('#settingsBody');
    body.innerHTML = '';

    /* ---------- SEKCIJA 1: OPŠTE (Format datuma) ---------- */
    const general = el('div', { class: 'card', style: 'margin-bottom: 0.75rem;' });
    general.appendChild(el('h4', { class: 'text-sm font-bold', text: t('settings.general', 'Opšte') }));

    const dateRow = el('div', { class: 'lock-row', style: 'margin-top: 0.5rem;' });
    dateRow.appendChild(el('span', { class: 'lock-row-label', text: t('settings.dateFormat', 'Format datuma') }));

    const dateSelect = el('select', { class: 'select', style: 'max-width: 200px; min-height: 40px; padding: 0.4rem 0.6rem;' });
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
      if (global.home) global.home.showToast(t('settings.dateFormatChanged', 'Format datuma promenjen.'));
      if (global.router) {
        const route = global.router.current();
        if (route === 'reminders' && global.reminders) {
          const v = document.getElementById('view-reminders');
          if (v) { v.innerHTML = ''; global.reminders.init && global.reminders.init(); }
        }
        if (route === 'bills' && global.bills) {
          const v = document.getElementById('view-bills');
          if (v) { v.innerHTML = ''; global.bills.init && global.bills.init(); }
        }
        if (route === 'items' && global.items) {
          const v = document.getElementById('view-items');
          if (v) { v.innerHTML = ''; global.items.init && global.items.init(); }
        }
      }
    });
    dateRow.appendChild(dateSelect);
    general.appendChild(dateRow);
    general.appendChild(el('p', { class: 'form-hint', style: 'margin-top: 0.4rem;', text: t('settings.dateFormatHint', 'Primer: 25/12/2026 ili 12/25/2026') }));
    body.appendChild(general);

    /* ---------- SEKCIJA 2: PROFILI ---------- */
    const profiles = el('div', { class: 'card', style: 'margin-bottom: 0.75rem;' });
    profiles.appendChild(el('h4', { class: 'text-sm font-bold', text: t('settings.profiles', 'Profili') }));
    profiles.appendChild(el('p', {
      class: 'text-xs text-muted',
      style: 'margin: 0.25rem 0 0.75rem;',
      text: t('settings.profilesHint', 'Dodaj do 3 profila (npr. za članove porodice).')
    }));

    const profileList = global.profile ? global.profile.getProfiles() : [];
    const activeProfileId = global.profile ? global.profile.getActiveProfileId() : null;

    if (profileList.length === 0) {
      profiles.appendChild(el('p', { class: 'text-sm text-muted', style: 'text-align:center;padding:0.5rem 0;', text: t('profile.empty', 'Još nemaš profila.') }));
    } else {
      profileList.forEach(function (p) {
        const row = el('div', { class: 'lock-row' });
        const label = el('span', { class: 'lock-row-label' });
        label.innerHTML = '<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:' + p.color + ';color:#fff;font-weight:800;font-size:0.75rem;">' + p.letter + '</span> ' + global.utils.escapeHtml(p.name);
        row.appendChild(label);

        if (p.id === activeProfileId) {
          row.appendChild(el('span', { class: 'text-xs', style: 'color:var(--color-brand);font-weight:700;text-transform:uppercase;', text: t('profile.active', 'Aktivan') }));
        }
        profiles.appendChild(row);
      });
    }

    const openProfilesBtn = el('button', {
      type: 'button',
      class: 'btn btn-primary btn-block',
      style: 'margin-top: 0.75rem;',
      text: t('profile.manage', 'Upravljaj profilima')
    });
    openProfilesBtn.addEventListener('click', function () {
      closeSettings();
      setTimeout(function () {
        if (global.profile && global.profile.openModal) global.profile.openModal();
      }, 220);
    });
    profiles.appendChild(openProfilesBtn);
    body.appendChild(profiles);

    /* ---------- SEKCIJA 3: PIN PO KARTICI ---------- */
    const privacy = el('div', { class: 'card' });
    privacy.appendChild(el('h4', { class: 'text-sm font-bold', text: t('settings.privacy', 'Zaključavanje kartica') }));
    privacy.appendChild(el('p', {
      class: 'text-xs text-muted',
      style: 'margin: 0.25rem 0 0.75rem;',
      text: t('settings.privacyHint', 'Klikni na katanac pored kartice da postaviš PIN. Svaka kartica može imati svoj PIN.')
    }));

    const modules = [
      { key: 'reminders', labelKey: 'nav.reminders', labelFallback: 'Podsetnici' },
      { key: 'bills', labelKey: 'nav.bills', labelFallback: 'Računi' },
      { key: 'items', labelKey: 'nav.items', labelFallback: 'Moje stvari' },
      { key: 'money', labelKey: 'nav.money', labelFallback: 'Novac' }
    ];

    const list = el('div', { class: 'lock-list' });
    modules.forEach(function (mod) {
      const row = el('div', { class: 'lock-row' });
      const label = el('span', { class: 'lock-row-label' });
      label.appendChild(el('span', { class: 'dot ' + mod.key }));
      label.appendChild(el('span', { text: t(mod.labelKey, mod.labelFallback) }));
      row.appendChild(label);

      const locked = global.pin.isModuleLocked(mod.key);
      const btn = el('button', {
        type: 'button',
        class: 'btn ' + (locked ? 'btn-danger' : 'btn-secondary'),
        style: 'min-height: 34px; padding: 0.35rem 0.75rem; font-size: 0.8rem;',
        text: locked ? t('pin.removeShort', 'Ukloni PIN') : t('pin.setShort', 'Postavi PIN')
      });

      btn.addEventListener('click', function () {
        if (locked) {
          /* Ukloni PIN */
          global.pin.removeModulePin(mod.key);
          global.home.showToast(t('pin.removed', 'PIN uklonjen za ') + t(mod.labelKey, mod.labelFallback));
          renderBody();
          if (global.home) global.home.refresh();
        } else {
          /* Postavi PIN */
          closeSettings();
          setTimeout(function () {
            if (global.pinUI && global.pinUI.promptSetPin) {
              global.pinUI.promptSetPin(mod.key, function () {
                global.home.showToast(t('pin.setOk', 'PIN postavljen za ') + t(mod.labelKey, mod.labelFallback));
                if (global.home) global.home.refresh();
              });
            }
          }, 220);
        }
      });
      row.appendChild(btn);
      list.appendChild(row);
    });
    privacy.appendChild(list);

    /* Auto-lock */
    const autoRow = el('div', { class: 'lock-row', style: 'margin-top: 0.5rem;' });
    autoRow.appendChild(el('span', { class: 'lock-row-label', text: t('settings.autoLock', 'Automatsko zaključavanje') }));
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

    /* Ukloni sve PIN-ove */
    if (global.pin.isAnyModuleLocked()) {
      const removeAllRow = el('div', { class: 'lock-row', style: 'margin-top: 0.5rem;' });
      removeAllRow.appendChild(el('span', { class: 'lock-row-label', text: t('settings.removeAllPins', 'Ukloni sve PIN-ove') }));
      const removeAllBtn = el('button', {
        type: 'button',
        class: 'btn btn-danger',
        style: 'min-height: 36px; padding: 0.4rem 0.9rem; font-size: 0.85rem;',
        text: t('common.delete', 'Obriši')
      });
      removeAllBtn.addEventListener('click', function () {
        if (!global.confirm) return;
        const ok = global.confirm(t('settings.removeAllPinsConfirm', 'Ukloniti sve PIN-ove? Sve kartice će biti otključane.'));
        if (!ok) return;
        global.pin.removeAllPins();
        global.pin.clearSession();
        if (global.home) global.home.refresh();
        renderBody();
        if (global.home) global.home.showToast(t('settings.pinsRemoved', 'Svi PIN-ovi su uklonjeni.'));
      });
      removeAllRow.appendChild(removeAllBtn);
      privacy.appendChild(removeAllRow);
    }

    body.appendChild(privacy);

    /* ---------- SEKCIJA 4: O APLIKACIJI ---------- */
    const about = el('div', { class: 'card', style: 'margin-top: 0.75rem;' });
    about.appendChild(el('h4', { class: 'text-sm font-bold', text: t('settings.about', 'O aplikaciji') }));
    about.appendChild(el('p', { class: 'text-xs text-muted', style: 'margin-top: 0.25rem;', text: t('settings.version', 'Alatika Pro — verzija 1.0.0') }));
    body.appendChild(about);
  }

  global.settings = {
    open: openSettings,
    close: closeSettings
  };
})(window);
