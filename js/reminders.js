/* =========================================================
   ALATIKA PRO — reminders.js
   Modul Podsetnici:
   - Lista, filteri, pretraga
   - Dodavanje / izmena / brisanje / završavanje
   - Kategorije (10 početnih + custom)
   - Prioritet, ponavljanje, opis, vreme
   - "Podseti me ranije"
   - Rođendani: automatsko računanje godina (bez duplog pitanja)
   - Povezivanje sa modulom Novac (plaćen podsetnik → rashod)
   - Pulsirajuća tačka za hitne
   ========================================================= */

(function (global) {
  'use strict';

  const STORE = 'reminders';
  const BIRTHDAY_CATEGORY = 'family';

  const DEFAULT_CATEGORIES = [
    { id: 'bills',     name_sr: 'Računi i plaćanja',       name_en: 'Bills & payments' },
    { id: 'vehicle',   name_sr: 'Vozila i registracija',   name_en: 'Vehicles & registration' },
    { id: 'personal',  name_sr: 'Lična dokumenta',         name_en: 'Personal documents' },
    { id: 'family',    name_sr: 'Porodica i rođendani',    name_en: 'Family & birthdays' },
    { id: 'health',    name_sr: 'Zdravlje i pregledi',     name_en: 'Health & checkups' },
    { id: 'work',      name_sr: 'Posao',                   name_en: 'Work' },
    { id: 'subs',      name_sr: 'Pretplate',               name_en: 'Subscriptions' },
    { id: 'home',      name_sr: 'Kuća i imovina',          name_en: 'Home & property' },
    { id: 'travel',    name_sr: 'Putovanja',               name_en: 'Travel' },
    { id: 'other',     name_sr: 'Ostalo',                  name_en: 'Other' }
  ];

  const LS_CUSTOM_CATS = 'reminders.customCats';

  const state = {
    items: [],
    filter: 'all',
    search: '',
    editingId: null
  };

  /* ---------- POMOĆNE ---------- */

  function t(key, fallback) {
    return (global.i18n && global.i18n.t) ? global.i18n.t(key, fallback) : (fallback || key);
  }

  function lang() {
    return (global.i18n && global.i18n.getLang) ? global.i18n.getLang() : 'sr';
  }

  function categoryName(catId) {
    const all = getAllCategories();
    const c = all.find(function (x) { return x.id === catId; });
    if (!c) return catId;
    return lang() === 'en' ? (c.name_en || c.name_sr) : (c.name_sr || c.name_en);
  }

  function getAllCategories() {
    const custom = global.storage.lsGet(LS_CUSTOM_CATS, []) || [];
    return DEFAULT_CATEGORIES.concat(custom);
  }

  function addCustomCategory(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    const id = 'custom-' + global.utils.uid('');
    const custom = global.storage.lsGet(LS_CUSTOM_CATS, []) || [];
    custom.push({ id: id, name_sr: trimmed, name_en: trimmed, custom: true });
    global.storage.lsSet(LS_CUSTOM_CATS, custom);
    return id;
  }

  /* ---------- ROĐENDANSKA LOGIKA ---------- */

  function parseBirthDate(str) {
    if (!str) return null;
    const s = String(str).trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
    }
    m = s.match(/^--(\d{2})-(\d{2})$/);
    if (m) {
      return { year: null, month: Number(m[1]), day: Number(m[2]) };
    }
    return null;
  }

  function nextBirthdayISO(birthInfo) {
    if (!birthInfo) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let target = new Date(now.getFullYear(), birthInfo.month - 1, birthInfo.day);
    if (isNaN(target.getTime())) return null;
    if (target < today) {
      target = new Date(now.getFullYear() + 1, birthInfo.month - 1, birthInfo.day);
    }
    return global.utils.toISODate(target);
  }

  function currentAge(birthInfo) {
    if (!birthInfo || !birthInfo.year) return null;
    const now = new Date();
    let age = now.getFullYear() - birthInfo.year;
    const thisYearBday = new Date(now.getFullYear(), birthInfo.month - 1, birthInfo.day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (thisYearBday > today) age -= 1;
    return age >= 0 ? age : null;
  }

  function ageAtNextBirthday(birthInfo) {
    if (!birthInfo || !birthInfo.year) return null;
    const now = new Date();
    let age = now.getFullYear() - birthInfo.year;
    const thisYearBday = new Date(now.getFullYear(), birthInfo.month - 1, birthInfo.day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (thisYearBday < today) age += 1;
    return age >= 0 ? age : null;
  }

  function isBirthday(rem) {
    return rem && rem.isBirthday === true;
  }

  function effectiveDate(rem) {
    if (isBirthday(rem) && rem.birthDate) {
      const bInfo = parseBirthDate(rem.birthDate);
      const next = nextBirthdayISO(bInfo);
      if (next) return next;
    }
    return rem.date || '';
  }

  function visibleFromDate(rem) {
    const effDate = effectiveDate(rem);
    const notify = Number(rem.notifyDaysBefore) || 0;
    if (!effDate) return '';
    if (notify <= 0) return effDate;
    return global.utils.addDays(effDate, -notify);
  }

  /* ---------- POVEZIVANJE SA NOVCEM ---------- */

  /**
   * Proverava da li je podsetnik povezan sa računom (preko billId).
   * Ako jeste, i ako je označen kao plaćen, evidentira trošak u Novac.
   */
  function handleBillPayment(rem) {
    if (!rem.billId) return Promise.resolve();
    if (!global.money || !global.money.upsertExpenseFromBill) return Promise.resolve();

    /* Pronađi račun u modulu Računi */
    if (!global.bills || !global.bills.loadAll) return Promise.resolve();

    return global.bills.loadAll().then(function () {
      const bills = (global.bills._state && global.bills._state.items) || [];
      const bill = bills.find(function (b) { return b.id === rem.billId; });
      if (!bill) return;

      /* Označi račun kao plaćen */
      bill.paid = true;
      bill.paidDate = global.utils.todayISO();

      return global.storage.save('bills', bill).then(function () {
        /* Sinhronizuj sa Novcem */
        return global.money.upsertExpenseFromBill(bill);
      }).then(function () {
        /* Prikaži toast */
        if (global.home && global.home.showToast) {
          global.home.showToast(t('rem.billPaidToast', '✓ Trošak evidentiran u Novac'));
        }
        /* Osveži modul Novac */
        if (global.money && global.money.refresh) global.money.refresh();
      });
    });
  }

  /* ---------- UČITAVANJE ---------- */

  function loadAll() {
    return global.storage.loadAll(STORE).then(function (list) {
      state.items = (list || []).sort(function (a, b) {
        return (effectiveDate(a) || '').localeCompare(effectiveDate(b) || '');
      });
      return state.items;
    });
  }

  /* ---------- FILTRIRANJE I GRUPISANJE ---------- */

  function applyFilter(list) {
    const today = global.utils.todayISO();
    let out = list.slice();

    if (state.filter === 'active') {
      out = out.filter(function (r) { return !r.done; });
    } else if (state.filter === 'done') {
      out = out.filter(function (r) { return r.done; });
    } else if (state.filter === 'overdue') {
      out = out.filter(function (r) {
        const eff = effectiveDate(r);
        return !r.done && eff && eff < today;
      });
    }

    if (state.search) {
      const q = state.search.toLowerCase();
      out = out.filter(function (r) {
        return (r.title || '').toLowerCase().indexOf(q) !== -1 ||
               (r.description || '').toLowerCase().indexOf(q) !== -1 ||
               (r.date || '').indexOf(q) !== -1 ||
               (r.time || '').indexOf(q) !== -1 ||
               (r.birthDate || '').indexOf(q) !== -1 ||
               categoryName(r.category).toLowerCase().indexOf(q) !== -1;
      });
    }

    return out;
  }

  function groupByDate(list) {
    const today = global.utils.todayISO();
    const tomorrow = global.utils.addDays(today, 1);
    const in7 = global.utils.addDays(today, 7);

    const groups = {
      overdue: [],
      today: [],
      tomorrow: [],
      next7: [],
      later: [],
      done: []
    };

    list.forEach(function (r) {
      const eff = effectiveDate(r);
      const visible = visibleFromDate(r);

      if (r.done) { groups.done.push(r); return; }
      if (!eff) { groups.later.push(r); return; }

      if (eff < today) { groups.overdue.push(r); return; }
      if (eff === today) { groups.today.push(r); return; }
      if (visible === today || eff === tomorrow) { groups.tomorrow.push(r); return; }
      if (visible <= in7 || eff <= in7) { groups.next7.push(r); return; }
      groups.later.push(r);
    });

    return groups;
  }

  /* ---------- RENDER ---------- */

  function renderInto(view) {
    let header = view.querySelector('.module-header');
    let filters = view.querySelector('.rem-filters');
    let searchWrap = view.querySelector('.rem-search');
    let listWrap = view.querySelector('.rem-list');

    if (!header) {
      view.innerHTML = '';
      header = buildHeader();
      view.appendChild(header);
    }

    /* Očisti sve posle headera */
    while (header.nextSibling) {
      view.removeChild(header.nextSibling);
    }

    buildFilters(view);
    buildSearch(view);
    listWrap = document.createElement('div');
    listWrap.className = 'rem-list';
    view.appendChild(listWrap);
    renderList(listWrap);

    buildFAB();
    toggleFabVisibility();
  }

  function buildHeader() {
    const header = document.createElement('div');
    header.className = 'module-header';
    header.innerHTML = [
      '<div class="module-title-wrap">',
      '  <button type="button" class="back-btn" id="remBack" aria-label="' + t('common.back', 'Nazad') + '">',
      '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
      '  </button>',
      '  <div class="module-icon color-amber" aria-hidden="true" style="width:38px;height:38px;">',
      '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>',
      '  </div>',
      '  <div>',
      '    <h2>' + t('reminders.title', 'Podsetnici') + '</h2>',
      '    <p class="text-muted text-sm">' + t('reminders.subtitle', 'Ne zaboravi važne obaveze.') + '</p>',
      '  </div>',
      '</div>',
      '<div class="header-actions-inline">',
      '  <button type="button" class="icon-btn" id="remHelp" aria-label="' + t('common.help', 'Pomoć') + '">',
      '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
      '  </button>',
      '  <button type="button" class="icon-btn" data-module-lock="reminders" title="' + t('pin.lock', 'Zaključaj') + '">',
      '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>',
      '  </button>',
      '</div>'
    ].join('');

    const backBtn = header.querySelector('#remBack');
    backBtn.addEventListener('click', function () {
      global.router.navigate('home');
    });

    const helpBtn = header.querySelector('#remHelp');
    helpBtn.addEventListener('click', function () {
      showHelp();
    });

    return header;
  }

  function showHelp() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title">' + t('rem.help.title', 'Kako rade Podsetnici?') + '</h3>',
      '  <div class="help-content">',
      '    <p>' + t('rem.help.p1', 'Podsetnici služe da ne zaboraviš važne obaveze — račune, rođendane, preglede, registracije.') + '</p>',
      '    <p>' + t('rem.help.p2', 'Ako je podsetnik povezan sa računom (preko kategorije "Računi i plaćanja"), kada ga označiš kao završenog, trošak se automatski evidentira u modulu Novac.') + '</p>',
      '    <p>' + t('rem.help.p3', 'Za rođendane izaberi kategoriju "Porodica i rođendani" — aplikacija automatski računa godine i ponavlja svake godine.') + '</p>',
      '  </div>',
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-primary btn-block" id="helpClose">' + t('common.close', 'Zatvori') + '</button>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);

    overlay.querySelector('#helpClose').addEventListener('click', function () {
      document.body.removeChild(overlay);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
    requestAnimationFrame(function () { overlay.classList.add('show'); });
  }

  function buildFilters(view) {
    const filters = document.createElement('div');
    filters.className = 'rem-filters';
    const filterDefs = [
      { id: 'all',     label: t('rem.filter.all', 'Svi') },
      { id: 'active',  label: t('rem.filter.active', 'Aktivni') },
      { id: 'done',    label: t('rem.filter.done', 'Završeni') },
      { id: 'overdue', label: t('rem.filter.overdue', 'Istekli') }
    ];
    filterDefs.forEach(function (f) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rem-filter' + (state.filter === f.id ? ' active' : '');
      btn.textContent = f.label;
      btn.addEventListener('click', function () {
        state.filter = f.id;
        filters.querySelectorAll('.rem-filter').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        const listWrap = view.querySelector('.rem-list');
        if (listWrap) renderList(listWrap);
      });
      filters.appendChild(btn);
    });
    view.appendChild(filters);
  }

  function buildSearch(view) {
    const search = document.createElement('div');
    search.className = 'rem-search';
    search.innerHTML = [
      '<svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="20" y1="20" x2="16.65" y2="16.65"></line></svg>',
      '<input type="search" id="remSearchInput" placeholder="' + t('rem.search', 'Pretraga...') + '" value="' + global.utils.escapeHtml(state.search) + '" />'
    ].join('');
    view.appendChild(search);

    const inp = search.querySelector('#remSearchInput');
    const debounced = global.utils.debounce(function () {
      state.search = inp.value.trim();
      const listWrap = view.querySelector('.rem-list');
      if (listWrap) renderList(listWrap);
    }, 180);
    inp.addEventListener('input', debounced);
  }

  const CAKE_SVG = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
    '  <path d="M20 21H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1z"></path>',
    '  <path d="M3 14h18"></path>',
    '  <path d="M3 18h18"></path>',
    '  <path d="M12 12v-3"></path>',
    '  <path d="M12 6.5c0-1 1-1.5 1-2.5s-1-1.5-1-2.5c0 1-1 1.5-1 2.5s1 1.5 1 2.5z" fill="currentColor" stroke="none"></path>',
    '  <path d="M8 12v-2"></path>',
    '  <path d="M8 7.5c0-.7.7-1 .7-1.7 0 .7.7 1 .7 1.7a.7.7 0 0 1-1.4 0z" fill="currentColor" stroke="none"></path>',
    '  <path d="M16 12v-2"></path>',
    '  <path d="M16 7.5c0-.7.7-1 .7-1.7 0 .7.7 1 .7 1.7a.7.7 0 0 1-1.4 0z" fill="currentColor" stroke="none"></path>',
    '</svg>'
  ].join('');

  function renderList(listWrap) {
    listWrap.innerHTML = '';

    const filtered = applyFilter(state.items);
    const groups = groupByDate(filtered);

    const groupOrder = [
      { key: 'overdue',  label: t('rem.group.overdue', 'Istekli') },
      { key: 'today',    label: t('rem.group.today', 'Danas') },
      { key: 'tomorrow', label: t('rem.group.tomorrow', 'Sutra') },
      { key: 'next7',    label: t('rem.group.next7', 'Narednih 7 dana') },
      { key: 'later',    label: t('rem.group.later', 'Kasnije') },
      { key: 'done',     label: t('rem.group.done', 'Završeni') }
    ];

    let totalShown = 0;

    groupOrder.forEach(function (g) {
      const items = groups[g.key] || [];
      if (!items.length) return;
      totalShown += items.length;

      const wrap = document.createElement('div');
      wrap.className = 'rem-group';

      const title = document.createElement('div');
      title.className = 'rem-group-title';
      title.innerHTML = '<span>' + global.utils.escapeHtml(g.label) + '</span>' +
                        '<span class="rem-group-count">' + items.length + '</span>';
      wrap.appendChild(title);

      items.forEach(function (r) {
        wrap.appendChild(buildItem(r, listWrap));
      });

      listWrap.appendChild(wrap);
    });

    if (totalShown === 0) {
      const empty = document.createElement('div');
      empty.className = 'rem-empty';
      empty.textContent = state.search
        ? t('rem.emptySearch', 'Nema rezultata za pretragu.')
        : t('rem.empty', 'Još uvek nemaš podsetnika. Dodaj prvi!');
      listWrap.appendChild(empty);
    }
  }

  function buildBirthdayInfoHTML(r) {
    const bInfo = parseBirthDate(r.birthDate);
    if (!bInfo) return '';

    const ageNow = currentAge(bInfo);
    const ageNext = ageAtNextBirthday(bInfo);
    const eff = effectiveDate(r);
    const days = eff ? global.utils.daysFromToday(eff) : null;

    const parts = [];

    if (ageNow !== null) {
      parts.push('<span class="age-now">' +
        t('rem.birthday.ageNow', 'Trenutno {age} god.').replace('{age}', String(ageNow)) +
        '</span>');
    }

    if (ageNext !== null && days !== null) {
      if (days === 0) {
        parts.push('<span class="turns-today">' +
          t('rem.birthday.turnsToday', '🎉 Danas puni {age} godina!').replace('{age}', String(ageNext)) +
          '</span>');
      } else if (days === 1) {
        parts.push('<span class="turns-in">' +
          t('rem.birthday.turnsTomorrow', 'Sutra puni {age} godina').replace('{age}', String(ageNext)) +
          '</span>');
      } else if (days > 0 && days <= 90) {
        parts.push('<span class="turns-in">' +
          t('rem.birthday.turnsIn', 'Puni {age} za {days} dana')
            .replace('{age}', String(ageNext))
            .replace('{days}', String(days)) +
          '</span>');
      } else if (days > 90) {
        parts.push('<span class="turns-in">' +
          t('rem.birthday.turnsOn', 'Puni {age} — {date}')
            .replace('{age}', String(ageNext))
            .replace('{date}', global.utils.formatDate(eff, lang())) +
          '</span>');
      }
    } else if (!bInfo.year) {
      parts.push('<span class="age-now">' + t('rem.birthday.ageUnknown', 'Datum rođenja bez godine') + '</span>');
    }

    if (!parts.length) return '';

    return '<div class="rem-birthday-info">' + parts.join('<span class="sep">·</span>') + '</div>';
  }

  function isUrgent(r) {
    if (r.done) return false;
    const eff = effectiveDate(r);
    if (!eff) return false;
    const days = global.utils.daysFromToday(eff);
    if (days === null) return false;
    if (days < 0) return true;   /* istekao */
    if (days <= 2) return true;  /* danas/sutra/prekosutra */
    return false;
  }

  function buildItem(r, listWrap) {
    const eff = effectiveDate(r);
    const today = global.utils.todayISO();
    const birthday = isBirthday(r);
    const urgent = isUrgent(r);

    const item = document.createElement('div');
    item.className = 'rem-item' + (r.done ? ' done' : '') + (birthday ? ' is-birthday' : '');

    if (birthday && eff === today && !r.done) {
      item.classList.add('birthday-today');
    }

    if (urgent) {
      item.classList.add('urgent');
    }

    if (birthday) {
      const cake = document.createElement('span');
      cake.className = 'rem-birthday-icon';
      cake.innerHTML = CAKE_SVG;
      item.appendChild(cake);
    } else {
      const check = document.createElement('button');
      check.type = 'button';
      check.className = 'rem-check';
      check.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      check.addEventListener('click', function () {
        r.done = !r.done;
        r.doneAt = r.done ? new Date().toISOString() : null;

        global.storage.save(STORE, r).then(function () {
          /* Ako je podsetnik povezan sa računom i označen kao plaćen — sinhronizuj */
          if (r.done && r.billId) {
            return handleBillPayment(r);
          }
          return Promise.resolve();
        }).then(function () {
          if (listWrap) renderList(listWrap);
          if (global.home) global.home.refresh();
        });
      });
      item.appendChild(check);
    }

    const body = document.createElement('div');
    body.className = 'rem-body';

    const title = document.createElement('div');
    title.className = 'rem-title';

    if (birthday) {
      const bInfo = parseBirthDate(r.birthDate);
      const ageNow = currentAge(bInfo);

      if (eff === today && !r.done) {
        const ageNext = ageAtNextBirthday(bInfo);
        if (ageNext !== null) {
          title.textContent = t('rem.birthday.todayHeadline', '🎉 Danas — {name} slavi {age}. rođendan')
            .replace('{name}', r.title || '')
            .replace('{age}', String(ageNext));
        } else {
          title.textContent = t('rem.birthday.todayHeadlineNoAge', '🎉 Danas je rođendan — {name}')
            .replace('{name}', r.title || '');
        }
      } else {
        title.textContent = (r.title || '') + ' — ' + t('rem.birthday.label', 'rođendan');
        if (ageNow !== null) {
          const span = document.createElement('span');
          span.className = 'rem-years';
          span.textContent = ' (' + ageNow + ' ' + t('rem.birthday.years', 'god.') + ')';
          title.appendChild(span);
        }
      }
    } else {
      title.textContent = r.title || '';
    }

    body.appendChild(title);

    if (birthday) {
      const infoHTML = buildBirthdayInfoHTML(r);
      if (infoHTML) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = infoHTML;
        const infoEl = wrapper.firstChild;
        body.appendChild(infoEl);
      }
    }

    const meta = document.createElement('div');
    meta.className = 'rem-meta';

    if (eff) {
      const days = global.utils.daysFromToday(eff);
      let cls = 'rem-meta-item';
      let label = global.utils.formatDate(eff, lang());
      if (r.time && !birthday) label += ' • ' + r.time;

      if (!r.done) {
        if (days < 0) { cls += ' overdue'; label += ' • ' + t('rem.overdue', 'isteklo'); }
        else if (days === 0) { cls += ' soon'; label += ' • ' + t('rem.today', 'danas'); }
        else if (days === 1) { label += ' • ' + t('rem.tomorrow', 'sutra'); }
        else if (days <= 30) {
          if (days <= 7) cls += ' soon';
          label += ' • ' + t('rem.inDays', 'za') + ' ' + days + ' ' + t('rem.days', 'dana');
        }
      }

      const dateEl = document.createElement('span');
      dateEl.className = cls;
      dateEl.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="16" y1="3" x2="16" y2="7"></line></svg> ' + global.utils.escapeHtml(label);
      meta.appendChild(dateEl);
    }

    if (r.category) {
      const cat = document.createElement('span');
      cat.className = 'rem-category-chip' + (birthday ? ' birthday' : '');
      cat.textContent = categoryName(r.category);
      meta.appendChild(cat);
    }

    if (r.priority && r.priority !== 'medium' && !birthday) {
      const p = document.createElement('span');
      p.className = 'rem-priority ' + r.priority;
      p.textContent = t('rem.priority.' + r.priority, r.priority);
      meta.appendChild(p);
    }

    const notify = Number(r.notifyDaysBefore) || 0;
    if (notify > 0 && !birthday) {
      const chip = document.createElement('span');
      chip.className = 'rem-notify-chip';
      chip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ' +
        t('rem.notify.' + notify, notify + ' dana ranije');
      meta.appendChild(chip);
    }

    if (r.billId) {
      const chip = document.createElement('span');
      chip.className = 'rem-bill-chip';
      chip.innerHTML = '💰 ' + t('rem.billLinked', 'Vezano za račun');
      meta.appendChild(chip);
    }

    body.appendChild(meta);

    if (r.description) {
      const desc = document.createElement('div');
      desc.className = 'rem-meta';
      desc.style.marginTop = '0.35rem';
      desc.style.color = 'var(--color-text-subtle)';
      desc.textContent = global.utils.truncate(r.description, 120);
      body.appendChild(desc);
    }

    item.appendChild(body);

    /* Pulsirajuća tačka za hitne */
    if (urgent) {
      const pulse = document.createElement('span');
      pulse.className = 'rem-pulse';
      pulse.setAttribute('aria-label', t('rem.urgent', 'Hitno'));
      item.appendChild(pulse);
    }

    const actions = document.createElement('div');
    actions.className = 'rem-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'rem-icon-btn';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>';
    editBtn.addEventListener('click', function () { openForm(r); });
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'rem-icon-btn danger';
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg>';
    delBtn.addEventListener('click', function () {
      const ok = global.confirm(t('rem.deleteConfirm', 'Obrisati ovaj podsetnik?'));
      if (!ok) return;
      global.storage.delete(STORE, r.id).then(function () {
        loadAll().then(function () {
          if (listWrap) renderList(listWrap);
          if (global.home) global.home.refresh();
        });
      });
    });
    actions.appendChild(delBtn);

    item.appendChild(actions);

    return item;
  }

  /* ---------- FAB ---------- */

  function buildFAB() {
    let fab = document.getElementById('remFab');
    if (!fab) {
      fab = document.createElement('button');
      fab.type = 'button';
      fab.id = 'remFab';
      fab.className = 'fab';
      document.body.appendChild(fab);
    }
    fab.setAttribute('aria-label', t('rem.add', 'Dodaj podsetnik'));
    fab.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
    fab.onclick = function () { openForm(null); };
  }

  function toggleFabVisibility() {
    const fab = document.getElementById('remFab');
    if (!fab) return;
    const route = global.router && global.router.current ? global.router.current() : 'home';
    fab.style.display = route === 'reminders' ? '' : 'none';
  }

  /* ---------- FORMA ---------- */

  let formOverlay = null;

  function openForm(existing) {
    if (formOverlay) return;
    state.editingId = existing ? existing.id : null;

    const isEdit = !!existing;
    const item = existing ? Object.assign({}, existing) : {
      title: '',
      category: '',
      date: global.utils.todayISO(),
      time: '',
      description: '',
      priority: 'medium',
      repeat: 'none',
      notifyDaysBefore: 0,
      isBirthday: false,
      birthDate: '',
      done: false,
      billId: ''
    };

    formOverlay = document.createElement('div');
    formOverlay.className = 'modal-overlay';
    formOverlay.setAttribute('role', 'dialog');
    formOverlay.setAttribute('aria-modal', 'true');

    formOverlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title">' + (isEdit ? t('rem.edit', 'Izmeni podsetnik') : t('rem.new', 'Novi podsetnik')) + '</h3>',
      '  <form id="remForm" novalidate>',
      '    <div class="form-group">',
      '      <label class="label">' + t('rem.field.title', 'Naziv') + ' *</label>',
      '      <input class="input" type="text" name="title" required value="' + global.utils.escapeHtml(item.title) + '" />',
      '    </div>',
      '    <div class="form-group">',
      '      <label class="label">' + t('rem.field.category', 'Kategorija') + '</label>',
      '      <select class="select" name="category">',
      '        <option value="">' + t('rem.field.noCategory', '— Bez kategorije —') + '</option>',
      '      </select>',
      '    </div>',
      '    <div id="birthdayPanel" class="birthday-panel" style="display:none;">',
      '      <div class="form-group">',
      '        <label class="label">' + t('rem.field.birthDate', 'Datum rođenja') + '</label>',
      global.utils.dateInputHTML('birthDate', item.birthDate || '', {}),
      '        <p class="form-hint">' + t('rem.field.birthDateHint', 'Unesi datum rođenja da bi se godine računale automatski.') + '</p>',
      '      </div>',
      '    </div>',
      '    <div class="form-row" id="dateRow">',
      '      <div class="form-group">',
      '        <label class="label">' + t('rem.field.date', 'Datum') + ' *</label>',
      global.utils.dateInputHTML('date', item.date || '', { required: true }),
      '      </div>',
      '      <div class="form-group">',
      '        <label class="label">' + t('rem.field.time', 'Vreme') + '</label>',
      '        <input class="input" type="time" name="time" value="' + global.utils.escapeHtml(item.time || '') + '" />',
      '      </div>',
      '    </div>',
      '    <div class="form-group" id="billLinkGroup" style="display:none;">',
      '      <label class="label">' + t('rem.field.billLink', 'Poveži sa računom') + '</label>',
      '      <select class="select" name="billId"><option value="">' + t('rem.field.noBillLink', '— Bez veze —') + '</option></select>',
      '      <p class="form-hint">' + t('rem.field.billLinkHint', 'Kada označiš podsetnik kao završen, trošak se automatski evidentira u modulu Novac.') + '</p>',
      '    </div>',
      '    <div class="form-group">',
      '      <label class="label">' + t('rem.field.notifyDaysBefore', 'Podseti me ranije') + '</label>',
      '      <select class="select" name="notifyDaysBefore">',
      '        <option value="0">' + t('rem.notify.0', 'Na dan') + '</option>',
      '        <option value="1">' + t('rem.notify.1', '1 dan ranije') + '</option>',
      '        <option value="2">' + t('rem.notify.2', '2 dana ranije') + '</option>',
      '        <option value="3">' + t('rem.notify.3', '3 dana ranije') + '</option>',
      '        <option value="5">' + t('rem.notify.5', '5 dana ranije') + '</option>',
      '        <option value="7">' + t('rem.notify.7', '7 dana ranije') + '</option>',
      '        <option value="14">' + t('rem.notify.14', '14 dana ranije') + '</option>',
      '        <option value="30">' + t('rem.notify.30', '30 dana ranije') + '</option>',
      '      </select>',
      '    </div>',
      '    <div class="form-row">',
      '      <div class="form-group">',
      '        <label class="label">' + t('rem.field.priority', 'Prioritet') + '</label>',
      '        <select class="select" name="priority">',
      '          <option value="low">' + t('rem.priority.low', 'Nizak') + '</option>',
      '          <option value="medium">' + t('rem.priority.medium', 'Srednji') + '</option>',
      '          <option value="high">' + t('rem.priority.high', 'Visok') + '</option>',
      '        </select>',
      '      </div>',
      '      <div class="form-group" id="repeatGroup">',
      '        <label class="label">' + t('rem.field.repeat', 'Ponavljanje') + '</label>',
      '        <select class="select" name="repeat">',
      '          <option value="none">' + t('rem.repeat.none', 'Ne ponavlja se') + '</option>',
      '          <option value="daily">' + t('rem.repeat.daily', 'Dnevno') + '</option>',
      '          <option value="weekly">' + t('rem.repeat.weekly', 'Nedeljno') + '</option>',
      '          <option value="monthly">' + t('rem.repeat.monthly', 'Mesečno') + '</option>',
      '          <option value="yearly">' + t('rem.repeat.yearly', 'Godišnje') + '</option>',
      '        </select>',
      '      </div>',
      '    </div>',
      '    <div class="form-group">',
      '      <label class="label">' + t('rem.field.description', 'Opis') + '</label>',
      '      <textarea class="textarea" name="description">' + global.utils.escapeHtml(item.description || '') + '</textarea>',
      '    </div>',
      '    <div class="form-error" id="remFormError"></div>',
      '    <div class="modal-actions">',
      '      <button type="button" class="btn btn-secondary" id="remCancel">' + t('common.cancel', 'Otkaži') + '</button>',
      '      <button type="submit" class="btn btn-primary">' + t('common.save', 'Sačuvaj') + '</button>',
      '    </div>',
      '  </form>',
      '</div>'
    ].join('');

    document.body.appendChild(formOverlay);
    global.utils.bindDateInputs(formOverlay);

    /* Popuni kategorije */
    const catSelect = formOverlay.querySelector('select[name="category"]');
    const allCats = getAllCategories();
    allCats.forEach(function (c) {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = lang() === 'en' ? (c.name_en || c.name_sr) : (c.name_sr || c.name_en);
      if (item.category === c.id) opt.selected = true;
      catSelect.appendChild(opt);
    });

    formOverlay.querySelector('select[name="priority"]').value = item.priority || 'medium';
    formOverlay.querySelector('select[name="notifyDaysBefore"]').value = String(item.notifyDaysBefore || 0);
    formOverlay.querySelector('select[name="repeat"]').value = item.repeat || 'none';

    const birthdayPanel = formOverlay.querySelector('#birthdayPanel');
    const dateRow = formOverlay.querySelector('#dateRow');
    const billLinkGroup = formOverlay.querySelector('#billLinkGroup');
    const repeatGroup = formOverlay.querySelector('#repeatGroup');
    const repeatSelect = formOverlay.querySelector('select[name="repeat"]');
    const billSelect = formOverlay.querySelector('select[name="billId"]');

    /* Popuni račune */
    function refreshBillOptions() {
      if (!global.bills || !global.bills.loadAll) return;
      global.bills.loadAll().then(function () {
        const bills = (global.bills._state && global.bills._state.items) || [];
        billSelect.innerHTML = '<option value="">' + t('rem.field.noBillLink', '— Bez veze —') + '</option>';
        bills.forEach(function (b) {
          const opt = document.createElement('option');
          opt.value = b.id;
          opt.textContent = (b.name || b.vendor || 'Račun') + ' — ' + (b.amount || 0) + ' ' + (b.currency || 'RSD');
          if (item.billId === b.id) opt.selected = true;
          billSelect.appendChild(opt);
        });
      });
    }

    /* Logika za rođendan — bez duplog pitanja */
    function refreshBirthdayUI() {
      const isFamily = catSelect.value === BIRTHDAY_CATEGORY;

      if (isFamily) {
        /* Odmah prikaži panel za datum rođenja */
        item.isBirthday = true;
        birthdayPanel.style.display = 'block';
        repeatSelect.value = 'yearly';
        repeatSelect.disabled = true;
        /* Sakrij datum polje jer se računa automatski */
        dateRow.style.display = 'none';
      } else {
        item.isBirthday = false;
        birthdayPanel.style.display = 'none';
        repeatSelect.disabled = false;
        if (repeatSelect.value === 'yearly') repeatSelect.value = 'none';
        dateRow.style.display = '';
      }

      /* Ako je kategorija "Računi i plaćanja", prikaži opciju za povezivanje */
      if (catSelect.value === 'bills') {
        billLinkGroup.style.display = 'block';
        refreshBillOptions();
      } else {
        billLinkGroup.style.display = 'none';
      }
    }

    catSelect.addEventListener('change', refreshBirthdayUI);
    refreshBirthdayUI();

    /* Kada se promeni datum rođenja, automatski postavi datum */
    const birthInput = formOverlay.querySelector('input[name="birthDate"]');
    if (birthInput) {
      birthInput.addEventListener('change', function () {
        const bInfo = parseBirthDate(birthInput.value);
        if (bInfo) {
          const next = nextBirthdayISO(bInfo);
          if (next) {
            global.utils.setDateValue(formOverlay, 'date', next);
          }
        }
      });
    }

    formOverlay.querySelector('#remCancel').addEventListener('click', closeForm);
    formOverlay.addEventListener('click', function (e) {
      if (e.target === formOverlay) closeForm();
    });

    formOverlay.querySelector('#remForm').addEventListener('submit', function (e) {
      e.preventDefault();
      submitForm(formOverlay, item);
    });

    requestAnimationFrame(function () {
      formOverlay.classList.add('show');
    });
  }

  function closeForm() {
    if (!formOverlay) return;
    formOverlay.classList.remove('show');
    setTimeout(function () {
      if (formOverlay && formOverlay.parentNode) formOverlay.parentNode.removeChild(formOverlay);
      formOverlay = null;
    }, 200);
  }

  function submitForm(overlay, baseItem) {
    const form = overlay.querySelector('#remForm');
    const errEl = overlay.querySelector('#remFormError');
    errEl.textContent = '';

    const isBday = baseItem.isBirthday === true;
    const billId = form.billId ? form.billId.value : '';

    const data = {
      title: form.title.value.trim(),
      category: form.category.value,
      date: form.date.value,
      time: form.time.value,
      priority: form.priority.value,
      repeat: isBday ? 'yearly' : form.repeat.value,
      notifyDaysBefore: Number(form.notifyDaysBefore.value) || 0,
      description: form.description.value.trim(),
      isBirthday: isBday,
      birthDate: isBday ? (form.birthDate.value || '') : '',
      billId: billId
    };

    if (!data.title) {
      errEl.textContent = t('rem.err.title', 'Naziv je obavezan.');
      return;
    }

    if (isBday && !data.birthDate) {
      errEl.textContent = t('rem.err.birthDate', 'Datum rođenja je obavezan za rođendan.');
      return;
    }

    if (isBday && data.birthDate) {
      const bInfo = parseBirthDate(data.birthDate);
      const next = nextBirthdayISO(bInfo);
      if (next) data.date = next;
    }

    if (!data.date) {
      errEl.textContent = t('rem.err.date', 'Datum je obavezan.');
      return;
    }

    let record;
    if (state.editingId) {
      const existing = state.items.find(function (x) { return x.id === state.editingId; });
      if (!existing) return;
      record = Object.assign({}, existing, data);
    } else {
      record = Object.assign({
        id: global.utils.uid('rem'),
        done: false,
        createdAt: new Date().toISOString()
      }, data);
    }

    global.storage.save(STORE, record).then(function () {
      closeForm();
      loadAll().then(function () {
        const view = document.getElementById('view-reminders');
        if (view) {
          const listWrap = view.querySelector('.rem-list');
          if (listWrap) renderList(listWrap);
        }
        if (global.home) global.home.refresh();
      });
    }).catch(function (err) {
      errEl.textContent = (err && err.message) ? err.message : t('common.error', 'Greška.');
    });
  }

  /* ---------- INIT ---------- */

  function init() {
    loadAll().then(function () {
      const view = document.getElementById('view-reminders');
      if (view) renderInto(view);
    });

    global.addEventListener('alatikapro:langchange', function () {
      const view = document.getElementById('view-reminders');
      if (view) renderInto(view);
    });

    if (global.router && global.router.onRouteChange) {
      global.router.onRouteChange(function (route) {
        toggleFabVisibility();
        if (route === 'reminders') {
          const view = document.getElementById('view-reminders');
          if (view) renderInto(view);
        }
      });
    }
  }

  global.reminders = {
    init: init,
    loadAll: loadAll,
    _state: state,
    DEFAULT_CATEGORIES: DEFAULT_CATEGORIES.slice(),
    getAllCategories: getAllCategories,
    addCustomCategory: addCustomCategory,
    effectiveDate: effectiveDate,
    isBirthday: isBirthday,
    parseBirthDate: parseBirthDate,
    currentAge: currentAge
  };
})(window);
