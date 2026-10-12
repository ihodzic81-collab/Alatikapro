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
      'pin.unlock.money': 'Otključaj Novac',

      'settings.title': 'Podešavanja',
      'settings.privacy': 'Privatnost i zaključavanje',
      'settings.privacyHint': 'Zaključaj pojedine kartice 4-cifrenim PIN-om.',
      'settings.pinSet': 'PIN je postavljen',
      'settings.pinNotSet': 'PIN nije postavljen',
      'settings.changePin': 'Promeni PIN',
      'settings.setPin': 'Postavi PIN',
      'settings.pinChanged': 'PIN je promenjen.',
      'settings.pinSetOk': 'PIN je postavljen.',
      'settings.removePin': 'Ukloni PIN',
      'settings.removePinConfirm': 'Ukloniti PIN? Kartice više neće biti zaključane.',
      'settings.pinRemoved': 'PIN je uklonjen.',
      'settings.autoLock': 'Automatsko zaključavanje',
      'settings.autoLockOff': 'Isključeno',
      'settings.autoLock1': '1 min',
      'settings.autoLock5': '5 min',
      'settings.autoLock15': '15 min',
      'settings.autoLock30': '30 min',
      'settings.about': 'O aplikaciji',
      'settings.version': 'Alatika Pro — verzija 1.0.0',

      'rem.filter.all': 'Svi',
      'rem.filter.active': 'Aktivni',
      'rem.filter.done': 'Završeni',
      'rem.filter.overdue': 'Istekli',
      'rem.search': 'Pretraga podsetnika...',
      'rem.group.overdue': 'Istekli',
      'rem.group.today': 'Danas',
      'rem.group.tomorrow': 'Sutra',
      'rem.group.next7': 'Narednih 7 dana',
      'rem.group.later': 'Kasnije',
      'rem.group.done': 'Završeni',
      'rem.empty': 'Još uvek nemaš podsetnika. Dodaj prvi!',
      'rem.emptySearch': 'Nema rezultata za pretragu.',
      'rem.add': 'Dodaj podsetnik',
      'rem.new': 'Novi podsetnik',
      'rem.edit': 'Izmeni podsetnik',
      'rem.field.title': 'Naziv',
      'rem.field.category': 'Kategorija',
      'rem.field.noCategory': '— Bez kategorije —',
      'rem.field.date': 'Datum',
      'rem.field.time': 'Vreme',
      'rem.field.priority': 'Prioritet',
      'rem.field.repeat': 'Ponavljanje',
      'rem.field.description': 'Opis',
      'rem.field.notifyDaysBefore': 'Podseti me ranije',
      'rem.field.notifyHint': 'Prikaži ovaj podsetnik nekoliko dana pre datuma.',
      'rem.notify.0': 'Na dan',
      'rem.notify.1': '1 dan ranije',
      'rem.notify.2': '2 dana ranije',
      'rem.notify.3': '3 dana ranije',
      'rem.notify.5': '5 dana ranije',
      'rem.notify.7': '7 dana ranije',
      'rem.notify.14': '14 dana ranije',
      'rem.notify.30': '30 dana ranije',
      'rem.field.birthDate': 'Datum rođenja',
      'rem.field.birthDateHint': 'Unesi datum rođenja da bi se godine računale automatski.',
      'rem.field.birthDateHintNoYear': 'Možeš uneti i samo dan i mesec, bez godine.',
      'rem.field.markAsBirthday': 'Označi kao rođendan',
      'rem.field.isBirthday': 'Rođendan',
      'rem.birthday.today': '🎉 Danas — {name} slavi {age}. rođendan',
      'rem.birthday.todayNoAge': '🎉 Danas je rođendan — {name}',
      'rem.birthday.tomorrow': 'Sutra — {name} slavi {age}. rođendan',
      'rem.birthday.tomorrowNoAge': 'Sutra je rođendan — {name}',
      'rem.birthday.inDays': '{name} — rođendan ({age} god.) — za {days} dana',
      'rem.birthday.inDaysNoAge': '{name} — rođendan — za {days} dana',
      'rem.birthday.label': 'rođendan',
      'rem.birthday.years': 'god.',
      'rem.priority.low': 'Nizak',
      'rem.priority.medium': 'Srednji',
      'rem.priority.high': 'Visok',
      'rem.repeat.none': 'Ne ponavlja se',
      'rem.repeat.daily': 'Dnevno',
      'rem.repeat.weekly': 'Nedeljno',
      'rem.repeat.monthly': 'Mesečno',
      'rem.repeat.yearly': 'Godišnje',
      'rem.repeat.autoYearly': 'Automatski — godišnje (rođendan)',
      'rem.err.title': 'Naziv je obavezan.',
      'rem.err.date': 'Datum je obavezan.',
      'rem.deleteConfirm': 'Obrisati ovaj podsetnik?',
      'rem.markDone': 'Označi kao završeno',
      'rem.markActive': 'Vrati u aktivne',
      'rem.overdue': 'isteklo',
      'rem.today': 'danas',
      'rem.tomorrow': 'sutra',
      'rem.inDays': 'za',
      'rem.days': 'dana'
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
      'pin.unlock.money': 'Unlock Money',

      'settings.title': 'Settings',
      'settings.privacy': 'Privacy & lock',
      'settings.privacyHint': 'Lock individual cards with a 4-digit PIN.',
      'settings.pinSet': 'PIN is set',
      'settings.pinNotSet': 'PIN is not set',
      'settings.changePin': 'Change PIN',
      'settings.setPin': 'Set PIN',
      'settings.pinChanged': 'PIN changed.',
      'settings.pinSetOk': 'PIN set.',
      'settings.removePin': 'Remove PIN',
      'settings.removePinConfirm': 'Remove PIN? Cards will no longer be locked.',
      'settings.pinRemoved': 'PIN removed.',
      'settings.autoLock': 'Auto-lock',
      'settings.autoLockOff': 'Off',
      'settings.autoLock1': '1 min',
      'settings.autoLock5': '5 min',
      'settings.autoLock15': '15 min',
      'settings.autoLock30': '30 min',
      'settings.about': 'About',
      'settings.version': 'Alatika Pro — version 1.0.0',

      'rem.filter.all': 'All',
      'rem.filter.active': 'Active',
      'rem.filter.done': 'Done',
      'rem.filter.overdue': 'Overdue',
      'rem.search': 'Search reminders...',
      'rem.group.overdue': 'Overdue',
      'rem.group.today': 'Today',
      'rem.group.tomorrow': 'Tomorrow',
      'rem.group.next7': 'Next 7 days',
      'rem.group.later': 'Later',
      'rem.group.done': 'Done',
      'rem.empty': 'No reminders yet. Add your first one!',
      'rem.emptySearch': 'No results found.',
      'rem.add': 'Add reminder',
      'rem.new': 'New reminder',
      'rem.edit': 'Edit reminder',
      'rem.field.title': 'Title',
      'rem.field.category': 'Category',
      'rem.field.noCategory': '— No category —',
      'rem.field.date': 'Date',
      'rem.field.time': 'Time',
      'rem.field.priority': 'Priority',
      'rem.field.repeat': 'Repeat',
      'rem.field.description': 'Description',
      'rem.field.notifyDaysBefore': 'Remind me earlier',
      'rem.field.notifyHint': 'Show this reminder a few days before the date.',
      'rem.notify.0': 'On the day',
      'rem.notify.1': '1 day before',
      'rem.notify.2': '2 days before',
      'rem.notify.3': '3 days before',
      'rem.notify.5': '5 days before',
      'rem.notify.7': '7 days before',
      'rem.notify.14': '14 days before',
      'rem.notify.30': '30 days before',
      'rem.field.birthDate': 'Date of birth',
      'rem.field.birthDateHint': 'Enter the date of birth to calculate age automatically.',
      'rem.field.birthDateHintNoYear': 'You can also enter only day and month, without the year.',
      'rem.field.markAsBirthday': 'Mark as birthday',
      'rem.field.isBirthday': 'Birthday',
      'rem.birthday.today': '🎉 Today — {name} turns {age}',
      'rem.birthday.todayNoAge': '🎉 Today is {name}\'s birthday',
      'rem.birthday.tomorrow': 'Tomorrow — {name} turns {age}',
      'rem.birthday.tomorrowNoAge': 'Tomorrow is {name}\'s birthday',
      'rem.birthday.inDays': '{name} — birthday ({age} yrs) — in {days} days',
      'rem.birthday.inDaysNoAge': '{name} — birthday — in {days} days',
      'rem.birthday.label': 'birthday',
      'rem.birthday.years': 'yrs',
      'rem.priority.low': 'Low',
      'rem.priority.medium': 'Medium',
      'rem.priority.high': 'High',
      'rem.repeat.none': 'Does not repeat',
      'rem.repeat.daily': 'Daily',
      'rem.repeat.weekly': 'Weekly',
      'rem.repeat.monthly': 'Monthly',
      'rem.repeat.yearly': 'Yearly',
      'rem.repeat.autoYearly': 'Automatic — yearly (birthday)',
      'rem.err.title': 'Title is required.',
      'rem.err.date': 'Date is required.',
      'rem.deleteConfirm': 'Delete this reminder?',
      'rem.markDone': 'Mark as done',
      'rem.markActive': 'Mark as active',
      'rem.overdue': 'overdue',
      'rem.today': 'today',
      'rem.tomorrow': 'tomorrow',
      'rem.inDays': 'in',
      'rem.days': 'days'
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
