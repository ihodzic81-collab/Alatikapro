/* =========================================================
   ALATIKA PRO — utils.js
   Pomoćne funkcije + pametan date input (DD / MM / GGGG).
   ========================================================= */

(function (global) {
  'use strict';

  /* ---------- ID / ESCAPE / TRUNCATE ---------- */

  function uid(prefix) {
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 10);
    return (prefix ? prefix + '-' : '') + t + '-' + r;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function truncate(str, len) {
    if (!str) return '';
    const s = String(str);
    if (s.length <= len) return s;
    return s.slice(0, len - 1).trim() + '…';
  }

  function debounce(fn, ms) {
    let t = null;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(ctx, args);
      }, ms);
    };
  }

  /* ---------- DATUM — OSNOVNO ---------- */

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function toISODate(date) {
    if (!date || isNaN(date.getTime())) return '';
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function parseISODate(iso) {
    if (!iso) return null;
    const parts = String(iso).split('-');
    if (parts.length !== 3) return null;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!y || !m || !d) return null;
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return null;
    return date;
  }

  function daysFromToday(iso) {
    const d = parseISODate(iso);
    if (!d) return null;
    const today = new Date();
    const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((b - a) / 86400000);
  }

  function addDays(iso, n) {
    const d = parseISODate(iso);
    if (!d) return '';
    d.setDate(d.getDate() + Number(n || 0));
    return toISODate(d);
  }

  function addMonths(iso, n) {
    const d = parseISODate(iso);
    if (!d) return '';
    const day = d.getDate();
    d.setMonth(d.getMonth() + Number(n || 0));
    /* Ako je dan prekoračen (npr. 31. u mesecu sa 30 dana) — vrati na poslednji dan */
    if (d.getDate() < day) {
      d.setDate(0);
    }
    return toISODate(d);
  }

  /* ---------- FORMAT DATUMA — podržava DMY i MDY ---------- */

  const LS_DATE_FORMAT = 'settings.dateFormat';
  const DEFAULT_DATE_FORMAT = 'DMY';

  function getDateFormat() {
    const saved = global.storage && global.storage.lsGet
      ? global.storage.lsGet(LS_DATE_FORMAT, DEFAULT_DATE_FORMAT)
      : DEFAULT_DATE_FORMAT;
    return (saved === 'MDY') ? 'MDY' : 'DMY';
  }

  function setDateFormat(fmt) {
    if (!global.storage || !global.storage.lsSet) return;
    global.storage.lsSet(LS_DATE_FORMAT, fmt === 'MDY' ? 'MDY' : 'DMY');
    try {
      global.dispatchEvent(new CustomEvent('alatikapro:dateformatchange', { detail: { format: fmt } }));
    } catch (e) {}
  }

  /**
   * Formatira ISO datum (YYYY-MM-DD) u prikaz po izabranom formatu.
   */
  function formatDate(iso, lang) {
    if (!iso) return '';
    const d = parseISODate(iso);
    if (!d) return String(iso);

    const day = pad2(d.getDate());
    const month = pad2(d.getMonth() + 1);
    const year = d.getFullYear();

    const fmt = getDateFormat();
    if (fmt === 'MDY') {
      return month + '/' + day + '/' + year;
    }
    return day + '/' + month + '/' + year;
  }

  /* ---------- PAMETAN DATE INPUT ---------- */

  /**
   * Vraća HTML za pametan date input (tekstualni input + skriveni native date).
   * opts:
   *   - required: bool
   *   - placeholder: string (default "DD/MM/GGGG")
   */
  function dateInputHTML(name, value, opts) {
    opts = opts || {};
    const fmt = getDateFormat();
    const placeholder = opts.placeholder || (fmt === 'MDY' ? 'MM/DD/GGGG' : 'DD/MM/GGGG');
    const required = opts.required ? ' required' : '';
    const displayValue = value ? formatDate(value) : '';

    const inputId = 'smartDate_' + name + '_' + Math.random().toString(36).slice(2, 8);

    return [
      '<div class="smart-date" data-smart-date="' + name + '">',
      '  <input type="text" inputmode="numeric" autocomplete="off"',
      '         class="input" id="' + inputId + '"',
      '         name="' + name + '_display"',
      '         value="' + escapeHtml(displayValue) + '"',
      '         placeholder="' + placeholder + '"',
      '         maxlength="10"' + required + ' />',
      '  <button type="button" class="smart-date-icon" aria-label="Otvori kalendar">',
      '    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '      <rect x="3" y="5" width="18" height="16" rx="2"></rect>',
      '      <line x1="3" y1="10" x2="21" y2="10"></line>',
      '      <line x1="8" y1="3" x2="8" y2="7"></line>',
      '      <line x1="16" y1="3" x2="16" y2="7"></line>',
      '    </svg>',
      '  </button>',
      '  <input type="date" class="smart-date-hidden"',
      '         name="' + name + '"',
      '         value="' + escapeHtml(value || '') + '"',
      '         tabindex="-1" aria-hidden="true" />',
      '</div>'
    ].join('');
  }

  /**
   * Povezuje sve pametne date inpute unutar datog root-a.
   * - Formatira unos dok korisnik kuca (DD / MM / GGGG)
   * - Validira datum
   * - Sinhronizuje sa skrivenim native date inputom
   * - Otvara native kalendar na klik ikonice
   */
  function bindDateInputs(root) {
    root = root || document;
    const wraps = root.querySelectorAll('[data-smart-date]');

    wraps.forEach(function (wrap) {
      if (wrap.dataset.bound) return;
      wrap.dataset.bound = '1';

      const display = wrap.querySelector('input[type="text"]');
      const hidden = wrap.querySelector('input[type="date"]');
      const iconBtn = wrap.querySelector('.smart-date-icon');

      if (!display || !hidden) return;

      /* Formatiraj unos dok korisnik kuca */
      display.addEventListener('input', function () {
        const raw = display.value.replace(/[^\d]/g, '').slice(0, 8);
        const fmt = getDateFormat();
        let out = '';

        if (fmt === 'MDY') {
          /* MM / DD / GGGG */
          if (raw.length <= 2) out = raw;
          else if (raw.length <= 4) out = raw.slice(0, 2) + '/' + raw.slice(2);
          else out = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
        } else {
          /* DD / MM / GGGG */
          if (raw.length <= 2) out = raw;
          else if (raw.length <= 4) out = raw.slice(0, 2) + '/' + raw.slice(2);
          else out = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
        }

        display.value = out;
        display.classList.remove('input-error');

        /* Sinhronizuj sa skrivenim */
        const iso = parseDisplayToISO(out);
        hidden.value = iso || '';
      });

      /* Na blur — validiraj i normalizuj */
      display.addEventListener('blur', function () {
        const iso = parseDisplayToISO(display.value);
        if (!iso) {
          display.classList.add('input-error');
          hidden.value = '';
          return;
        }
        display.classList.remove('input-error');
        hidden.value = iso;
        display.value = formatDate(iso);
      });

      /* Klik na ikonicu — otvori native kalendar */
      if (iconBtn) {
        iconBtn.addEventListener('click', function () {
          /* Ako hidden ima vrednost, sinhronizuj display pre otvaranja */
          if (hidden.value) {
            display.value = formatDate(hidden.value);
          }
          if (typeof hidden.showPicker === 'function') {
            try { hidden.showPicker(); } catch (e) { hidden.click(); }
          } else {
            hidden.click();
          }
        });
      }

      /* Kada se native date promeni — sinhronizuj display */
      hidden.addEventListener('change', function () {
        if (hidden.value) {
          display.value = formatDate(hidden.value);
          display.classList.remove('input-error');
        } else {
          display.value = '';
        }
      });
    });
  }

  /**
   * Parsira prikaz (DD/MM/GGGG ili MM/DD/GGGG) u ISO (YYYY-MM-DD).
   * Vraća '' ako nije validan.
   */
  function parseDisplayToISO(display) {
    if (!display) return '';
    const parts = String(display).split('/');
    if (parts.length !== 3) return '';

    const fmt = getDateFormat();
    let day, month, year;

    if (fmt === 'MDY') {
      month = Number(parts[0]);
      day = Number(parts[1]);
      year = Number(parts[2]);
    } else {
      day = Number(parts[0]);
      month = Number(parts[1]);
      year = Number(parts[2]);
    }

    if (!day || !month || !year) return '';
    if (year < 1900 || year > 2200) return '';
    if (month < 1 || month > 12) return '';
    if (day < 1 || day > 31) return '';

    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return '';
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return '';

    return toISODate(d);
  }

  /**
   * Vraća vrednost datuma iz forme (iz skrivenog native inputa).
   */
  function getDateValue(root, name) {
    if (!root) return '';
    const hidden = root.querySelector('input[type="date"][name="' + name + '"]');
    if (hidden && hidden.value) return hidden.value;
    const display = root.querySelector('input[type="text"][name="' + name + '_display"]');
    if (display && display.value) return parseDisplayToISO(display.value);
    return '';
  }

  /**
   * Postavlja vrednost datuma u formu.
   */
  function setDateValue(root, name, iso) {
    if (!root) return;
    const hidden = root.querySelector('input[type="date"][name="' + name + '"]');
    const display = root.querySelector('input[type="text"][name="' + name + '_display"]');
    if (hidden) hidden.value = iso || '';
    if (display) display.value = iso ? formatDate(iso) : '';
  }

  /* ---------- PARSIRANJE IZNOSA ---------- */

  /**
   * Parsira string u broj. Podržava i zarez i tačku.
   */
  function parseAmount(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    let s = String(value).trim();
    if (!s) return 0;
    /* Ukloni sve osim cifara, zareza i tačke */
    s = s.replace(/[^\d.,-]/g, '');
    /* Ako ima oba — zarez je decimalni, tačka je separator hiljada */
    if (s.indexOf(',') !== -1 && s.indexOf('.') !== -1) {
      s = s.replace(/\./g, '');
      s = s.replace(',', '.');
    } else if (s.indexOf(',') !== -1) {
      s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  /* ---------- MINI DOM HELPER ---------- */

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

  /* ---------- EXPORT ---------- */

  global.utils = {
    uid: uid,
    escapeHtml: escapeHtml,
    truncate: truncate,
    debounce: debounce,

    todayISO: todayISO,
    toISODate: toISODate,
    parseISODate: parseISODate,
    daysFromToday: daysFromToday,
    addDays: addDays,
    addMonths: addMonths,

    getDateFormat: getDateFormat,
    setDateFormat: setDateFormat,
    formatDate: formatDate,

    dateInputHTML: dateInputHTML,
    bindDateInputs: bindDateInputs,
    parseDisplayToISO: parseDisplayToISO,
    getDateValue: getDateValue,
    setDateValue: setDateValue,

    parseAmount: parseAmount,
    el: el
  };
})(window);
