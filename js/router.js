/* =========================================================
   ALATIKA PRO — router.js
   Navigacija između glavnih ekrana. Koristi hash.
   VERZIJA 3.0 — dodaje guard pri svakoj promeni rute.
   ========================================================= */

(function (global) {
  'use strict';

  const ROUTES = ['home', 'reminders', 'bills', 'items', 'money'];
  const DEFAULT_ROUTE = 'home';

  let currentRoute = DEFAULT_ROUTE;
  const listeners = [];

  function normalize(hash) {
    if (!hash) return DEFAULT_ROUTE;
    let r = String(hash).replace(/^#\/?/, '').trim().toLowerCase();
    if (r === '') return DEFAULT_ROUTE;
    if (r.indexOf('/') !== -1) r = r.split('/')[0];
    if (ROUTES.indexOf(r) === -1) return DEFAULT_ROUTE;
    return r;
  }

  function getRouteFromHash() {
    return normalize(global.location.hash);
  }

  let lastGuardTime = 0;

  function pushGuard() {
    const now = Date.now();
    if (now - lastGuardTime < 200) return;
    lastGuardTime = now;
    try {
      history.pushState({ app: 'alatikapro', guard: now }, '');
    } catch (e) {}
  }

  function updateView(route) {
    ROUTES.forEach(function (r) {
      const view = document.getElementById('view-' + r);
      if (!view) return;
      if (r === route) {
        view.removeAttribute('hidden');
      } else {
        view.setAttribute('hidden', '');
      }
    });

    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(function (btn) {
      const btnRoute = btn.getAttribute('data-route');
      if (btnRoute === route) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      }
    });

    currentRoute = route;

    if (global.appState && global.appState.set) {
      global.appState.set('route', route);
    }

    listeners.forEach(function (fn) {
      try { fn(route); } catch (e) {}
    });

    const main = document.getElementById('appMain');
    if (main) main.scrollTop = 0;
    global.scrollTo({ top: 0, behavior: 'auto' });
  }

  function navigate(route, opts) {
    const r = normalize(route);
    const targetHash = '#' + r;
    if (global.location.hash !== targetHash) {
      if (opts && opts.replace) {
        global.location.replace(targetHash);
      } else {
        global.location.hash = targetHash;
      }
      pushGuard();
    } else {
      updateView(r);
    }
  }

  function onHashChange() {
    const r = getRouteFromHash();
    if (r !== currentRoute) {
      updateView(r);
      pushGuard();
    }
  }

  function init() {
    const initial = getRouteFromHash();
    updateView(initial);

    global.addEventListener('hashchange', onHashChange);

    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const r = btn.getAttribute('data-route');
        if (r) navigate(r);
      });
    });

    pushGuard();
  }

  function current() {
    return currentRoute;
  }

  function onRouteChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  global.router = {
    ROUTES: ROUTES.slice(),
    DEFAULT_ROUTE: DEFAULT_ROUTE,
    init: init,
    navigate: navigate,
    current: current,
    onRouteChange: onRouteChange
  };
})(window);
