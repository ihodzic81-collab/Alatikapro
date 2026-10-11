/* =========================================================
   ALATIKA PRO — home.js
   Logika Početne strane:
   - Pozdrav i datum
   - Kartice modula (sa zaključavanjem)
   - Brze akcije
   - Današnji pregled (prazan placeholder za sada)
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
      subKey: 'home.mod.reminders.sub',
      subFallback: 'Obaveze i rokovi.',
      icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>'
    },
    {
      key: 'bills',
      route: 'bills',
      iconColor: 'bills',
      titleKey: 'nav.bills',
      titleFallback: 'Računi',
      subKey: 'home.mod.bills.sub',
      subFallback: 'Arhiva i plaćanja.',
      icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6"></path><path d="M9 13h6M9 17h6"></path></svg>'
    },
    {
      key: 'items',
      route: 'items',
      iconColor: 'items',
      titleKey: 'nav.items',
      titleFallback: 'Moje stvari',
      subKey: 'home.mod.items.sub',
      subFallback: 'Dokumenta i fajlovi.',
      icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'
    },
    {
      key: 'money',
      route: 'money',
      iconColor: 'money',
      titleKey: 'nav.money',
      titleFallback: 'Novac',
      subKey: 'home.mod.money.sub',
      subFallback: 'Prihodi i rashodi.',
      icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v10M9 9.5a2.5 2.5 0 0 1 5 0c0 1.5-5 1.5-5 3a2.5 2.5 0 0 0 5 0"></path></svg>'
    }
  ];

  const LOCK_SVG =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>';

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
        '<span class="mc-sub">' + tr(mod.subKey, mod.subFallback) + '</span>',
        locked ? '<span class="mc-lock" aria-hidden="true">' + LOCK_SVG + '</span>' : ''
      ].join('');

      btn.addEventListener('click', function () {
        openModule(mod.key);
      });

      wrap.appendChild(btn);
    });
  }

  /* ---------- OTVARANJE MODULA (sa PIN proverom) ---------- */

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
    showToast(tr('home.action.soon', 'Ova funkcija dolazi u narednoj sesiji.'));
  }

  /* ---------- DANAŠNJI PREGLED ---------- */

  function renderToday() {
    const wrap = document.getElementById('homeToday');
    if (!wrap) return;
    wrap.innerHTML = '';

    const empty = document.createElement('div');
    empty.className = 'today-card';
    empty.style.cursor = 'default';
    empty.innerHTML = [
      '<span class="today-icon" aria-hidden="true">',
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '<circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path>',
      '</svg></span>',
      '<span class="today-text">',
      '<span class="today-label">' + tr('home.today.empty', 'Nema obaveza za danas.') + '</span>',
      '<span class="today-sub">' + tr('home.today.emptySub', 'Uživaj u slobodnom danu.') + '</span>',
      '</span>'
    ].join('');
    wrap.appendChild(empty);
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

  /* ---------- ZAKLJUČAVANJE (dugmad u zaglavljima modula) ---------- */

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
    renderQuickActions();
    renderToday();
    bindModuleLockButtons();
  }

  /* ---------- INIT ---------- */

  function init() {
    refreshAll();

    /* Na promenu jezika — ponovo iscrtaj */
    global.addEventListener('alatikapro:langchange', refreshAll);

    /* Na promenu PIN stanja — ponovo iscrtaj kartice */
    global.addEventListener('alatikapro:pinchange', function () {
      renderModuleCards();
    });

    /* Kada se vratimo na home, osveži */
    if (global.router && global.router.onRouteChange) {
      global.router.onRouteChange(function (route) {
        if (route === 'home') refreshAll();
      });
    }
  }

  global.home = {
    init: init,
    refresh: refreshAll,
    showToast: showToast,
    openModule: openModule
  };
})(window);
