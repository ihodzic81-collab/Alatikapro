/* =========================================================
   ALATIKA PRO — home.js
   Logika Početne strane:
   - Pozdrav i datum
   - 4 kompaktne kartice modula (u jednom redu)
   - 4 interaktivna vidžeta: Današnje obaveze, Računi na
     čekanju, Budžet ovog meseca, Kursna lista
   - Brze akcije
   ========================================================= */

(function (global) {
  'use strict';

  function t(key, fallback) {
    return (global.i18n && global.i18n.t) ? global.i18n.t(key, fallback) : (fallback || key);
  }

  function tr(key, fallback) {
    return t(key, fallback);
  }

  /* ---------- POZDRAV I DATUM ---------- */

  function renderGreeting() {
    const helloEl = document.getElementById('homeHello');
    const dateEl = document.getElementById('homeDate');
    if (!helloEl || !dateEl) return;

    const hour = new Date().getHours();
    let key = 'home.greet.day';
    if (hour < 5) key = 'home.greet.night';
    else if (hour < 11) key = 'home.greet.morning';
    else if (hour < 18) key = 'home.greet.day';
    else key = 'home.greet.evening';

    helloEl.textContent = tr(key, 'Zdravo!');

    const lang = (global.i18n && global.i18n.getLang) ? global.i18n.getLang() : 'sr';
    const locale = lang === 'en' ? 'en-GB' : 'sr-RS';
    const d = new Date();
    const formatted = d.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  /* ---------- KARTICE MODULA ---------- */

  const MODULE_DEFS = [
    {
      key: 'reminders',
      route: 'reminders',
      iconColor: 'reminders',
      titleKey: 'nav.reminders',
      titleFallback: 'Podsetnici',
      icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>'
    },
    {
      key: 'bills',
      route: 'bills',
      iconColor: 'bills',
      titleKey: 'nav.bills',
      titleFallback: 'Računi',
      icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6"></path><path d="M9 13h6M9 17h6"></path></svg>'
    },
    {
      key: 'items',
      route: 'items',
      iconColor: 'items',
      titleKey: 'nav.items',
      titleFallback: 'Moje stvari',
      icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'
    },
    {
      key: 'money',
      route: 'money',
      iconColor: 'money',
      titleKey: 'nav.money',
      titleFallback: 'Novac',
      icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v10M9 9.5a2.5 2.5 0 0 1 5 0c0 1.5-5 1.5-5 3a2.5 2.5 0 0 0 5 0"></path></svg>'
    }
  ];

  const LOCK_SVG =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>';

  function renderModuleCards() {
    const wrap = document.getElementById('homeCards');
    if (!wrap) return;
    wrap.innerHTML = '';

    MODULE_DEFS.forEach(function (mod) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'module-card mc-compact';
      btn.setAttribute('data-module', mod.key);

      const locked = global.pin && global.pin.isModuleLocked(mod.key) ? true : false;

      btn.innerHTML = [
        '<span class="mc-icon ' + mod.iconColor + '" aria-hidden="true">' + mod.icon + '</span>',
        '<span class="mc-title">' + tr(mod.titleKey, mod.titleFallback) + '</span>',
        locked ? '<span class="mc-lock" aria-hidden="true">' + LOCK_SVG + '</span>' : ''
      ].join('');

      btn.addEventListener('click', function () {
        openModule(mod.key);
      });

      wrap.appendChild(btn);
    });
  }

  function openModule(moduleKey) {
    const routeMap = {
      reminders: 'reminders',
      bills: 'bills',
      items: 'items',
      money: 'money'
    };
    const route = routeMap[moduleKey] || moduleKey;

    if (!global.pin || !global.pin.isModuleLocked(moduleKey)) {
      global.router.navigate(route);
      return;
    }

    if (global.pin.isUnlockedThisSession(moduleKey)) {
      global.router.navigate(route);
      return;
    }

    if (global.pinUI && global.pinUI.promptUnlock) {
      global.pinUI.promptUnlock(moduleKey, function () {
        global.pin.markUnlocked(moduleKey);
        global.router.navigate(route);
      });
    } else {
      global.router.navigate(route);
    }
  }

  /* ---------- VIDŽETI (4 komada) ---------- */

  function renderWidgets() {
    const wrap = document.getElementById('homeWidgets');
    if (!wrap) return;
    wrap.innerHTML = '';

    /* 1. Današnje obaveze */
    renderTodayWidget(wrap);

    /* 2. Računi na čekanju */
    renderPendingBillsWidget(wrap);

    /* 3. Budžet ovog meseca */
    renderBudgetWidget(wrap);

    /* 4. Kursna lista */
    renderRatesWidget(wrap);
  }

  /* --- 1. Današnje obaveze --- */
  function renderTodayWidget(parent) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'home-widget hw-reminders';

    let count = 0;
    let label = tr('home.today.empty', 'Nema obaveza za danas.');

    if (global.reminders && global.reminders.loadAll) {
      /* Sinhrono ne možemo, ali koristimo keš iz state-a ako postoji */
    }

    /* Čitamo iz storage-a sinhrono preko lsGet? Ne — koristimo već učitane liste
       iz modula. Ako nisu učitane, prikazujemo 0. */
    const reminders = (global.reminders && global.reminders._state && global.reminders._state.items) || [];

    const today = global.utils.todayISO();
    const todayItems = reminders.filter(function (r) {
      if (r.done) return false;
      const eff = global.reminders.effectiveDate ? global.reminders.effectiveDate(r) : r.date;
      return eff === today;
    });

    count = todayItems.length;
    if (count > 0) {
      label = count + ' ' + (count === 1 ? tr('home.widget.task', 'obaveza') : tr('home.widget.tasks', 'obaveza')) + ' ' + tr('home.widget.forToday', 'za danas');
    }

    card.innerHTML = [
      '<span class="hw-icon hw-icon-reminders" aria-hidden="true">',
      '  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>',
      '</span>',
      '<span class="hw-body">',
      '  <span class="hw-label">' + tr('home.widget.todayTitle', 'Današnje obaveze') + '</span>',
      '  <span class="hw-value">' + label + '</span>',
      '</span>',
      '<span class="hw-arrow" aria-hidden="true">',
      '  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
      '</span>'
    ].join('');

    card.addEventListener('click', function () {
      global.router.navigate('reminders');
    });

    parent.appendChild(card);
  }

  /* --- 2. Računi na čekanju --- */
  function renderPendingBillsWidget(parent) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'home-widget hw-bills';

    const bills = (global.bills && global.bills._state && global.bills._state.items) || [];
    const currentMonth = (function () {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    })();

    const pending = bills.filter(function (b) {
      return !b.paid && (b.month || '') === currentMonth;
    });

    let value = tr('home.widget.noBills', 'Nema računa na čekanju.');
    if (pending.length > 0) {
      /* Zbir po valuti — prikaži prvi */
      const byCur = {};
      pending.forEach(function (b) {
        const cur = b.currency || 'RSD';
        byCur[cur] = (byCur[cur] || 0) + (Number(b.amount) || 0);
      });
      const parts = Object.keys(byCur).map(function (cur) {
        const flag = global.currencies ? global.currencies.getFlag(cur) : '';
        return flag + ' ' + byCur[cur].toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + cur;
      });
      value = pending.length + ' · ' + parts.join(' · ');
    }

    card.innerHTML = [
      '<span class="hw-icon hw-icon-bills" aria-hidden="true">',
      '  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6"></path><path d="M9 13h6M9 17h6"></path></svg>',
      '</span>',
      '<span class="hw-body">',
      '  <span class="hw-label">' + tr('home.widget.billsTitle', 'Računi na čekanju') + '</span>',
      '  <span class="hw-value">' + value + '</span>',
      '</span>',
      '<span class="hw-arrow" aria-hidden="true">',
      '  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
      '</span>'
    ].join('');

    card.addEventListener('click', function () {
      global.router.navigate('bills');
    });

    parent.appendChild(card);
  }

  /* --- 3. Budžet ovog meseca --- */
  function renderBudgetWidget(parent) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'home-widget hw-money';

    const transactions = (global.money && global.money._state && global.money._state.items) || [];
    const budgets = (global.money && global.money._state && global.money._state.budgets) || [];

    const currentMonth = (function () {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    })();

    const monthExpenses = transactions.filter(function (x) {
      return x.type === 'expense' && (x.date || '').slice(0, 7) === currentMonth;
    });

    const totalExpenses = monthExpenses.reduce(function (sum, x) {
      return sum + (Number(x.amount) || 0);
    }, 0);

    const budget = budgets.find(function (b) { return b.month === currentMonth; });

    let value = tr('home.widget.noBudget', 'Budžet nije postavljen.');
    if (budget && budget.amount > 0) {
      const percent = Math.min(100, Math.round((totalExpenses / budget.amount) * 100));
      value = percent + '% · ' +
        totalExpenses.toLocaleString('sr-RS', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' / ' +
        Number(budget.amount).toLocaleString('sr-RS', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' RSD';
    } else {
      value = totalExpenses.toLocaleString('sr-RS', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' RSD ' + tr('home.widget.spent', 'potrošeno');
    }

    card.innerHTML = [
      '<span class="hw-icon hw-icon-money" aria-hidden="true">',
      '  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v10M9 9.5a2.5 2.5 0 0 1 5 0c0 1.5-5 1.5-5 3a2.5 2.5 0 0 0 5 0"></path></svg>',
      '</span>',
      '<span class="hw-body">',
      '  <span class="hw-label">' + tr('home.widget.budgetTitle', 'Budžet ovog meseca') + '</span>',
      '  <span class="hw-value">' + value + '</span>',
      '</span>',
      '<span class="hw-arrow" aria-hidden="true">',
      '  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
      '</span>'
    ].join('');

    card.addEventListener('click', function () {
      global.router.navigate('money');
    });

    parent.appendChild(card);
  }

  /* --- 4. Kursna lista (mini) --- */
  function renderRatesWidget(parent) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'home-widget hw-rates';

    card.innerHTML = [
      '<span class="hw-icon hw-icon-rates" aria-hidden="true">',
      '  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
      '</span>',
      '<span class="hw-body">',
      '  <span class="hw-label">' + tr('home.rates', 'Kursna lista') + '</span>',
      '  <span class="hw-value" id="hwRatesValue">' + tr('rates.loading', 'Učitavanje...') + '</span>',
      '</span>',
      '<span class="hw-arrow" aria-hidden="true">',
      '  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
      '</span>'
    ].join('');

    card.addEventListener('click', function () {
      global.router.navigate('money');
    });

    parent.appendChild(card);

    /* Popuni vrednost iz NBS */
    if (global.nbs) {
      global.nbs.getRates().then(function () {
        const valueEl = document.getElementById('hwRatesValue');
        if (!valueEl) return;
        const eur = global.nbs.getRate('EUR');
        const usd = global.nbs.getRate('USD');
        if (!eur) {
          valueEl.textContent = tr('rates.unavailable', 'Kurs nije dostupan.');
          return;
        }
        const parts = [];
        if (eur) parts.push('EUR ' + eur.toFixed(2));
        if (usd) parts.push('USD ' + usd.toFixed(2));
        valueEl.textContent = parts.join(' · ') + ' RSD';
      }).catch(function () {
        const valueEl = document.getElementById('hwRatesValue');
        if (valueEl) valueEl.textContent = tr('rates.unavailable', 'Kurs nije dostupan.');
      });
    } else {
      const valueEl = document.getElementById('hwRatesValue');
      if (valueEl) valueEl.textContent = tr('rates.unavailable', 'Kurs nije dostupan.');
    }
  }

  /* ---------- BRZE AKCIJE ---------- */

  const QUICK_ACTIONS = [
    {
      key: 'add-reminder',
      labelKey: 'home.action.addReminder',
      labelFallback: 'Novi podsetnik',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
    },
    {
      key: 'add-bill',
      labelKey: 'home.action.addBill',
      labelFallback: 'Novi račun',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
    },
    {
      key: 'add-item',
      labelKey: 'home.action.addItem',
      labelFallback: 'Novi dokument',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
    },
    {
      key: 'add-money',
      labelKey: 'home.action.addMoney',
      labelFallback: 'Nova transakcija',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
    }
  ];

  function renderQuickActions() {
    const wrap = document.getElementById('homeActions');
    if (!wrap) return;
    wrap.innerHTML = '';

    QUICK_ACTIONS.forEach(function (action) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quick-action';
      btn.setAttribute('data-action', action.key);
      btn.innerHTML = [
        '<span class="qa-icon" aria-hidden="true">' + action.icon + '</span>',
        '<span class="qa-label">' + tr(action.labelKey, action.labelFallback) + '</span>'
      ].join('');

      btn.addEventListener('click', function () {
        handleQuickAction(action.key);
      });

      wrap.appendChild(btn);
    });
  }

  function handleQuickAction(key) {
    const routeByAction = {
      'add-reminder': 'reminders',
      'add-bill': 'bills',
      'add-item': 'items',
      'add-money': 'money'
    };
    const r = routeByAction[key];
    if (r) global.router.navigate(r);
  }

  /* ---------- DANAŠNJI PREGLED (zadržan zbog kompatibilnosti) ---------- */

  function renderToday() {
    /* Ništa — zamenjeno vidžetima. */
  }

  /* ---------- TOAST ---------- */

  let toastTimer = null;

  function showToast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('show');
    }, 2400);
  }

  /* ---------- ZAKLJUČAVANJE ---------- */

  function bindModuleLockButtons() {
    const buttons = document.querySelectorAll('[data-module-lock]');
    buttons.forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';

      btn.addEventListener('click', function () {
        const moduleName = btn.getAttribute('data-module-lock');
        if (!moduleName) return;

        if (!global.pin || !global.pin.isPinSet()) {
          showToast(tr('pin.setFirst', 'Prvo postavi PIN u Podešavanjima.'));
          return;
        }

        const locked = global.pin.isModuleLocked(moduleName);
        if (locked) {
          global.pin.setModuleLocked(moduleName, false);
          showToast(tr('pin.unlocked', 'Kartica je otključana.'));
        } else {
          global.pin.setModuleLocked(moduleName, true);
          showToast(tr('pin.locked', 'Kartica je zaključana.'));
        }
        refreshAll();
      });
    });
  }

  /* ---------- OSVEŽI SVE ---------- */

  function refreshAll() {
    renderGreeting();
    renderModuleCards();
    renderWidgets();
    renderQuickActions();
    bindModuleLockButtons();
  }

  /* ---------- INIT ---------- */

  function init() {
    refreshAll();

    global.addEventListener('alatikapro:langchange', refreshAll);

    global.addEventListener('alatikapro:pinchange', function () {
      renderModuleCards();
    });

    if (global.router && global.router.onRouteChange) {
      global.router.onRouteChange(function (route) {
        if (route === 'home') refreshAll();
      });
    }

    /* Kada se moduli učitaju, osveži vidžete */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) renderWidgets();
    });
  }

  global.home = {
    init: init,
    refresh: refreshAll,
    showToast: showToast,
    openModule: openModule
  };
})(window);
