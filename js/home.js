/* =========================================================
   ALATIKA PRO — home.js
   Početna sa vidžetima (uklj. funkcionalan mini konverter).
   ========================================================= */

(function (global) {
  'use strict';

  function t(key, fallback) {
    return (global.i18n && global.i18n.t) ? global.i18n.t(key, fallback) : (fallback || key);
  }
  function tr(key, fallback) { return t(key, fallback); }

  /* ---------- POZDRAV ---------- */

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
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  /* ---------- KARTICE MODULA ---------- */

  const MODULE_DEFS = [
    { key: 'reminders', iconColor: 'reminders',
      titleKey: 'nav.reminders', titleFallback: 'Podsetnici',
      icon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>' },
    { key: 'bills', iconColor: 'bills',
      titleKey: 'nav.bills', titleFallback: 'Računi',
      icon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6"></path><path d="M9 13h6M9 17h6"></path></svg>' },
    { key: 'items', iconColor: 'items',
      titleKey: 'nav.items', titleFallback: 'Moje stvari',
      icon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' },
    { key: 'money', iconColor: 'money',
      titleKey: 'nav.money', titleFallback: 'Novac',
      icon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v10M9 9.5a2.5 2.5 0 0 1 5 0c0 1.5-5 1.5-5 3a2.5 2.5 0 0 0 5 0"></path></svg>' }
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
      btn.className = 'module-card';
      btn.setAttribute('data-module', mod.key);

      const locked = global.pin && global.pin.isModuleLocked(mod.key) ? true : false;

      btn.innerHTML = [
        '<span class="mc-icon ' + mod.iconColor + '" aria-hidden="true">' + mod.icon + '</span>',
        '<span class="mc-title">' + tr(mod.titleKey, mod.titleFallback) + '</span>',
        locked ? '<span class="mc-lock" aria-hidden="true">' + LOCK_SVG + '</span>' : ''
      ].join('');

      btn.addEventListener('click', function () { openModule(mod.key); });
      wrap.appendChild(btn);
    });
  }

  function openModule(moduleKey) {
    const route = moduleKey;
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

  /* ---------- VIDŽETI ---------- */

  function renderWidgets() {
    const wrap = document.getElementById('homeWidgets');
    if (!wrap) return;
    wrap.innerHTML = '';
    renderTodayWidget(wrap);
    renderPendingBillsWidget(wrap);
    renderBudgetWidget(wrap);
    renderRatesWidget(wrap);
  }

  /* --- Današnje obaveze --- */
  function renderTodayWidget(parent) {
    const card = document.createElement('div');
    card.className = 'home-widget';

    const reminders = (global.reminders && global.reminders._state && global.reminders._state.items) || [];

    const upcoming = reminders.filter(function (r) {
      if (r.done) return false;
      const eff = global.reminders.effectiveDate ? global.reminders.effectiveDate(r) : r.date;
      if (!eff) return false;
      const days = global.utils.daysFromToday(eff);
      return days !== null && days >= -1 && days <= 3;
    }).sort(function (a, b) {
      const ea = global.reminders.effectiveDate ? global.reminders.effectiveDate(a) : a.date;
      const eb = global.reminders.effectiveDate ? global.reminders.effectiveDate(b) : b.date;
      return (ea || '').localeCompare(eb || '');
    });

    const hasUrgent = upcoming.some(function (r) {
      const eff = global.reminders.effectiveDate ? global.reminders.effectiveDate(r) : r.date;
      const days = global.utils.daysFromToday(eff);
      return days !== null && days <= 1;
    });

    let chipsHTML = '';
    if (upcoming.length === 0) {
      chipsHTML = '<div class="hw-empty">' + tr('home.widget.noTasks', 'Nema obaveza u naredna 3 dana.') + '</div>';
    } else {
      chipsHTML = upcoming.map(function (r) {
        const eff = global.reminders.effectiveDate ? global.reminders.effectiveDate(r) : r.date;
        const days = global.utils.daysFromToday(eff);
        let dayLabel = '';
        if (days === 0) dayLabel = tr('home.widget.today', 'Danas');
        else if (days === 1) dayLabel = tr('home.widget.tomorrow', 'Sutra');
        else if (days === 2) dayLabel = tr('home.widget.in2days', 'Za 2 dana');
        else if (days === 3) dayLabel = tr('home.widget.in3days', 'Za 3 dana');
        else if (days === -1) dayLabel = tr('home.widget.yesterday', 'Juče');
        let cls = 'hw-chip';
        if (days < 0) cls += ' chip-overdue';
        else if (days <= 1) cls += ' chip-urgent';
        const isBday = global.reminders.isBirthday && global.reminders.isBirthday(r);
        const icon = isBday ? '🎂' : '';
        return [
          '<button type="button" class="' + cls + '" data-goto="reminders">',
          '  <span class="hw-chip-day">' + dayLabel + '</span>',
          '  <span class="hw-chip-title">' + (icon ? icon + ' ' : '') + global.utils.escapeHtml(global.utils.truncate(r.title || '', 20)) + '</span>',
          '</button>'
        ].join('');
      }).join('');
    }

    card.innerHTML = [
      '<div class="hw-header">',
      '  <span class="hw-icon hw-icon-reminders" aria-hidden="true">',
      '    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>',
      '  </span>',
      '  <span class="hw-label">' + tr('home.widget.todayTitle', 'Današnje obaveze') + '</span>',
      hasUrgent ? '<span class="hw-pulse"></span>' : '',
      '  <button type="button" class="hw-more" data-goto="reminders">→</button>',
      '</div>',
      '<div class="hw-scroll">' + chipsHTML + '</div>'
    ].join('');

    card.querySelectorAll('[data-goto]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        global.router.navigate('reminders');
      });
    });

    parent.appendChild(card);
  }

  /* --- Računi na čekanju --- */
  function renderPendingBillsWidget(parent) {
    const card = document.createElement('div');
    card.className = 'home-widget';

    const bills = (global.bills && global.bills._state && global.bills._state.items) || [];
    const currentMonth = (function () {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    })();

    const pending = bills.filter(function (b) {
      return !b.paid && (b.month || '') === currentMonth;
    }).sort(function (a, b) {
      return (a.dueDate || '').localeCompare(b.dueDate || '');
    });

    const hasOverdue = pending.some(function (b) {
      if (!b.dueDate) return false;
      return global.utils.daysFromToday(b.dueDate) < 0;
    });

    let chipsHTML = '';
    if (pending.length === 0) {
      chipsHTML = '<div class="hw-empty">' + tr('home.widget.noBills', 'Nema računa na čekanju.') + '</div>';
    } else {
      chipsHTML = pending.map(function (b) {
        const days = b.dueDate ? global.utils.daysFromToday(b.dueDate) : null;
        let cls = 'hw-chip';
        let dayLabel = '';
        if (days !== null) {
          if (days < 0) { cls += ' chip-overdue'; dayLabel = tr('home.widget.overdue', 'Isteklo') + ' ' + Math.abs(days) + 'd'; }
          else if (days === 0) { cls += ' chip-urgent'; dayLabel = tr('home.widget.today', 'Danas'); }
          else if (days === 1) { cls += ' chip-urgent'; dayLabel = tr('home.widget.tomorrow', 'Sutra'); }
          else { dayLabel = tr('home.widget.inDays', 'Za') + ' ' + days + 'd'; }
        }
        const flag = global.currencies ? global.currencies.getFlag(b.currency || 'RSD') : '';
        const amount = Number(b.amount) || 0;
        return [
          '<button type="button" class="' + cls + '" data-bill-id="' + b.id + '">',
          '  <span class="hw-chip-day">' + dayLabel + '</span>',
          '  <span class="hw-chip-title">' + global.utils.escapeHtml(global.utils.truncate(b.name || b.vendor || '', 16)) + '</span>',
          '  <span class="hw-chip-amount">' + flag + ' ' + amount.toFixed(0) + '</span>',
          '</button>'
        ].join('');
      }).join('');
    }

    card.innerHTML = [
      '<div class="hw-header">',
      '  <span class="hw-icon hw-icon-bills" aria-hidden="true">',
      '    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6"></path><path d="M9 13h6M9 17h6"></path></svg>',
      '  </span>',
      '  <span class="hw-label">' + tr('home.widget.billsTitle', 'Računi na čekanju') + '</span>',
      hasOverdue ? '<span class="hw-pulse"></span>' : '',
      '  <button type="button" class="hw-more" data-goto="bills">→</button>',
      '</div>',
      '<div class="hw-scroll">' + chipsHTML + '</div>'
    ].join('');

    card.querySelectorAll('[data-bill-id]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const billId = btn.getAttribute('data-bill-id');
        const bill = bills.find(function (b) { return b.id === billId; });
        if (bill && global.bills && global.bills.openBillDetail) {
          global.bills.openBillDetail(bill);
        } else {
          global.router.navigate('bills');
        }
      });
    });

    card.querySelectorAll('[data-goto]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        global.router.navigate('bills');
      });
    });

    parent.appendChild(card);
  }

  /* --- Budžet --- */
  function renderBudgetWidget(parent) {
    const card = document.createElement('div');
    card.className = 'home-widget';

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

    let contentHTML = '';
    let isOver = false;

    if (budget && budget.amount > 0) {
      const percent = Math.min(100, Math.round((totalExpenses / budget.amount) * 100));
      const over = totalExpenses > budget.amount;
      isOver = over;
      const remaining = Math.max(0, budget.amount - totalExpenses);

      contentHTML = [
        '<div class="hw-budget-bar-wrap">',
        '  <div class="hw-budget-bar' + (over ? ' over' : '') + '" style="width: ' + percent + '%"></div>',
        '</div>',
        '<div class="hw-budget-info">',
        '  <span>' + percent + '%</span>',
        '  <span>' + totalExpenses.toFixed(0) + ' / ' + Number(budget.amount).toFixed(0) + ' RSD</span>',
        '</div>',
        '<div class="hw-budget-hint">' +
          (over
            ? '⚠️ ' + tr('home.widget.budgetOver', 'Prekoračeno za') + ' ' + (totalExpenses - budget.amount).toFixed(0) + ' RSD'
            : tr('home.widget.budgetRemaining', 'Ostalo') + ' ' + remaining.toFixed(0) + ' RSD ' + tr('home.widget.thisMonth', 'ovog meseca')) +
        '</div>'
      ].join('');
    } else {
      contentHTML = [
        '<div class="hw-empty">' + tr('home.widget.noBudget', 'Budžet nije postavljen.') + '</div>',
        '<div class="hw-budget-hint">' + tr('home.widget.spentSoFar', 'Do sada potrošeno') + ' ' + totalExpenses.toFixed(0) + ' RSD</div>'
      ].join('');
    }

    card.innerHTML = [
      '<div class="hw-header">',
      '  <span class="hw-icon hw-icon-money" aria-hidden="true">',
      '    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v10M9 9.5a2.5 2.5 0 0 1 5 0c0 1.5-5 1.5-5 3a2.5 2.5 0 0 0 5 0"></path></svg>',
      '  </span>',
      '  <span class="hw-label">' + tr('home.widget.budgetTitle', 'Budžet ovog meseca') + '</span>',
      isOver ? '<span class="hw-pulse"></span>' : '',
      '  <button type="button" class="hw-more" data-goto="money">→</button>',
      '</div>',
      '<div class="hw-budget-body">' + contentHTML + '</div>'
    ].join('');

    card.querySelectorAll('[data-goto]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        global.router.navigate('money');
      });
    });

    parent.appendChild(card);
  }

  /* --- Kursna lista sa MINI KONVERTEROM --- */
  function renderRatesWidget(parent) {
    const card = document.createElement('div');
    card.className = 'home-widget';

    card.innerHTML = [
      '<div class="hw-header">',
      '  <span class="hw-icon hw-icon-rates" aria-hidden="true">',
      '    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
      '  </span>',
      '  <span class="hw-label">' + tr('home.rates', 'Kursna lista') + '</span>',
      '  <button type="button" class="hw-more" data-open-converter aria-label="' + tr('rates.openConverter', 'Otvori konverter') + '">→</button>',
      '</div>',
      '<div class="hw-converter" id="hwConverter">',
      '  <input type="text" inputmode="decimal" class="hw-conv-input" id="hwConvAmount" value="100" />',
      '  <select class="hw-conv-cur" id="hwConvFrom"></select>',
      '  <button type="button" class="hw-conv-swap" id="hwConvSwap" aria-label="' + tr('conv.swap', 'Zameni') + '">',
      '    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
      '  </button>',
      '  <select class="hw-conv-cur" id="hwConvTo"></select>',
      '</div>',
      '<div class="hw-conv-result" id="hwConvResult">',
      '  <div class="hw-conv-result-label">' + tr('conv.result', 'Rezultat') + '</div>',
      '  <div class="hw-conv-result-value" id="hwConvResultValue">—</div>',
      '</div>',
      '<div class="hw-conv-rate" id="hwConvRate"></div>'
    ].join('');

    parent.appendChild(card);

    /* Popuni valute */
    const fromSelect = card.querySelector('#hwConvFrom');
    const toSelect = card.querySelector('#hwConvTo');
    const allCurrencies = global.currencies ? global.currencies.getAll() : [];
    const buildOptions = function (selectedCode) {
      return allCurrencies.map(function (c) {
        const sel = c.code === selectedCode ? ' selected' : '';
        return '<option value="' + c.code + '"' + sel + '>' + c.flag + ' ' + c.code + '</option>';
      }).join('');
    };
    fromSelect.innerHTML = buildOptions('EUR');
    toSelect.innerHTML = buildOptions('RSD');

    const amountInput = card.querySelector('#hwConvAmount');
    const resultValue = card.querySelector('#hwConvResultValue');
    const rateEl = card.querySelector('#hwConvRate');
    const swapBtn = card.querySelector('#hwConvSwap');
    const openBtn = card.querySelector('[data-open-converter]');

    function updateConversion() {
      const amount = global.utils.parseAmount(amountInput.value);
      const from = fromSelect.value;
      const to = toSelect.value;

      if (!amount || amount <= 0) {
        resultValue.textContent = '—';
        rateEl.textContent = '';
        return;
      }

      if (!global.nbs || !global.nbs.hasRates()) {
        if (global.nbs && global.nbs.getRates) {
          global.nbs.getRates().then(updateConversion).catch(function () {
            resultValue.textContent = '—';
            rateEl.textContent = tr('rates.unavailable', 'Kurs nije dostupan.');
          });
        }
        return;
      }

      const result = global.nbs.convert(amount, from, to);
      if (result === null) {
        resultValue.textContent = '—';
        rateEl.textContent = tr('conv.error', 'Kurs nije dostupan.');
        return;
      }

      const flag = global.currencies.getFlag(to);
      resultValue.textContent = result.toLocaleString('sr-RS', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + ' ' + flag + ' ' + to;

      /* Prikaz kursa */
      let rateText = '';
      if (from === 'RSD' || to === 'RSD') {
        const rate = from === 'RSD' ? global.nbs.getRate(to) : global.nbs.getRate(from);
        if (rate) {
          rateText = '1 ' + (from === 'RSD' ? to : from) + ' = ' +
            rate.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RSD';
        }
      } else {
        const r1 = global.nbs.getRate(from);
        const r2 = global.nbs.getRate(to);
        if (r1 && r2) {
          const cross = r1 / r2;
          rateText = '1 ' + from + ' = ' + cross.toLocaleString('sr-RS', {
            minimumFractionDigits: 2, maximumFractionDigits: 4
          }) + ' ' + to;
        }
      }
      const date = global.nbs.getDate();
      if (date) {
        rateText += ' · ' + date;
      }
      rateEl.textContent = rateText;
    }

    amountInput.addEventListener('input', global.utils.debounce(updateConversion, 250));
    fromSelect.addEventListener('change', updateConversion);
    toSelect.addEventListener('change', updateConversion);

    swapBtn.addEventListener('click', function () {
      const f = fromSelect.value;
      const t2 = toSelect.value;
      fromSelect.value = t2;
      toSelect.value = f;
      swapBtn.classList.add('rotating');
      setTimeout(function () { swapBtn.classList.remove('rotating'); }, 300);
      updateConversion();
    });

    openBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (global.converter && global.converter.openModal) {
        global.converter.openModal();
      } else {
        global.router.navigate('money');
      }
    });

    /* Učitaj kurseve pa izračunaj */
    if (global.nbs) {
      global.nbs.getRates().then(updateConversion).catch(function () {
        resultValue.textContent = '—';
        rateEl.textContent = tr('rates.unavailable', 'Kurs nije dostupan.');
      });
    }
  }

  /* ---------- BRZE AKCIJE ---------- */

  function handleQuickAction(key) {
    /* Otvori formu direktno, bez ulaska u karticu */
    if (key === 'add-reminder') {
      if (global.reminders && global.reminders.openForm) {
        global.reminders.openForm(null);
      } else {
        global.router.navigate('reminders');
        setTimeout(function () {
          if (global.reminders && global.reminders.openForm) global.reminders.openForm(null);
        }, 200);
      }
      return;
    }
    if (key === 'add-bill') {
      if (global.bills && global.bills.openBillForm) {
        global.bills.openBillForm(null);
      } else {
        global.router.navigate('bills');
        setTimeout(function () {
          if (global.bills && global.bills.openBillForm) global.bills.openBillForm(null);
        }, 200);
      }
      return;
    }
    if (key === 'add-item') {
      if (global.items && global.items.openForm) {
        global.items.openForm(null);
      } else {
        global.router.navigate('items');
        setTimeout(function () {
          if (global.items && global.items.openForm) global.items.openForm(null);
        }, 200);
      }
      return;
    }
    if (key === 'add-money') {
      if (global.money && global.money.openTransactionForm) {
        global.money.openTransactionForm(null, 'expense');
      } else {
        global.router.navigate('money');
        setTimeout(function () {
          if (global.money && global.money.openTransactionForm) {
            global.money.openTransactionForm(null, 'expense');
          }
        }, 200);
      }
      return;
    }
  }

  /* ---------- TOAST ---------- */

  let toastTimer = null;

  function showToast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  /* ---------- FUTER ---------- */

  function bindFooterActions() {
    document.querySelectorAll('.nav-btn.nav-action').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        handleQuickAction(btn.getAttribute('data-action'));
      });
    });
  }

  /* ---------- LOCK ---------- */

  function bindModuleLockButtons() {
    document.querySelectorAll('[data-module-lock]').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        const moduleName = btn.getAttribute('data-module-lock');
        if (!moduleName) return;
        if (!global.pin || !global.pin.isPinSet()) {
          showToast(tr('pin.setFirst', 'Prvo postavi PIN u Podešavanjima.'));
          if (global.settings) global.settings.open();
          return;
        }
        const locked = global.pin.isModuleLocked(moduleName);
        if (global.pinUI && global.pinUI.promptUnlock) {
          global.pinUI.promptUnlock(moduleName, function () {
            global.pin.setModuleLocked(moduleName, !locked);
            showToast(locked ? tr('pin.unlocked', 'Otključano.') : tr('pin.locked', 'Zaključano.'));
            refreshAll();
          });
        }
      });
    });
  }

  function refreshAll() {
    renderGreeting();
    renderModuleCards();
    renderWidgets();
    bindModuleLockButtons();
    bindFooterActions();
  }

  function init() {
    refreshAll();

    global.addEventListener('alatikapro:langchange', refreshAll);
    global.addEventListener('alatikapro:pinchange', renderModuleCards);

    if (global.router && global.router.onRouteChange) {
      global.router.onRouteChange(function (route) {
        if (route === 'home') setTimeout(refreshAll, 150);
      });
    }

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) renderWidgets();
    });

    global.addEventListener('alatikapro:datachange', function () { renderWidgets(); });
  }

  global.home = {
    init: init,
    refresh: refreshAll,
    showToast: showToast,
    openModule: openModule
  };
})(window);
