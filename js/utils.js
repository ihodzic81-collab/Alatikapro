/* =========================================================
   ALATIKA PRO — utils.js
   Pomoćne funkcije + pametan date input (DD / MM / GGGG).
   ========================================================= */

(function (global) {
  'use strict';

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

  /* ---------- DATUM ---------- */

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
    if (d.getDate() < day) {
      d.setDate(0);
    }
    return toISODate(d);
  }

  /* ---------- FORMAT DATUMA ---------- */

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

  /* ---------- PAMETAN DATE INPUT (isključivo tekstualni) ---------- */

  function dateInputHTML(name, value, opts) {
    opts = opts || {};
    const fmt = getDateFormat();
    const placeholder = opts.placeholder || (fmt === 'MDY' ? 'MM/DD/GGGG' : 'DD/MM/GGGG');
    const required = opts.required ? ' required' : '';
    const displayValue = value ? formatDate(value) : '';

    const inputId = 'smartDate_' + name + '_' + Math.random().toString(36).slice(2, 8);

    return [
      '<div class="smart-date" data-smart-date="' + name + '" data-format="' + fmt + '">',
      '  <input type="text" inputmode="numeric" autocomplete="off"',
      '         class="input" id="' + inputId + '"',
      '         name="' + name + '"',
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
      '</div>'
    ].join('');
  }

  function bindDateInputs(root) {
    root = root || document;
    const wraps = root.querySelectorAll('[data-smart-date]');

    wraps.forEach(function (wrap) {
      if (wrap.dataset.bound) return;
      wrap.dataset.bound = '1';

      const input = wrap.querySelector('input[type="text"]');
      const iconBtn = wrap.querySelector('.smart-date-icon');
      const fmt = wrap.getAttribute('data-format') || getDateFormat();

      if (!input) return;

      input.addEventListener('input', function () {
        const raw = input.value.replace(/[^\d]/g, '').slice(0, 8);
        let out = '';

        if (fmt === 'MDY') {
          if (raw.length <= 2) out = raw;
          else if (raw.length <= 4) out = raw.slice(0, 2) + '/' + raw.slice(2);
          else out = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
        } else {
          if (raw.length <= 2) out = raw;
          else if (raw.length <= 4) out = raw.slice(0, 2) + '/' + raw.slice(2);
          else out = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
        }

        input.value = out;
        input.classList.remove('input-error');
      });

      input.addEventListener('blur', function () {
        const iso = parseDisplayToISO(input.value, fmt);
        if (!iso) {
          if (input.value.trim() === '') {
            input.classList.remove('input-error');
            return;
          }
          input.classList.add('input-error');
          return;
        }
        input.classList.remove('input-error');
        input.value = formatDate(iso);
      });

      if (iconBtn) {
        iconBtn.addEventListener('click', function () {
          openMiniCalendar(wrap, input, fmt, iconBtn);
        });
      }
    });
  }

  function parseDisplayToISO(display, fmt) {
    if (!display) return '';
    const parts = String(display).split('/');
    if (parts.length !== 3) return '';

    const f = fmt || getDateFormat();
    let day, month, year;

    if (f === 'MDY') {
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

  function openMiniCalendar(wrap, input, fmt, iconBtn) {
    const existing = wrap.querySelector('.mini-calendar');
    if (existing) existing.parentNode.removeChild(existing);

    const currentISO = parseDisplayToISO(input.value, fmt);
    const currentDate = currentISO ? parseISODate(currentISO) : new Date();
    let viewYear = currentDate.getFullYear();
    let viewMonth = currentDate.getMonth();

    const cal = document.createElement('div');
    cal.className = 'mini-calendar';

    function render() {
      const firstDay = new Date(viewYear, viewMonth, 1);
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const startWeekday = (firstDay.getDay() + 6) % 7;

      const lang = (global.i18n && global.i18n.getLang) ? global.i18n.getLang() : 'sr';
      const monthNames = lang === 'en'
        ? ['January','February','March','April','May','June','July','August','September','October','November','December']
        : ['Januar','Februar','Mart','April','Maj','Jun','Jul','Avgust','Septembar','Oktobar','Novembar','Decembar'];
      const dayNames = lang === 'en'
        ? ['Mo','Tu','We','Th','Fr','Sa','Su']
        : ['Po','Ut','Sr','Če','Pe','Su','Ne'];

      const currentYear = new Date().getFullYear();
      const minYear = 1900;
      const maxYear = currentYear + 5;

      let yearOptions = '';
      for (let y = maxYear; y >= minYear; y--) {
        yearOptions += '<option value="' + y + '"' + (y === viewYear ? ' selected' : '') + '>' + y + '</option>';
      }

      let monthOptions = '';
      monthNames.forEach(function (mn, idx) {
        monthOptions += '<option value="' + idx + '"' + (idx === viewMonth ? ' selected' : '') + '>' + mn + '</option>';
      });

      let html = [
        '<div class="mc-header">',
        '  <button type="button" class="mc-nav" data-mc-dir="-12" title="Prethodna godina">«</button>',
        '  <button type="button" class="mc-nav" data-mc-dir="-1" title="Prethodni mesec">‹</button>',
        '  <select class="mc-select-month" data-mc-month>' + monthOptions + '</select>',
        '  <select class="mc-select-year" data-mc-year>' + yearOptions + '</select>',
        '  <button type="button" class="mc-nav" data-mc-dir="1" title="Sledeći mesec">›</button>',
        '  <button type="button" class="mc-nav" data-mc-dir="12" title="Sledeća godina">»</button>',
        '</div>',
        '<div class="mc-days">'
      ];

      dayNames.forEach(function (d) {
        html.push('<span class="mc-day-name">' + d + '</span>');
      });
      html.push('</div>');

      html.push('<div class="mc-grid">');

      for (let i = 0; i < startWeekday; i++) {
        html.push('<span class="mc-empty"></span>');
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const iso = viewYear + '-' + pad2(viewMonth + 1) + '-' + pad2(day);
        const isToday = iso === todayISO();
        const isSelected = currentISO === iso;
        let cls = 'mc-day';
        if (isToday) cls += ' today';
        if (isSelected) cls += ' selected';
        html.push('<button type="button" class="' + cls + '" data-mc-day="' + iso + '">' + day + '</button>');
      }

      html.push('</div>');
      cal.innerHTML = html.join('');

      cal.querySelectorAll('[data-mc-dir]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          const dir = Number(btn.getAttribute('data-mc-dir'));
          if (Math.abs(dir) === 12) {
            viewYear += dir / 12;
            if (viewYear < minYear) viewYear = minYear;
            if (viewYear > maxYear) viewYear = maxYear;
          } else {
            viewMonth += dir;
            if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
            if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
          }
          render();
        });
      });

      const monthSelect = cal.querySelector('[data-mc-month]');
      if (monthSelect) {
        monthSelect.addEventListener('change', function (e) {
          e.stopPropagation();
          viewMonth = Number(monthSelect.value);
          render();
        });
      }

      const yearSelect = cal.querySelector('[data-mc-year]');
      if (yearSelect) {
        yearSelect.addEventListener('change', function (e) {
          e.stopPropagation();
          viewYear = Number(yearSelect.value);
          render();
        });
      }

      cal.querySelectorAll('[data-mc-day]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          const iso = btn.getAttribute('data-mc-day');
          input.value = formatDate(iso);
          input.classList.remove('input-error');
          if (cal.parentNode) cal.parentNode.removeChild(cal);
        });
      });
    }

    render();
    wrap.appendChild(cal);

    /* Pametno pozicioniranje — da ne izlazi van ekrana */
    const rect = cal.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    if (rect.right > viewportWidth - 8) {
      cal.style.left = 'auto';
      cal.style.right = '0';
    } else {
      cal.style.left = '0';
      cal.style.right = 'auto';
    }

    setTimeout(function () {
      function closeCal(e) {
        if (!cal.contains(e.target) && e.target !== input && e.target !== iconBtn) {
          if (cal.parentNode) cal.parentNode.removeChild(cal);
          document.removeEventListener('click', closeCal);
        }
      }
      document.addEventListener('click', closeCal);
    }, 10);
  }

  function getDateValue(root, name) {
    if (!root) return '';
    const input = root.querySelector('input[type="text"][name="' + name + '"]');
    if (input && input.value) {
      const wrap = input.closest('[data-smart-date]');
      const fmt = wrap ? wrap.getAttribute('data-format') : getDateFormat();
      return parseDisplayToISO(input.value, fmt);
    }
    return '';
  }

  function setDateValue(root, name, iso) {
    if (!root) return;
    const input = root.querySelector('input[type="text"][name="' + name + '"]');
    if (input) input.value = iso ? formatDate(iso) : '';
  }

  /* ---------- PARSIRANJE IZNOSA ---------- */

  function parseAmount(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    let s = String(value).trim();
    if (!s) return 0;
    s = s.replace(/[^\d.,-]/g, '');
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
