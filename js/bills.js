/* =========================================================
   ALATIKA PRO — bills.js
   Modul Računi — kompletno:
   - Tab RAČUNI: arhiva sa slikama/PDF-om u IndexedDB
   - Tab RATE: ukupan iznos → podeli na rate, "Plati ratu"
   - Tab ČEKOVI: toggle ukupno/po čeku, kupovina na N čekova,
                 grupisanje, pametni datumi (DD / MM / GGGG)
   ========================================================= */

(function (global) {
  'use strict';

  const STORE = 'bills';
  const STORE_CHECKS = 'checks';
  const STORE_RATES = 'rates';
  const STORE_FILES = 'files';
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
    checks: [],
    rates: [],
    filter: 'all',
    checkFilter: 'all',
    rateFilter: 'active',
    search: '',
    month: null,
    view: 'bills',
    editingId: null,
    editingCheckId: null,
    editingRateId: null
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

  function formatAmount(value) {
    const n = typeof value === 'number' ? value : parseFloat(value) || 0;
    const locale = lang() === 'en' ? 'en-GB' : 'sr-RS';
    return n.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatInt(value) {
    const n = typeof value === 'number' ? value : parseFloat(value) || 0;
    const locale = lang() === 'en' ? 'en-GB' : 'sr-RS';
    return n.toLocaleString(locale, { maximumFractionDigits: 0 });
  }

  /* ---------- STATUS RAČUNA ---------- */

  function getStatus(bill) {
    if (bill.paid) return 'paid';
    if (bill.dueDate && bill.dueDate < global.utils.todayISO()) return 'overdue';
    return 'pending';
  }

  /* ---------- SLIKE / FAJLOVI ---------- */

  function optimizeImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) {
        resolve(file);
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        const MAX = 1600;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > MAX || h > MAX) {
          if (w >= h) { h = Math.round(h * (MAX / w)); w = MAX; }
          else { w = Math.round(w * (MAX / h)); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else resolve(file);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Greška pri učitavanju slike.'));
      };
      img.src = url;
    });
  }

  function saveFile(file) {
    const id = global.utils.uid('file');
    const now = new Date().toISOString();
    return optimizeImage(file).then(function (optimized) {
      const record = {
        id: id,
        name: file.name || 'attachment',
        type: optimized.type || file.type || 'application/octet-stream',
        size: optimized.size || file.size || 0,
        blob: optimized,
        createdAt: now
      };
      return global.storage.save(STORE_FILES, record).then(function () {
        return id;
      });
    });
  }

  function loadFile(fileId) {
    return global.storage.load(STORE_FILES, fileId);
  }

  function deleteFile(fileId) {
    if (!fileId) return Promise.resolve();
    return global.storage.delete(STORE_FILES, fileId);
  }

  function getFileURL(fileId) {
    return loadFile(fileId).then(function (rec) {
      if (!rec || !rec.blob) return null;
      return {
        url: URL.createObjectURL(rec.blob),
        type: rec.type,
        name: rec.name
      };
    });
  }

  /* ---------- UČITAVANJE ---------- */

  function loadAll() {
    return Promise.all([
      global.storage.loadAll(STORE),
      global.storage.loadAll(STORE_CHECKS),
      global.storage.loadAll(STORE_RATES)
    ]).then(function (results) {
      state.items = (results[0] || []).sort(function (a, b) {
        return (b.dueDate || '').localeCompare(a.dueDate || '');
      });
      state.checks = (results[1] || []).sort(function (a, b) {
        return (a.realizeDate || '').localeCompare(b.realizeDate || '');
      });
      state.rates = (results[2] || []).sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '');
      });
      return state;
    });
  }

  /* ---------- FILTRIRANJE RAČUNA ---------- */

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

  /* ---------- SAŽETAK RAČUNA ---------- */

  function computeSummary(list) {
    const monthItems = state.month
      ? list.filter(function (b) { return (b.month || '') === state.month; })
      : list;

    const total = monthItems.length;
    const paid = monthItems.filter(function (b) { return b.paid; }).length;
    const pending = total - paid;

    const paidByCurrency = {};
    monthItems.forEach(function (b) {
      if (!b.paid) return;
      const cur = b.currency || 'RSD';
      paidByCurrency[cur] = (paidByCurrency[cur] || 0) + (Number(b.amount) || 0);
    });

    const pendingByCurrency = {};
    monthItems.forEach(function (b) {
      if (b.paid) return;
      const cur = b.currency || 'RSD';
      pendingByCurrency[cur] = (pendingByCurrency[cur] || 0) + (Number(b.amount) || 0);
    });

    return {
      total: total,
      paid: paid,
      pending: pending,
      paidByCurrency: paidByCurrency,
      pendingByCurrency: pendingByCurrency
    };
  }

  /* ---------- RATE ---------- */

  function getRateProgress(rate) {
    const total = Number(rate.totalInstallments) || 0;
    const paid = Number(rate.paidInstallments) || 0;
    if (total <= 0) return { paid: paid, total: 0, percent: 0 };
    const percent = Math.min(100, Math.round((paid / total) * 100));
    return { paid: paid, total: total, percent: percent };
  }

  function getRateMonthlyAmount(rate) {
    const total = Number(rate.totalAmount) || 0;
    const installments = Number(rate.totalInstallments) || 0;
    if (installments <= 0) return 0;
    return total / installments;
  }

  function getRateRemainingAmount(rate) {
    const total = Number(rate.totalAmount) || 0;
    const paid = Number(rate.paidInstallments) || 0;
    const monthly = getRateMonthlyAmount(rate);
    return Math.max(0, total - (paid * monthly));
  }

  function getRatePaidAmount(rate) {
    const paid = Number(rate.paidInstallments) || 0;
    return paid * getRateMonthlyAmount(rate);
  }

  function getRateStatus(rate) {
    const total = Number(rate.totalInstallments) || 0;
    const paid = Number(rate.paidInstallments) || 0;
    if (total > 0 && paid >= total) return 'finished';
    if (rate.active === false) return 'finished';
    return 'active';
  }

  /* ---------- ČEKOVI ---------- */

  function getCheckStatus(check) {
    if (check.realized) return 'realized';
    if (check.realizeDate && check.realizeDate < global.utils.todayISO()) return 'pending-realize';
    return 'pending';
  }

  function computeCheckSummary() {
    const monthItems = state.month
      ? state.checks.filter(function (c) {
          return (c.realizeDate || '').slice(0, 7) === state.month;
        })
      : state.checks;

    const total = monthItems.length;
    const realized = monthItems.filter(function (c) { return c.realized; }).length;
    const pending = total - realized;

    let totalAmount = 0;
    let realizedAmount = 0;
    let pendingAmount = 0;
    monthItems.forEach(function (c) {
      const amt = Number(c.amount) || 0;
      totalAmount += amt;
      if (c.realized) realizedAmount += amt;
      else pendingAmount += amt;
    });

    return {
      total: total,
      realized: realized,
      pending: pending,
      totalAmount: totalAmount,
      realizedAmount: realizedAmount,
      pendingAmount: pendingAmount
    };
  }

  function autoRealizeChecks() {
    const today = global.utils.todayISO();
    let changed = 0;
    const promises = [];

    state.checks.forEach(function (c) {
      if (c.realized) return;
      if (!c.autoRealize) return;
      if (!c.realizeDate) return;
      if (c.realizeDate <= today) {
        c.realized = true;
        c.realizedAt = new Date().toISOString();
        c.realizedAuto = true;
        changed += 1;
        promises.push(global.storage.save(STORE_CHECKS, c));
      }
    });

    if (!promises.length) return Promise.resolve(0);
    return Promise.all(promises).then(function () { return changed; });
  }  /* =========================================================
     RENDER — GLAVNI
     ========================================================= */

  function renderInto(view) {
    let header = view.querySelector('.module-header');
    let tabs = view.querySelector('.bills-tabs');

    if (!header || !tabs) {
      view.innerHTML = '';
      if (header) view.appendChild(header);
      buildTabs(view);
    }

    const existingTabs = view.querySelector('.bills-tabs');
    if (existingTabs) {
      while (existingTabs.nextSibling) {
        view.removeChild(existingTabs.nextSibling);
      }
    }

    if (state.view === 'bills') {
      renderBillsTab(view);
    } else if (state.view === 'rates') {
      renderRatesTab(view);
    } else {
      renderChecksTab(view);
    }

    toggleFabVisibility();
  }

  function buildTabs(view) {
    const tabs = document.createElement('div');
    tabs.className = 'bills-tabs';
    const defs = [
      { id: 'bills',  label: t('bills.tab.bills', 'Računi') },
      { id: 'rates',  label: t('bills.tab.rates', 'Rate') },
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
        renderInto(view);
      });
      tabs.appendChild(btn);
    });
    view.appendChild(tabs);
  }

  /* =========================================================
     TAB 1 — RAČUNI
     ========================================================= */

  function renderBillsTab(view) {
    buildMonthNav(view);
    buildBillsSummary(view);
    buildBillsFilters(view);
    buildBillsSearch(view);

    const listWrap = document.createElement('div');
    listWrap.className = 'bills-list';
    view.appendChild(listWrap);
    renderBillsList(listWrap);

    buildFAB(view);
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
        loadAll().then(function () { refreshAll(view); });
      });
    });

    view.appendChild(nav);
  }

  function buildBillsSummary(view) {
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

    const totalsBox = document.createElement('div');
    totalsBox.className = 'bills-totals';

    const paidKeys = Object.keys(s.paidByCurrency);
    const pendingKeys = Object.keys(s.pendingByCurrency);

    paidKeys.forEach(function (cur) {
      const chip = document.createElement('span');
      chip.className = 'bills-total-chip';
      chip.innerHTML = '<span class="flag">' + global.currencies.getFlag(cur) + '</span>' +
        formatAmount(s.paidByCurrency[cur]) + ' ' + cur;
      chip.style.color = 'var(--color-success)';
      totalsBox.appendChild(chip);
    });

    pendingKeys.forEach(function (cur) {
      const chip = document.createElement('span');
      chip.className = 'bills-total-chip';
      chip.innerHTML = '<span class="flag">' + global.currencies.getFlag(cur) + '</span>' +
        formatAmount(s.pendingByCurrency[cur]) + ' ' + cur;
      chip.style.color = 'var(--color-warning)';
      totalsBox.appendChild(chip);
    });

    if (totalsBox.children.length > 0) {
      view.appendChild(totalsBox);
    }
  }

  function buildBillsFilters(view) {
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

  function buildBillsSearch(view) {
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
      if (listWrap) renderBillsList(listWrap);
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
      listWrap.appendChild(buildBillItem(b));
    });
  }

  function buildBillItem(b) {
    const status = getStatus(b);
    const days = b.dueDate ? global.utils.daysFromToday(b.dueDate) : null;

    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'bill-item' + (status === 'overdue' ? ' overdue' : '') + (b.paid ? ' paid' : '');

    const thumb = document.createElement('div');
    thumb.className = 'bill-thumb';
    if (b.attachmentId) {
      getFileURL(b.attachmentId).then(function (info) {
        if (!info) return;
        if (info.type && info.type.indexOf('image/') === 0) {
          const img = document.createElement('img');
          img.src = info.url;
          img.alt = '';
          thumb.innerHTML = '';
          thumb.appendChild(img);
        } else {
          thumb.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
        }
      });
    } else {
      thumb.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6"></path></svg>';
    }
    item.appendChild(thumb);

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
      let label = global.utils.formatDate(b.dueDate);
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

    const statusEl = document.createElement('span');
    statusEl.className = 'bill-status ' + status;
    statusEl.textContent = t('bills.status.' + status, status);
    meta.appendChild(statusEl);

    body.appendChild(meta);
    item.appendChild(body);

    const amount = document.createElement('div');
    amount.className = 'bill-amount';
    const flag = global.currencies.getFlag(b.currency || 'RSD');
    amount.innerHTML = formatAmount(b.amount || 0) +
      ' <span class="currency-code">' + flag + ' ' + (b.currency || 'RSD') + '</span>';
    item.appendChild(amount);

    item.addEventListener('click', function () {
      openBillDetail(b);
    });

    return item;
  }

  /* =========================================================
     TAB 2 — RATE
     ========================================================= */

  function renderRatesTab(view) {
    const summary = document.createElement('div');
    summary.className = 'bills-summary';

    const activeRates = state.rates.filter(function (r) {
      return getRateStatus(r) === 'active';
    });

    let totalMonthly = 0;
    activeRates.forEach(function (r) {
      totalMonthly += getRateMonthlyAmount(r);
    });

    summary.innerHTML = [
      '<div class="bills-stat">',
      '  <div class="bills-stat-value total">' + state.rates.length + '</div>',
      '  <div class="bills-stat-label">' + t('rates.stat.total', 'Ukupno') + '</div>',
      '</div>',
      '<div class="bills-stat">',
      '  <div class="bills-stat-value paid">' + activeRates.length + '</div>',
      '  <div class="bills-stat-label">' + t('rates.stat.active', 'Aktivne') + '</div>',
      '</div>',
      '<div class="bills-stat">',
      '  <div class="bills-stat-value pending">' + formatInt(totalMonthly) + '</div>',
      '  <div class="bills-stat-label">' + t('rates.stat.monthly', 'Mesečno RSD') + '</div>',
      '</div>'
    ].join('');
    view.appendChild(summary);

    const filters = document.createElement('div');
    filters.className = 'bills-filters';
    const defs = [
      { id: 'all',      label: t('rates.filter.all', 'Sve') },
      { id: 'active',   label: t('rates.filter.active', 'Aktivne') },
      { id: 'finished', label: t('rates.filter.finished', 'Završene') }
    ];
    defs.forEach(function (d) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bills-filter' + (state.rateFilter === d.id ? ' active' : '');
      btn.textContent = d.label;
      btn.addEventListener('click', function () {
        state.rateFilter = d.id;
        filters.querySelectorAll('.bills-filter').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        const listWrap = view.querySelector('.bills-list');
        if (listWrap) renderRatesList(listWrap);
      });
      filters.appendChild(btn);
    });
    view.appendChild(filters);

    const search = document.createElement('div');
    search.className = 'bills-search';
    search.innerHTML = [
      '<svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="20" y1="20" x2="16.65" y2="16.65"></line></svg>',
      '<input type="search" id="ratesSearchInput" placeholder="' + t('rates.search', 'Pretraga rata...') + '" value="' + global.utils.escapeHtml(state.search) + '" />'
    ].join('');
    view.appendChild(search);
    const inp = search.querySelector('#ratesSearchInput');
    inp.addEventListener('input', global.utils.debounce(function () {
      state.search = inp.value.trim();
      const listWrap = view.querySelector('.bills-list');
      if (listWrap) renderRatesList(listWrap);
    }, 180));

    const listWrap = document.createElement('div');
    listWrap.className = 'bills-list';
    view.appendChild(listWrap);
    renderRatesList(listWrap);

    buildFAB(view);
  }

  function renderRatesList(listWrap) {
    listWrap.innerHTML = '';

    let filtered = state.rates.slice();

    if (state.rateFilter === 'active') {
      filtered = filtered.filter(function (r) { return getRateStatus(r) === 'active'; });
    } else if (state.rateFilter === 'finished') {
      filtered = filtered.filter(function (r) { return getRateStatus(r) === 'finished'; });
    }

    if (state.search) {
      const q = state.search.toLowerCase();
      filtered = filtered.filter(function (r) {
        return (r.name || '').toLowerCase().indexOf(q) !== -1 ||
               (r.bank || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    if (filtered.length === 0) {
      listWrap.innerHTML = [
        '<div class="bills-empty">',
        '  <div class="bills-empty-icon" style="background-color: rgba(108, 92, 231, 0.10); color: #6C5CE7;">',
        '    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><line x1="8" y1="15" x2="16" y2="15"></line></svg>',
        '  </div>',
        '  <p>' + t('rates.empty', 'Još uvek nemaš unetih rata. Dodaj prvu!') + '</p>',
        '</div>'
      ].join('');
      return;
    }

    filtered.forEach(function (r) {
      listWrap.appendChild(buildRateItem(r));
    });
  }

  function buildRateItem(r) {
    const status = getRateStatus(r);
    const progress = getRateProgress(r);
    const remaining = getRateRemainingAmount(r);
    const monthly = getRateMonthlyAmount(r);
    const flag = global.currencies.getFlag(r.currency || 'RSD');
    const currency = r.currency || 'RSD';

    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'rate-item' + (status === 'finished' ? ' finished' : '');

    const body = document.createElement('div');
    body.className = 'rate-body';

    const name = document.createElement('div');
    name.className = 'rate-name';
    name.textContent = r.name || t('rates.untitled', '(Bez naziva)');
    body.appendChild(name);

    if (r.bank) {
      const bank = document.createElement('div');
      bank.className = 'rate-bank';
      bank.textContent = r.bank;
      body.appendChild(bank);
    }

    const progressWrap = document.createElement('div');
    progressWrap.className = 'rate-progress';
    progressWrap.innerHTML = [
      '<div class="rate-progress-bar">',
      '  <div class="rate-progress-fill" style="width: ' + progress.percent + '%"></div>',
      '</div>',
      '<div class="rate-progress-label">',
      '  <span>' + progress.paid + ' / ' + progress.total + ' ' + t('rates.installments', 'rata') + '</span>',
      '  <span>' + progress.percent + '%</span>',
      '</div>'
    ].join('');
    body.appendChild(progressWrap);

    const info = document.createElement('div');
    info.className = 'rate-remaining';
    info.innerHTML = [
      '<strong>' + t('rates.monthly', 'Mesečno') + ':</strong> ' + formatAmount(monthly) + ' ' + flag + ' ' + currency,
      ' · ',
      '<strong>' + t('rates.remaining', 'Ostalo') + ':</strong> ' + formatAmount(remaining) + ' ' + flag + ' ' + currency
    ].join('');
    body.appendChild(info);

    const meta = document.createElement('div');
    meta.className = 'rate-meta';

    if (r.dayOfMonth) {
      const day = document.createElement('span');
      day.className = 'bill-meta-item';
      day.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg> ' + t('rates.everyDay', 'Svakog') + ' ' + r.dayOfMonth + '.';
      meta.appendChild(day);
    }

    const statusEl = document.createElement('span');
    statusEl.className = 'rate-status ' + (status === 'finished' ? 'finished' : 'active');
    statusEl.textContent = status === 'finished'
      ? t('rates.status.finished', 'Završena')
      : t('rates.status.active', 'Aktivna');
    meta.appendChild(statusEl);

    body.appendChild(meta);
    item.appendChild(body);

    if (status === 'active') {
      const payBtn = document.createElement('button');
      payBtn.type = 'button';
      payBtn.className = 'rate-pay-btn';
      payBtn.innerHTML = [
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">',
        '<polyline points="20 6 9 17 4 12"></polyline>',
        '</svg>',
        '<span>' + t('rates.payNow', 'Plati ratu') + '</span>'
      ].join('');
      payBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        payRate(r, payBtn);
      });
      item.appendChild(payBtn);
    } else {
      const doneBadge = document.createElement('div');
      doneBadge.className = 'rate-done-badge';
      doneBadge.innerHTML = '✓ ' + t('rates.paidFull', 'Otplaćeno');
      item.appendChild(doneBadge);
    }

    item.addEventListener('click', function (e) {
      if (e.target === item || (item.contains(e.target) && !e.target.closest('.rate-pay-btn'))) {
        openRateDetail(r);
      }
    });

    return item;
  }

  function payRate(r, btn) {
    const total = Number(r.totalInstallments) || 0;
    const paid = Number(r.paidInstallments) || 0;
    if (paid >= total) return;

    if (btn) {
      btn.classList.add('paying');
      btn.disabled = true;
    }

    r.paidInstallments = paid + 1;
    r.lastPaidAt = new Date().toISOString();

    if (r.paidInstallments >= total) {
      r.active = false;
    }

    global.storage.save(STORE_RATES, r).then(function () {
      if (global.home) global.home.showToast(t('rates.paidToast', 'Rata plaćena!'));
      loadAll().then(function () {
        const view = document.getElementById('view-bills');
        if (view) refreshAll(view);
      });
    });
  }  /* =========================================================
     TAB 3 — ČEKOVI (toggle ukupno/po čeku, grupisanje po kupovini)
     ========================================================= */

  function renderChecksTab(view) {
    const summary = computeCheckSummary();

    const box = document.createElement('div');
    box.className = 'bills-summary';
    box.innerHTML = [
      '<div class="bills-stat">',
      '  <div class="bills-stat-value total">' + summary.total + '</div>',
      '  <div class="bills-stat-label">' + t('checks.stat.total', 'Ukupno') + '</div>',
      '</div>',
      '<div class="bills-stat">',
      '  <div class="bills-stat-value paid">' + summary.realized + '</div>',
      '  <div class="bills-stat-label">' + t('checks.stat.realized', 'Realizovano') + '</div>',
      '</div>',
      '<div class="bills-stat">',
      '  <div class="bills-stat-value pending">' + summary.pending + '</div>',
      '  <div class="bills-stat-label">' + t('checks.stat.pending', 'Preostalo') + '</div>',
      '</div>'
    ].join('');
    view.appendChild(box);

    buildMonthNav(view);

    if (summary.total > 0) {
      const msg = document.createElement('div');
      msg.className = 'checks-status-message';
      if (summary.pending === 0) {
        msg.classList.add('all-done');
        msg.innerHTML = '✓ ' + t('checks.allDone', 'Svi čekovi za ovaj mesec su realizovani.');
      } else {
        msg.innerHTML = '<span class="check-count">' + summary.realized + ' / ' + summary.total + '</span> ' +
          t('checks.partialDone', 'čekova realizovano. Preostalo') + ' ' + summary.pending + '.';
      }
      view.appendChild(msg);
    }

    const filters = document.createElement('div');
    filters.className = 'bills-filters';
    const defs = [
      { id: 'all',      label: t('checks.filter.all', 'Svi') },
      { id: 'pending',  label: t('checks.filter.pending', 'Nerealizovani') },
      { id: 'realized', label: t('checks.filter.realized', 'Realizovani') }
    ];
    defs.forEach(function (d) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bills-filter' + (state.checkFilter === d.id ? ' active' : '');
      btn.textContent = d.label;
      btn.addEventListener('click', function () {
        state.checkFilter = d.id;
        filters.querySelectorAll('.bills-filter').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        const listWrap = view.querySelector('.bills-list');
        if (listWrap) renderChecksList(listWrap);
      });
      filters.appendChild(btn);
    });
    view.appendChild(filters);

    const listWrap = document.createElement('div');
    listWrap.className = 'bills-list';
    view.appendChild(listWrap);
    renderChecksList(listWrap);

    buildFAB(view);
  }

  function renderChecksList(listWrap) {
    listWrap.innerHTML = '';

    let filtered = state.checks.slice();

    if (state.month) {
      filtered = filtered.filter(function (c) {
        return (c.realizeDate || '').slice(0, 7) === state.month;
      });
    }

    if (state.checkFilter === 'pending') {
      filtered = filtered.filter(function (c) { return !c.realized; });
    } else if (state.checkFilter === 'realized') {
      filtered = filtered.filter(function (c) { return c.realized === true; });
    }

    if (filtered.length === 0) {
      listWrap.innerHTML = [
        '<div class="bills-empty">',
        '  <div class="bills-empty-icon" style="background-color: rgba(139, 92, 246, 0.10); color: #8B5CF6;">',
        '    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><line x1="7" y1="14" x2="11" y2="14"></line></svg>',
        '  </div>',
        '  <p>' + t('checks.empty', 'Još uvek nemaš čekova za ovaj mesec.') + '</p>',
        '</div>'
      ].join('');
      return;
    }

    const grouped = {};
    const standalone = [];

    filtered.forEach(function (c) {
      if (c.purchaseId) {
        if (!grouped[c.purchaseId]) grouped[c.purchaseId] = [];
        grouped[c.purchaseId].push(c);
      } else {
        standalone.push(c);
      }
    });

    Object.keys(grouped).forEach(function (pid) {
      const checks = grouped[pid].sort(function (a, b) {
        return (a.realizeDate || '').localeCompare(b.realizeDate || '');
      });
      listWrap.appendChild(buildPurchaseGroup(checks));
    });

    standalone.forEach(function (c) {
      listWrap.appendChild(buildCheckItem(c));
    });
  }

  function buildPurchaseGroup(checks) {
    const first = checks[0];
    const total = checks.length;
    const realized = checks.filter(function (c) { return c.realized; }).length;
    const percent = Math.round((realized / total) * 100);
    const currency = first.currency || 'RSD';
    const flag = global.currencies.getFlag(currency);
    const monthly = Number(first.amount) || 0;
    const totalAmount = monthly * total;

    const group = document.createElement('div');
    group.className = 'purchase-group';

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'purchase-header';
    header.innerHTML = [
      '<div class="purchase-header-body">',
      '  <div class="purchase-title">' + global.utils.escapeHtml(first.purpose || '') + '</div>',
      '  <div class="purchase-subtitle">' + global.utils.escapeHtml(first.seller || '') + '</div>',
      '  <div class="rate-progress" style="margin-top: 0.4rem;">',
      '    <div class="rate-progress-bar">',
      '      <div class="rate-progress-fill" style="width: ' + percent + '%"></div>',
      '    </div>',
      '    <div class="rate-progress-label">',
      '      <span>' + realized + ' / ' + total + ' ' + t('checks.realized', 'realizovano') + '</span>',
      '      <span>' + percent + '%</span>',
      '    </div>',
      '  </div>',
      '  <div class="purchase-meta">',
      '    <span>' + formatAmount(monthly) + ' ' + flag + ' ' + currency + ' / ' + t('checks.month', 'mesec') + '</span>',
      '    <span>·</span>',
      '    <span>' + t('checks.totalLabel', 'Ukupno') + ' ' + formatAmount(totalAmount) + ' ' + flag + '</span>',
      '  </div>',
      '</div>',
      '<div class="purchase-toggle" aria-hidden="true">',
      '  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',
      '</div>'
    ].join('');

    group.appendChild(header);

    const details = document.createElement('div');
    details.className = 'purchase-details';
    details.style.display = 'none';

    checks.forEach(function (c) {
      details.appendChild(buildCheckItem(c));
    });

    group.appendChild(details);

    header.addEventListener('click', function () {
      const isOpen = details.style.display !== 'none';
      details.style.display = isOpen ? 'none' : 'block';
      header.classList.toggle('open', !isOpen);
    });

    return group;
  }

  function buildCheckItem(c) {
    const days = c.realizeDate ? global.utils.daysFromToday(c.realizeDate) : null;
    const currency = c.currency || 'RSD';
    const flag = global.currencies.getFlag(currency);

    const item = document.createElement('div');
    item.className = 'check-item' + (c.realized ? ' realized' : '');
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'rem-check' + (c.realized ? ' done' : '');
    check.setAttribute('aria-label', c.realized
      ? t('checks.markPending', 'Označi kao nerealizovano')
      : t('checks.markRealized', 'Označi kao realizovano'));
    check.innerHTML = c.realized
      ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      : '';
    check.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleCheckRealized(c);
    });
    item.appendChild(check);

    const body = document.createElement('div');
    body.className = 'check-body';

    const meta = document.createElement('div');
    meta.className = 'check-meta';

    if (c.realizeDate) {
      let cls = 'bill-meta-item';
      let label = global.utils.formatDate(c.realizeDate);
      if (!c.realized && days !== null) {
        if (days < 0) { cls += ' overdue'; label += ' • ' + t('checks.overdue', 'prošlo'); }
        else if (days === 0) { cls += ' soon'; label += ' • ' + t('checks.today', 'danas'); }
        else if (days <= 5) { cls += ' soon'; label += ' • ' + t('checks.inDays', 'za') + ' ' + days + ' ' + t('checks.days', 'dana'); }
      }
      const rd = document.createElement('span');
      rd.className = cls;
      rd.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 14"></polyline></svg> ' + global.utils.escapeHtml(label);
      meta.appendChild(rd);
    }

    if (c.autoRealize && !c.realized) {
      const auto = document.createElement('span');
      auto.className = 'check-auto-badge';
      auto.innerHTML = '⚡ ' + t('checks.auto', 'Auto');
      meta.appendChild(auto);
    }

    if (c.realized) {
      const badge = document.createElement('span');
      badge.className = 'check-status realized';
      badge.textContent = '✓ ' + t('checks.status.realized', 'Realizovan');
      meta.appendChild(badge);
    }

    body.appendChild(meta);
    item.appendChild(body);

    const amount = document.createElement('div');
    amount.className = 'bill-amount';
    amount.innerHTML = formatAmount(c.amount || 0) +
      ' <span class="currency-code">' + flag + ' ' + currency + '</span>';
    item.appendChild(amount);

    item.addEventListener('click', function (e) {
      if (e.target === check || check.contains(e.target)) return;
      openCheckDetail(c);
    });

    return item;
  }

  function toggleCheckRealized(c) {
    c.realized = !c.realized;
    if (c.realized) {
      c.realizedAt = new Date().toISOString();
      c.realizedAuto = false;
    } else {
      c.realizedAt = null;
      c.realizedAuto = false;
    }

    global.storage.save(STORE_CHECKS, c).then(function () {
      const v = document.getElementById('view-bills');
      if (v) {
        const lw = v.querySelector('.bills-list');
        if (lw) renderChecksList(lw);
        refreshChecksSummary(v);
      }
      if (global.home) global.home.refresh();
    });
  }

  function refreshChecksSummary(view) {
    const summary = computeCheckSummary();
    const summaryBox = view.querySelector('.bills-summary');
    if (summaryBox) {
      summaryBox.innerHTML = [
        '<div class="bills-stat">',
        '  <div class="bills-stat-value total">' + summary.total + '</div>',
        '  <div class="bills-stat-label">' + t('checks.stat.total', 'Ukupno') + '</div>',
        '</div>',
        '<div class="bills-stat">',
        '  <div class="bills-stat-value paid">' + summary.realized + '</div>',
        '  <div class="bills-stat-label">' + t('checks.stat.realized', 'Realizovano') + '</div>',
        '</div>',
        '<div class="bills-stat">',
        '  <div class="bills-stat-value pending">' + summary.pending + '</div>',
        '  <div class="bills-stat-label">' + t('checks.stat.pending', 'Preostalo') + '</div>',
        '</div>'
      ].join('');
    }

    const msgEl = view.querySelector('.checks-status-message');
    if (msgEl) {
      if (summary.pending === 0 && summary.total > 0) {
        msgEl.classList.add('all-done');
        msgEl.innerHTML = '✓ ' + t('checks.allDone', 'Svi čekovi za ovaj mesec su realizovani.');
      } else {
        msgEl.classList.remove('all-done');
        msgEl.innerHTML = '<span class="check-count">' + summary.realized + ' / ' + summary.total + '</span> ' +
          t('checks.partialDone', 'čekova realizovano. Preostalo') + ' ' + summary.pending + '.';
      }
    }
  }

  /* =========================================================
     FORMA — ČEK (toggle ukupno / po čeku, pametan datum)
     ========================================================= */

  let formOverlay = null;
  let currentAttachment = { id: null, isNew: false, removed: false };

  function openCheckForm() {
    if (formOverlay) return;
    state.editingCheckId = null;

    const today = global.utils.todayISO();

    formOverlay = document.createElement('div');
    formOverlay.className = 'modal-overlay';
    formOverlay.setAttribute('role', 'dialog');

    const currencyOptions = global.currencies.getAll().map(function (c) {
      const label = c.flag + ' ' + c.code + ' — ' + (lang() === 'en' ? c.name_en : c.name_sr);
      const selected = c.code === 'RSD' ? ' selected' : '';
      return '<option value="' + c.code + '"' + selected + '>' + global.utils.escapeHtml(label) + '</option>';
    }).join('');

    formOverlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title">' + t('checks.new', 'Nova kupovina čekovima') + '</h3>',
      '  <form id="checkForm" novalidate>',

      /* Purpose */
      '    <div class="form-group">',
      '      <label class="label">' + t('checks.field.purpose', 'Šta je kupljeno') + ' *</label>',
      '      <input class="input" type="text" name="purpose" required placeholder="' + t('checks.field.purposePlaceholder', 'npr. Patike') + '" />',
      '    </div>',

      /* Seller */
      '    <div class="form-group">',
      '      <label class="label">' + t('checks.field.seller', 'Gde je kupljeno') + '</label>',
      '      <input class="input" type="text" name="seller" placeholder="' + t('checks.field.sellerPlaceholder', 'npr. N Sport') + '" />',
      '    </div>',

      /* Amount toggle */
      '    <div class="form-group">',
      '      <label class="label">' + t('checks.field.amountMode', 'Način unosa iznosa') + '</label>',
      '      <div class="amount-mode-toggle" id="amountModeToggle">',
      '        <button type="button" class="amt-mode-btn active" data-mode="total">' + t('checks.mode.total', 'Ukupan iznos') + '</button>',
      '        <button type="button" class="amt-mode-btn" data-mode="per-check">' + t('checks.mode.perCheck', 'Iznos po čeku') + '</button>',
      '      </div>',
      '    </div>',

      /* Amount + currency */
      '    <div class="amount-row">',
      '      <div class="form-group">',
      '        <label class="label" id="amountLabel">' + t('checks.field.totalAmount', 'Ukupan iznos') + ' *</label>',
      '        <input class="input" type="text" inputmode="decimal" name="amount" required placeholder="0,00" />',
      '      </div>',
      '      <div class="form-group currency-select">',
      '        <label class="label">' + t('checks.field.currency', 'Valuta') + '</label>',
      '        <select class="select" name="currency">' + currencyOptions + '</select>',
      '      </div>',
      '    </div>',

      /* Number + first date */
      '    <div class="form-row">',
      '      <div class="form-group">',
      '        <label class="label">' + t('checks.field.numberOfChecks', 'Broj čekova') + ' *</label>',
      '        <input class="input" type="number" min="1" max="60" name="numberOfChecks" required value="1" />',
      '      </div>',
      '      <div class="form-group">',
      '        <label class="label">' + t('checks.field.firstDate', 'Prva realizacija') + ' *</label>',
      global.utils.dateInputHTML('firstDate', today, { required: true }),
      '      </div>',
      '    </div>',

      /* Preview */
      '    <div class="check-monthly-preview" id="monthlyPreview"></div>',

      /* Auto realize */
      '    <div class="form-group">',
      '      <label class="label">',
      '        <input type="checkbox" name="autoRealize" checked style="margin-right:0.4rem;" />',
      '        ' + t('checks.field.autoRealize', 'Automatski označi kao realizovano na datum') + '</label>',
      '    </div>',

      /* Note */
      '    <div class="form-group">',
      '      <label class="label">' + t('checks.field.note', 'Napomena') + '</label>',
      '      <textarea class="textarea" name="note"></textarea>',
      '    </div>',

      '    <div class="form-error" id="checkFormError"></div>',
      '    <div class="modal-actions">',
      '      <button type="button" class="btn btn-secondary" id="checkCancel">' + t('common.cancel', 'Otkaži') + '</button>',
      '      <button type="submit" class="btn btn-primary">' + t('common.save', 'Sačuvaj') + '</button>',
      '    </div>',
      '  </form>',
      '</div>'
    ].join('');

    document.body.appendChild(formOverlay);

    /* Bind date inputs */
    global.utils.bindDateInputs(formOverlay);

    /* Amount mode toggle */
    let amountMode = 'total';
    const toggleBtns = formOverlay.querySelectorAll('.amt-mode-btn');
    const amountLabel = formOverlay.querySelector('#amountLabel');
    const amountInput = formOverlay.querySelector('input[name="amount"]');
    const numberOfChecksInput = formOverlay.querySelector('input[name="numberOfChecks"]');
    const previewEl = formOverlay.querySelector('#monthlyPreview');

    toggleBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        amountMode = btn.getAttribute('data-mode');
        toggleBtns.forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        if (amountMode === 'total') {
          amountLabel.textContent = t('checks.field.totalAmount', 'Ukupan iznos') + ' *';
        } else {
          amountLabel.textContent = t('checks.field.perCheckAmount', 'Iznos po čeku') + ' *';
        }
        updatePreview();
      });
    });

    function updatePreview() {
      const val = global.utils.parseAmount(amountInput.value);
      const n = Number(numberOfChecksInput.value) || 0;
      if (val > 0 && n > 0) {
        if (amountMode === 'total') {
          const monthly = val / n;
          previewEl.innerHTML = '<span class="preview-label">' + t('checks.monthlyPreview', 'Mesečno') + ':</span> ' +
            '<span class="preview-value">' + formatAmount(monthly) + '</span>';
        } else {
          const total = val * n;
          previewEl.innerHTML = '<span class="preview-label">' + t('checks.totalPreview', 'Ukupno') + ':</span> ' +
            '<span class="preview-value">' + formatAmount(total) + '</span>';
        }
      } else {
        previewEl.innerHTML = '';
      }
    }

    amountInput.addEventListener('input', updatePreview);
    numberOfChecksInput.addEventListener('input', updatePreview);

    formOverlay.querySelector('#checkCancel').addEventListener('click', closeForm);
    formOverlay.addEventListener('click', function (e) {
      if (e.target === formOverlay) closeForm();
    });
    formOverlay.querySelector('#checkForm').addEventListener('submit', function (e) {
      e.preventDefault();
      submitCheckForm(formOverlay, function () { return amountMode; });
    });

    requestAnimationFrame(function () {
      formOverlay.classList.add('show');
    });
  }

  function submitCheckForm(overlay, getAmountMode) {
    const form = overlay.querySelector('#checkForm');
    const errEl = overlay.querySelector('#checkFormError');
    errEl.textContent = '';

    const rawAmount = global.utils.parseAmount(form.amount.value);
    const numberOfChecks = Number(form.numberOfChecks.value) || 0;
    const currency = form.currency.value || 'RSD';
    const firstDate = global.utils.getDateValue(overlay, 'firstDate');
    const purpose = form.purpose.value.trim();
    const seller = form.seller.value.trim();
    const autoRealize = form.autoRealize.checked;
    const note = form.note.value.trim();
    const mode = getAmountMode ? getAmountMode() : 'total';

    if (!purpose) {
      errEl.textContent = t('checks.err.purpose', 'Opis je obavezan.');
      return;
    }
    if (!rawAmount || rawAmount <= 0) {
      errEl.textContent = t('checks.err.amount', 'Iznos mora biti veći od 0.');
      return;
    }
    if (numberOfChecks <= 0 || numberOfChecks > 60) {
      errEl.textContent = t('checks.err.number', 'Broj čekova mora biti između 1 i 60.');
      return;
    }
    if (!firstDate) {
      errEl.textContent = t('checks.err.date', 'Datum prve realizacije je obavezan.');
      return;
    }

    /* Odredi monthly i total na osnovu moda */
    let monthlyAmount, totalAmount;
    if (mode === 'total') {
      totalAmount = rawAmount;
      monthlyAmount = rawAmount / numberOfChecks;
    } else {
      monthlyAmount = rawAmount;
      totalAmount = rawAmount * numberOfChecks;
    }

    const purchaseId = global.utils.uid('purchase');
    const promises = [];

    for (let i = 0; i < numberOfChecks; i++) {
      const realizeDate = global.utils.addMonths(firstDate, i);
      const check = {
        id: global.utils.uid('check'),
        purchaseId: purchaseId,
        purpose: purpose,
        seller: seller,
        amount: monthlyAmount,
        currency: currency,
        totalAmount: totalAmount,
        totalChecks: numberOfChecks,
        checkIndex: i + 1,
        realizeDate: realizeDate,
        autoRealize: autoRealize,
        realized: false,
        realizedAt: null,
        note: note,
        createdAt: new Date().toISOString()
      };
      promises.push(global.storage.save(STORE_CHECKS, check));
    }

    Promise.all(promises).then(function () {
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

  function openCheckDetail(c) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const currency = c.currency || 'RSD';
    const flag = global.currencies.getFlag(currency);

    overlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title">' + global.utils.escapeHtml(c.purpose || '') + '</h3>',
      c.seller ? '  <p class="text-muted text-sm" style="margin-bottom: 0.75rem;">' + global.utils.escapeHtml(c.seller) + '</p>' : '',
      '  <div class="detail-row"><span class="detail-label">' + t('checks.field.amount', 'Iznos') + '</span><span class="detail-value">' + formatAmount(c.amount) + ' ' + flag + ' ' + currency + '</span></div>',
      c.totalAmount ? '  <div class="detail-row"><span class="detail-label">' + t('checks.field.totalAmount', 'Ukupan iznos') + '</span><span class="detail-value">' + formatAmount(c.totalAmount) + ' ' + flag + ' ' + currency + '</span></div>' : '',
      c.checkIndex ? '  <div class="detail-row"><span class="detail-label">' + t('checks.field.checkNumber', 'Ček') + '</span><span class="detail-value">' + c.checkIndex + ' / ' + c.totalChecks + '</span></div>' : '',
      c.realizeDate ? '  <div class="detail-row"><span class="detail-label">' + t('checks.field.realizeDate', 'Datum realizacije') + '</span><span class="detail-value">' + global.utils.formatDate(c.realizeDate) + '</span></div>' : '',
      '  <div class="detail-row"><span class="detail-label">' + t('checks.field.status', 'Status') + '</span><span class="detail-value">' + (c.realized ? '✓ ' + t('checks.status.realized', 'Realizovan') : t('checks.status.pending', 'Nerealizovan')) + '</span></div>',
      c.note ? '  <div class="detail-row" style="flex-direction: column; align-items: flex-start;"><span class="detail-label">' + t('checks.field.note', 'Napomena') + '</span><span class="detail-value" style="text-align: left;">' + global.utils.escapeHtml(c.note) + '</span></div>' : '',
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-secondary" id="checkDetailClose">' + t('common.close', 'Zatvori') + '</button>',
      '    <button type="button" class="btn btn-danger" id="checkDetailDelete">' + t('common.delete', 'Obriši') + '</button>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    overlay.querySelector('#checkDetailClose').addEventListener('click', function () {
      document.body.removeChild(overlay);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
    overlay.querySelector('#checkDetailDelete').addEventListener('click', function () {
      const ok = global.confirm(t('checks.deleteConfirm', 'Obrisati ovaj ček?'));
      if (!ok) return;
      global.storage.delete(STORE_CHECKS, c.id).then(function () {
        document.body.removeChild(overlay);
        loadAll().then(function () {
          const view = document.getElementById('view-bills');
          if (view) refreshAll(view);
        });
      });
    });

    requestAnimationFrame(function () {
      overlay.classList.add('show');
    });
  }

  /* =========================================================
     FORMA — RATA (pametan datum)
     ========================================================= */

  function openRateForm(existing) {
    if (formOverlay) return;
    state.editingRateId = existing ? existing.id : null;

    const isEdit = !!existing;
    const item = existing ? Object.assign({}, existing) : {
      name: '',
      bank: '',
      totalAmount: '',
      currency: 'RSD',
      dayOfMonth: 15,
      startDate: global.utils.todayISO(),
      totalInstallments: 12,
      paidInstallments: 0,
      active: true,
      notes: ''
    };

    formOverlay = document.createElement('div');
    formOverlay.className = 'modal-overlay';
    formOverlay.setAttribute('role', 'dialog');

    const currencyOptions = global.currencies.getAll().map(function (c) {
      const label = c.flag + ' ' + c.code + ' — ' + (lang() === 'en' ? c.name_en : c.name_sr);
      const selected = (item.currency || 'RSD') === c.code ? ' selected' : '';
      return '<option value="' + c.code + '"' + selected + '>' + global.utils.escapeHtml(label) + '</option>';
    }).join('');

    formOverlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title">' + (isEdit ? t('rates.edit', 'Izmeni ratu') : t('rates.new', 'Nova rata')) + '</h3>',
      '  <form id="rateForm" novalidate>',
      '    <div class="form-group">',
      '      <label class="label">' + t('rates.field.name', 'Naziv') + ' *</label>',
      '      <input class="input" type="text" name="name" required value="' + global.utils.escapeHtml(item.name || '') + '" placeholder="' + t('rates.field.namePlaceholder', 'npr. Kredit za auto') + '" />',
      '    </div>',
      '    <div class="form-group">',
      '      <label class="label">' + t('rates.field.bank', 'Banka / primalac') + '</label>',
      '      <input class="input" type="text" name="bank" value="' + global.utils.escapeHtml(item.bank || '') + '" placeholder="' + t('rates.field.bankPlaceholder', 'npr. Banca Intesa') + '" />',
      '    </div>',
      '    <div class="amount-row">',
      '      <div class="form-group">',
      '        <label class="label">' + t('rates.field.totalAmount', 'Ukupan iznos') + ' *</label>',
      '        <input class="input" type="text" inputmode="decimal" name="totalAmount" required value="' + global.utils.escapeHtml(String(item.totalAmount || '')) + '" placeholder="0,00" />',
      '      </div>',
      '      <div class="form-group currency-select">',
      '        <label class="label">' + t('rates.field.currency', 'Valuta') + '</label>',
      '        <select class="select" name="currency">' + currencyOptions + '</select>',
      '      </div>',
      '    </div>',
      '    <div class="form-row">',
      '      <div class="form-group">',
      '        <label class="label">' + t('rates.field.totalInstallments', 'Broj rata') + ' *</label>',
      '        <input class="input" type="number" min="1" max="360" name="totalInstallments" required value="' + (item.totalInstallments || 12) + '" />',
      '      </div>',
      '      <div class="form-group">',
      '        <label class="label">' + t('rates.field.dayOfMonth', 'Dan u mesecu') + '</label>',
      '        <input class="input" type="number" min="1" max="28" name="dayOfMonth" value="' + (item.dayOfMonth || 15) + '" />',
      '      </div>',
      '    </div>',
      '    <div class="check-monthly-preview" id="rateMonthlyPreview"></div>',
      '    <div class="form-row">',
      '      <div class="form-group">',
      '        <label class="label">' + t('rates.field.startDate', 'Datum početka') + '</label>',
      global.utils.dateInputHTML('startDate', item.startDate || '', {}),
      '      </div>',
      '      <div class="form-group">',
      '        <label class="label">' + t('rates.field.paidInstallments', 'Plaćeno rata') + '</label>',
      '        <input class="input" type="number" min="0" name="paidInstallments" value="' + (item.paidInstallments || 0) + '" />',
      '      </div>',
      '    </div>',
      '    <div class="form-group">',
      '      <label class="label">' + t('rates.field.notes', 'Napomena') + '</label>',
      '      <textarea class="textarea" name="notes">' + global.utils.escapeHtml(item.notes || '') + '</textarea>',
      '    </div>',
      '    <div class="form-error" id="rateFormError"></div>',
      '    <div class="modal-actions">',
      '      <button type="button" class="btn btn-secondary" id="rateCancel">' + t('common.cancel', 'Otkaži') + '</button>',
      '      <button type="submit" class="btn btn-primary">' + t('common.save', 'Sačuvaj') + '</button>',
      '    </div>',
      '  </form>',
      '</div>'
    ].join('');

    document.body.appendChild(formOverlay);
    global.utils.bindDateInputs(formOverlay);

    const totalAmountInput = formOverlay.querySelector('input[name="totalAmount"]');
    const installmentsInput = formOverlay.querySelector('input[name="totalInstallments"]');
    const previewEl = formOverlay.querySelector('#rateMonthlyPreview');

    function updatePreview() {
      const total = global.utils.parseAmount(totalAmountInput.value);
      const n = Number(installmentsInput.value) || 0;
      if (total > 0 && n > 0) {
        const monthly = total / n;
        previewEl.innerHTML = '<span class="preview-label">' + t('rates.monthlyPreview', 'Mesečna rata') + ':</span> ' +
          '<span class="preview-value">' + formatAmount(monthly) + '</span>';
      } else {
        previewEl.innerHTML = '';
      }
    }

    totalAmountInput.addEventListener('input', updatePreview);
    installmentsInput.addEventListener('input', updatePreview);
    updatePreview();

    formOverlay.querySelector('#rateCancel').addEventListener('click', closeForm);
    formOverlay.addEventListener('click', function (e) {
      if (e.target === formOverlay) closeForm();
    });
    formOverlay.querySelector('#rateForm').addEventListener('submit', function (e) {
      e.preventDefault();
      submitRateForm(formOverlay);
    });

    requestAnimationFrame(function () {
      formOverlay.classList.add('show');
    });
  }

  function submitRateForm(overlay) {
    const form = overlay.querySelector('#rateForm');
    const errEl = overlay.querySelector('#rateFormError');
    errEl.textContent = '';

    const totalAmount = global.utils.parseAmount(form.totalAmount.value);
    const totalInstallments = Number(form.totalInstallments.value) || 0;
    const startDate = global.utils.getDateValue(overlay, 'startDate');

    const data = {
      name: form.name.value.trim(),
      bank: form.bank.value.trim(),
      totalAmount: totalAmount,
      currency: form.currency.value || 'RSD',
      dayOfMonth: Number(form.dayOfMonth.value) || 15,
      startDate: startDate,
      totalInstallments: totalInstallments,
      paidInstallments: Number(form.paidInstallments.value) || 0,
      notes: form.notes.value.trim(),
      active: true
    };

    if (!data.name) {
      errEl.textContent = t('rates.err.name', 'Naziv je obavezan.');
      return;
    }
    if (!data.totalAmount || data.totalAmount <= 0) {
      errEl.textContent = t('rates.err.amount', 'Ukupan iznos mora biti veći od 0.');
      return;
    }
    if (!data.totalInstallments || data.totalInstallments <= 0) {
      errEl.textContent = t('rates.err.total', 'Broj rata je obavezan.');
      return;
    }
    if (data.paidInstallments > data.totalInstallments) {
      data.paidInstallments = data.totalInstallments;
    }
    if (data.paidInstallments >= data.totalInstallments) {
      data.active = false;
    }

    let record;
    if (state.editingRateId) {
      const existing = state.rates.find(function (x) { return x.id === state.editingRateId; });
      if (!existing) return;
      record = Object.assign({}, existing, data);
    } else {
      record = Object.assign({
        id: global.utils.uid('rate'),
        createdAt: new Date().toISOString()
      }, data);
    }

    global.storage.save(STORE_RATES, record).then(function () {
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

  function openRateDetail(r) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const progress = getRateProgress(r);
    const remaining = getRateRemainingAmount(r);
    const paid = getRatePaidAmount(r);
    const monthly = getRateMonthlyAmount(r);
    const currency = r.currency || 'RSD';
    const flag = global.currencies.getFlag(currency);
    const status = getRateStatus(r);

    overlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title">' + global.utils.escapeHtml(r.name || '') + '</h3>',
      r.bank ? '  <p class="text-muted text-sm" style="margin-bottom: 0.75rem;">' + global.utils.escapeHtml(r.bank) + '</p>' : '',
      '  <div class="rate-progress" style="margin-bottom: 1rem;">',
      '    <div class="rate-progress-bar">',
      '      <div class="rate-progress-fill" style="width: ' + progress.percent + '%"></div>',
      '    </div>',
      '    <div class="rate-progress-label">',
      '      <span>' + progress.paid + ' / ' + progress.total + ' ' + t('rates.installments', 'rata') + '</span>',
      '      <span>' + progress.percent + '%</span>',
      '    </div>',
      '  </div>',
      '  <div class="detail-row"><span class="detail-label">' + t('rates.field.totalAmount', 'Ukupno') + '</span><span class="detail-value">' + formatAmount(r.totalAmount) + ' ' + flag + ' ' + currency + '</span></div>',
      '  <div class="detail-row"><span class="detail-label">' + t('rates.field.paidAmount', 'Plaćeno') + '</span><span class="detail-value">' + formatAmount(paid) + ' ' + flag + ' ' + currency + '</span></div>',
      '  <div class="detail-row"><span class="detail-label">' + t('rates.remaining', 'Ostalo') + '</span><span class="detail-value">' + formatAmount(remaining) + ' ' + flag + ' ' + currency + '</span></div>',
      '  <div class="detail-row"><span class="detail-label">' + t('rates.monthly', 'Mesečno') + '</span><span class="detail-value">' + formatAmount(monthly) + ' ' + flag + ' ' + currency + '</span></div>',
      r.dayOfMonth ? '  <div class="detail-row"><span class="detail-label">' + t('rates.field.dayOfMonth', 'Dan u mesecu') + '</span><span class="detail-value">' + r.dayOfMonth + '.</span></div>' : '',
      r.startDate ? '  <div class="detail-row"><span class="detail-label">' + t('rates.field.startDate', 'Početak') + '</span><span class="detail-value">' + global.utils.formatDate(r.startDate) + '</span></div>' : '',
      r.notes ? '  <div class="detail-row" style="flex-direction: column; align-items: flex-start;"><span class="detail-label">' + t('rates.field.notes', 'Napomena') + '</span><span class="detail-value" style="text-align: left;">' + global.utils.escapeHtml(r.notes) + '</span></div>' : '',
      status === 'active'
        ? '  <button type="button" class="btn btn-primary btn-block rate-pay-big" id="rateDetailPay" style="margin-top: 1rem;">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> ' +
            t('rates.payNowBig', 'Plati sledeću ratu') + ' (' + formatAmount(monthly) + ' ' + flag + ')' +
          '</button>'
        : '  <div class="rate-done-badge" style="margin-top: 1rem; text-align: center;">✓ ' + t('rates.paidFull', 'Otplaćeno') + '</div>',
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-secondary" id="rateDetailClose">' + t('common.close', 'Zatvori') + '</button>',
      '    <button type="button" class="btn btn-secondary" id="rateDetailEdit" style="color: var(--color-brand);">' + t('common.edit', 'Izmeni') + '</button>',
      '    <button type="button" class="btn btn-danger" id="rateDetailDelete">' + t('common.delete', 'Obriši') + '</button>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    overlay.querySelector('#rateDetailClose').addEventListener('click', function () {
      document.body.removeChild(overlay);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
    overlay.querySelector('#rateDetailEdit').addEventListener('click', function () {
      document.body.removeChild(overlay);
      openRateForm(r);
    });
    overlay.querySelector('#rateDetailDelete').addEventListener('click', function () {
      const ok = global.confirm(t('rates.deleteConfirm', 'Obrisati ovu ratu?'));
      if (!ok) return;
      global.storage.delete(STORE_RATES, r.id).then(function () {
        document.body.removeChild(overlay);
        loadAll().then(function () {
          const view = document.getElementById('view-bills');
          if (view) refreshAll(view);
        });
      });
    });

    const payBtn = overlay.querySelector('#rateDetailPay');
    if (payBtn) {
      payBtn.addEventListener('click', function () {
        document.body.removeChild(overlay);
        payRate(r, null);
      });
    }

    requestAnimationFrame(function () {
      overlay.classList.add('show');
    });
  }

  /* =========================================================
     FORMA — RAČUN (pametni datumi, upload)
     ========================================================= */

  function openBillForm(existing) {
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
      reference: '',
      attachmentId: ''
    };

    currentAttachment = {
      id: item.attachmentId || null,
      isNew: false,
      removed: false
    };

    formOverlay = document.createElement('div');
    formOverlay.className = 'modal-overlay';
    formOverlay.setAttribute('role', 'dialog');
    formOverlay.setAttribute('aria-modal', 'true');

    const catOptions = getAllCategories().map(function (c) {
      const label = lang() === 'en' ? (c.name_en || c.name_sr) : (c.name_sr || c.name_en);
      const selected = item.category === c.id ? ' selected' : '';
      return '<option value="' + c.id + '"' + selected + '>' + global.utils.escapeHtml(label) + '</option>';
    }).join('');

    const currencyOptions = global.currencies.getAll().map(function (c) {
      const label = c.flag + ' ' + c.code + ' — ' + (lang() === 'en' ? c.name_en : c.name_sr);
      const selected = (item.currency || 'RSD') === c.code ? ' selected' : '';
      return '<option value="' + c.code + '"' + selected + '>' + global.utils.escapeHtml(label) + '</option>';
    }).join('');

    formOverlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title">' + (isEdit ? t('bills.edit', 'Izmeni račun') : t('bills.new', 'Novi račun')) + '</h3>',
      '  <form id="billForm" novalidate>',
      '    <div class="bill-form-section"><div id="uploadArea"></div></div>',
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
      '    <div class="bill-form-section">',
      '      <div class="bill-form-section-title">' + t('bills.section.amount', 'Iznos i valuta') + '</div>',
      '      <div class="amount-row">',
      '        <div class="form-group">',
      '          <label class="label">' + t('bills.field.amount', 'Iznos') + ' *</label>',
      '          <input class="input" type="text" inputmode="decimal" name="amount" required value="' + global.utils.escapeHtml(String(item.amount || '')) + '" placeholder="0,00" />',
      '        </div>',
      '        <div class="form-group currency-select">',
      '          <label class="label">' + t('bills.field.currency', 'Valuta') + '</label>',
      '          <select class="select" name="currency">' + currencyOptions + '</select>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="bill-form-section">',
      '      <div class="bill-form-section-title">' + t('bills.section.dates', 'Period i datumi') + '</div>',
      '      <div class="form-row">',
      '        <div class="form-group">',
      '          <label class="label">' + t('bills.field.month', 'Mesec') + ' *</label>',
      '          <input class="input" type="month" name="month" required value="' + global.utils.escapeHtml(item.month || currentMonthISO()) + '" />',
      '        </div>',
      '        <div class="form-group">',
      '          <label class="label">' + t('bills.field.issueDate', 'Datum izdavanja') + '</label>',
      global.utils.dateInputHTML('issueDate', item.issueDate || '', {}),
      '        </div>',
      '      </div>',
      '      <div class="form-group">',
      '        <label class="label">' + t('bills.field.dueDate', 'Rok plaćanja') + '</label>',
      global.utils.dateInputHTML('dueDate', item.dueDate || '', {}),
      '      </div>',
      '      <div class="form-group">',
      '        <label class="label"><input type="checkbox" name="paid" ' + (item.paid ? 'checked' : '') + ' style="margin-right:0.4rem;" /> ' + t('bills.field.paid', 'Plaćeno') + '</label>',
      '      </div>',
      '      <div class="form-group" id="paidDateGroup" style="' + (item.paid ? '' : 'display:none;') + '">',
      '        <label class="label">' + t('bills.field.paidDate', 'Datum plaćanja') + '</label>',
      global.utils.dateInputHTML('paidDate', item.paidDate || '', {}),
      '      </div>',
      '    </div>',
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
    global.utils.bindDateInputs(formOverlay);

    renderUploadArea(formOverlay.querySelector('#uploadArea'));

    const paidCheckbox = formOverlay.querySelector('input[name="paid"]');
    const paidDateGroup = formOverlay.querySelector('#paidDateGroup');
    paidCheckbox.addEventListener('change', function () {
      paidDateGroup.style.display = paidCheckbox.checked ? '' : 'none';
      if (paidCheckbox.checked) {
        const current = global.utils.getDateValue(formOverlay, 'paidDate');
        if (!current) {
          global.utils.setDateValue(formOverlay, 'paidDate', global.utils.todayISO());
        }
      }
    });

    formOverlay.querySelector('#billCancel').addEventListener('click', closeForm);
    formOverlay.addEventListener('click', function (e) {
      if (e.target === formOverlay) closeForm();
    });
    formOverlay.querySelector('#billForm').addEventListener('submit', function (e) {
      e.preventDefault();
      submitBillForm(formOverlay);
    });

    requestAnimationFrame(function () {
      formOverlay.classList.add('show');
    });
  }

  function renderUploadArea(container) {
    container.innerHTML = '';

    if (currentAttachment.id && !currentAttachment.removed) {
      getFileURL(currentAttachment.id).then(function (info) {
        if (!info) return;
        const wrap = document.createElement('div');
        wrap.className = 'upload-preview';

        if (info.type && info.type.indexOf('image/') === 0) {
          const img = document.createElement('img');
          img.src = info.url;
          img.alt = '';
          wrap.appendChild(img);
        } else {
          wrap.innerHTML = '<div style="padding: 1rem; text-align: center;"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-module-bills);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><p style="margin-top:0.5rem; font-size: 0.85rem;">' + global.utils.escapeHtml(info.name) + '</p></div>';
        }

        const actions = document.createElement('div');
        actions.className = 'upload-preview-actions';

        const changeBtn = document.createElement('button');
        changeBtn.type = 'button';
        changeBtn.className = 'btn btn-secondary';
        changeBtn.textContent = t('bills.attachment.change', 'Promeni');
        changeBtn.addEventListener('click', pickFile);
        actions.appendChild(changeBtn);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-secondary';
        removeBtn.style.color = 'var(--color-danger)';
        removeBtn.textContent = t('bills.attachment.remove', 'Ukloni');
        removeBtn.addEventListener('click', function () {
          currentAttachment.removed = true;
          currentAttachment.id = null;
          renderUploadArea(container);
        });
        actions.appendChild(removeBtn);

        container.appendChild(wrap);
        container.appendChild(actions);
      });
      return;
    }

    const zone = document.createElement('div');
    zone.className = 'upload-zone';
    zone.innerHTML = [
      '<div class="upload-zone-icon">',
      '  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
      '</div>',
      '<div class="upload-zone-title">' + t('bills.attachment.add', 'Dodaj iz galerije') + '</div>',
      '<div class="upload-zone-hint">' + t('bills.attachment.hint', 'Izaberi fotografiju računa ili PDF dokument. Ostaje samo na tvom uređaju.') + '</div>'
    ].join('');

    zone.addEventListener('click', pickFile);
    container.appendChild(zone);
  }

  function pickFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      const file = input.files && input.files[0];
      if (!file) {
        document.body.removeChild(input);
        return;
      }
      saveFile(file).then(function (id) {
        currentAttachment.id = id;
        currentAttachment.isNew = true;
        currentAttachment.removed = false;
        const area = formOverlay && formOverlay.querySelector('#uploadArea');
        if (area) renderUploadArea(area);
      }).catch(function (err) {
        if (global.home) global.home.showToast(t('bills.err.file', 'Greška: ') + (err.message || ''));
      }).then(function () {
        document.body.removeChild(input);
      });
    });
    input.click();
  }

  function closeForm() {
    if (!formOverlay) return;
    formOverlay.classList.remove('show');
    setTimeout(function () {
      if (formOverlay && formOverlay.parentNode) formOverlay.parentNode.removeChild(formOverlay);
      formOverlay = null;
      currentAttachment = { id: null, isNew: false, removed: false };
    }, 200);
  }

  function submitBillForm(overlay) {
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
      issueDate: global.utils.getDateValue(overlay, 'issueDate'),
      dueDate: global.utils.getDateValue(overlay, 'dueDate'),
      paid: form.paid.checked,
      paidDate: global.utils.getDateValue(overlay, 'paidDate'),
      reference: form.reference.value.trim(),
      description: form.description.value.trim()
    };

    if (!data.name) {
      errEl.textContent = t('bills.err.name', 'Naziv je obavezan.');
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

      if (currentAttachment.removed && existing.attachmentId) {
        deleteFile(existing.attachmentId);
        record.attachmentId = '';
      } else if (currentAttachment.id) {
        record.attachmentId = currentAttachment.id;
      } else {
        record.attachmentId = existing.attachmentId || '';
      }
    } else {
      record = Object.assign({
        id: global.utils.uid('bill'),
        attachmentId: currentAttachment.id || '',
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

  function openBillDetail(b) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');

    const status = getStatus(b);
    const statusLabel = t('bills.status.' + status, status);
    const currency = b.currency || 'RSD';
    const flag = global.currencies.getFlag(currency);

    let attachmentHTML = '';
    if (b.attachmentId) {
      attachmentHTML = '<div id="detailAttachment" style="margin-top: 0.75rem;"></div>';
    }

    overlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title">' + global.utils.escapeHtml(b.name || b.vendor || '') + '</h3>',
      '  <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">',
      '    <span class="bill-status ' + status + '">' + statusLabel + '</span>',
      b.category ? '    <span class="rem-category-chip">' + global.utils.escapeHtml(categoryName(b.category)) + '</span>' : '',
      '  </div>',
      '  <div class="detail-row"><span class="detail-label">' + t('bills.field.amount', 'Iznos') + '</span><span class="detail-value">' + formatAmount(b.amount || 0) + ' ' + flag + ' ' + currency + '</span></div>',
      b.vendor ? '  <div class="detail-row"><span class="detail-label">' + t('bills.field.vendor', 'Dobavljač') + '</span><span class="detail-value">' + global.utils.escapeHtml(b.vendor) + '</span></div>' : '',
      b.issueDate ? '  <div class="detail-row"><span class="detail-label">' + t('bills.field.issueDate', 'Izdato') + '</span><span class="detail-value">' + global.utils.formatDate(b.issueDate) + '</span></div>' : '',
      b.dueDate ? '  <div class="detail-row"><span class="detail-label">' + t('bills.field.dueDate', 'Rok') + '</span><span class="detail-value">' + global.utils.formatDate(b.dueDate) + '</span></div>' : '',
      b.paidDate ? '  <div class="detail-row"><span class="detail-label">' + t('bills.field.paidDate', 'Plaćeno') + '</span><span class="detail-value">' + global.utils.formatDate(b.paidDate) + '</span></div>' : '',
      b.month ? '  <div class="detail-row"><span class="detail-label">' + t('bills.field.month', 'Mesec') + '</span><span class="detail-value">' + monthLabel(b.month) + '</span></div>' : '',
      b.reference ? '  <div class="detail-row"><span class="detail-label">' + t('bills.field.reference', 'Referenca') + '</span><span class="detail-value">' + global.utils.escapeHtml(b.reference) + '</span></div>' : '',
      b.description ? '  <div class="detail-row" style="flex-direction: column; align-items: flex-start;"><span class="detail-label">' + t('bills.field.description', 'Opis') + '</span><span class="detail-value" style="text-align: left;">' + global.utils.escapeHtml(b.description) + '</span></div>' : '',
      attachmentHTML,
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-secondary" id="detailClose">' + t('common.close', 'Zatvori') + '</button>',
      '    <button type="button" class="btn btn-secondary" id="detailEdit" style="color: var(--color-brand);">' + t('common.edit', 'Izmeni') + '</button>',
      '    <button type="button" class="btn btn-danger" id="detailDelete">' + t('common.delete', 'Obriši') + '</button>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    if (b.attachmentId) {
      getFileURL(b.attachmentId).then(function (info) {
        if (!info) return;
        const container = overlay.querySelector('#detailAttachment');
        if (!container) return;

        if (info.type && info.type.indexOf('image/') === 0) {
          const img = document.createElement('img');
          img.src = info.url;
          img.style.width = '100%';
          img.style.borderRadius = '12px';
          img.style.display = 'block';
          container.appendChild(img);
        } else {
          const link = document.createElement('a');
          link.href = info.url;
          link.download = info.name || 'attachment';
          link.className = 'btn btn-secondary btn-block';
          link.style.textDecoration = 'none';
          link.innerHTML = '📄 ' + t('bills.download', 'Preuzmi') + ' ' + global.utils.escapeHtml(info.name || '');
          link.target = '_blank';
          container.appendChild(link);
        }
      });
    }

    overlay.querySelector('#detailClose').addEventListener('click', function () {
      document.body.removeChild(overlay);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
    overlay.querySelector('#detailEdit').addEventListener('click', function () {
      document.body.removeChild(overlay);
      openBillForm(b);
    });
    overlay.querySelector('#detailDelete').addEventListener('click', function () {
      const ok = global.confirm(t('bills.deleteConfirm', 'Obrisati ovaj račun?'));
      if (!ok) return;
      if (b.attachmentId) deleteFile(b.attachmentId);
      global.storage.delete(STORE, b.id).then(function () {
        document.body.removeChild(overlay);
        loadAll().then(function () {
          const view = document.getElementById('view-bills');
          if (view) refreshAll(view);
          if (global.home) global.home.refresh();
        });
      });
    });

    requestAnimationFrame(function () {
      overlay.classList.add('show');
    });
  }

  /* ---------- FAB ---------- */

  function buildFAB() {
    let fab = document.getElementById('billsFab');
    if (!fab) {
      fab = document.createElement('button');
      fab.type = 'button';
      fab.id = 'billsFab';
      fab.className = 'fab-bills';
      document.body.appendChild(fab);
    }

    if (state.view === 'checks') {
      fab.style.backgroundColor = '#8B5CF6';
      fab.setAttribute('aria-label', t('checks.add', 'Dodaj ček'));
    } else if (state.view === 'rates') {
      fab.style.backgroundColor = '#6C5CE7';
      fab.setAttribute('aria-label', t('rates.add', 'Dodaj ratu'));
    } else {
      fab.style.backgroundColor = '';
      fab.setAttribute('aria-label', t('bills.add', 'Dodaj račun'));
    }

    fab.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';

    fab.onclick = function () {
      if (state.view === 'checks') openCheckForm();
      else if (state.view === 'rates') openRateForm(null);
      else openBillForm(null);
    };
  }

  function toggleFabVisibility() {
    const fab = document.getElementById('billsFab');
    if (!fab) return;
    const route = global.router && global.router.current ? global.router.current() : 'home';
    fab.style.display = route === 'bills' ? '' : 'none';
  }

  function refreshAll(view) {
    if (!view) view = document.getElementById('view-bills');
    if (!view) return;

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

    const view = document.getElementById('view-bills');
    if (view && !view.querySelector('.module-header')) {
      view.innerHTML = '';
      view.appendChild(buildHeader());
    }

    loadAll().then(function () {
      return autoRealizeChecks();
    }).then(function (changed) {
      if (changed > 0) return loadAll();
    }).then(function () {
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
            loadAll().then(function () {
              return autoRealizeChecks();
            }).then(function () {
              return loadAll();
            }).then(function () { refreshAll(v); });
          }
        } else {
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
    addCustomCategory: addCustomCategory,
    autoRealizeChecks: autoRealizeChecks
  };
})(window);
