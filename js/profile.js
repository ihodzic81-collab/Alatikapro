/* =========================================================
   ALATIKA PRO — profile.js
   Upravljanje profilima korisnika (max 3).
   ========================================================= */

(function (global) {
  'use strict';

  const LS_PROFILES = 'profiles';
  const LS_ACTIVE = 'activeProfile';
  const MAX_PROFILES = 3;

  const COLORS = [
    { id: 'purple', hex: '#6C5CE7' },
    { id: 'pink',   hex: '#EC4899' },
    { id: 'green',  hex: '#10B981' },
    { id: 'blue',   hex: '#3B82F6' },
    { id: 'orange', hex: '#F59E0B' },
    { id: 'teal',   hex: '#14B8A6' }
  ];

  function t(key, fallback) {
    return (global.i18n && global.i18n.t) ? global.i18n.t(key, fallback) : (fallback || key);
  }

  /* ---------- STORAGE ---------- */

  function getProfiles() {
    const list = global.storage.lsGet(LS_PROFILES, []);
    return Array.isArray(list) ? list : [];
  }

  function saveProfiles(list) {
    global.storage.lsSet(LS_PROFILES, list);
  }

  function getActiveProfileId() {
    return global.storage.lsGet(LS_ACTIVE, null);
  }

  function setActiveProfileId(id) {
    global.storage.lsSet(LS_ACTIVE, id);
    try {
      global.dispatchEvent(new CustomEvent('alatikapro:profilechange', { detail: { id: id } }));
    } catch (e) {}
  }

  function getActiveProfile() {
    const id = getActiveProfileId();
    if (!id) return null;
    return getProfiles().find(function (p) { return p.id === id; }) || null;
  }

  /* ---------- CRUD ---------- */

  function addProfile(name, colorId) {
    const list = getProfiles();
    if (list.length >= MAX_PROFILES) return null;
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;

    const color = COLORS.find(function (c) { return c.id === colorId; }) || COLORS[0];
    const profile = {
      id: 'prof-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name: trimmed,
      letter: trimmed.charAt(0).toUpperCase(),
      color: color.hex,
      colorId: color.id,
      createdAt: new Date().toISOString()
    };
    list.push(profile);
    saveProfiles(list);

    /* Ako je prvi profil — postavi kao aktivan */
    if (list.length === 1) {
      setActiveProfileId(profile.id);
    }
    return profile;
  }

  function updateProfile(id, changes) {
    const list = getProfiles();
    const idx = list.findIndex(function (p) { return p.id === id; });
    if (idx === -1) return null;
    if (changes.name) {
      changes.letter = String(changes.name).trim().charAt(0).toUpperCase();
    }
    if (changes.colorId) {
      const color = COLORS.find(function (c) { return c.id === changes.colorId; });
      if (color) changes.color = color.hex;
    }
    list[idx] = Object.assign({}, list[idx], changes);
    saveProfiles(list);
    return list[idx];
  }

  function removeProfile(id) {
    let list = getProfiles();
    if (list.length <= 1) return false;
    list = list.filter(function (p) { return p.id !== id; });
    saveProfiles(list);

    /* Ako je obrisan aktivni — postavi prvog */
    if (getActiveProfileId() === id) {
      setActiveProfileId(list[0] ? list[0].id : null);
    }
    return true;
  }

  function switchProfile(id) {
    const list = getProfiles();
    if (!list.find(function (p) { return p.id === id; })) return false;
    setActiveProfileId(id);
    return true;
  }

  function getColors() {
    return COLORS.slice();
  }

  function getMaxProfiles() {
    return MAX_PROFILES;
  }

  /* ---------- POZDRAV SA IMENOM ---------- */

  function getGreeting() {
    const hour = new Date().getHours();
    let key = 'home.greet.day';
    if (hour < 5) key = 'home.greet.night';
    else if (hour < 11) key = 'home.greet.morning';
    else if (hour < 18) key = 'home.greet.day';
    else key = 'home.greet.evening';

    const base = t(key, 'Zdravo!');
    const profile = getActiveProfile();
    if (!profile) return base;

    /* "Dobro jutro, Irfane!" */
    const name = profile.name;
    const vocative = getVocative(name);
    return base.replace('!', ', ' + vocative + '!');
  }

  function getVocative(name) {
    if (!name) return '';
    const n = name.trim();
    if (/[bcćdđfghjklmnprsštvzž]$/i.test(n)) {
      if (/[aeiou]$/i.test(n)) return n;
      return n + 'e';
    }
    return n;
  }

  /* ---------- UI ---------- */

  function renderAvatarHTML(profile, size) {
    if (!profile) return '';
    const s = size || 36;
    return '<span class="profile-avatar" style="background:' + profile.color + ';width:' + s + 'px;height:' + s + 'px;font-size:' + Math.round(s * 0.45) + 'px;">' + profile.letter + '</span>';
  }

  function updateHeaderAvatar() {
    const wrap = document.getElementById('profileBtn');
    if (!wrap) return;
    const profile = getActiveProfile();
    if (!profile) {
      wrap.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
      wrap.classList.add('profile-btn-empty');
    } else {
      wrap.innerHTML = renderAvatarHTML(profile, 32);
      wrap.classList.remove('profile-btn-empty');
    }
  }

  function openProfileModal() {
    const existing = document.getElementById('profileModal');
    if (existing) existing.parentNode.removeChild(existing);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'profileModal';

    renderModalContent(overlay);

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('show'); });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  function closeModal() {
    const overlay = document.getElementById('profileModal');
    if (overlay) {
      overlay.classList.remove('show');
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 200);
    }
  }

  function renderModalContent(overlay) {
    const list = getProfiles();
    const activeId = getActiveProfileId();

    let profilesHTML = '';
    if (list.length === 0) {
      profilesHTML = '<div class="profile-empty">' + t('profile.empty', 'Još nemaš profila. Dodaj prvi!') + '</div>';
    } else {
      profilesHTML = list.map(function (p) {
        const isActive = p.id === activeId;
        return [
          '<div class="profile-row' + (isActive ? ' active' : '') + '" data-profile-id="' + p.id + '">',
          '  ' + renderAvatarHTML(p, 44),
          '  <div class="profile-row-body">',
          '    <div class="profile-row-name">' + global.utils.escapeHtml(p.name) + '</div>',
          isActive ? '    <div class="profile-row-badge">' + t('profile.active', 'Aktivan') + '</div>' : '',
          '  </div>',
          '  <button type="button" class="profile-row-btn profile-row-edit" data-edit-id="' + p.id + '" aria-label="' + t('common.edit', 'Izmeni') + '">',
          '    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>',
          '  </button>',
          '  <button type="button" class="profile-row-btn profile-row-del" data-del-id="' + p.id + '" aria-label="' + t('common.delete', 'Obriši') + '"' + (list.length <= 1 ? ' disabled' : '') + '>',
          '    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg>',
          '  </button>',
          '</div>'
        ].join('');
      }).join('');
    }

    const canAdd = list.length < MAX_PROFILES;

    overlay.innerHTML = [
      '<div class="modal-sheet" style="max-width: 460px; margin: auto;">',
      '  <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:1rem;">',
      '    <div style="flex:1;">',
      '      <h3 class="modal-title" style="margin:0;">' + t('profile.title', 'Profili') + '</h3>',
      '      <p class="text-muted text-sm" style="margin:0.15rem 0 0;">' + t('profile.subtitle', 'Izaberi ili dodaj profil.') + '</p>',
      '    </div>',
      '    <button type="button" class="icon-btn" id="profileClose" aria-label="' + t('common.close', 'Zatvori') + '">',
      '      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
      '    </button>',
      '  </div>',
      '  <div class="profile-list">' + profilesHTML + '</div>',
      canAdd
        ? '  <button type="button" class="btn btn-primary btn-block" id="profileAddBtn" style="margin-top:1rem;">+ ' + t('profile.add', 'Dodaj profil') + '</button>'
        : '  <p class="text-muted text-sm" style="text-align:center;margin-top:1rem;">' + t('profile.maxReached', 'Dostignut maksimum od 3 profila.') + '</p>',
      '</div>'
    ].join('');

    overlay.querySelector('#profileClose').addEventListener('click', closeModal);

    overlay.querySelectorAll('[data-profile-id]').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('.profile-row-btn')) return;
        const id = row.getAttribute('data-profile-id');
        if (switchProfile(id)) {
          updateHeaderAvatar();
          if (global.home && global.home.refresh) global.home.refresh();
          renderModalContent(overlay);
        }
      });
    });

    overlay.querySelectorAll('[data-edit-id]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const id = btn.getAttribute('data-edit-id');
        const profile = getProfiles().find(function (p) { return p.id === id; });
        if (profile) openEditForm(overlay, profile);
      });
    });

    overlay.querySelectorAll('[data-del-id]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const id = btn.getAttribute('data-del-id');
        const profile = getProfiles().find(function (p) { return p.id === id; });
        if (!profile) return;
        if (global.confirm(t('profile.deleteConfirm', 'Obrisati profil "' + profile.name + '"? Svi podaci ovog profila biće obrisani.'))) {
          removeProfile(id);
          updateHeaderAvatar();
          if (global.home && global.home.refresh) global.home.refresh();
          renderModalContent(overlay);
        }
      });
    });

    const addBtn = overlay.querySelector('#profileAddBtn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        openAddForm(overlay);
      });
    }
  }

  function openAddForm(overlay, existing) {
    const isEdit = !!existing;
    const profile = existing || { name: '', colorId: 'purple' };

    const colorsHTML = COLORS.map(function (c) {
      const sel = profile.colorId === c.id ? ' selected' : '';
      return '<button type="button" class="profile-color-swatch' + sel + '" data-color="' + c.id + '" style="background:' + c.hex + ';" aria-label="' + c.id + '"></button>';
    }).join('');

    overlay.innerHTML = [
      '<div class="modal-sheet" style="max-width: 420px; margin: auto;">',
      '  <h3 class="modal-title">' + (isEdit ? t('profile.edit', 'Izmeni profil') : t('profile.new', 'Novi profil')) + '</h3>',
      '  <div class="form-group">',
      '    <label class="label">' + t('profile.field.name', 'Ime') + ' *</label>',
      '    <input class="input" type="text" id="profileNameInput" maxlength="20" value="' + global.utils.escapeHtml(profile.name) + '" />',
      '  </div>',
      '  <div class="form-group">',
      '    <label class="label">' + t('profile.field.color', 'Boja') + '</label>',
      '    <div class="profile-colors" id="profileColors">' + colorsHTML + '</div>',
      '  </div>',
      '  <div class="form-error" id="profileFormError"></div>',
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-secondary" id="profileFormCancel">' + t('common.cancel', 'Otkaži') + '</button>',
      '    <button type="button" class="btn btn-primary" id="profileFormSave">' + t('common.save', 'Sačuvaj') + '</button>',
      '  </div>',
      '</div>'
    ].join('');

    let selectedColor = profile.colorId || 'purple';

    overlay.querySelectorAll('.profile-color-swatch').forEach(function (sw) {
      sw.addEventListener('click', function () {
        selectedColor = sw.getAttribute('data-color');
        overlay.querySelectorAll('.profile-color-swatch').forEach(function (s) {
          s.classList.toggle('selected', s === sw);
        });
      });
    });

    overlay.querySelector('#profileFormCancel').addEventListener('click', function () {
      renderModalContent(overlay);
    });

    overlay.querySelector('#profileFormSave').addEventListener('click', function () {
      const name = overlay.querySelector('#profileNameInput').value.trim();
      const errEl = overlay.querySelector('#profileFormError');
      errEl.textContent = '';
      if (!name) {
        errEl.textContent = t('profile.err.name', 'Ime je obavezno.');
        return;
      }

      if (isEdit) {
        updateProfile(profile.id, { name: name, colorId: selectedColor });
      } else {
        const created = addProfile(name, selectedColor);
        if (!created) {
          errEl.textContent = t('profile.err.max', 'Dostignut maksimum od 3 profila.');
          return;
        }
      }
      updateHeaderAvatar();
      if (global.home && global.home.refresh) global.home.refresh();
      renderModalContent(overlay);
    });

    setTimeout(function () {
      const inp = overlay.querySelector('#profileNameInput');
      if (inp) inp.focus();
    }, 150);
  }

  function init() {
    updateHeaderAvatar();
    global.addEventListener('alatikapro:profilechange', updateHeaderAvatar);
  }

  global.profile = {
    init: init,
    getProfiles: getProfiles,
    getActiveProfile: getActiveProfile,
    getActiveProfileId: getActiveProfileId,
    setActiveProfileId: setActiveProfileId,
    addProfile: addProfile,
    updateProfile: updateProfile,
    removeProfile: removeProfile,
    switchProfile: switchProfile,
    getColors: getColors,
    getMaxProfiles: getMaxProfiles,
    getGreeting: getGreeting,
    openModal: openProfileModal,
    closeModal: closeModal,
    updateHeaderAvatar: updateHeaderAvatar
  };
})(window);
