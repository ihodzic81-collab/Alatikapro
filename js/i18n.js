/* =========================================================
   ALATIKA PRO — i18n.js
   Dvojezičnost SR / EN. Podrazumevani jezik: SR.
   ========================================================= */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'alatikapro.lang';
  const DEFAULT_LANG = 'sr';
  const SUPPORTED = ['sr', 'en'];

  const translations = {
    sr: {
      'app.tagline': 'Sve važno, na jednom mestu.',
      'app.name': 'ALATIKA',
      'app.pro': ' PRO',

      'nav.home': 'Početna',
      'nav.reminders': 'Podsetnici',
      'nav.bills': 'Računi',
      'nav.items': 'Moje stvari',
      'nav.money': 'Novac',

      'home.title': 'Početna',
      'home.placeholder': 'Ovde će biti tvoj današnji pregled.',

      'reminders.title': 'Podsetnici',
      'reminders.placeholder': 'Ovde će biti tvoji podsetnici.',

      'bills.title': 'Računi',
      'bills.placeholder': 'Ovde će biti tvoji računi.',

      'items.title': 'Moje stvari',
      'items.placeholder': 'Ovde će biti tvoja dokumenta i fajlovi.',

      'money.title': 'Novac',
      'money.placeholder': 'Ovde će biti tvoji prihodi i rashodi.',

      'common.save': 'Sačuvaj',
      'common.cancel': 'Otkaži',
      'common.delete': 'Obriši',
      'common.edit': 'Izmeni',
      'common.add': 'Dodaj',
      'common.search': 'Pretraga',
      'common.close': 'Zatvori',
      'common.confirm': 'Potvrdi',
      'common.back': 'Nazad',
      'common.next': 'Sledeće',
      'common.yes': 'Da',
      'common.no': 'Ne',
      'common.loading': 'Učitavanje...',
      'common.error': 'Greška',
      'common.success': 'Uspešno',
      'common.empty': 'Nema podataka'
    },
    en: {
      'app.tagline': 'Everything important, in one place.',
      'app.name': 'ALATIKA',
      'app.pro': ' PRO',

      'nav.home': 'Home',
      'nav.reminders': 'Reminders',
      'nav.bills': 'Bills',
      'nav.items': 'My Items',
      'nav.money': 'Money',

      'home.title': 'Home',
      'home.placeholder': 'Your daily overview will appear here.',

      'reminders.title': 'Reminders',
      'reminders.placeholder': 'Your reminders will appear here.',

      'bills.title': 'Bills',
      'bills.placeholder': 'Your bills will appear here.',

      'items.title': 'My Items',
      'items.placeholder': 'Your documents and files will appear here.',

      'money.title': 'Money',
      'money.placeholder': 'Your income and expenses will appear here.',

      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.add': 'Add',
      'common.search': 'Search',
      'common.close': 'Close',
      'common.confirm': 'Confirm',
      'common.back': 'Back',
      'common.next': 'Next',
      'common.yes': 'Yes',
      'common.no': 'No',
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.empty': 'No data'
    }
  };

  let currentLang = DEFAULT_LANG;

  function getSavedLang() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    return null;
  }

  function saveLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
  }

  function detectLang() {
    const saved = getSavedLang();
    if (saved) return saved;

    const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (nav.indexOf('sr') === 0) return 'sr';
    if (nav.indexOf('en') === 0) return 'en';

    return DEFAULT_LANG;
  }

  function t(key, fallback) {
    const dict = translations[currentLang] || translations[DEFAULT_LANG];
    if (dict && dict[key] !== undefined) return dict[key];
    const def = translations[DEFAULT_LANG];
    if (def && def[key] !== undefined) return def[key];
    return fallback !== undefined ? fallback : key;
  }

  function applyToDOM(root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll('[data-i18n]');
    nodes.forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const value = t(key);
      const attr = el.getAttribute('data-i18n-attr');
      if (attr) {
        el.setAttribute(attr, value);
      } else {
        el.textContent = value;
      }
    });
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    currentLang = lang;
    saveLang(lang);
    document.documentElement.setAttribute('lang', lang);
    applyToDOM(document);
    try {
      window.dispatchEvent(new CustomEvent('alatikapro:langchange', { detail: { lang: lang } }));
    } catch (e) {
      const ev = document.createEvent('Event');
      ev.initEvent('alatikapro:langchange', true, true);
      ev.detail = { lang: lang };
      window.dispatchEvent(ev);
    }
  }

  function toggleLang() {
    setLang(currentLang === 'sr' ? 'en' : 'sr');
    return currentLang;
  }

  function getLang() {
    return currentLang;
  }

  function getLangLabel() {
    return currentLang.toUpperCase();
  }

  function init() {
    currentLang = detectLang();
    document.documentElement.setAttribute('lang', currentLang);
    applyToDOM(document);
  }

  global.i18n = {
    init: init,
    t: t,
    setLang: setLang,
    toggleLang: toggleLang,
    getLang: getLang,
    getLangLabel: getLangLabel,
    applyToDOM: applyToDOM,
    SUPPORTED: SUPPORTED.slice()
  };
})(window);
