/* =========================================================
   ALATIKA PRO — money.js
   Modul Novac:
   - Prihodi, rashodi, budžet
   - Mesečni pregled, statistika, grafikoni
   - Povezivanje sa računima (plaćen račun → rashod)
   - Valute (30 komada)
   ========================================================= */

(function (global) {
  'use strict';

  const STORE = 'transactions';
  const STORE_BUDGETS = 'budgets';
  const LS_CUSTOM_CATS = 'money.customCats';

  /* Kategorije prihoda */
  const INCOME_CATEGORIES = [
    { id: 'salary',       name_sr: 'Plata',                 name_en: 'Salary' },
    { id: 'side',         name_sr: 'Dodatni posao',         name_en: 'Side job' },
    { id: 'business',     name_sr: 'Poslovni prihod',       name_en: 'Business income' },
    { id: 'pension',      name_sr: 'Penzija i naknade',     name_en: 'Pension & benefits' },
    { id: 'rental',       name_sr: 'Prihod od zakupa',      name_en: 'Rental income' },
    { id: 'interest',     name_sr: 'Kamate i investicije',  name_en: 'Interest & investments' },
    { id: 'gift',         name_sr: 'Pokloni',               name_en: 'Gifts' },
    { id: 'income-other', name_sr: 'Ostali prihodi',        name_en: 'Other income' }
  ];

  /* Kategorije rashoda */
  const EXPENSE_CATEGORIES = [
    { id: 'housing',      name_sr: 'Stanovanje',            name_en: 'Housing' },
    { id: 'utilities',    name_sr: 'Računi i komunalije',   name_en: 'Bills & utilities' },
    { id: 'food',         name_sr: 'Hrana i namirnice',     name_en: 'Food & groceries' },
    { id: 'transport',    name_sr: 'Prevoz i gorivo',       name_en: 'Transport & fuel' },
    { id: 'vehicle',      name_sr: 'Održavanje vozila',     name_en: 'Vehicle maintenance' },
    { id: 'health',       name_sr: 'Zdravlje',              name_en: 'Health' },
    { id: 'family',       name_sr: 'Porodica i deca',       name_en: 'Family & kids' },
    { id: 'shopping',     name_sr: 'Kupovina',              name_en: 'Shopping' },
    { id: 'leisure',      name_sr: 'Slobodno vreme',        name_en: 'Leisure' },
    { id: 'education',    name_sr: 'Obrazovanje',           name_en: 'Education' },
    { id: 'subscriptions', name_sr: 'Pretplate',            name_en: 'Subscriptions' },
    { id: 'taxes',        name_sr: 'Porezi i osiguranje',   name_en: 'Taxes & insurance' },
    { id: 'expense-other', name_sr: 'Ostali rashodi',       name_en: 'Other expenses' }
  ];

  const state = {
    items: [],
    budgets: [],
    filter: 'all',         /* all | income | expense */
    search: '',
    month: null,           /* "YYYY-MM" */
    categoryFilter: '',    /* '' | categoryId */
    editingId: null,
    budgetEditing: false
  };

  /* ---------- POMOĆNE ---------- */

  function t(key, fallback) {
    return (global.i18n && global.i18n.t) ? global.i18n.t(key, fallback) : (fallback || key);
  }

  function lang() {
    return (global.i18n && global.i18n.getLang) ? global.i18n.getLang() : 'sr';
  }

  function getAllCategories(type) {
    const custom = global.storage.lsGet(LS_CUSTOM_CATS, {}) || {};
    if (type === 'income') {
      return INCOME_CATEGORIES.concat(custom.income || []);
    }
    if (type === 'expense') {
      return EXPENSE_CATEGORIES.concat(custom.expense || []);
    }
    return {
      income: INCOME_CATEGORIES.concat(custom.income || []),
      expense: EXPENSE_CATEGORIES.concat(custom.expense || [])
    };
  }

  function categoryName(catId, type) {
    const all = getAllCategories(type);
    const c = all.find(function (x) { return x.id === catId; });
    if (!c) return catId;
    return lang() === 'en' ? (c.name_en || c.name_sr) : (c.name_sr || c.name_en);
  }

  function addCustomCategory(type, name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    const id = 'custom-' + global.utils.uid('');
    const custom = global.storage.lsGet(LS_CUSTOM_CATS, {}) || {};
    if (!custom[type]) custom[type] = [];
    custom[type].push({
      id: id,
      name_sr: trimmed,
      name_en: trimmed,
      custom: true
    });
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

  /* ---------- UČITAVANJE ---------- */

  function loadAll() {
    return Promise.all([
      global.storage.loadAll(STORE),
      global.storage.loadAll(STORE_BUDGETS)
    ]).then(function (results) {
      state.items = (results[0] || []).sort(function (a, b) {
        return (b.date || '').localeCompare(a.date || '');
      });
      state.budgets = (results[1] || []);
      return state;
    });
  }

  /* ---------- FILTRIRANJE ---------- */

  function applyFilter(list) {
    let out = list.slice();

    if (state.month) {
      out = out.filter(function (x) {
        return (x.date || '').slice(0, 7) === state.month;
      });
    }

    if (state.filter === 'income') {
      out = out.filter(function (x) { return x.type === 'income'; });
    } else if (state.filter === 'expense') {
      out = out.filter(function (x) { return x.type === 'expense'; });
    }

    if (state.categoryFilter) {
      out = out.filter(function (x) { return x.category === state.categoryFilter; });
    }

    if (state.search) {
      const q = state.search.toLowerCase();
      out = out.filter(function (x) {
        return (x.name || '').toLowerCase().indexOf(q) !== -1 ||
               (x.note || '').toLowerCase().indexOf(q) !== -1 ||
               categoryName(x.category, x.type).toLowerCase().indexOf(q) !== -1;
      });
    }

    return out;
  }

  /* ---------- SAŽETAK MESECA ---------- */

  function computeMonthSummary(monthISO) {
    const m = monthISO || state.month || currentMonthISO();

    const monthItems = state.items.filter(function (x) {
      return (x.date || '').slice(0, 7) === m;
    });

    /* Prihodi */
    const incomeByCurrency = {};
    let incomeTotalRSD = 0;
    monthItems.forEach(function (x) {
      if (x.type !== 'income') return;
      const cur = x.currency || 'RSD';
      const amt = Number(x.amount) || 0;
      incomeByCurrency[cur] = (incomeByCurrency[cur] || 0) + amt;
      if (cur === 'RSD') incomeTotalRSD += amt;
    });

    /* Rashodi */
    const expenseByCurrency = {};
    let expenseTotalRSD = 0;
    monthItems.forEach(function (x) {
      if (x.type !== 'expense') return;
      const cur = x.currency || 'RSD';
      const amt = Number(x.amount) || 0;
      expenseByCurrency[cur] = (expenseByCurrency[cur] || 0) + amt;
      if (cur === 'RSD') expenseTotalRSD += amt;
    });

    /* Diferencija (samo RSD) */
    const balanceRSD = incomeTotalRSD - expenseTotalRSD;

    /* Budžet za mesec */
    const budget = getBudgetForMonth(m);

    return {
      month: m,
      total: monthItems.length,
      incomeTotalRSD: incomeTotalRSD,
      expenseTotalRSD: expenseTotalRSD,
      balanceRSD: balanceRSD,
      incomeByCurrency: incomeByCurrency,
      expenseByCurrency: expenseByCurrency,
      budget: budget
    };
  }

  function getBudgetForMonth(monthISO) {
    const b = state.budgets.find(function (x) { return x.month === monthISO; });
    if (!b) return null;
    return b;
  }

  function setBudgetForMonth(monthISO, amount) {
    const existing = state.budgets.find(function (x) { return x.month === monthISO; });
    const amt = Number(amount) || 0;

    if (existing) {
      existing.amount = amt;
      return global.storage.save(STORE_BUDGETS, existing);
    }

    const record = {
      id: global.utils.uid('budget'),
      month: monthISO,
      amount: amt,
      createdAt: new Date().toISOString()
    };
    return global.storage.save(STORE_BUDGETS, record);
  }

  function deleteBudgetForMonth(monthISO) {
    const existing = state.budgets.find(function (x) { return x.month === monthISO; });
    if (!existing) return Promise.resolve();
    return global.storage.delete(STORE_BUDGETS, existing.id);
  }

  /* ---------- RASHODI PO KATEGORIJI ---------- */

  function computeExpenseByCategory(monthISO) {
    const m = monthISO || state.month || currentMonthISO();
    const monthItems = state.items.filter(function (x) {
      return (x.date || '').slice(0, 7) === m && x.type === 'expense';
    });

    const byCat = {};
    monthItems.forEach(function (x) {
      const cat = x.category || 'expense-other';
      if (!byCat[cat]) {
        byCat[cat] = { id: cat, total: 0, count: 0 };
      }
      byCat[cat].total += Number(x.amount) || 0;
      byCat[cat].count += 1;
    });

    /* Sortiraj po iznosu */
    const arr = Object.keys(byCat).map(function (k) { return byCat[k]; });
    arr.sort(function (a, b) { return b.total - a.total; });

    return arr;
  }

  /* ---------- RENDER ---------- */

  function renderInto(view) {
    /* Header */
    let header = view.querySelector('.module-header');
    if (!header) {
      view.innerHTML = '';
      header = buildHeader();
      view.appendChild(header);
    }

    /* Očisti sve posle headera */
    while (header.nextSibling) {
      view.removeChild(header.nextSibling);
    }

    /* Tabovi: Prihodi/Rashodi | Budžet | Izveštaj */
    const tabs = document.createElement('div');
    tabs.className = 'money-tabs';
    const tabDefs = [
      { id: 'list',    label: t('money.tab.list', 'Transakcije') },
      { id: 'budget',  label: t('money.tab.budget', 'Budžet') },
      { id: 'reports', label: t('money.tab.reports', 'Izveštaj') }
    ];
    if (!state.view) state.view = 'list';

    tabDefs.forEach(function (d) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'money-tab' + (state.view === d.id ? ' active' : '');
      btn.textContent = d.label;
      btn.addEventListener('click', function () {
        state.view = d.id;
        tabs.querySelectorAll('.money-tab').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        renderContent(view);
      });
      tabs.appendChild(btn);
    });
    view.appendChild(tabs);

    /* Sadržaj */
    const content = document.createElement('div');
    content.className = 'money-content';
    view.appendChild(content);

    renderContent(view);
    toggleFabVisibility();
  }

  function renderContent(view) {
    const content = view.querySelector('.money-content');
    if (!content) return;
    content.innerHTML = '';

    if (state.view === 'list') {
      renderListView(content);
    } else if (state.view === 'budget') {
      renderBudgetView(content);
    } else {
      renderReportsView(content);
    }
  }

  /* =========================================================
     VIEW 1 — LISTA TRANSAKCIJA
     ========================================================= */

  function renderListView(view) {
    /* Mesec nav */
    buildMonthNav(view);

    /* Sažetak */
    buildMoneySummary(view);

    /* Filteri */
    buildMoneyFilters(view);

    /* Pretraga */
    buildMoneySearch(view);

    /* Lista */
    const listWrap = document.createElement('div');
    listWrap.className = 'money-list';
    view.appendChild(listWrap);
    renderTransactionsList(listWrap);
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
        loadAll().then(function () {
          const v = document.getElementById('view-money');
          if (v) renderInto(v);
        });
      });
    });

    view.appendChild(nav);
  }

  function buildMoneySummary(view) {
    const s = computeMonthSummary();

    const box = document.createElement('div');
    box.className = 'money-summary';

    const balanceClass = s.balanceRSD >= 0 ? 'positive' : 'negative';

    box.innerHTML = [
      '<div class="money-stat income">',
      '  <div class="money-stat-label">' + t('money.stat.income', 'Prihodi') + '</div>',
      '  <div class="money-stat-value">' + formatAmount(s.incomeTotalRSD) + '</div>',
      '  <div class="money-stat-currency">RSD</div>',
      '</div>',
      '<div class="money-stat expense">',
      '  <div class="money-stat-label">' + t('money.stat.expense', 'Rashodi') + '</div>',
      '  <div class="money-stat-value">' + formatAmount(s.expenseTotalRSD) + '</div>',
      '  <div class="money-stat-currency">RSD</div>',
      '</div>',
      '<div class="money-stat balance ' + balanceClass + '">',
      '  <div class="money-stat-label">' + t('money.stat.balance', 'Razlika') + '</div>',
      '  <div class="money-stat-value">' + formatAmount(s.balanceRSD) + '</div>',
      '  <div class="money-stat-currency">RSD</div>',
      '</div>'
    ].join('');
    view.appendChild(box);

    /* Budžet indikator */
    if (s.budget && s.budget.amount > 0) {
      const used = s.expenseTotalRSD;
      const total = s.budget.amount;
      const percent = Math.min(100, Math.round((used / total) * 100));
      const over = used > total;

      const budgetBox = document.createElement('div');
      budgetBox.className = 'money-budget-indicator' + (over ? ' over' : '');
      budgetBox.innerHTML = [
        '<div class="money-budget-header">',
        '  <span>' + t('money.budget.used', 'Iskorišćen budžet') + '</span>',
        '  <span class="money-budget-percent">' + percent + '%</span>',
        '</div>',
        '<div class="money-budget-bar">',
        '  <div class="money-budget-fill" style="width: ' + percent + '%"></div>',
        '</div>',
        '<div class="money-budget-footer">',
        '  <span>' + formatAmount(used) + ' / ' + formatAmount(total) + ' RSD</span>',
        over ? '<span class="money-budget-over">' + t('money.budget.over', 'Prekoračeno') + '</span>' : '',
        '</div>'
      ].join('');
      view.appendChild(budgetBox);
    }
  }

  function buildMoneyFilters(view) {
    const filters = document.createElement('div');
    filters.className = 'bills-filters';
    const defs = [
      { id: 'all',     label: t('money.filter.all', 'Sve') },
      { id: 'income',  label: t('money.filter.income', 'Prihodi') },
      { id: 'expense', label: t('money.filter.expense', 'Rashodi') }
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
        const listWrap = view.querySelector('.money-list');
        if (listWrap) renderTransactionsList(listWrap);
      });
      filters.appendChild(btn);
    });
    view.appendChild(filters);
  }

  function buildMoneySearch(view) {
    const search = document.createElement('div');
    search.className = 'bills-search';
    search.innerHTML = [
      '<svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="20" y1="20" x2="16.65" y2="16.65"></line></svg>',
      '<input type="search" id="moneySearchInput" placeholder="' + t('money.search', 'Pretraga transakcija...') + '" value="' + global.utils.escapeHtml(state.search) + '" />'
    ].join('');
    view.appendChild(search);

    const inp = search.querySelector('#moneySearchInput');
    inp.addEventListener('input', global.utils.debounce(function () {
      state.search = inp.value.trim();
      const listWrap = view.querySelector('.money-list');
      if (listWrap) renderTransactionsList(listWrap);
    }, 180));
  }

  function renderTransactionsList(listWrap) {
    listWrap.innerHTML = '';
    const filtered = applyFilter(state.items);

    if (filtered.length === 0) {
      listWrap.innerHTML = [
        '<div class="bills-empty">',
        '  <div class="bills-empty-icon" style="background-color: rgba(34, 197, 94, 0.10); color: #22C55E;">',
        '    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v10M9 9.5a2.5 2.5 0 0 1 5 0c0 1.5-5 1.5-5 3a2.5 2.5 0 0 0 5 0"></path></svg>',
        '  </div>',
        '  <p>' + (state.search
          ? t('money.emptySearch', 'Nema rezultata.')
          : t('money.empty', 'Još uvek nemaš transakcija za ovaj mesec.')) + '</p>',
        '</div>'
      ].join('');
      return;
    }

    /* Grupisanje po datumu */
    const groups = {};
    filtered.forEach(function (x) {
      const d = x.date || '';
      if (!groups[d]) groups[d] = [];
      groups[d].push(x);
    });

    const sortedDates = Object.keys(groups).sort(function (a, b) {
      return b.localeCompare(a);
    });

    sortedDates.forEach(function (date) {
      const dateLabel = global.utils.formatDate(date);
      const wrap = document.createElement('div');
      wrap.className = 'money-group';

      const dayItems = groups[date];
      let dayIncome = 0;
      let dayExpense = 0;
      dayItems.forEach(function (x) {
        if (x.type === 'income') dayIncome += Number(x.amount) || 0;
        else dayExpense += Number(x.amount) || 0;
      });

      const header = document.createElement('div');
      header.className = 'money-group-header';
      header.innerHTML = [
        '<span class="money-group-date">' + dateLabel + '</span>',
        '<span class="money-group-totals">',
        dayIncome > 0 ? '<span class="money-day-income">+' + formatAmount(dayIncome) + '</span>' : '',
        dayExpense > 0 ? '<span class="money-day-expense">−' + formatAmount(dayExpense) + '</span>' : '',
        '</span>'
      ].join('');
      wrap.appendChild(header);

      dayItems.forEach(function (x) {
        wrap.appendChild(buildTransactionRow(x));
      });

      listWrap.appendChild(wrap);
    });
  }

  function buildTransactionRow(x) {
    const isIncome = x.type === 'income';
    const item = document.createElement('div');
    item.className = 'money-item ' + (isIncome ? 'income' : 'expense');

    /* Ikonica */
    const iconWrap = document.createElement('div');
    iconWrap.className = 'money-item-icon ' + (isIncome ? 'income' : 'expense');
    iconWrap.innerHTML = isIncome
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>';
    item.appendChild(iconWrap);

    /* Body */
    const body = document.createElement('div');
    body.className = 'money-item-body';

    const name = document.createElement('div');
    name.className = 'money-item-name';
    name.textContent = x.name || t('money.untitled', '(Bez naziva)');
    body.appendChild(name);

    const meta = document.createElement('div');
    meta.className = 'money-item-meta';
    const catName = categoryName(x.category, x.type);
    if (catName) meta.textContent = catName;
    body.appendChild(meta);

    item.appendChild(body);

    /* Amount */
    const amount = document.createElement('div');
    amount.className = 'money-item-amount ' + (isIncome ? 'income' : 'expense');
    amount.textContent = (isIncome ? '+' : '−') + formatAmount(x.amount) + ' ' + (x.currency || 'RSD');
    item.appendChild(amount);

    /* Klik na item → detalji/izmena */
    item.addEventListener('click', function () {
      openTransactionDetail(x);
    });

    return item;
  }

  /* =========================================================
     VIEW 2 — BUDŽET
     ========================================================= */

  function renderBudgetView(view) {
    /* Mesec nav */
    buildMonthNav(view);

    const s = computeMonthSummary();

    /* Trenutni budžet */
    const box = document.createElement('div');
    box.className = 'money-budget-box';

    if (s.budget && s.budget.amount > 0) {
      const used = s.expenseTotalRSD;
      const total = s.budget.amount;
      const remaining = total - used;
      const percent = Math.min(100, Math.round((used / total) * 100));
      const over = used > total;

      box.innerHTML = [
        '<div class="budget-circle">',
        '  <svg viewBox="0 0 100 100" class="budget-circle-svg">',
        '    <circle cx="50" cy="50" r="42" class="budget-circle-bg" fill="none" stroke-width="10" />',
        '    <circle cx="50" cy="50" r="42" class="budget-circle-fill' + (over ? ' over' : '') + '" fill="none" stroke-width="10" ',
        '      stroke-dasharray="' + (percent * 2.64) + ' 264" ',
        '      transform="rotate(-90 50 50)" />',
        '  </svg>',
        '  <div class="budget-circle-text">',
        '    <div class="budget-circle-percent">' + percent + '%</div>',
        '    <div class="budget-circle-label">' + t('money.budget.used', 'iskorišćeno') + '</div>',
        '  </div>',
        '</div>',
        '<div class="budget-details">',
        '  <div class="budget-row"><span>' + t('money.budget.total', 'Ukupan budžet') + '</span><strong>' + formatAmount(total) + ' RSD</strong></div>',
        '  <div class="budget-row"><span>' + t('money.budget.spent', 'Potrošeno') + '</span><strong class="budget-spent">' + formatAmount(used) + ' RSD</strong></div>',
        '  <div class="budget-row"><span>' + t('money.budget.remaining', 'Preostalo') + '</span><strong class="' + (over ? 'budget-over' : 'budget-remaining') + '">' + formatAmount(remaining) + ' RSD</strong></div>',
        '</div>'
      ].join('');

      if (over) {
        const warn = document.createElement('div');
        warn.className = 'budget-warning';
        warn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> ' +
          t('money.budget.warning', 'Prekoračili ste budžet za') + ' ' + formatAmount(used - total) + ' RSD';
        box.appendChild(warn);
      }
    } else {
      box.innerHTML = [
        '<div class="budget-empty">',
        '  <div class="budget-empty-icon">',
        '    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><line x1="7" y1="15" x2="11" y2="15"></line></svg>',
        '  </div>',
        '  <h3>' + t('money.budget.noBudget', 'Nemate postavljen budžet za ovaj mesec') + '</h3>',
        '  <p>' + t('money.budget.noBudgetHint', 'Postavite mesečni budžet da biste pratili potrošnju.') + '</p>',
        '</div>'
      ].join('');
    }

    view.appendChild(box);

    /* Dugme postavi/promeni budžet */
    const btnWrap = document.createElement('div');
    btnWrap.className = 'budget-action';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary btn-block';
    btn.textContent = (s.budget && s.budget.amount > 0)
      ? t('money.budget.change', 'Promeni budžet')
      : t('money.budget.set', 'Postavi budžet');
    btn.addEventListener('click', function () {
      openBudgetForm(s.budget);
    });
    btnWrap.appendChild(btn);
    view.appendChild(btnWrap);

    /* Top kategorije */
    const byCat = computeExpenseByCategory();
    if (byCat.length > 0) {
      const title = document.createElement('h3');
      title.className = 'money-section-title';
      title.textContent = t('money.budget.topCategories', 'Najveći rashodi ovog meseca');
      view.appendChild(title);

      const catList = document.createElement('div');
      catList.className = 'money-categories-list';
      byCat.slice(0, 5).forEach(function (c) {
        const maxTotal = byCat[0].total;
        const percent = Math.round((c.total / maxTotal) * 100);
        const row = document.createElement('div');
        row.className = 'money-cat-row';
        row.innerHTML = [
          '<div class="money-cat-name">' + categoryName(c.id, 'expense') + '</div>',
          '<div class="money-cat-bar-wrap">',
          '  <div class="money-cat-bar" style="width: ' + percent + '%"></div>',
          '</div>',
          '<div class="money-cat-amount">' + formatAmount(c.total) + '</div>'
        ].join('');
        catList.appendChild(row);
      });
      view.appendChild(catList);
    }
  }

  /* =========================================================
     VIEW 3 — IZVEŠTAJ
     ========================================================= */

  function renderReportsView(view) {
    /* Godina nav */
    const year = state.month ? Number(state.month.split('-')[0]) : new Date().getFullYear();

    const yearNav = document.createElement('div');
    yearNav.className = 'month-nav';
    yearNav.innerHTML = [
      '<button type="button" class="month-nav-btn" data-year-dir="-1">',
      '  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
      '</button>',
      '<span class="month-nav-label">' + year + '</span>',
      '<button type="button" class="month-nav-btn" data-year-dir="1">',
      '  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
      '</button>'
    ].join('');

    yearNav.querySelectorAll('.month-nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const dir = Number(btn.getAttribute('data-year-dir'));
        const newYear = year + dir;
        state.month = newYear + '-' + (state.month ? state.month.split('-')[1] : '01');
        const v = document.getElementById('view-money');
        if (v) renderInto(v);
      });
    });
    view.appendChild(yearNav);

    /* Godišnji pregled */
    const yearStr = String(year);
    const yearItems = state.items.filter(function (x) {
      return (x.date || '').slice(0, 4) === yearStr;
    });

    let yearIncome = 0;
    let yearExpense = 0;
    yearItems.forEach(function (x) {
      if (x.type === 'income') yearIncome += Number(x.amount) || 0;
      else yearExpense += Number(x.amount) || 0;
    });
    const yearBalance = yearIncome - yearExpense;

    const summary = document.createElement('div');
    summary.className = 'report-summary';
    summary.innerHTML = [
      '<div class="report-stat">',
      '  <div class="report-stat-label">' + t('money.stat.yearIncome', 'Godišnji prihodi') + '</div>',
      '  <div class="report-stat-value income">' + formatAmount(yearIncome) + ' RSD</div>',
      '</div>',
      '<div class="report-stat">',
      '  <div class="report-stat-label">' + t('money.stat.yearExpense', 'Godišnji rashodi') + '</div>',
      '  <div class="report-stat-value expense">' + formatAmount(yearExpense) + ' RSD</div>',
      '</div>',
      '<div class="report-stat">',
      '  <div class="report-stat-label">' + t('money.stat.yearBalance', 'Razlika') + '</div>',
      '  <div class="report-stat-value ' + (yearBalance >= 0 ? 'positive' : 'negative') + '">' + formatAmount(yearBalance) + ' RSD</div>',
      '</div>'
    ].join('');
    view.appendChild(summary);

    /* Grafikon po mesecima (12 meseci) */
    const chartTitle = document.createElement('h3');
    chartTitle.className = 'money-section-title';
    chartTitle.textContent = t('money.report.monthlyChart', 'Mesečni pregled') + ' ' + year;
    view.appendChild(chartTitle);

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const mStr = yearStr + '-' + String(m).padStart(2, '0');
      const monthItems = state.items.filter(function (x) {
        return (x.date || '').slice(0, 7) === mStr;
      });
      let inc = 0;
      let exp = 0;
      monthItems.forEach(function (x) {
        if (x.type === 'income') inc += Number(x.amount) || 0;
        else exp += Number(x.amount) || 0;
      });
      months.push({ month: m, income: inc, expense: exp });
    }

    const maxVal = Math.max.apply(null, months.map(function (x) {
      return Math.max(x.income, x.expense);
    }).concat([1]));

    const chart = document.createElement('div');
    chart.className = 'report-chart';

    const locale = lang() === 'en' ? 'en-GB' : 'sr-RS';
    months.forEach(function (m) {
      const d = new Date(year, m.month - 1, 1);
      const label = d.toLocaleDateString(locale, { month: 'short' });

      const incHeight = maxVal > 0 ? (m.income / maxVal) * 100 : 0;
      const expHeight = maxVal > 0 ? (m.expense / maxVal) * 100 : 0;

      const bar = document.createElement('div');
      bar.className = 'report-chart-month';
      bar.innerHTML = [
        '<div class="report-chart-bars">',
        '  <div class="report-bar income" style="height: ' + incHeight + '%" title="' + formatAmount(m.income) + '"></div>',
        '  <div class="report-bar expense" style="height: ' + expHeight + '%" title="' + formatAmount(m.expense) + '"></div>',
        '</div>',
        '<div class="report-chart-label">' + label + '</div>'
      ].join('');
      chart.appendChild(bar);
    });
    view.appendChild(chart);

    /* Legenda */
    const legend = document.createElement('div');
    legend.className = 'report-legend';
    legend.innerHTML = [
      '<span><span class="legend-dot income"></span>' + t('money.stat.income', 'Prihodi') + '</span>',
      '<span><span class="legend-dot expense"></span>' + t('money.stat.expense', 'Rashodi') + '</span>'
    ].join('');
    view.appendChild(legend);

    /* Rashodi po kategorijama za godinu */
    const catTitle = document.createElement('h3');
    catTitle.className = 'money-section-title';
    catTitle.textContent = t('money.report.byCategory', 'Rashodi po kategorijama') + ' ' + year;
    view.appendChild(catTitle);

    const byCat = {};
    yearItems.forEach(function (x) {
      if (x.type !== 'expense') return;
      const cat = x.category || 'expense-other';
      if (!byCat[cat]) byCat[cat] = 0;
      byCat[cat] += Number(x.amount) || 0;
    });

    const arr = Object.keys(byCat).map(function (k) {
      return { id: k, total: byCat[k] };
    }).sort(function (a, b) { return b.total - a.total; });

    if (arr.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-muted text-sm';
      empty.style.textAlign = 'center';
      empty.textContent = t('money.report.noData', 'Nema podataka za ovu godinu.');
      view.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'money-categories-list';
      const maxTotal = arr[0].total;
      arr.forEach(function (c) {
        const percent = Math.round((c.total / maxTotal) * 100);
        const row = document.createElement('div');
        row.className = 'money-cat-row';
        row.innerHTML = [
          '<div class="money-cat-name">' + categoryName(c.id, 'expense') + '</div>',
          '<div class="money-cat-bar-wrap">',
          '  <div class="money-cat-bar" style="width: ' + percent + '%"></div>',
          '</div>',
          '<div class="money-cat-amount">' + formatAmount(c.total) + '</div>'
        ].join('');
        list.appendChild(row);
      });
      view.appendChild(list);
    }
  }  /* =========================================================
     FORMA — TRANSAKCIJA
     ========================================================= */

  let formOverlay = null;

  function openTransactionForm(existing, type) {
    if (formOverlay) return;
    state.editingId = existing ? existing.id : null;

    const isEdit = !!existing;
    const item = existing ? Object.assign({}, existing) : {
      name: '',
      type: type || 'expense',
      category: '',
      amount: '',
      currency: 'RSD',
      date: global.utils.todayISO(),
      note: '',
      paymentMethod: ''
    };

    formOverlay = document.createElement('div');
    formOverlay.className = 'modal-overlay';
    formOverlay.setAttribute('role', 'dialog');

    formOverlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title">' + (isEdit
        ? t('money.edit', 'Izmeni transakciju')
        : t('money.new', 'Nova transakcija')) + '</h3>',
      '  <form id="moneyForm" novalidate>',

      /* Tip */
      '    <div class="form-group">',
      '      <label class="label">' + t('money.field.type', 'Tip') + ' *</label>',
      '      <div class="money-type-toggle" id="typeToggle">',
      '        <button type="button" class="money-type-btn' + (item.type === 'expense' ? ' active' : '') + '" data-type="expense">',
      '          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>',
      '          <span>' + t('money.type.expense', 'Rashod') + '</span>',
      '        </button>',
      '        <button type="button" class="money-type-btn' + (item.type === 'income' ? ' active' : '') + '" data-type="income">',
      '          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>',
      '          <span>' + t('money.type.income', 'Prihod') + '</span>',
      '        </button>',
      '      </div>',
      '    </div>',

      /* Iznos + valuta */
      '    <div class="amount-row">',
      '      <div class="form-group">',
      '        <label class="label">' + t('money.field.amount', 'Iznos') + ' *</label>',
      '        <input class="input" type="text" inputmode="decimal" name="amount" required value="' + global.utils.escapeHtml(String(item.amount || '')) + '" placeholder="0,00" />',
      '      </div>',
      '      <div class="form-group currency-select">',
      '        <label class="label">' + t('money.field.currency', 'Valuta') + '</label>',
      '        <select class="select" name="currency">',
      '          ' + global.currencies.getAll().map(function (c) {
              const selected = (item.currency || 'RSD') === c.code ? ' selected' : '';
              const label = c.flag + ' ' + c.code + ' — ' + (lang() === 'en' ? c.name_en : c.name_sr);
              return '<option value="' + c.code + '"' + selected + '>' + global.utils.escapeHtml(label) + '</option>';
            }).join(''),
      '        </select>',
      '      </div>',
      '    </div>',

      /* Naziv */
      '    <div class="form-group">',
      '      <label class="label">' + t('money.field.name', 'Naziv') + ' *</label>',
      '      <input class="input" type="text" name="name" required value="' + global.utils.escapeHtml(item.name || '') + '" placeholder="' + t('money.field.namePlaceholder', 'npr. Plata za oktobar') + '" />',
      '    </div>',

      /* Kategorija */
      '    <div class="form-group">',
      '      <label class="label">' + t('money.field.category', 'Kategorija') + '</label>',
      '      <select class="select" name="category" id="categorySelect"></select>',
      '    </div>',

      /* Datum */
      '    <div class="form-group">',
      '      <label class="label">' + t('money.field.date', 'Datum') + ' *</label>',
      global.utils.dateInputHTML('date', item.date || global.utils.todayISO(), { required: true }),
      '    </div>',

      /* Način plaćanja */
      '    <div class="form-group">',
      '      <label class="label">' + t('money.field.paymentMethod', 'Način plaćanja') + '</label>',
      '      <select class="select" name="paymentMethod">',
      '        <option value="">' + t('money.payment.none', '— Nije određeno —') + '</option>',
      '        <option value="cash"' + (item.paymentMethod === 'cash' ? ' selected' : '') + '>' + t('money.payment.cash', 'Gotovina') + '</option>',
      '        <option value="card"' + (item.paymentMethod === 'card' ? ' selected' : '') + '>' + t('money.payment.card', 'Kartica') + '</option>',
      '        <option value="transfer"' + (item.paymentMethod === 'transfer' ? ' selected' : '') + '>' + t('money.payment.transfer', 'Prenos') + '</option>',
      '        <option value="check"' + (item.paymentMethod === 'check' ? ' selected' : '') + '>' + t('money.payment.check', 'Ček') + '</option>',
      '        <option value="other"' + (item.paymentMethod === 'other' ? ' selected' : '') + '>' + t('money.payment.other', 'Ostalo') + '</option>',
      '      </select>',
      '    </div>',

      /* Napomena */
      '    <div class="form-group">',
      '      <label class="label">' + t('money.field.note', 'Napomena') + '</label>',
      '      <textarea class="textarea" name="note">' + global.utils.escapeHtml(item.note || '') + '</textarea>',
      '    </div>',

      '    <div class="form-error" id="moneyFormError"></div>',
      '    <div class="modal-actions">',
      '      <button type="button" class="btn btn-secondary" id="moneyCancel">' + t('common.cancel', 'Otkaži') + '</button>',
      '      <button type="submit" class="btn btn-primary">' + t('common.save', 'Sačuvaj') + '</button>',
      '    </div>',
      '  </form>',
      '</div>'
    ].join('');

    document.body.appendChild(formOverlay);
    global.utils.bindDateInputs(formOverlay);

    /* Kategorije — dinamičke */
    let currentType = item.type || 'expense';
    const categorySelect = formOverlay.querySelector('#categorySelect');

    function refreshCategories() {
      const cats = getAllCategories(currentType);
      categorySelect.innerHTML = '<option value="">' + t('money.field.noCategory', '— Bez kategorije —') + '</option>' +
        cats.map(function (c) {
          const name = lang() === 'en' ? (c.name_en || c.name_sr) : (c.name_sr || c.name_en);
          const selected = item.category === c.id ? ' selected' : '';
          return '<option value="' + c.id + '"' + selected + '>' + global.utils.escapeHtml(name) + '</option>';
        }).join('');
    }
    refreshCategories();

    /* Type toggle */
    const typeBtns = formOverlay.querySelectorAll('.money-type-btn');
    typeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentType = btn.getAttribute('data-type');
        typeBtns.forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        /* Reset kategorije pri promeni tipa */
        item.category = '';
        refreshCategories();
      });
    });

    formOverlay.querySelector('#moneyCancel').addEventListener('click', closeForm);
    formOverlay.addEventListener('click', function (e) {
      if (e.target === formOverlay) closeForm();
    });
    formOverlay.querySelector('#moneyForm').addEventListener('submit', function (e) {
      e.preventDefault();
      submitTransactionForm(formOverlay, currentType);
    });

    requestAnimationFrame(function () {
      formOverlay.classList.add('show');
    });
  }

  function submitTransactionForm(overlay, currentType) {
    const form = overlay.querySelector('#moneyForm');
    const errEl = overlay.querySelector('#moneyFormError');
    errEl.textContent = '';

    const dateValue = global.utils.getDateValue(overlay, 'date');

    const data = {
      type: currentType,
      name: form.name.value.trim(),
      amount: global.utils.parseAmount(form.amount.value),
      currency: form.currency.value || 'RSD',
      category: form.category.value,
      date: dateValue,
      note: form.note.value.trim(),
      paymentMethod: form.paymentMethod.value
    };

    if (!data.name) {
      errEl.textContent = t('money.err.name', 'Naziv je obavezan.');
      return;
    }
    if (!data.amount || data.amount <= 0) {
      errEl.textContent = t('money.err.amount', 'Iznos mora biti veći od 0.');
      return;
    }
    if (!data.date) {
      errEl.textContent = t('money.err.date', 'Datum je obavezan.');
      return;
    }

    let record;
    if (state.editingId) {
      const existing = state.items.find(function (x) { return x.id === state.editingId; });
      if (!existing) return;
      record = Object.assign({}, existing, data);
    } else {
      record = Object.assign({
        id: global.utils.uid('tx'),
        createdAt: new Date().toISOString()
      }, data);
    }

    global.storage.save(STORE, record).then(function () {
      closeForm();
      loadAll().then(function () {
        const view = document.getElementById('view-money');
        if (view) renderInto(view);
        if (global.home) global.home.refresh();
      });
    }).catch(function (err) {
      errEl.textContent = (err && err.message) ? err.message : t('common.error', 'Greška.');
    });
  }

  /* =========================================================
     FORMA — BUDŽET
     ========================================================= */

  function openBudgetForm(existing) {
    if (formOverlay) return;

    const month = state.month || currentMonthISO();
    const item = existing || { amount: '' };

    formOverlay = document.createElement('div');
    formOverlay.className = 'modal-overlay';
    formOverlay.setAttribute('role', 'dialog');

    formOverlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title">' + (existing ? t('money.budget.edit', 'Izmeni budžet') : t('money.budget.set', 'Postavi budžet')) + '</h3>',
      '  <p class="text-muted text-sm" style="margin-bottom: 1rem;">' + t('money.budget.forMonth', 'Budžet za') + ' <strong>' + monthLabel(month) + '</strong></p>',
      '  <form id="budgetForm" novalidate>',
      '    <div class="form-group">',
      '      <label class="label">' + t('money.budget.amount', 'Mesečni budžet') + ' (RSD) *</label>',
      '      <input class="input" type="text" inputmode="decimal" name="amount" required value="' + global.utils.escapeHtml(String(item.amount || '')) + '" placeholder="0,00" />',
      '    </div>',
      '    <p class="form-hint">' + t('money.budget.hint', 'Ovaj iznos predstavlja maksimum koji želite da potrošite u mesecu.') + '</p>',
      '    <div class="form-error" id="budgetFormError"></div>',
      '    <div class="modal-actions">',
      '      <button type="button" class="btn btn-secondary" id="budgetCancel">' + t('common.cancel', 'Otkaži') + '</button>',
      '      <button type="submit" class="btn btn-primary">' + t('common.save', 'Sačuvaj') + '</button>',
      '    </div>',
      existing ? '    <button type="button" class="btn btn-danger btn-block" id="budgetDelete" style="margin-top: 0.5rem;">' + t('money.budget.remove', 'Ukloni budžet') + '</button>' : '',
      '  </form>',
      '</div>'
    ].join('');

    document.body.appendChild(formOverlay);

    formOverlay.querySelector('#budgetCancel').addEventListener('click', closeForm);
    formOverlay.addEventListener('click', function (e) {
      if (e.target === formOverlay) closeForm();
    });
    formOverlay.querySelector('#budgetForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const amount = global.utils.parseAmount(formOverlay.querySelector('input[name="amount"]').value);
      const errEl = formOverlay.querySelector('#budgetFormError');
      if (!amount || amount <= 0) {
        errEl.textContent = t('money.err.budgetAmount', 'Budžet mora biti veći od 0.');
        return;
      }
      setBudgetForMonth(month, amount).then(function () {
        closeForm();
        loadAll().then(function () {
          const view = document.getElementById('view-money');
          if (view) renderInto(view);
        });
      });
    });

    const deleteBtn = formOverlay.querySelector('#budgetDelete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        const ok = global.confirm(t('money.budget.removeConfirm', 'Ukloniti budžet za ovaj mesec?'));
        if (!ok) return;
        deleteBudgetForMonth(month).then(function () {
          closeForm();
          loadAll().then(function () {
            const view = document.getElementById('view-money');
            if (view) renderInto(view);
          });
        });
      });
    }

    requestAnimationFrame(function () {
      formOverlay.classList.add('show');
    });
  }

  /* =========================================================
     DETALJI TRANSAKCIJE
     ========================================================= */

  function openTransactionDetail(x) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const isIncome = x.type === 'income';
    const catName = categoryName(x.category, x.type);

    overlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title">' + global.utils.escapeHtml(x.name || '') + '</h3>',
      '  <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">',
      '    <span class="money-item-amount ' + (isIncome ? 'income' : 'expense') + '" style="font-size: 1.1rem;">' + (isIncome ? '+' : '−') + formatAmount(x.amount) + ' ' + (x.currency || 'RSD') + '</span>',
      '    <span class="rem-category-chip">' + (isIncome ? t('money.type.income', 'Prihod') : t('money.type.expense', 'Rashod')) + '</span>',
      '  </div>',
      x.date ? '  <div class="detail-row"><span class="detail-label">' + t('money.field.date', 'Datum') + '</span><span class="detail-value">' + global.utils.formatDate(x.date) + '</span></div>' : '',
      catName ? '  <div class="detail-row"><span class="detail-label">' + t('money.field.category', 'Kategorija') + '</span><span class="detail-value">' + global.utils.escapeHtml(catName) + '</span></div>' : '',
      x.paymentMethod ? '  <div class="detail-row"><span class="detail-label">' + t('money.field.paymentMethod', 'Način plaćanja') + '</span><span class="detail-value">' + t('money.payment.' + x.paymentMethod, x.paymentMethod) + '</span></div>' : '',
      x.note ? '  <div class="detail-row" style="flex-direction: column; align-items: flex-start;"><span class="detail-label">' + t('money.field.note', 'Napomena') + '</span><span class="detail-value" style="text-align: left;">' + global.utils.escapeHtml(x.note) + '</span></div>' : '',
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-secondary" id="txDetailClose">' + t('common.close', 'Zatvori') + '</button>',
      '    <button type="button" class="btn btn-secondary" id="txDetailEdit" style="color: var(--color-brand);">' + t('common.edit', 'Izmeni') + '</button>',
      '    <button type="button" class="btn btn-danger" id="txDetailDelete">' + t('common.delete', 'Obriši') + '</button>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    overlay.querySelector('#txDetailClose').addEventListener('click', function () {
      document.body.removeChild(overlay);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
    overlay.querySelector('#txDetailEdit').addEventListener('click', function () {
      document.body.removeChild(overlay);
      openTransactionForm(x);
    });
    overlay.querySelector('#txDetailDelete').addEventListener('click', function () {
      const ok = global.confirm(t('money.deleteConfirm', 'Obrisati ovu transakciju?'));
      if (!ok) return;
      global.storage.delete(STORE, x.id).then(function () {
        document.body.removeChild(overlay);
        loadAll().then(function () {
          const view = document.getElementById('view-money');
          if (view) renderInto(view);
          if (global.home) global.home.refresh();
        });
      });
    });

    requestAnimationFrame(function () {
      overlay.classList.add('show');
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

  /* =========================================================
     FAB
     ========================================================= */

  function buildFAB() {
    let fab = document.getElementById('moneyFab');
    if (!fab) {
      fab = document.createElement('button');
      fab.type = 'button';
      fab.id = 'moneyFab';
      fab.className = 'fab-bills';
      fab.style.backgroundColor = '#22C55E';
      document.body.appendChild(fab);
    }
    fab.setAttribute('aria-label', t('money.add', 'Dodaj transakciju'));
    fab.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
    fab.onclick = function () { openTransactionForm(null, 'expense'); };
  }

  function toggleFabVisibility() {
    const fab = document.getElementById('moneyFab');
    if (!fab) return;
    const route = global.router && global.router.current ? global.router.current() : 'home';
    /* FAB se prikazuje samo na tabu "list" */
    fab.style.display = (route === 'money' && state.view === 'list') ? '' : 'none';
  }

  /* =========================================================
     HEADER
     ========================================================= */

  function buildHeader() {
    const header = document.createElement('div');
    header.className = 'module-header';
    header.innerHTML = [
      '<div class="module-title-wrap">',
      '  <button type="button" class="back-btn" id="moneyBack" aria-label="' + t('common.back', 'Nazad') + '">',
      '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
      '  </button>',
      '  <div class="module-icon color-green" aria-hidden="true" style="width:38px;height:38px;">',
      '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v10M9 9.5a2.5 2.5 0 0 1 5 0c0 1.5-5 1.5-5 3a2.5 2.5 0 0 0 5 0"></path></svg>',
      '  </div>',
      '  <div>',
      '    <h2>' + t('money.title', 'Novac') + '</h2>',
      '    <p class="text-muted text-sm">' + t('money.subtitle', 'Prihodi, rashodi i budžet.') + '</p>',
      '  </div>',
      '</div>',
      '<button type="button" class="icon-btn" data-module-lock="money" title="' + t('pin.lock', 'Zaključaj') + '">',
      '  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>',
      '</button>'
    ].join('');

    const backBtn = header.querySelector('#moneyBack');
    backBtn.addEventListener('click', function () {
      global.router.navigate('home');
    });

    return header;
  }

  /* =========================================================
     INIT
     ========================================================= */

  function init() {
    if (!state.month) state.month = currentMonthISO();
    if (!state.view) state.view = 'list';

    const view = document.getElementById('view-money');
    if (view && !view.querySelector('.module-header')) {
      view.innerHTML = '';
      view.appendChild(buildHeader());
    }

    loadAll().then(function () {
      const v = document.getElementById('view-money');
      if (v) {
        renderInto(v);
        buildFAB();
        toggleFabVisibility();
      }
    });

    global.addEventListener('alatikapro:langchange', function () {
      const v = document.getElementById('view-money');
      if (v) {
        v.innerHTML = '';
        v.appendChild(buildHeader());
        renderInto(v);
        buildFAB();
        if (global.home && global.home.bindModuleLocks) global.home.bindModuleLocks();
      }
    });

    if (global.router && global.router.onRouteChange) {
      global.router.onRouteChange(function (route) {
        toggleFabVisibility();
        if (route === 'money') {
          const v = document.getElementById('view-money');
          if (v) {
            if (!v.querySelector('.module-header')) {
              v.innerHTML = '';
              v.appendChild(buildHeader());
            }
            loadAll().then(function () {
              renderInto(v);
              buildFAB();
              toggleFabVisibility();
            });
          }
        }
      });
    }
  }

  /* =========================================================
     API ZA DRUGE MODULE
     ========================================================= */

  /**
   * Kreira rashod na osnovu plaćenog računa.
   * Poziva se iz modula Računi kada korisnik čekira "Plaćeno".
   */
  function createExpenseFromBill(bill) {
    const record = {
      id: global.utils.uid('tx'),
      type: 'expense',
      name: bill.name || bill.vendor || t('money.fromBill', 'Račun'),
      amount: Number(bill.amount) || 0,
      currency: bill.currency || 'RSD',
      category: 'utilities',
      date: bill.paidDate || global.utils.todayISO(),
      note: t('money.fromBillNote', 'Automatski kreirano iz plaćenog računa') + ': ' + (bill.name || ''),
      paymentMethod: '',
      linkedBillId: bill.id,
      createdAt: new Date().toISOString()
    };
    return global.storage.save(STORE, record);
  }

  global.money = {
    init: init,
    loadAll: loadAll,
    createExpenseFromBill: createExpenseFromBill,
    INCOME_CATEGORIES: INCOME_CATEGORIES.slice(),
    EXPENSE_CATEGORIES: EXPENSE_CATEGORIES.slice(),
    getAllCategories: getAllCategories,
    addCustomCategory: addCustomCategory
  };
})(window);
