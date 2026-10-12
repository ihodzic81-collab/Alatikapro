/* =========================================================
   ALATIKA PRO — nbs.js
   Kursna lista NBS (Narodna banka Srbije).
   - Povlači XML sa zvaničnog sajta NBS-a
   - Kešira rezultat u localStorage (radi offline)
   - Osvežava se 1x dnevno
   - Podržava "srednji kurs" (NBS objavljuje samo srednji)
   ========================================================= */

(function (global) {
  'use strict';

  const LS_RATES = 'nbs.rates';
  const LS_UPDATED = 'nbs.updatedAt';
  const NBS_URL = 'https://www.nbs.rs/export/sites/default/internet/latinica/scripts/kl_srednji.xml';
  const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; /* 1 dan */

  const state = {
    rates: null,
    updatedAt: null,
    loading: false,
    error: null
  };

  /* ---------- PARSIRANJE XML ---------- */

  /**
   * Parsira XML iz NBS-a.
   * Format XML-a (pojednostavljeno):
   *   <KursnaLista>
   *     <Datum>2026-10-12</Datum>
   *     <Valuta>
   *       <Sifra>EUR</Sifra>
   *       <Naziv>Evro</Naziv>
   *       <Srednji>117.2300</Srednji>
   *     </Valuta>
   *     ...
   *   </KursnaLista>
   *
   * Ako format ne odgovara, funkcija pokušava da pronađe bilo koji XML
   * sa elementima Valuta/Sifra/Srednji.
   */
  function parseNBSXML(xmlText) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');

      /* Provera grešaka u XML-u */
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        return { error: 'XML greška u NBS odgovoru.' };
      }

      /* Datum */
      let dateEl = doc.querySelector('Datum');
      let date = dateEl ? dateEl.textContent.trim() : '';

      /* Valute */
      const valutaEls = doc.querySelectorAll('Valuta');
      const rates = {};

      valutaEls.forEach(function (v) {
        const sifraEl = v.querySelector('Sifra');
        const srednjiEl = v.querySelector('Srednji');
        const nazivEl = v.querySelector('Naziv');
        if (!sifraEl || !srednjiEl) return;

        const code = sifraEl.textContent.trim().toUpperCase();
        /* NBS koristi zarez kao decimalni separator */
        const value = parseFloat(srednjiEl.textContent.trim().replace(',', '.'));
        if (!isFinite(value) || value <= 0) return;

        rates[code] = {
          code: code,
          name: nazivEl ? nazivEl.textContent.trim() : code,
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

  /* ---------- POVLAČENJE SA NBS ---------- */

  /**
   * Povlači XML sa NBS sajta.
   * Vraća Promise sa { date, rates } ili greškom.
   */
  function fetchFromNBS() {
    return new Promise(function (resolve, reject) {
      /* Timeout za slučaj da NBS ne odgovori */
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeout = setTimeout(function () {
        if (controller) controller.abort();
      }, 12000);

      const opts = {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store'
      };
      if (controller) opts.signal = controller.signal;

      fetch(NBS_URL, opts).then(function (res) {
        clearTimeout(timeout);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      }).then(function (text) {
        const parsed = parseNBSXML(text);
        if (parsed.error) {
          reject(new Error(parsed.error));
        } else {
          resolve(parsed);
        }
      }).catch(function (err) {
        clearTimeout(timeout);
        /* Ako je CORS problem — probaj preko proxy-ja */
        if (err.message && (err.message.indexOf('Failed to fetch') !== -1 || err.name === 'TypeError')) {
          fetchViaProxy().then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Fallback: povlači preko javnog CORS proxy-ja.
   * Ovo je samo rezervna opcija ako direktno ne radi.
   */
  function fetchViaProxy() {
    const proxies = [
      'https://corsproxy.io/?' + encodeURIComponent(NBS_URL),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(NBS_URL)
    ];

    return new Promise(function (resolve, reject) {
      let idx = 0;
      function tryNext() {
        if (idx >= proxies.length) {
          reject(new Error('NBS nije dostupan.'));
          return;
        }
        const url = proxies[idx++];
        fetch(url, { cache: 'no-store' }).then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        }).then(function (text) {
          const parsed = parseNBSXML(text);
          if (parsed.error) throw new Error(parsed.error);
          resolve(parsed);
        }).catch(function () {
          tryNext();
        });
      }
      tryNext();
    });
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

  /**
   * Vraća Promise sa kursnom listom.
   * 1. Ako postoji sveža keširana lista (mlađa od 24h) — vraća nju.
   * 2. Inače pokušava da povuče sa NBS-a.
   * 3. Ako NBS ne radi — vraća staru keširanu listu.
   * 4. Ako nema ni keša — vraća grešku.
   */
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

    if (state.loading) {
      /* Ako je već u toku, vrati keš ili čekaj */
      const cached = loadFromCache();
      if (cached) {
        return Promise.resolve({
          rates: cached.rates,
          date: cached.date,
          updatedAt: cached.updatedAt,
          fromCache: true,
          stale: true
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

  /**
   * Konvertuje iz jedne valute u drugu koristeći srednji kurs NBS-a.
   * Vraća broj (rezultat) ili null ako ne može.
   */
  function convert(amount, fromCode, toCode) {
    if (!state.rates) return null;
    const from = state.rates[fromCode.toUpperCase()];
    const to = state.rates[toCode.toUpperCase()];
    if (!from || !to) return null;

    /* Sve valute imaju kurs prema RSD (srednji) */
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

  /* ---------- EXPORT ---------- */

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
