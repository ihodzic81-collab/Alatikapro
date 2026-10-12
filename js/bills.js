/* =========================================================
   ALATIKA PRO — bills.js
   Modul Računi (osnova):
   - Dva taba: Računi / Čekovi (Čekovi dolaze u Sesiji 4c)
   - Lista, filteri, pretraga
   - Mesec/godina prebacivanje
   - Dodavanje / izmena / brisanje
   - Valute (30 komada, RSD default)
   - Status: plaćeno / na čekanju / isteklo
   ========================================================= */

(function (global) {
  'use strict';

  const STORE = 'bills';
  const LS_CUSTOM_CATS = 'bills.customCats';

  const DEFAULT_CATEGORIES = [
    { id: 'electricity', name_sr: 'Struja',                 name_en: 'Electricity' },
    { id: 'water',       name_sr: 'Voda',                   name_en: 'Water' },
    { id: 'gas',         name_sr: 'Grejanje i gas',         name_en: 'Heating & gas' },
    { id: 'utilities',   name_sr: 'Komunalije',             name_en: 'Utilities' },
    { id: 'internet',    name_sr: 'Internet',               name_en: 'Internet' },
    { id: 'phone',       name_sr: 'Telefon',                name_en: 'Phone' },
    { id: 'tv',          name_sr: 'Televizija i mediji',    name_en: 'TV & media' },
    { id: 'rent',        name_sr: 'Stanovanje i zakup',     name_en: 'Housing & rent' },
    { id: 'insurance',   name_sr: 'Osiguranje',             name_en: 'Insurance' },
    { id: 'taxes',       name_sr: 'Porezi i naknade',       name_en: 'Taxes & fees' },
    { id: 'health',      name_sr: 'Zdravstvo',              name_en: 'Health' },
    { id: 'transport',   name_sr: 'Prevoz i gorivo',        name_en: 'Transport & fuel' },
    { id: 'shopping',    name_sr: 'Kupovina i domaćinstvo', name_en: 'Shopping & household' },
    { id: 'subscriptions', name_sr: 'Pretplate',            name_en: 'Subscriptions' },
    { id: 'other',       name_sr: 'Ostalo',                 name_en: 'Other' }
  ];

  const state = {
    items: [],
    filter: 'all',        /* all | paid | pending | overdue */
    search: '',
    month: null,          /* "YYYY-MM" */
    view: 'bills',        /* bills | checks */
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

  function currentMonthISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function monthLabel(monthISO) {
    if (!monthISO) return '';
    const parts = monthISO.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    const d = new Date(y, m, 1);
    const locale = lang() === 'en' ? 'en-GB' : 'sr-RS';
    return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }

  function nextMonth(monthISO, delta) {
    const parts = monthISO.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    const d = new Date(y, m + delta, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function formatAmount(value, currencyCode) {
    const n = typeof value === 'number' ? value : parseFloat(value) || 0;
    const locale = lang() === 'en' ? 'en-GB' : 'sr-RS';
    const formatted = n.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatted;
  }

  /* ---------- STATUS ---------- */

  function getStatus(bill) {
    if (bill.paid) return 'paid';
    if (bill.dueDate && bill.dueDate < global.utils.todayISO()) return 'overdue';
    return 'pending';
  }

  /* ---------- UČITAVANJE ---------- */

  function loadAll() {
    return global.storage.loadAll(STORE).then(function (list) {
      state.items = (list || []).sort(function (a, b) {
        return (b.dueDate || '').localeCompare(a.dueDate || '');
      });
      return state.items;
    });
  }

  /* ---------- FILTRIRANJE ---------- */

  function applyFilter(list) {
    let out = list.slice();

    if (state.month) {
      out = out.filter(function (b) {
        return (b.month || '') === state.month;
      });
    }

    if (state.filter === 'paid') {
      out = out.filter(function (b) { return b.paid === true; });
    } else if (state.filter === 'pending') {
      out = out.filter(function (b) { return !b.paid && getStatus(b) === 'pending'; });
    } else if (state.filter === 'overdue') {
      out = out.filter(function (b) { return !b.paid && getStatus(b) === 'overdue'; });
    }

    if (state.search) {
      const q = state.search.toLowerCase();
      out = out.filter(function (b) {
        return (b.name || '').toLowerCase().indexOf(q) !== -1 ||
               (b.vendor || '').toLowerCase().indexOf(q) !== -1 ||
               (b.description || '').toLowerCase().indexOf(q) !== -1 ||
               categoryName(b.category).toLowerCase().indexOf(q) !== -1;
      });
    }

    return out;
  }

  /* ---------- SAŽETAK ---------- */

  function computeSummary(list) {
    const monthItems = state.month
      ? list.filter(function (b) { return (b.month || '') === state.month; })
      : list;

    const total = monthItems.length;
    const paid = monthItems.filter(function (b) { return b.paid; }).length;
    const pending = total - paid;
    const overdue = monthItems.filter(function (b) { return !b.paid && getStatus(b) === 'overdue'; }).length;

    /* Ukupno po valuti — za plaćene */
    const paidByCurrency = {};
    monthItems.forEach(function (b) {
      if (!b.paid) return;
      const cur = b.currency || 'RSD';
      const amount = Number(b.amount) || 0;
      paidByCurrency[cur] = (paidByCurrency[cur] || 0) + amount;
    });

    /* Ukupno po valuti — za neplaćene */
    const pendingByCurrency = {};
    monthItems.forEach(function (b) {
      if (b.paid) return;
      const cur = b.currency || 'RSD';
      const amount = Number(b.amount) || 0;
      pendingByCurrency[cur] = (pendingByCurrency[cur] || 0) + amount;
    });

    return {
      total: total,
      paid: paid,
      pending: pending,
      overdue: overdue,
      paidByCurrency: paidByCurrency,
      pendingByCurrency: pendingByCurrency
    };
  }

  /* ---------- RENDER ---------- */

  function renderInto(view) {
    /* Sačuvaj postojeće delove gde je moguće */
    let header = view.querySelector('.module-header');
    let tabs = view.querySelector('.bills-tabs');
    let monthNav = view.querySelector('.month-nav');
    let summary = view.querySelector('.bills-summary');
    let filters = view.querySelector('.bills-filters');
    let searchWrap = view.querySelector('.bills-search');
    let listWrap = view.querySelector('.bills-list');

    if (!header || !tabs || !monthNav || !summary || !filters || !searchWrap || !listWrap) {
      view.innerHTML = '';
      if (header) view.appendChild(header);
      buildTabs(view);
      buildMonthNav(view);
      buildSummary(view);
      buildFilters(view);
      buildSearch(view);
      listWrap = document.createElement('div');
      listWrap.className = 'bills-list';
      view.appendChild(listWrap);
    }

    if (state.view === 'bills') {
      renderBillsList(listWrap);
      buildFAB(view);
    } else {
      /* Čekovi — dolaze u Sesiji 4c */
      listWrap.innerHTML = '<div class="bills-empty">' +
        t('checks.soon', 'Modul Čekovi dolazi uskoro.') +
        '</div>';
      removeFAB();
    }

    toggleFabVisibility();
  }

  function buildTabs(view) {
    const tabs = document.createElement('div');
    tabs.className = 'bills-tabs';
    const defs = [
      { id: 'bills',  label: t('bills.tab.bills', 'Računi') },
      { id: 'checks', label: t('bills.tab.checks', 'Čekovi') }
    ];
    defs.forEach(function (d) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bills-tab' + (state.view === d.id ? ' active' : '');
      btn.textContent = d.label;
      btn.addEventListener('click', function () {
        state.view = d.id;
        tabs.querySelectorAll('.bills-tab').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        const listWrap = view.querySelector('.bills-list');
        if (listWrap) {
          if (state.view === 'bills') {
            renderBillsList(listWrap);
            buildFAB(view);
          } else {
            listWrap.innerHTML = '<div class="bills-empty">' +
              t('checks.soon', 'Modul Čekovi dolazi uskoro.') +
              '</div>';
            removeFAB();
          }
        }
      });
      tabs.appendChild(btn);
    });
    view.appendChild(tabs);
  }

  function buildMonthNav(view) {
    const nav = document.createElement('div');
    nav.className = 'month-nav';
    nav.innerHTML = [
      '<button type="button" class="month-nav-btn" data-dir="-1" aria-label="Prethodni mesec">',
      '  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
      '</button>',
      '<span class="month-nav-label">' + monthLabel(state.month) + '</span>',
      '<button type="button" class="month-nav-btn" data-dir="1" aria-label="Sledeći mesec">',
      '  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
      '</button>'
    ].join('');

    nav.querySelectorAll('.month-nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const dir = Number(btn.getAttribute('data-dir'));
        state.month = nextMonth(state.month, dir);
        refreshAll(view);
      });
    });

    view.appendChild(nav);
  }

  function buildSummary(view) {
    const box = document.createElement('div');
    box.className = 'bills-summary';

    const s = computeSummary(state.items);

    box.innerHTML = [
      '<div class="bills-stat">',
      '  <div class="bills-stat-value total">' + s.total + '</div>',
      '  <div class="bills-stat-label">' + t('bills.stat.total', 'Ukupno') + '</div>',
      '</div>',
      '<div class="bills-stat">',
      '  <div class="bills-stat-value paid">' + s.paid + '</div>',
      '  <div class="bills-stat-label">' + t('bills.stat.paid', 'Plaćeno') + '</div>',
      '</div>',
      '<div class="bills-stat">',
      '  <div class="bills-stat-value pending">' + s.pending + '</div>',
      '  <div class="bills-stat-label">' + t('bills.stat.pending', 'Na čekanju') + '</div>',
      '</div>'
    ].join('');

    view.appendChild(box);

    /* Sažetak po valuti (ispod brojeva) */
    const totalsBox = document.createElement('div');
    totalsBox.className = 'bills-totals';

    const paidKeys = Object.keys(s.paidByCurrency);
    const pendingKeys = Object.keys(s.pendingByCurrency);

    if (paidKeys.length > 0) {
      paidKeys.forEach(function (cur) {
        const chip = document.createElement('span');
        chip.className = 'bills-total-chip';
        chip.innerHTML = '<span class="flag">' + global.currencies.getFlag(cur) + '</span>' +
          formatAmount(s.paidByCurrency[cur], cur) + ' ' + cur;
        chip.style.color = 'var(--color-success)';
        totalsBox.appendChild(chip);
      });
    }

    if (pendingKeys.length > 0) {
      pendingKeys.forEach(function (cur) {
        const chip = document.createElement('span');
        chip.className = 'bills-total-chip';
        chip.innerHTML = '<span class="flag">' + global.currencies.getFlag(cur) + '</span>' +
          formatAmount(s.pendingByCurrency[cur], cur) + ' ' + cur;
        chip.style.color = 'var(--color-warning)';
        totalsBox.appendChild(chip);
      });
    }

    if (totalsBox.children.length > 0) {
      view.appendChild(totalsBox);
    }
  }

  function buildFilters(view) {
    const filters = document.createElement('div');
    filters.className = 'bills-filters';
    const defs = [
      { id: 'all',      label: t('bills.filter.all', 'Svi') },
      { id: 'paid',     label: t('bills.filter.paid', 'Plaćeni') },
      { id: 'pending',  label: t('bills.filter.pending', 'Na čekanju') },
      { id: 'overdue',  label: t('bills.filter.overdue', 'Istekli') }
    ];
    defs.forEach(function (d) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bills-filter' + (state.filter === d.id ? ' active' : '');
      btn.textContent = d.label;
      btn.addEventListener('click', function () {
        state.filter = d.id;
        filters.querySelectorAll('.bills-filter').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        const listWrap = view.querySelector('.bills-list');
        if (listWrap) renderBillsList(listWrap);
      });
      filters.appendChild(btn);
    });
    view.appendChild(filters);
  }

  function buildSearch(view) {
    const search = document.createElement('div');
    search.className = 'bills-search';
    search.innerHTML = [
      '<svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="20" y1="20" x2="16.65" y2="16.65"></line></svg>',
      '<input type="search" id="billsSearchInput" placeholder="' + t('bills.search', 'Pretraga računa...') + '" value="' + global.utils.escapeHtml(state.search) + '" />'
    ].join('');
    view.appendChild(search);

    const inp = search.querySelector('#billsSearchInput');
    const debounced = global.utils.debounce(function () {
      state.search = inp.value.trim();
      const listWrap = view.querySelector('.bills-list');
      if (listWrap && state.view === 'bills') renderBillsList(listWrap);
    }, 180);
    inp.addEventListener('input', debounced);
  }

  function renderBillsList(listWrap) {
    listWrap.innerHTML = '';

    const filtered = applyFilter(state.items);

    if (filtered.length === 0) {
      listWrap.innerHTML = [
        '<div class="bills-empty">',
        '  <div class="bills-empty-icon">',
        '    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6"></path><path d="M9 13h6M9 17h6"></path></svg>',
        '  </div>',
        '  <p>' + (state.search
          ? t('bills.emptySearch', 'Nema rezultata za pretragu.')
          : t('bills.empty', 'Još uvek nemaš računa za ovaj mesec.')) + '</p>',
        '</div>'
      ].join('');
      return;
    }

    filtered.forEach(function (b) {
      listWrap.appendChild(buildBillItem(b, listWrap));
    });
  }

  function buildBillItem(b, listWrap) {
    const status = getStatus(b);
    const today = global.utils.todayISO();
    const days = b.dueDate ? global.utils.daysFromToday(b.dueDate) : null;

    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'bill-item' + (status === 'overdue' ? ' overdue' : '') + (b.paid ? ' paid' : '');

    /* Thumb (slika dolazi u Sesiji 4b — sada placeholder) */
    const thumb = document.createElement('div');
    thumb.className = 'bill-thumb';
    thumb.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6"></path></svg>';
    item.appendChild(thumb);

    /* Body */
    const body = document.createElement('div');
    body.className = 'bill-body';

    const name = document.createElement('div');
    name.className = 'bill-name';
    name.textContent = b.name || b.vendor || t('bills.untitled', '(Bez naziva)');
    body.appendChild(name);

    const meta = document.createElement('div');
    meta.className = 'bill-meta';

    if (b.dueDate) {
      let cls = 'bill-meta-item';
      let label = global.utils.formatDate(b.dueDate, lang());
      if (!b.paid && days !== null) {
        if (days < 0) { cls += ' overdue'; label += ' • ' + t('bills.overdue', 'isteklo'); }
        else if (days === 0) { cls += ' soon'; label += ' • ' + t('bills.today', 'danas'); }
        else if (days <= 7) { cls += ' soon'; label += ' • ' + t('bills.inDays', 'za') + ' ' + days + ' ' + t('bills.days', 'dana'); }
      }
      const dateEl = document.createElement('span');
      dateEl.className = cls;
      dateEl.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="16" y1="3" x2="16" y2="7"></line></svg> ' + global.utils.escapeHtml(label);
      meta.appendChild(dateEl);
    }

    if (b.category) {
      const cat = document.createElement('span');
      cat.className = 'bill-meta-item';
      cat.textContent = categoryName(b.category);
      meta.appendChild(cat);
    }

    body.appendChild(meta);

    /* Status badge */
    const statusEl = document.createElement('span');
    statusEl.className = 'bill-status ' + status;
    statusEl.textContent = t('bills.status.' + status, status);
    meta.appendChild(statusEl);

    item.appendChild(body);

    /* Amount */
    const amount = document.createElement('div');
    amount.className = 'bill-amount';
    const flag = global.currencies.getFlag(b.currency || 'RSD');
    amount.innerHTML = formatAmount(b.amount || 0) +
      ' <span class="currency-code">' + flag + ' ' + (b.currency || 'RSD') + '</span>';
    item.appendChild(amount);

    /* Klik — otvori detalje (Sesija 4b) — zasad samo toast */
    item.addEventListener('click', function () {
      if (global.home) {
        global.home.showToast(t('bills.detailsSoon', 'Detalji računa dolaze u Sesiji 4b.'));
      }
    });

    return item;
  }

  /* ---------- FAB ---------- */

  function buildFAB(view) {
    let fab = document.getElementById('billsFab');
    if (!fab) {
      fab = document.createElement('button');
      fab.type = 'button';
      fab.id = 'billsFab';
      fab.className = 'fab-bills';
      fab.setAttribute('aria-label', t('bills.add', 'Dodaj račun'));
      fab.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
      document.body.appendChild(fab);
    }
    fab.onclick = function () { openForm(null); };
  }

  function removeFAB() {
    const fab = document.getElementById('billsFab');
    if (fab) fab.style.display = 'none';
  }

  function toggleFabVisibility() {
    const fab = document.getElementById('billsFab');
    if (!fab) return;
    const route = global.router && global.router.current ? global.router.current() : 'home';
    fab.style.display = (route === 'bills' && state.view === 'bills') ? '' : 'none';
  }

  /* ---------- FORMA (modal) ---------- */

  let formOverlay = null;

  function openForm(existing) {
    if (formOverlay) return;
    state.editingId = existing ? existing.id : null;

    const isEdit = !!existing;
    const item = existing ? Object.assign({}, existing) : {
      name: '',
      vendor: '',
      category: '',
      month: state.month || currentMonthISO(),
      amount: '',
      currency: global.currencies.DEFAULT_CODE,
      issueDate: global.utils.todayISO(),
      dueDate: '',
      paidDate: '',
      paid: false,
      description: '',
      reference: ''
    };

    formOverlay = document.createElement('div');
    formOverlay.className = 'modal-overlay';
    formOverlay.setAttribute('role', 'dialog');
    formOverlay.setAttribute('aria-modal', 'true');

    /* Kategorije */
    const catOptions = getAllCategories().map(function (c) {
      const label = lang() === 'en' ? (c.name_en || c.name_sr) : (c.name_sr || c.name_en);
      const selected = item.category === c.id ? ' selected' : '';
      return '<option value="' + c.id + '"' + selected + '>' + global.utils.escapeHtml(label) + '</option>';
    }).join('');

    /* Valute */
    const currencyOptions = global.currencies.getAll().map(function (c) {
      const label = c.flag + ' ' + c.code + ' — ' + (lang() === 'en' ? c.name_en : c.name_sr);
      const selected = (item.currency || 'RSD') === c.code ? ' selected' : '';
      return '<option value="' + c.code + '"' + selected + '>' + global.utils.escapeHtml(label) + '</option>';
    }).join('');

    formOverlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title">' + (isEdit ? t('bills.edit', 'Izmeni račun') : t('bills.new', 'Novi račun')) + '</h3>',
      '  <form id="billForm" novalidate>',

      /* Sekcija 1: Osnovni podaci */
      '    <div class="bill-form-section">',
      '      <div class="bill-form-section-title">' + t('bills.section.basic', 'Osnovni podaci') + '</div>',

      '      <div class="form-group">',
      '        <label class="label">' + t('bills.field.name', 'Naziv računa') + ' *</label>',
      '        <input class="input" type="text" name="name" required value="' + global.utils.escapeHtml(item.name || '') + '" placeholder="' + t('bills.field.namePlaceholder', 'npr. Struja za oktobar') + '" />',
      '      </div>',

      '      <div class="form-group">',
      '        <label class="label">' + t('bills.field.vendor', 'Dobavljač') + '</label>',
      '        <input class="input" type="text" name="vendor" value="' + global.utils.escapeHtml(item.vendor || '') + '" placeholder="' + t('bills.field.vendorPlaceholder', 'npr. EPS') + '" />',
      '      </div>',

      '      <div class="form-group">',
      '        <label class="label">' + t('bills.field.category', 'Kategorija') + '</label>',
      '        <select class="select" name="category">',
      '          <option value="">' + t('bills.field.noCategory', '— Bez kategorije —') + '</option>',
      catOptions,
      '        </select>',
      '      </div>',
      '    </div>',

      /* Sekcija 2: Iznos i valuta */
      '    <div class="bill-form-section">',
      '      <div class="bill-form-section-title">' + t('bills.section.amount', 'Iznos i valuta') + '</div>',

      '      <div class="amount-row">',
      '        <div class="form-group">',
      '          <label class="label">' + t('bills.field.amount', 'Iznos') + ' *</label>',
      '          <input class="input" type="text" inputmode="decimal" name="amount" required value="' + global.utils.escapeHtml(String(item.amount || '')) + '" placeholder="0,00" />',
      '        </div>',
      '        <div class="form-group currency-select">',
      '          <label class="label">' + t('bills.field.currency', 'Valuta') + '</label>',
      '          <select class="select" name="currency">',
      currencyOptions,
      '          </select>',
      '        </div>',
      '      </div>',
      '    </div>',

      /* Sekcija 3: Datumi */
      '    <div class="bill-form-section">',
      '      <div class="bill-form-section-title">' + t('bills.section.dates', 'Period i datumi') + '</div>',

      '      <div class="form-row">',
      '        <div class="form-group">',
      '          <label class="label">' + t('bills.field.month', 'Mesec') + ' *</label>',
      '          <input class="input" type="month" name="month" required value="' + global.utils.escapeHtml(item.month || currentMonthISO()) + '" />',
      '        </div>',
      '        <div class="form-group">',
      '          <label class="label">' + t('bills.field.issueDate', 'Datum izdavanja') + '</label>',
      '          <input class="input" type="date" name="issueDate" value="' + global.utils.escapeHtml(item.issueDate || '') + '" />',
      '        </div>',
      '      </div>',

      '      <div class="form-group">',
      '        <label class="label">' + t('bills.field.dueDate', 'Rok plaćanja') + '</label>',
      '        <input class="input" type="date" name="dueDate" value="' + global.utils.escapeHtml(item.dueDate || '') + '" />',
      '      </div>',

      '      <div class="form-group">',
      '        <label class="label">',
      '          <input type="checkbox" name="paid" ' + (item.paid ? 'checked' : '') + ' style="margin-right:0.4rem;" />',
      '          ' + t('bills.field.paid', 'Plaćeno') + '</label>',
      '      </div>',

      '      <div class="form-group" id="paidDateGroup" style="' + (item.paid ? '' : 'display:none;') + '">',
      '        <label class="label">' + t('bills.field.paidDate', 'Datum plaćanja') + '</label>',
      '        <input class="input" type="date" name="paidDate" value="' + global.utils.escapeHtml(item.paidDate || '') + '" />',
      '      </div>',
      '    </div>',

      /* Sekcija 4: Dodatno */
      '    <div class="bill-form-section">',
      '      <div class="bill-form-section-title">' + t('bills.section.extra', 'Dodatno') + '</div>',

      '      <div class="form-group">',
      '        <label class="label">' + t('bills.field.reference', 'Referentni broj') + '</label>',
      '        <input class="input" type="text" name="reference" value="' + global.utils.escapeHtml(item.reference || '') + '" />',
      '      </div>',

      '      <div class="form-group">',
      '        <label class="label">' + t('bills.field.description', 'Opis') + '</label>',
      '        <textarea class="textarea" name="description">' + global.utils.escapeHtml(item.description || '') + '</textarea>',
      '      </div>',
      '    </div>',

      '    <div class="form-error" id="billFormError"></div>',
      '    <div class="modal-actions">',
      '      <button type="button" class="btn btn-secondary" id="billCancel">' + t('common.cancel', 'Otkaži') + '</button>',
      '      <button type="submit" class="btn btn-primary">' + t('common.save', 'Sačuvaj') + '</button>',
      '    </div>',
      '  </form>',
      '</div>'
    ].join('');

    document.body.appendChild(formOverlay);

    /* Paid checkbox → prikaži/sakrij datum plaćanja */
    const paidCheckbox = formOverlay.querySelector('input[name="paid"]');
    const paidDateGroup = formOverlay.querySelector('#paidDateGroup');
    paidCheckbox.addEventListener('change', function () {
      paidDateGroup.style.display = paidCheckbox.checked ? '' : 'none';
      if (paidCheckbox.checked && !formOverlay.querySelector('input[name="paidDate"]').value) {
        formOverlay.querySelector('input[name="paidDate"]').value = global.utils.todayISO();
      }
    });

    formOverlay.querySelector('#billCancel').addEventListener('click', closeForm);
    formOverlay.addEventListener('click', function (e) {
      if (e.target === formOverlay) closeForm();
    });

    formOverlay.querySelector('#billForm').addEventListener('submit', function (e) {
      e.preventDefault();
      submitForm(formOverlay);
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

  function submitForm(overlay) {
    const form = overlay.querySelector('#billForm');
    const errEl = overlay.querySelector('#billFormError');
    errEl.textContent = '';

    const data = {
      name: form.name.value.trim(),
      vendor: form.vendor.value.trim(),
      category: form.category.value,
      month: form.month.value,
      amount: global.utils.parseAmount(form.amount.value),
      currency: form.currency.value || 'RSD',
      issueDate: form.issueDate.value,
      dueDate: form.dueDate.value,
      paid: form.paid.checked,
      paidDate: form.paidDate.value,
      reference: form.reference.value.trim(),
      description: form.description.value.trim()
    };

    if (!data.name) {
      errEl.textContent = t('bills.err.name', 'Naziv računa je obavezan.');
      return;
    }
    if (!data.amount || data.amount <= 0) {
      errEl.textContent = t('bills.err.amount', 'Iznos mora biti veći od 0.');
      return;
    }
    if (!data.month) {
      errEl.textContent = t('bills.err.month', 'Mesec je obavezan.');
      return;
    }

    let record;
    if (state.editingId) {
      const existing = state.items.find(function (x) { return x.id === state.editingId; });
      if (!existing) return;
      record = Object.assign({}, existing, data);
    } else {
      record = Object.assign({
        id: global.utils.uid('bill'),
        createdAt: new Date().toISOString()
      }, data);
    }

    global.storage.save(STORE, record).then(function () {
      closeForm();
      loadAll().then(function () {
        const view = document.getElementById('view-bills');
        if (view) refreshAll(view);
        if (global.home) global.home.refresh();
      });
    }).catch(function (err) {
      errEl.textContent = (err && err.message) ? err.message : t('common.error', 'Greška.');
    });
  }

  /* ---------- OSVEŽI SVE ---------- */

  function refreshAll(view) {
    if (!view) view = document.getElementById('view-bills');
    if (!view) return;

    /* Očisti i ponovo izgradi */
    view.innerHTML = '';
    const header = buildHeader();
    view.appendChild(header);
    renderInto(view);
  }

  function buildHeader() {
    const header = document.createElement('div');
    header.className = 'module-header';
    header.innerHTML = [
      '<div class="module-title-wrap">',
      '  <button type="button" class="back-btn" id="billsBack" aria-label="' + t('common.back', 'Nazad') + '">',
      '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
      '  </button>',
      '  <div class="module-icon color-blue" aria-hidden="true" style="width:38px;height:38px;">',
      '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6"></path><path d="M9 13h6M9 17h6"></path></svg>',
      '  </div>',
      '  <div>',
      '    <h2>' + t('bills.title', 'Računi') + '</h2>',
      '    <p class="text-muted text-sm">' + t('bills.subtitle', 'Arhiva računa i statusa plaćanja.') + '</p>',
      '  </div>',
      '</div>',
      '<button type="button" class="icon-btn" data-module-lock="bills" title="' + t('pin.lock', 'Zaključaj') + '">',
      '  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>',
      '</button>'
    ].join('');

    const backBtn = header.querySelector('#billsBack');
    backBtn.addEventListener('click', function () {
      global.router.navigate('home');
    });

    return header;
  }

  /* ---------- INIT ---------- */

  function init() {
    if (!state.month) state.month = currentMonthISO();

    /* Osiguraj da view ima header */
    const view = document.getElementById('view-bills');
    if (view) {
      if (!view.querySelector('.module-header')) {
        view.innerHTML = '';
        view.appendChild(buildHeader());
      }
    }

    loadAll().then(function () {
      const v = document.getElementById('view-bills');
      if (v) renderInto(v);
    });

    global.addEventListener('alatikapro:langchange', function () {
      const v = document.getElementById('view-bills');
      if (v) {
        refreshAll(v);
        if (global.home && global.home.bindModuleLocks) global.home.bindModuleLocks();
      }
    });

    if (global.router && global.router.onRouteChange) {
      global.router.onRouteChange(function (route) {
        toggleFabVisibility();
        if (route === 'bills') {
          const v = document.getElementById('view-bills');
          if (v) {
            if (!v.querySelector('.module-header')) {
              v.innerHTML = '';
              v.appendChild(buildHeader());
            }
            loadAll().then(function () { refreshAll(v); });
          }
        } else {
          /* Sakrij FAB kada nismo na bills ruti */
          const fab = document.getElementById('billsFab');
          if (fab) fab.style.display = 'none';
        }
      });
    }
  }

  global.bills = {
    init: init,
    loadAll: loadAll,
    DEFAULT_CATEGORIES: DEFAULT_CATEGORIES.slice(),
    getAllCategories: getAllCategories,
    addCustomCategory: addCustomCategory
  };
})(window);
