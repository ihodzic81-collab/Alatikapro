/* =========================================================
   ALATIKA PRO — nbs.js
   Kursna lista NBS (Narodna banka Srbije).
   - Povlači XML sa zvaničnog sajta NBS-a (preko proxy-ja)
   - Kešira rezultat u localStorage (radi offline)
   - Osvežava se 1x dnevno
   - Nazivi valuta se uzimaju iz našeg currencies.js (latinica)
   ========================================================= */

(function (global) {
  'use strict';

  const LS_RATES = 'nbs.rates';
  const LS_UPDATED = 'nbs.updatedAt';
  const NBS_URL = 'https://www.nbs.rs/export/sites/default/internet/latinica/scripts/kl_srednji.xml';
  const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
  const FETCH_TIMEOUT_MS = 10000;

  /* Proxy servisi kao fallback (jer NBS ne dozvoljava CORS direktno) */
  const PROXIES = [
    'https://corsproxy.io/?url=' + encodeURIComponent(NBS_URL),
    'https://api.allorigins.win/raw?url=' + encodeURIComponent(NBS_URL),
    'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(NBS_URL),
    'https://thingproxy.freeboard.io/fetch/' + NBS_URL
  ];

  const state = {
    rates: null,
    date: null,
    updatedAt: null,
    loading: false,
    error: null
  };

  /* ---------- PARSIRANJE XML ---------- */

  function parseNBSXML(xmlText) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');

      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        return { error: 'XML greška u NBS odgovoru.' };
      }

      /* Datum */
      let date = '';
      const dateEl = doc.querySelector('Datum');
      if (dateEl) date = dateEl.textContent.trim();

      /* Valute */
      const valutaEls = doc.querySelectorAll('Valuta');
      const rates = {};

      valutaEls.forEach(function (v) {
        const sifraEl = v.querySelector('Sifra');
        const srednjiEl = v.querySelector('Srednji');
        if (!sifraEl || !srednjiEl) return;

        const code = sifraEl.textContent.trim().toUpperCase();
        const value = parseFloat(srednjiEl.textContent.trim().replace(',', '.'));
        if (!isFinite(value) || value <= 0) return;

        /* Ime iz našeg currencies.js (latinica), ne iz XML-a (ćirilica) */
        let name = code;
        if (global.currencies && global.currencies.getName) {
          name = global.currencies.getName(code, 'sr');
        }

        rates[code] = {
          code: code,
          name: name,
          middle: value,
          unit: 1
        };
      });

      /* Uvek dodaj RSD kao baznu valutu */
      rates.RSD = {
        code: 'RSD',
        name: 'Srpski dinar',
        middle: 1,
        unit: 1
      };

      if (Object.keys(rates).length <= 1) {
        return { error: 'NBS lista je prazna ili nije prepoznata.' };
      }

      return { date: date, rates: rates };
    } catch (e) {
      return { error: 'Ne mogu da parsiram NBS odgovor: ' + e.message };
    }
  }

  /* ---------- FETCH SA TIMEOUT-om ---------- */

  function fetchWithTimeout(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = setTimeout(function () {
        if (controller) controller.abort();
        reject(new Error('Timeout'));
      }, timeoutMs);

      const opts = {
        method: 'GET',
        cache: 'no-store'
      };
      if (controller) opts.signal = controller.signal;

      fetch(url, opts).then(function (res) {
        clearTimeout(timer);
        if (!res.ok) {
          reject(new Error('HTTP ' + res.status));
          return;
        }
        res.text().then(resolve).catch(reject);
      }).catch(function (err) {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /* ---------- POVLAČENJE SA NBS (preko proxy-ja) ---------- */

  function fetchFromNBS() {
    /* Redosled: probaj direktno (možda radi u nekim browserima), pa proxiji */
    const urls = [NBS_URL].concat(PROXIES);

    let idx = 0;

    function tryNext() {
      if (idx >= urls.length) {
        return Promise.reject(new Error('NBS nije dostupan ni preko jednog proxy-ja.'));
      }
      const url = urls[idx++];
      return fetchWithTimeout(url, FETCH_TIMEOUT_MS).then(function (text) {
        const parsed = parseNBSXML(text);
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        return parsed;
      }).catch(function () {
        /* Probaj sledeći proxy */
        return tryNext();
      });
    }

    return tryNext();
  }

  /* ---------- KEŠ ---------- */

  function loadFromCache() {
    try {
      const ratesRaw = localStorage.getItem('alatikapro.' + LS_RATES);
      const updatedRaw = localStorage.getItem('alatikapro.' + LS_UPDATED);
      if (!ratesRaw) return null;
      const parsed = JSON.parse(ratesRaw);
      return {
        rates: parsed,
        date: parsed.__date || null,
        updatedAt: updatedRaw ? Number(updatedRaw) : null
      };
    } catch (e) {
      return null;
    }
  }

  function saveToCache(date, rates) {
    try {
      const copy = Object.assign({}, rates);
      copy.__date = date;
      localStorage.setItem('alatikapro.' + LS_RATES, JSON.stringify(copy));
      localStorage.setItem('alatikapro.' + LS_UPDATED, String(Date.now()));
    } catch (e) {}
  }

  /* ---------- GLAVNA FUNKCIJA ---------- */

  function getRates(forceRefresh) {
    /* Ako imamo svežu listu u memoriji */
    if (state.rates && state.updatedAt && !forceRefresh) {
      const age = Date.now() - state.updatedAt;
      if (age < REFRESH_INTERVAL_MS) {
        return Promise.resolve({
          rates: state.rates,
          date: state.date,
          updatedAt: state.updatedAt,
          fromCache: true,
          stale: false
        });
      }
    }

    const cached = loadFromCache();

    /* Ako je keš svež — vrati ga */
    if (cached && cached.updatedAt && !forceRefresh) {
      const age = Date.now() - cached.updatedAt;
      if (age < REFRESH_INTERVAL_MS) {
        state.rates = cached.rates;
        state.date = cached.date;
        state.updatedAt = cached.updatedAt;
        return Promise.resolve({
          rates: cached.rates,
          date: cached.date,
          updatedAt: cached.updatedAt,
          fromCache: true,
          stale: false
        });
      }
    }

    /* Povuci sa NBS-a */
    state.loading = true;
    state.error = null;

    return fetchFromNBS().then(function (result) {
      state.rates = result.rates;
      state.date = result.date;
      state.updatedAt = Date.now();
      state.loading = false;
      saveToCache(result.date, result.rates);
      return {
        rates: result.rates,
        date: result.date,
        updatedAt: state.updatedAt,
        fromCache: false,
        stale: false
      };
    }).catch(function (err) {
      state.loading = false;
      state.error = err.message || 'Nepoznata greška';

      /* Vrati keš ako postoji */
      if (cached) {
        state.rates = cached.rates;
        state.date = cached.date;
        state.updatedAt = cached.updatedAt;
        return {
          rates: cached.rates,
          date: cached.date,
          updatedAt: cached.updatedAt,
          fromCache: true,
          stale: true,
          error: state.error
        };
      }

      throw new Error('Kursna lista nije dostupna. ' + state.error);
    });
  }

  /* ---------- POMOĆNE ---------- */

  function getRate(code) {
    if (!state.rates) return null;
    const r = state.rates[code.toUpperCase()];
    if (!r) return null;
    return r.middle;
  }

  function convert(amount, fromCode, toCode) {
    if (!state.rates) return null;
    const from = state.rates[fromCode.toUpperCase()];
    const to = state.rates[toCode.toUpperCase()];
    if (!from || !to) return null;

    const amountInRSD = amount * from.middle;
    const result = amountInRSD / to.middle;
    return result;
  }

  function getUpdatedAt() {
    return state.updatedAt;
  }

  function getDate() {
    return state.date;
  }

  function hasRates() {
    return !!state.rates;
  }

  function getError() {
    return state.error;
  }

  global.nbs = {
    getRates: getRates,
    getRate: getRate,
    convert: convert,
    getUpdatedAt: getUpdatedAt,
    getDate: getDate,
    hasRates: hasRates,
    getError: getError
  };
})(window);
