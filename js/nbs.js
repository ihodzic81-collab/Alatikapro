/* =========================================================
   ALATIKA PRO — nbs.js
   Kursna lista sa više fallback API-ja + hardkodovana rezerva.
   ========================================================= */

(function (global) {
  'use strict';

  const LS_RATES = 'nbs.rates';
  const LS_UPDATED = 'nbs.updatedAt';
  const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
  const FETCH_TIMEOUT_MS = 8000;

  /* RSD srednji kurs prema EUR — fiksna vrednost kao fallback */
  const FALLBACK_EUR_RSD = 117.20;

  /* Hardkodovane rezervne vrednosti (EUR baza) — koristi se ako svi API-ji padnu */
  const HARDCODED_FALLBACK = {
    EUR: 1,
    USD: 1.08,
    GBP: 0.85,
    CHF: 0.95,
    CAD: 1.47,
    AUD: 1.65,
    JPY: 168.50,
    CNY: 7.85,
    RUB: 100.00,
    BAM: 1.9558,
    MKD: 61.50,
    HRK: 7.5345,
    HUF: 395.00,
    RON: 4.97,
    BGN: 1.9558,
    TRY: 35.00,
    PLN: 4.30,
    CZK: 25.30,
    SEK: 11.45,
    NOK: 11.75,
    DKK: 7.46,
    NZD: 1.78,
    SGD: 1.45,
    HKD: 8.45,
    KRW: 1450.00,
    INR: 90.50,
    BRL: 5.45,
    ZAR: 20.30,
    MXN: 18.50
  };

  /* API-ji — probaj redom */
  const APIS = [
    {
      name: 'frankfurter.dev',
      url: 'https://api.frankfurter.dev/v1/latest?base=EUR',
      parse: function (data) {
        if (!data || !data.rates) throw new Error('no rates');
        return { date: data.date, rates: data.rates };
      }
    },
    {
      name: 'frankfurter.app',
      url: 'https://api.frankfurter.app/latest?from=EUR',
      parse: function (data) {
        if (!data || !data.rates) throw new Error('no rates');
        return { date: data.date, rates: data.rates };
      }
    },
    {
      name: 'open.er-api.com',
      url: 'https://open.er-api.com/v6/latest/EUR',
      parse: function (data) {
        if (!data || !data.rates) throw new Error('no rates');
        const d = new Date();
        const date = d.toISOString().slice(0, 10);
        return { date: date, rates: data.rates };
      }
    },
    {
      name: 'exchangerate.host',
      url: 'https://api.exchangerate.host/latest?base=EUR',
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
    loading: false,
    error: null,
    source: null
  };

  function fetchWithTimeout(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = setTimeout(function () {
        if (controller) controller.abort();
        reject(new Error('Timeout'));
      }, timeoutMs);

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
      const middle = FALLBACK_EUR_RSD / x;
      rates[code] = { code: code, name: getName(code), middle: middle, unit: 1 };
    });

    return rates;
  }

  /**
   * Pokušava redom API-je. Vraća { date, rates, source }.
   */
  function fetchFromAPIs() {
    let idx = 0;

    function tryNext() {
      if (idx >= APIS.length) {
        return Promise.reject(new Error('Svi API-ji nedostupni'));
      }
      const api = APIS[idx++];
      return fetchWithTimeout(api.url, FETCH_TIMEOUT_MS).then(function (data) {
        const parsed = api.parse(data);
        return {
          date: parsed.date || new Date().toISOString().slice(0, 10),
          rates: buildRatesObject(parsed.rates),
          source: api.name
        };
      }).catch(function (err) {
        if (global.console && console.warn) {
          console.warn('NBS: API "' + api.name + '" nije uspeo:', err.message);
        }
        return tryNext();
      });
    }

    return tryNext();
  }

  /**
   * Hardkodovani fallback — koristi se ako svi API-ji padnu.
   */
  function buildHardcodedFallback() {
    const rates = buildRatesObject(HARDCODED_FALLBACK);
    return {
      date: new Date().toISOString().slice(0, 10),
      rates: rates,
      source: 'hardcoded'
    };
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

  function getRates(forceRefresh) {
    if (state.rates && state.updatedAt && !forceRefresh) {
      const age = Date.now() - state.updatedAt;
      if (age < REFRESH_INTERVAL_MS) {
        return Promise.resolve({
          rates: state.rates,
          date: state.date,
          updatedAt: state.updatedAt,
          fromCache: true,
          stale: false,
          source: state.source
        });
      }
    }

    const cached = loadFromCache();
    if (cached && cached.updatedAt && !forceRefresh) {
      const age = Date.now() - cached.updatedAt;
      if (age < REFRESH_INTERVAL_MS) {
        state.rates = cached.rates;
        state.date = cached.date;
        state.updatedAt = cached.updatedAt;
        state.source = 'cache';
        return Promise.resolve({
          rates: cached.rates,
          date: cached.date,
          updatedAt: cached.updatedAt,
          fromCache: true,
          stale: false,
          source: 'cache'
        });
      }
    }

    state.loading = true;
    state.error = null;

    return fetchFromAPIs().then(function (result) {
      state.rates = result.rates;
      state.date = result.date;
      state.updatedAt = Date.now();
      state.loading = false;
      state.source = result.source;
      saveToCache(result.date, result.rates);
      return {
        rates: result.rates,
        date: result.date,
        updatedAt: state.updatedAt,
        fromCache: false,
        stale: false,
        source: result.source
      };
    }).catch(function (err) {
      state.loading = false;
      state.error = err.message || 'Nepoznata greška';

      /* Ako ima keš — koristi ga */
      if (cached) {
        state.rates = cached.rates;
        state.date = cached.date;
        state.updatedAt = cached.updatedAt;
        state.source = 'cache';
        return {
          rates: cached.rates,
          date: cached.date,
          updatedAt: cached.updatedAt,
          fromCache: true,
          stale: true,
          error: state.error,
          source: 'cache'
        };
      }

      /* Poslednja linija odbrane — hardkodovano */
      const fallback = buildHardcodedFallback();
      state.rates = fallback.rates;
      state.date = fallback.date;
      state.updatedAt = Date.now();
      state.source = 'hardcoded';
      saveToCache(fallback.date, fallback.rates);
      return {
        rates: fallback.rates,
        date: fallback.date,
        updatedAt: state.updatedAt,
        fromCache: false,
        stale: true,
        error: state.error,
        source: 'hardcoded'
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
    const amountInRSD = amount * from.middle;
    return amountInRSD / to.middle;
  }

  function getUpdatedAt() { return state.updatedAt; }
  function getDate() { return state.date; }
  function hasRates() { return !!state.rates; }
  function getError() { return state.error; }
  function getSource() { return state.source; }

  global.nbs = {
    getRates: getRates,
    getRate: getRate,
    convert: convert,
    getUpdatedAt: getUpdatedAt,
    getDate: getDate,
    hasRates: hasRates,
    getError: getError,
    getSource: getSource
  };
})(window);
