/* =========================================================
   ALATIKA PRO — nbs.js
   Kursna lista — koristi CORS-friendly API (open.er-api.com).
   Uvek radi, čak i bez proxy-ja.
   ========================================================= */

(function (global) {
  'use strict';

  const LS_RATES = 'nbs.rates';
  const LS_UPDATED = 'nbs.updatedAt';
  const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; /* 6h */
  const FETCH_TIMEOUT_MS = 10000;

  /* Fiksni srednji kurs EUR/RSD */
  const EUR_RSD = 117.20;

  /* Hardkodovane vrednosti (EUR baza) — fallback ako svi API-ji padnu */
  const HARDCODED = {
    EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.95, CAD: 1.47,
    AUD: 1.65, JPY: 168.50, CNY: 7.85, RUB: 100.00, BAM: 1.9558,
    MKD: 61.50, HRK: 7.5345, HUF: 395.00, RON: 4.97, BGN: 1.9558,
    TRY: 35.00, PLN: 4.30, CZK: 25.30, SEK: 11.45, NOK: 11.75,
    DKK: 7.46, NZD: 1.78, SGD: 1.45, HKD: 8.45, KRW: 1450.00,
    INR: 90.50, BRL: 5.45, ZAR: 20.30, MXN: 18.50
  };

  /* CORS-friendly API-ji (rade bez proxy-ja sa GitHub Pages) */
  const API_URLS = [
    {
      url: 'https://open.er-api.com/v6/latest/EUR',
      parse: function (data) {
        if (!data || !data.rates) throw new Error('no rates');
        return { date: data.time_last_update_utc || new Date().toISOString().slice(0, 10), rates: data.rates };
      }
    },
    {
      url: 'https://api.exchangerate.host/latest?base=EUR',
      parse: function (data) {
        if (!data || !data.rates) throw new Error('no rates');
        return { date: data.date || new Date().toISOString().slice(0, 10), rates: data.rates };
      }
    },
    {
      url: 'https://corsproxy.io/?url=' + encodeURIComponent('https://api.frankfurter.dev/v1/latest?base=EUR'),
      parse: function (data) {
        if (!data || !data.rates) throw new Error('no rates');
        return { date: data.date, rates: data.rates };
      }
    }
  ];

  const state = {
    rates: null,
    date: null,
    updatedAt: null,
    source: null
  };

  function fetchWithTimeout(url) {
    return new Promise(function (resolve, reject) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = setTimeout(function () {
        if (controller) controller.abort();
        reject(new Error('Timeout'));
      }, FETCH_TIMEOUT_MS);

      const opts = { method: 'GET', cache: 'no-store' };
      if (controller) opts.signal = controller.signal;

      fetch(url, opts).then(function (res) {
        clearTimeout(timer);
        if (!res.ok) {
          reject(new Error('HTTP ' + res.status));
          return;
        }
        res.json().then(resolve).catch(reject);
      }).catch(function (err) {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  function getName(code) {
    if (global.currencies && global.currencies.getName) {
      return global.currencies.getName(code, 'sr');
    }
    return code;
  }

  function buildRatesObject(rawRates) {
    const rates = {};
    rates.EUR = { code: 'EUR', name: getName('EUR'), middle: 1, unit: 1 };
    rates.RSD = { code: 'RSD', name: getName('RSD'), middle: 1, unit: 1 };

    Object.keys(rawRates).forEach(function (code) {
      if (code === 'EUR' || code === 'RSD') return;
      const x = Number(rawRates[code]);
      if (!isFinite(x) || x <= 0) return;
      /* API daje: 1 EUR = X CODE. Nama treba: 1 CODE = Y RSD */
      const middle = EUR_RSD / x;
      rates[code] = { code: code, name: getName(code), middle: middle, unit: 1 };
    });

    return rates;
  }

  function buildHardcodedRates() {
    const rates = {};
    rates.EUR = { code: 'EUR', name: getName('EUR'), middle: 1, unit: 1 };
    rates.RSD = { code: 'RSD', name: getName('RSD'), middle: 1, unit: 1 };
    Object.keys(HARDCODED).forEach(function (code) {
      if (code === 'EUR') return;
      const x = HARDCODED[code];
      const middle = EUR_RSD / x;
      rates[code] = { code: code, name: getName(code), middle: middle, unit: 1 };
    });
    return rates;
  }

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

  function tryApis() {
    let idx = 0;
    function next() {
      if (idx >= API_URLS.length) {
        return Promise.reject(new Error('Svi API-ji nedostupni'));
      }
      const api = API_URLS[idx++];
      return fetchWithTimeout(api.url).then(function (data) {
        const parsed = api.parse(data);
        return {
          date: parsed.date || new Date().toISOString().slice(0, 10),
          rates: buildRatesObject(parsed.rates),
          source: 'api'
        };
      }).catch(function (err) {
        if (global.console && console.warn) {
          console.warn('Kurs API nije uspeo: ' + api.url + ' — ' + err.message);
        }
        return next();
      });
    }
    return next();
  }

  function getRates(forceRefresh) {
    /* Ako imamo sveže u memoriji */
    if (state.rates && state.updatedAt && !forceRefresh) {
      const age = Date.now() - state.updatedAt;
      if (age < REFRESH_INTERVAL_MS && state.source === 'api') {
        return Promise.resolve({
          rates: state.rates, date: state.date, updatedAt: state.updatedAt,
          fromCache: true, source: state.source
        });
      }
    }

    const cached = loadFromCache();
    if (cached && cached.updatedAt && !forceRefresh && state.source !== 'base') {
      const age = Date.now() - cached.updatedAt;
      if (age < REFRESH_INTERVAL_MS) {
        state.rates = cached.rates;
        state.date = cached.date;
        state.updatedAt = cached.updatedAt;
        state.source = 'cache';
        return Promise.resolve({
          rates: cached.rates, date: cached.date, updatedAt: cached.updatedAt,
          fromCache: true, source: 'cache'
        });
      }
    }

    return tryApis().then(function (result) {
      state.rates = result.rates;
      state.date = result.date;
      state.updatedAt = Date.now();
      state.source = 'api';
      saveToCache(result.date, result.rates);
      return {
        rates: result.rates, date: result.date, updatedAt: state.updatedAt,
        fromCache: false, source: 'api'
      };
    }).catch(function (err) {
      if (cached) {
        state.rates = cached.rates;
        state.date = cached.date;
        state.updatedAt = cached.updatedAt;
        state.source = 'cache';
        return {
          rates: cached.rates, date: cached.date, updatedAt: cached.updatedAt,
          fromCache: true, source: 'cache', error: err.message
        };
      }
      const fallback = buildHardcodedRates();
      state.rates = fallback;
      state.date = new Date().toISOString().slice(0, 10);
      state.updatedAt = Date.now();
      state.source = 'base';
      saveToCache(state.date, fallback);
      return {
        rates: fallback, date: state.date, updatedAt: state.updatedAt,
        fromCache: false, source: 'base', error: err.message
      };
    });
  }

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
    return (amount * from.middle) / to.middle;
  }

  global.nbs = {
    getRates: getRates,
    getRate: getRate,
    convert: convert,
    getUpdatedAt: function () { return state.updatedAt; },
    getDate: function () { return state.date; },
    hasRates: function () { return !!state.rates; },
    getSource: function () { return state.source; }
  };
})(window);
