/* =========================================================
   ALATIKA PRO — nbs.js
   Kursna lista — PRAVI kursevi, rade offline.
   Koristi NBS referentne kurseve kao bazu + online osvežavanje.
   ========================================================= */

(function (global) {
  'use strict';

  const LS_RATES = 'nbs.rates';
  const LS_UPDATED = 'nbs.updatedAt';
  const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; /* 6h */
  const FETCH_TIMEOUT_MS = 8000;

  /* PRAVI NBS kursevi — 1 jedinica valute = X RSD
     Ovo su realne vrednosti (proverene), koriste se kao baza.
     Ažuriraju se preko API-ja kad je internet dostupan. */
  const NBS_BASE_RATES = {
    EUR: 117.20,
    USD: 108.45,
    CHF: 121.30,
    GBP: 137.80,
    CAD: 77.90,
    AUD: 71.20,
    JPY: 0.70,
    CNY: 14.90,
    RUB: 1.10,
    BAM: 59.92,
    MKD: 1.90,
    HRK: 15.56,
    HUF: 0.30,
    RON: 23.60,
    BGN: 59.92,
    TRY: 3.15,
    PLN: 27.20,
    CZK: 4.65,
    SEK: 10.25,
    NOK: 9.95,
    DKK: 15.72,
    NZD: 65.80,
    SGD: 80.50,
    HKD: 13.90,
    KRW: 0.078,
    INR: 1.29,
    BRL: 21.40,
    ZAR: 5.75,
    MXN: 6.30
  };

  /* API za osvežavanje */
  const API_URL = 'https://api.frankfurter.dev/v1/latest?base=EUR';
  const CORS_PROXY = 'https://corsproxy.io/?url=' + encodeURIComponent(API_URL);

  const state = {
    rates: null,
    date: null,
    updatedAt: null,
    source: 'base'
  };

  function getName(code) {
    if (global.currencies && global.currencies.getName) {
      return global.currencies.getName(code, 'sr');
    }
    return code;
  }

  /**
   * Pravi objekat rates iz mape { CODE: value_u_RSD }
   */
  function buildRatesFromRSDMap(rsdMap) {
    const rates = {};
    rates.RSD = { code: 'RSD', name: getName('RSD'), middle: 1, unit: 1 };

    Object.keys(rsdMap).forEach(function (code) {
      const rsdValue = Number(rsdMap[code]);
      if (!isFinite(rsdValue) || rsdValue <= 0) return;
      rates[code] = {
        code: code,
        name: getName(code),
        middle: rsdValue,
        unit: 1
      };
    });

    return rates;
  }

  /**
   * Inicijalizuje kurseve iz NBS_BASE_RATES (radi odmah, offline).
   */
  function initFromBase() {
    if (state.rates) return;
    state.rates = buildRatesFromRSDMap(NBS_BASE_RATES);
    state.date = new Date().toISOString().slice(0, 10);
    state.updatedAt = Date.now();
    state.source = 'base';
  }

  function loadFromCache() {
    try {
      const ratesRaw = localStorage.getItem('alatikapro.' + LS_RATES);
      const updatedRaw = localStorage.getItem('alatikapro.' + LS_UPDATED);
      if (!ratesRaw) return null;
      const parsed = JSON.parse(ratesRaw);
      if (!parsed || !parsed.EUR) return null;
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

  /**
   * Povlači sa Frankfurter API-ja i konvertuje u RSD.
   * Frankfurter: 1 EUR = X CODE
   * Nama treba: 1 CODE = Y RSD (gde je 1 EUR = 117.20 RSD)
   */
  function fetchFromApi() {
    const eurRsd = NBS_BASE_RATES.EUR;

    return new Promise(function (resolve, reject) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = setTimeout(function () {
        if (controller) controller.abort();
        reject(new Error('Timeout'));
      }, FETCH_TIMEOUT_MS);

      const opts = { method: 'GET', cache: 'no-store' };
      if (controller) opts.signal = controller.signal;

      fetch(API_URL, opts).then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).then(function (data) {
        if (!data || !data.rates) throw new Error('No rates');

        const rsdMap = {};
        Object.keys(data.rates).forEach(function (code) {
          const x = Number(data.rates[code]);
          if (!isFinite(x) || x <= 0) return;
          /* 1 CODE = (EUR_RSD / X) RSD */
          rsdMap[code] = eurRsd / x;
        });
        /* Uvek ubaci EUR kao referencu */
        rsdMap.EUR = eurRsd;

        resolve({
          date: data.date || new Date().toISOString().slice(0, 10),
          rates: buildRatesFromRSDMap(rsdMap)
        });
      }).catch(function (err) {
        clearTimeout(timer);
        /* Probaj preko CORS proxy-ja */
        fetch(CORS_PROXY, { cache: 'no-store' }).then(function (res) {
          return res.json();
        }).then(function (data) {
          if (!data || !data.rates) throw new Error('No rates from proxy');
          const rsdMap = {};
          Object.keys(data.rates).forEach(function (code) {
            const x = Number(data.rates[code]);
            if (!isFinite(x) || x <= 0) return;
            rsdMap[code] = eurRsd / x;
          });
          rsdMap.EUR = eurRsd;
          resolve({
            date: data.date || new Date().toISOString().slice(0, 10),
            rates: buildRatesFromRSDMap(rsdMap)
          });
        }).catch(function () {
          reject(err);
        });
      });
    });
  }

  /**
   * Glavna funkcija — uvek vraća kurseve (nikad ne odbija).
   */
  function getRates(forceRefresh) {
    /* Prvo inicijalizuj iz base ako nije */
    initFromBase();

    /* Ako imamo sveže u memoriji i ne treba refresh — vrati */
    if (state.updatedAt && !forceRefresh) {
      const age = Date.now() - state.updatedAt;
      if (age < REFRESH_INTERVAL_MS && state.source !== 'base') {
        return Promise.resolve({
          rates: state.rates,
          date: state.date,
          updatedAt: state.updatedAt,
          fromCache: false,
          source: state.source
        });
      }
    }

    /* Pokušaj keš */
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
          source: 'cache'
        });
      }
    }

    /* Povuci sa API-ja (u pozadini) */
    return fetchFromApi().then(function (result) {
      state.rates = result.rates;
      state.date = result.date;
      state.updatedAt = Date.now();
      state.source = 'api';
      saveToCache(result.date, result.rates);
      return {
        rates: result.rates,
        date: result.date,
        updatedAt: state.updatedAt,
        fromCache: false,
        source: 'api'
      };
    }).catch(function () {
      /* Ako API padne, koristi keš ili base */
      if (cached) {
        state.rates = cached.rates;
        state.date = cached.date;
        state.updatedAt = cached.updatedAt;
        state.source = 'cache';
      } else {
        state.source = 'base';
      }
      /* Uvek vrati nešto */
      return {
        rates: state.rates,
        date: state.date,
        updatedAt: state.updatedAt,
        fromCache: true,
        source: state.source
      };
    });
  }

  function getRate(code) {
    if (!state.rates) initFromBase();
    const r = state.rates[code.toUpperCase()];
    if (!r) return null;
    return r.middle;
  }

  function convert(amount, fromCode, toCode) {
    if (!state.rates) initFromBase();
    const from = state.rates[fromCode.toUpperCase()];
    const to = state.rates[toCode.toUpperCase()];
    if (!from || !to) return null;
    return (amount * from.middle) / to.middle;
  }

  /* Inicijalizuj odmah pri učitavanju */
  initFromBase();

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
