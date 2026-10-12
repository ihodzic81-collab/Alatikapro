/* =========================================================
   ALATIKA PRO — utils.js
   Pomoćne funkcije: datumi, brojevi, formatiranje, DOM.
   Podrška za format datuma: DD/MM/YYYY (default) ili MM/DD/YYYY.
   ========================================================= */

(function (global) {
  'use strict';

  const LS_DATE_FORMAT = 'settings.dateFormat';
  const DEFAULT_DATE_FORMAT = 'DMY';   /* DMY = DD/MM/YYYY, MDY = MM/DD/YYYY */

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
   * Formatira ISO datum prema izabranom formatu.
   * DMY = DD/MM/YYYY
   * MDY = MM/DD/YYYY
   */
  function formatDate(iso) {
    const d = fromISO(iso);
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const fmt = getDateFormat();
    if (fmt === 'MDY') {
      return month + '/' + day + '/' + year;
    }
    return day + '/' + month + '/' + year;
  }

  /**
   * Formatira ISO datum u dugom obliku (npr. "12. oktobar 2026.").
   * Ovaj oblik ne zavisi od izabranog formata.
   */
  function formatDateLong(iso, lang) {
    const d = fromISO(iso);
    if (!d) return '';
    const locale = lang === 'en' ? 'en-GB' : 'sr-RS';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
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
    /* Ako je mesec kratak (npr. 31. u aprilu) — pomeri na poslednji dan */
    if (d.getDate() < day) {
      d.setDate(0);
    }
    return toISODate(d);
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
    daysBetween: daysBetween,
    daysFromToday: daysFromToday,
    isPast: isPast,
    isToday: isToday,
    isTomorrow: isTomorrow,
    addDays: addDays,
    addMonths: addMonths,

    getDateFormat: getDateFormat,
    setDateFormat: setDateFormat,

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
