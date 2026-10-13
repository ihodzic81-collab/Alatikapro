/* =========================================================
   ALATIKA PRO — utils.js
   Pomoćne funkcije + pametan date input:
   - Korisnik kuca samo cifre: 2 5 1 2 2 0 2 6
   - Program sam dodaje " / " separator: 25 / 12 / 2026
   - Klik na kalendar → native picker
   - Podrška za DD/MM/GGGG (default) i MM/DD/GGGG
   ========================================================= */

(function (global) {
  'use strict';

  const LS_DATE_FORMAT = 'settings.dateFormat';
  const DEFAULT_DATE_FORMAT = 'DMY';
  const SEP = ' / ';

  /* ---------- DOM ---------- */

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        if (typeof c === 'string' || typeof c === 'number') {
          node.appendChild(document.createTextNode(String(c)));
        } else {
          node.appendChild(c);
        }
      });
    }
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  /* ---------- ESCAPE ---------- */

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------- ID ---------- */

  function uid(prefix) {
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 8);
    return (prefix ? prefix + '-' : '') + t + r;
  }

  /* ---------- FORMAT DATUMA ---------- */

  function getDateFormat() {
    try {
      const v = localStorage.getItem('alatikapro.' + LS_DATE_FORMAT);
      if (v === 'DMY' || v === 'MDY') return v;
    } catch (e) {}
    return DEFAULT_DATE_FORMAT;
  }

  function setDateFormat(fmt) {
    if (fmt !== 'DMY' && fmt !== 'MDY') return;
    try {
      localStorage.setItem('alatikapro.' + LS_DATE_FORMAT, fmt);
    } catch (e) {}
  }

  /* ---------- DATUMI ---------- */

  function todayISO() {
    const d = new Date();
    return toISODate(d);
  }

  function toISODate(d) {
    if (!(d instanceof Date)) d = new Date(d);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function fromISO(iso) {
    if (!iso) return null;
    const parts = String(iso).split('-');
    if (parts.length !== 3) return null;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Formatira ISO datum u tekstualni prikaz.
   * DMY = DD / MM / YYYY
   * MDY = MM / DD / YYYY
   */
  function formatDate(iso) {
    const d = fromISO(iso);
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const fmt = getDateFormat();
    if (fmt === 'MDY') {
      return month + SEP + day + SEP + year;
    }
    return day + SEP + month + SEP + year;
  }

  function formatDateLong(iso, lang) {
    const d = fromISO(iso);
    if (!d) return '';
    const locale = lang === 'en' ? 'en-GB' : 'sr-RS';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /**
   * Parsira tekstualni datum u bilo kom formatu (razmaci, crtice, tačke, kose crte)
   * Vraća ISO datum "YYYY-MM-DD" ili '' ako ne može.
   * Prihvata:
   *   "25 / 12 / 2026"
   *   "25/12/2026"
   *   "25-12-2026"
   *   "25.12.2026"
   *   "25 12 2026"
   *   "25122026" (8 cifara)
   */
  function parseDateInput(text) {
    if (!text) return '';
    let s = String(text).trim();
    if (!s) return '';

    /* Ako je već u ISO formatu */
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    /* Ako je samo 8 cifara — pretvori u DD/MM/YYYY */
    const digitsOnly = s.replace(/\D/g, '');
    if (digitsOnly.length === 8) {
      const a = digitsOnly.slice(0, 2);
      const b = digitsOnly.slice(2, 4);
      const y = digitsOnly.slice(4, 8);
      return buildISO(a, b, y);
    }
    if (digitsOnly.length === 6) {
      /* DD MM YY */
      const a = digitsOnly.slice(0, 2);
      const b = digitsOnly.slice(2, 4);
      let y = digitsOnly.slice(4, 6);
      y = Number(y) < 50 ? '20' + y : '19' + y;
      return buildISO(a, b, y);
    }

    /* Izdvoji brojeve */
    const nums = s.match(/\d+/g);
    if (!nums || nums.length !== 3) return '';

    let a = nums[0].padStart(2, '0');
    let b = nums[1].padStart(2, '0');
    let y = nums[2];
    if (y.length === 2) {
      y = Number(y) < 50 ? '20' + y : '19' + y;
    }
    if (y.length !== 4) return '';

    return buildISO(a, b, y);
  }

  function buildISO(a, b, y) {
    let day, month;
    const fmt = getDateFormat();

    const na = Number(a);
    const nb = Number(b);

    if (fmt === 'MDY') {
      month = na;
      day = nb;
    } else {
      day = na;
      month = nb;
    }

    /* Ako je jedan > 12 a drugi <= 12 → zameni */
    if (day > 12 && month > 12) return '';
    if (day > 12 && month <= 12) {
      /* OK */
    } else if (month > 12 && day <= 12) {
      const tmp = day;
      day = month;
      month = tmp;
    }

    const yi = Number(y);
    if (month < 1 || month > 12) return '';
    if (day < 1 || day > 31) return '';
    if (yi < 1900 || yi > 2200) return '';

    const d = new Date(yi, month - 1, day);
    if (isNaN(d.getTime())) return '';
    if (d.getMonth() !== month - 1) return '';
    if (d.getDate() !== day) return '';

    return toISODate(d);
  }

  function daysBetween(isoA, isoB) {
    const a = fromISO(isoA);
    const b = fromISO(isoB);
    if (!a || !b) return 0;
    const ms = b.getTime() - a.getTime();
    return Math.round(ms / 86400000);
  }

  function daysFromToday(iso) {
    return daysBetween(todayISO(), iso);
  }

  function isPast(iso) {
    return daysFromToday(iso) < 0;
  }

  function isToday(iso) {
    return iso === todayISO();
  }

  function isTomorrow(iso) {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return iso === toISODate(t);
  }

  function addDays(iso, n) {
    const d = fromISO(iso);
    if (!d) return '';
    d.setDate(d.getDate() + n);
    return toISODate(d);
  }

  function addMonths(iso, n) {
    const d = fromISO(iso);
    if (!d) return '';
    const day = d.getDate();
    d.setMonth(d.getMonth() + n);
    if (d.getDate() < day) {
      d.setDate(0);
    }
    return toISODate(d);
  }

  /* ---------- PAMETAN DATE INPUT SA MASKOM ---------- */

  /**
   * Vraća HTML string za pametno datum polje.
   */
  function dateInputHTML(name, value, opts) {
    opts = opts || {};
    const id = 'dateinput-' + name + '-' + Math.random().toString(36).slice(2, 8);
    const isoValue = value || '';
    const displayValue = isoValue ? formatDate(isoValue) : '';
    const required = opts.required ? 'required' : '';
    const placeholder = opts.placeholder || (getDateFormat() === 'MDY' ? 'MM / DD / GGGG' : 'DD / MM / GGGG');
    const className = opts.className || 'input';

    return [
      '<div class="smart-date" data-smart-date="' + name + '">',
      '  <input type="text" inputmode="numeric" class="' + className + '" ',
      '         name="' + name + '" ',
      '         id="' + id + '" ',
      '         value="' + escapeHtml(displayValue) + '" ',
      '         placeholder="' + placeholder + '" ',
      '         autocomplete="off" ',
      '         ' + required + ' ',
      '         data-smart-display />',
      '  <button type="button" class="smart-date-icon" tabindex="-1" aria-label="Kalendar">',
      '    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '      <rect x="3" y="5" width="18" height="16" rx="2"></rect>',
      '      <line x1="3" y1="10" x2="21" y2="10"></line>',
      '      <line x1="8" y1="3" x2="8" y2="7"></line>',
      '      <line x1="16" y1="3" x2="16" y2="7"></line>',
      '    </svg>',
      '  </button>',
      '  <input type="date" class="smart-date-hidden" name="' + name + '_native" value="' + escapeHtml(isoValue) + '" tabindex="-1" aria-hidden="true" data-smart-native />',
      '</div>'
    ].join('');
  }

  /**
   * Primenjuje masku na tekstualno polje:
   * - Dozvoljava samo cifre
   * - Automatski dodaje " / " separator posle 2. i 4. cifre
   * - Postavlja kursor na kraj
   */
  function attachDateMask(display, native) {
    if (!display) return;

    display.addEventListener('keydown', function (e) {
  /* Dozvoli navigacione tastere */
  const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End', 'Escape'];
  if (allowed.indexOf(e.key) !== -1) return;
  /* Dozvoli Ctrl/Cmd kombinacije (copy/paste/select all) */
  if (e.ctrlKey || e.metaKey) return;
  /* Dozvoli cifre */
  if (/^\d$/.test(e.key)) return;
  /* Dozvoli / i razmak (ako korisnik želi ručno da ukuca) */
  if (e.key === '/' || e.key === ' ') return;
  /* Sve ostalo blokiraj */
  e.preventDefault();
});

    display.addEventListener('input', function (e) {
      const input = e.target;
      const cursorWasAtEnd = input.selectionStart === input.value.length;

      /* Izvuci samo cifre */
      let digits = input.value.replace(/\D/g, '');

      /* Ograniči na 8 cifara */
      if (digits.length > 8) digits = digits.slice(0, 8);

      /* Formatiraj sa " / " */
      let formatted = '';
      if (digits.length <= 2) {
        formatted = digits;
      } else if (digits.length <= 4) {
        formatted = digits.slice(0, 2) + SEP + digits.slice(2);
      } else {
        formatted = digits.slice(0, 2) + SEP + digits.slice(2, 4) + SEP + digits.slice(4);
      }

      /* Ako je novo formatiranje različito od unosa, zameni */
      if (input.value !== formatted) {
        input.value = formatted;
        if (cursorWasAtEnd) {
          /* Kursor na kraj */
          input.setSelectionRange(formatted.length, formatted.length);
        }
      }

      /* Ažuriraj native i ISO vrednost */
      const iso = parseDateInput(formatted);
      if (native) {
        native.value = iso || '';
      }
      if (iso) {
        display.classList.remove('input-error');
      } else if (digits.length === 8) {
        display.classList.add('input-error');
      } else {
        display.classList.remove('input-error');
      }
    });

    display.addEventListener('blur', function () {
      const text = display.value.trim();
      if (!text) {
        if (native) native.value = '';
        display.classList.remove('input-error');
        return;
      }
      const iso = parseDateInput(text);
      if (iso) {
        display.value = formatDate(iso);
        if (native) native.value = iso;
        display.classList.remove('input-error');
      } else {
        display.classList.add('input-error');
      }
    });

    display.addEventListener('paste', function (e) {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      const iso = parseDateInput(pasted);
      if (iso) {
        display.value = formatDate(iso);
        if (native) native.value = iso;
        display.classList.remove('input-error');
      } else {
        /* Ako ne može da parsira, samo ubaci cifre */
        const digits = pasted.replace(/\D/g, '').slice(0, 8);
        let formatted = '';
        if (digits.length <= 2) formatted = digits;
        else if (digits.length <= 4) formatted = digits.slice(0, 2) + SEP + digits.slice(2);
        else formatted = digits.slice(0, 2) + SEP + digits.slice(2, 4) + SEP + digits.slice(4);
        display.value = formatted;
        const iso2 = parseDateInput(formatted);
        if (native) native.value = iso2 || '';
      }
    });

    /* Klik na kalendar */
    const icon = display.parentNode.querySelector('.smart-date-icon');
    if (icon && native) {
      icon.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openNativePicker(native);
      });
    }

    /* Promena u native kalendaru */
    if (native) {
      native.addEventListener('change', function () {
        if (native.value) {
          display.value = formatDate(native.value);
          display.classList.remove('input-error');
        } else {
          display.value = '';
        }
      });
    }
  }

  function bindDateInputs(root) {
    root = root || document;
    const wrappers = root.querySelectorAll('[data-smart-date]');

    wrappers.forEach(function (wrap) {
      if (wrap.dataset.bound) return;
      wrap.dataset.bound = '1';

      const display = wrap.querySelector('[data-smart-display]');
      const native = wrap.querySelector('[data-smart-native]');

      if (!display || !native) return;

      attachDateMask(display, native);
    });
  }

  function openNativePicker(native) {
    if (!native) return;
    if (typeof native.showPicker === 'function') {
      try {
        native.showPicker();
        return;
      } catch (e) {}
    }
    native.style.display = 'block';
    native.style.position = 'absolute';
    native.style.opacity = '0';
    native.style.pointerEvents = 'none';
    native.focus();
    native.click();
  }

  function getDateValue(root, name) {
    root = root || document;
    const wrap = root.querySelector('[data-smart-date="' + name + '"]');
    if (!wrap) return '';
    const native = wrap.querySelector('[data-smart-native]');
    return native ? (native.value || '') : '';
  }

  function setDateValue(root, name, iso) {
    root = root || document;
    const wrap = root.querySelector('[data-smart-date="' + name + '"]');
    if (!wrap) return;
    const display = wrap.querySelector('[data-smart-display]');
    const native = wrap.querySelector('[data-smart-native]');
    if (display) display.value = iso ? formatDate(iso) : '';
    if (native) native.value = iso || '';
  }

  /* ---------- BROJEVI I VALUTE ---------- */

  function parseAmount(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return isFinite(value) ? value : 0;
    let s = String(value).trim();
    s = s.replace(/\s/g, '');
    s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  function formatAmount(value, lang, currency) {
    const n = typeof value === 'number' ? value : parseAmount(value);
    const locale = lang === 'en' ? 'en-GB' : 'sr-RS';
    const opts = {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    };
    const formatted = n.toLocaleString(locale, opts);
    if (currency) return formatted + ' ' + currency;
    return formatted;
  }

  function formatInt(value, lang) {
    const n = typeof value === 'number' ? value : parseAmount(value);
    const locale = lang === 'en' ? 'en-GB' : 'sr-RS';
    return n.toLocaleString(locale, { maximumFractionDigits: 0 });
  }

  /* ---------- TEKST ---------- */

  function truncate(str, max) {
    if (!str) return '';
    const s = String(str);
    if (s.length <= max) return s;
    return s.slice(0, max - 1).trim() + '…';
  }

  function capitalize(str) {
    if (!str) return '';
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
  }

  function slugify(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /* ---------- DATOTEKE ---------- */

  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsArrayBuffer(file);
    });
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
  }

  /* ---------- MISC ---------- */

  function debounce(fn, wait) {
    let timer = null;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait || 200);
    };
  }

  function download(filename, content, mime) {
    const blob = content instanceof Blob
      ? content
      : new Blob([content], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function safeJsonParse(str, fallback) {
    try { return JSON.parse(str); } catch (e) { return fallback; }
  }

  /* ---------- EXPORT ---------- */

  global.utils = {
    $: $,
    $$: $$,
    el: el,
    clear: clear,
    escapeHtml: escapeHtml,
    uid: uid,

    todayISO: todayISO,
    toISODate: toISODate,
    fromISO: fromISO,
    formatDate: formatDate,
    formatDateLong: formatDateLong,
    parseDateInput: parseDateInput,
    daysBetween: daysBetween,
    daysFromToday: daysFromToday,
    isPast: isPast,
    isToday: isToday,
    isTomorrow: isTomorrow,
    addDays: addDays,
    addMonths: addMonths,

    getDateFormat: getDateFormat,
    setDateFormat: setDateFormat,

    dateInputHTML: dateInputHTML,
    bindDateInputs: bindDateInputs,
    attachDateMask: attachDateMask,
    getDateValue: getDateValue,
    setDateValue: setDateValue,

    parseAmount: parseAmount,
    formatAmount: formatAmount,
    formatInt: formatInt,

    truncate: truncate,
    capitalize: capitalize,
    slugify: slugify,

    readFileAsDataURL: readFileAsDataURL,
    readFileAsArrayBuffer: readFileAsArrayBuffer,
    formatBytes: formatBytes,

    debounce: debounce,
    download: download,
    safeJsonParse: safeJsonParse
  };
})(window);
