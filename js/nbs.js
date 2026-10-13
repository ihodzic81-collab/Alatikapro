/* =========================================================
   ALATIKA PRO — nbs.js
   Kursna lista — koristi Frankfurter API (radi bez ključa).
   Frankfurter koristi ECB referentne kurseve.
   RSD nije direktno u Frankfurter-u, pa koristimo EUR kao bazu
   i fiksiramo RSD prema EUR (NBS srednji kurs ~117.2).
   ========================================================= */

(function (global) {
  'use strict';

  const LS_RATES = 'nbs.rates';
  const LS_UPDATED = 'nbs.updatedAt';
  const API_URL = 'https://api.frankfurter.app/latest?from=EUR';
  const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000; /* 12h */
  const FETCH_TIMEOUT_MS = 12000;

  /* RSD nije u Frankfurter-u. Koristimo fiksni srednji kurs EUR/RSD.
     Ažurira se automatski ako NBS bude dostupan. */
  const FALLBACK_EUR_RSD = 117.20;

  const state = {
    rates: null,
    date: null,
    updatedAt: null,
    loading: false,
    error: null
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

  /**
   * Povlači kurseve sa Frankfurter API-ja.
   * Vraća { date, rates } gde su rates u formatu { CODE: { middle } }.
   */
  function fetchFromAPI() {
    return fetchWithTimeout(API_URL, FETCH_TIMEOUT_MS).then(function (data) {
      if (!data || !data.rates) {
        throw new Error('Neispravan odgovor API-ja.');
      }

      const rates = {};

      /* Dodaj EUR kao bazu */
      rates.EUR = {
        code: 'EUR',
        name: getName('EUR'),
        middle: 1,
        unit: 1
      };

      /* Dodaj RSD sa fiksnim kursom */
      rates.RSD = {
        code: 'RSD',
        name: getName('RSD'),
        middle: 1,
        unit: 1
      };

      /* Konvertuj ostale valute u RSD:
         Frankfurter daje 1 EUR = X CODE.
         Nama treba 1 CODE = Y RSD.
         Y = FALLBACK_EUR_RSD / X
      */
      Object.keys(data.rates).forEach(function (code) {
        const x = Number(data.rates[code]);
        if (!isFinite(x) || x <= 0) return;
        const middle = FALLBACK_EUR_RSD / x;
        rates[code] = {
          code: code,
          name: getName(code),
          middle: middle,
          unit: 1
        };
      });

      return {
        date: data.date || new Date().toISOString().slice(0, 10),
        rates: rates
      };
    });
  }

  function getName(code) {
    if (global.currencies && global.currencies.getName) {
      return global.currencies.getName(code, 'sr');
    }
    return code;
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
          stale: false
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
        return Promise.resolve({
          rates: cached.rates,
          date: cached.date,
          updatedAt: cached.updatedAt,
          fromCache: true,
          stale: false
        });
      }
    }

    state.loading = true;
    state.error = null;

    return fetchFromAPI().then(function (result) {
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

    /* Sve valute su izražene u RSD (1 CODE = X RSD). */
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
