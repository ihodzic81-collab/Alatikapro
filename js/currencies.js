/* =========================================================
   ALATIKA PRO — currencies.js
   Lista od 30 najpopularnijih svetskih valuta.
   + pomoćne funkcije za radne dane (za čekove).
   ========================================================= */

(function (global) {
  'use strict';

  const CURRENCIES = [
    { code: 'RSD', symbol: 'дин.', flag: '🇷🇸', name_sr: 'Srpski dinar',         name_en: 'Serbian dinar' },
    { code: 'EUR', symbol: '€',    flag: '🇪🇺', name_sr: 'Evro',                 name_en: 'Euro' },
    { code: 'CAD', symbol: 'C$',   flag: '🇨🇦', name_sr: 'Kanadski dolar',        name_en: 'Canadian dollar' },
    { code: 'USD', symbol: '$',    flag: '🇺🇸', name_sr: 'Američki dolar',        name_en: 'US dollar' },
    { code: 'CHF', symbol: 'Fr',   flag: '🇨🇭', name_sr: 'Švajcarski franak',     name_en: 'Swiss franc' },
    { code: 'GBP', symbol: '£',    flag: '🇬🇧', name_sr: 'Britanska funta',       name_en: 'British pound' },
    { code: 'AUD', symbol: 'A$',   flag: '🇦🇺', name_sr: 'Australijski dolar',    name_en: 'Australian dollar' },
    { code: 'JPY', symbol: '¥',    flag: '🇯🇵', name_sr: 'Japanski jen',          name_en: 'Japanese yen' },
    { code: 'CNY', symbol: '¥',    flag: '🇨🇳', name_sr: 'Kineski juan',          name_en: 'Chinese yuan' },
    { code: 'RUB', symbol: '₽',    flag: '🇷🇺', name_sr: 'Ruska rublja',          name_en: 'Russian ruble' },
    { code: 'BAM', symbol: 'KM',   flag: '🇧🇦', name_sr: 'Konvertibilna marka',   name_en: 'Bosnian mark' },
    { code: 'MKD', symbol: 'ден',  flag: '🇲🇰', name_sr: 'Makedonski denar',      name_en: 'Macedonian denar' },
    { code: 'HRK', symbol: 'kn',   flag: '🇭🇷', name_sr: 'Hrvatska kuna',         name_en: 'Croatian kuna' },
    { code: 'HUF', symbol: 'Ft',   flag: '🇭🇺', name_sr: 'Mađarska forinta',      name_en: 'Hungarian forint' },
    { code: 'RON', symbol: 'lei',  flag: '🇷🇴', name_sr: 'Rumunski lej',          name_en: 'Romanian leu' },
    { code: 'BGN', symbol: 'лв',   flag: '🇧🇬', name_sr: 'Bugarski lev',          name_en: 'Bulgarian lev' },
    { code: 'TRY', symbol: '₺',    flag: '🇹🇷', name_sr: 'Turska lira',           name_en: 'Turkish lira' },
    { code: 'PLN', symbol: 'zł',   flag: '🇵🇱', name_sr: 'Poljski zlot',          name_en: 'Polish zloty' },
    { code: 'CZK', symbol: 'Kč',   flag: '🇨🇿', name_sr: 'Češka kruna',           name_en: 'Czech koruna' },
    { code: 'SEK', symbol: 'kr',   flag: '🇸🇪', name_sr: 'Švedska kruna',         name_en: 'Swedish krona' },
    { code: 'NOK', symbol: 'kr',   flag: '🇳🇴', name_sr: 'Norveška kruna',        name_en: 'Norwegian krone' },
    { code: 'DKK', symbol: 'kr',   flag: '🇩🇰', name_sr: 'Danska kruna',          name_en: 'Danish krone' },
    { code: 'NZD', symbol: 'NZ$',  flag: '🇳🇿', name_sr: 'Novozelandski dolar',   name_en: 'New Zealand dollar' },
    { code: 'SGD', symbol: 'S$',   flag: '🇸🇬', name_sr: 'Singapurski dolar',     name_en: 'Singapore dollar' },
    { code: 'HKD', symbol: 'HK$',  flag: '🇭🇰', name_sr: 'Hongkonški dolar',      name_en: 'Hong Kong dollar' },
    { code: 'KRW', symbol: '₩',    flag: '🇰🇷', name_sr: 'Južnokorejski von',     name_en: 'South Korean won' },
    { code: 'INR', symbol: '₹',    flag: '🇮🇳', name_sr: 'Indijska rupija',       name_en: 'Indian rupee' },
    { code: 'BRL', symbol: 'R$',   flag: '🇧🇷', name_sr: 'Brazilski real',        name_en: 'Brazilian real' },
    { code: 'ZAR', symbol: 'R',    flag: '🇿🇦', name_sr: 'Južnoafrički rand',     name_en: 'South African rand' },
    { code: 'MXN', symbol: 'MX$',  flag: '🇲🇽', name_sr: 'Meksički pezos',        name_en: 'Mexican peso' }
  ];

  const DEFAULT_CODE = 'RSD';

  function getAll() {
    return CURRENCIES.slice();
  }

  function getByCode(code) {
    return CURRENCIES.find(function (c) { return c.code === code; }) || null;
  }

  function getSymbol(code) {
    const c = getByCode(code);
    return c ? c.symbol : '';
  }

  function getFlag(code) {
    const c = getByCode(code);
    return c ? c.flag : '';
  }

  function getName(code, lang) {
    const c = getByCode(code);
    if (!c) return code;
    return lang === 'en' ? c.name_en : c.name_sr;
  }

  function getLabel(code, lang) {
    const c = getByCode(code);
    if (!c) return code;
    return c.flag + ' ' + c.code + ' — ' + (lang === 'en' ? c.name_en : c.name_sr);
  }

  function isValid(code) {
    return !!getByCode(code);
  }

  /* ---------- RADNI DANI (za čekove) ---------- */

  /**
   * Da li je datum subota ili nedelja?
   */
  function isWeekend(date) {
    const d = date.getDay();
    return d === 0 || d === 6;
  }

  /**
   * Dodaje N radnih dana na dati datum.
   * Preskače subote i nedelje.
   */
  function addBusinessDays(date, n) {
    const result = new Date(date.getTime());
    let added = 0;
    while (added < n) {
      result.setDate(result.getDate() + 1);
      if (!isWeekend(result)) added += 1;
    }
    return result;
  }

  /**
   * Vraća ISO datum N radnih dana od datog ISO datuma.
   */
  function addBusinessDaysISO(isoDate, n) {
    if (!isoDate) return '';
    const parts = String(isoDate).split('-');
    if (parts.length !== 3) return '';
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(d.getTime())) return '';
    const result = addBusinessDays(d, n);
    const y = result.getFullYear();
    const m = String(result.getMonth() + 1).padStart(2, '0');
    const day = String(result.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  global.currencies = {
    getAll: getAll,
    getByCode: getByCode,
    getSymbol: getSymbol,
    getFlag: getFlag,
    getName: getName,
    getLabel: getLabel,
    isValid: isValid,
    DEFAULT_CODE: DEFAULT_CODE,
    addBusinessDays: addBusinessDays,
    addBusinessDaysISO: addBusinessDaysISO,
    isWeekend: isWeekend
  };
})(window);
