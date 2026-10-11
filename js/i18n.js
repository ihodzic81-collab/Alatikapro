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

      'nav.home': 'Početna',
      'nav.reminders': 'Podsetnici',
      'nav.bills': 'Računi',
      'nav.items': 'Moje stvari',
      'nav.money': 'Novac',

      'home.greet.morning': 'Dobro jutro!',
      'home.greet.day': 'Zdravo!',
      'home.greet.evening': 'Dobro veče!',
      'home.greet.night': 'Laku noć!',
      'home.today': 'Današnji pregled',
      'home.modules': 'Moduli',
      'home.rates': 'Kursna lista',
      'home.ratesPlaceholder': 'Kursna lista dolazi u Sesiji 6.',
      'home.quickActions': 'Brze akcije',
      'home.today.empty': 'Nema obaveza za danas.',
      'home.today.emptySub': 'Uživaj u slobodnom danu.',

      'home.mod.reminders.sub': 'Obaveze i rokovi.',
      'home.mod.bills.sub': 'Arhiva i plaćanja.',
      'home.mod.items.sub': 'Dokumenta i fajlovi.',
      'home.mod.money.sub': 'Prihodi i rashodi.',

      'home.action.addReminder': 'Novi podsetnik',
      'home.action.addBill': 'Novi račun',
      'home.action.addItem': 'Novi dokument',
      'home.action.addMoney': 'Nova transakcija',
      'home.action.soon': 'Ova funkcija dolazi u narednoj sesiji.',

      'reminders.title': 'Podsetnici',
      'reminders.subtitle': 'Ne zaboravi važne obaveze.',
      'reminders.placeholder': 'Ovde će biti tvoji podsetnici.',

      'bills.title': 'Računi',
      'bills.subtitle': 'Arhiva računa i statusa plaćanja.',
      'bills.placeholder': 'Ovde će biti tvoji računi.',

      'items.title': 'Moje stvari',
      'items.subtitle': 'Važni dokumenti uvek pri ruci.',
      'items.placeholder': 'Ovde će biti tvoja dokumenta i fajlovi.',

      'money.title': 'Novac',
      'money.subtitle': 'Prihodi, rashodi i budžet.',
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
      'common.yes': 'Da',
      'common.no': 'Ne',
      'common.loading': 'Učitavanje...',
      'common.error': 'Greška',
      'common.success': 'Uspešno',
      'common.empty': 'Nema podataka',
      'common.ok': 'U redu',

      'pin.title': 'Unesi PIN',
      'pin.set': 'Postavi PIN',
      'pin.setSub': 'Izaberi 4-cifreni PIN.',
      'pin.confirm': 'Potvrdi PIN',
      'pin.confirmSub': 'Ponovo unesi isti PIN.',
      'pin.old': 'Stari PIN',
      'pin.oldSub': 'Unesi postojeći PIN.',
      'pin.new': 'Novi PIN',
      'pin.enter4': 'Unesi 4-cifreni PIN.',
      'pin.wrong': 'Pogrešan PIN. Pokušaj ponovo.',
      'pin.mismatch': 'PIN-ovi se ne poklapaju.',
      'pin.tooMany': 'Previše pokušaja. Pokušaj za ',
      'pin.setFirst': 'Prvo postavi PIN u Podešavanjima.',
      'pin.locked': 'Kartica je zaključana.',
      'pin.unlocked': 'Kartica je otključana.',
      'pin.unlock.reminders': 'Otključaj Podsetnike',
      'pin.unlock.bills': 'Otključaj Račune',
      'pin.unlock.items': 'Otključaj Moje stvari',
      'pin.unlock.money': 'Otključaj Novac'
    },
    en: {
      'app.tagline': 'Everything important, in one place.',

      'nav.home': 'Home',
      'nav.reminders': 'Reminders',
      'nav.bills': 'Bills',
      'nav.items': 'My Items',
      'nav.money': 'Money',

      'home.greet.morning': 'Good morning!',
      'home.greet.day': 'Hello!',
      'home.greet.evening': 'Good evening!',
      'home.greet.night': 'Good night!',
      'home.today': "Today's overview",
      'home.modules': 'Modules',
      'home.rates': 'Exchange rates',
      'home.ratesPlaceholder': 'Exchange rates arrive in Session 6.',
      'home.quickActions': 'Quick actions',
      'home.today.empty': 'No tasks for today.',
      'home.today.emptySub': 'Enjoy your free day.',

      'home.mod.reminders.sub': 'Tasks and deadlines.',
      'home.mod.bills.sub': 'Archive and payments.',
      'home.mod.items.sub': 'Documents and files.',
      'home.mod.money.sub': 'Income and expenses.',

      'home.action.addReminder': 'New reminder',
      'home.action.addBill': 'New bill',
      'home.action.addItem': 'New document',
      'home.action.addMoney': 'New transaction',
      'home.action.soon': 'This feature arrives in the next session.',

      'reminders.title': 'Reminders',
      'reminders.subtitle': "Don't forget important tasks.",
      'reminders.placeholder': 'Your reminders will appear here.',

      'bills.title': 'Bills',
      'bills.subtitle': 'Archive and payment status.',
      'bills.placeholder': 'Your bills will appear here.',

      'items.title': 'My Items',
      'items.subtitle': 'Important documents always at hand.',
      'items.placeholder': 'Your documents and files will appear here.',

      'money.title': 'Money',
      'money.subtitle': 'Income, expenses, and budget.',
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
      'common.yes': 'Yes',
      'common.no': 'No',
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.empty': 'No data',
      'common.ok': 'OK',

      'pin.title': 'Enter PIN',
      'pin.set': 'Set PIN',
      'pin.setSub': 'Choose a 4-digit PIN.',
      'pin.confirm': 'Confirm PIN',
      'pin.confirmSub': 'Re-enter the same PIN.',
      'pin.old': 'Old PIN',
      'pin.oldSub': 'Enter your current PIN.',
      'pin.new': 'New PIN',
      'pin.enter4': 'Enter your 4-digit PIN.',
      'pin.wrong': 'Wrong PIN. Try again.',
      'pin.mismatch': 'PINs do not match.',
      'pin.tooMany': 'Too many attempts. Try again in ',
      'pin.setFirst': 'First set a PIN in Settings.',
      'pin.locked': 'Card locked.',
      'pin.unlocked': 'Card unlocked.',
      'pin.unlock.reminders': 'Unlock Reminders',
      'pin.unlock.bills': 'Unlock Bills',
      'pin.unlock.items': 'Unlock My Items',
      'pin.unlock.money': 'Unlock Money'
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
