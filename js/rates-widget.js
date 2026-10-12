/* =========================================================
   ALATIKA PRO — rates-widget.js
   Kursna lista (NBS):
   - Mali widget za Početnu (sakriva se ako NBS ne radi)
   - Puna stranica unutar modula Novac
   - Timeout prikaz
   ========================================================= */

(function (global) {
  'use strict';

  const LS_FAVORITES = 'rates.favorites';
  const DEFAULT_FAVORITES = ['EUR', 'USD', 'CHF', 'GBP'];

  const state = {
    rates: null,
    date: null,
    updatedAt: null,
    loading: false,
    error: null
  };

  function t(key, fallback) {
    return (global.i18n && global.i18n.t) ? global.i18n.t(key, fallback) : (fallback || key);
  }

  function lang() {
    return (global.i18n && global.i18n.getLang) ? global.i18n.getLang() : 'sr';
  }

  function getFavorites() {
    const saved = global.storage.lsGet(LS_FAVORITES, null);
    if (Array.isArray(saved) && saved.length > 0) return saved;
    return DEFAULT_FAVORITES.slice();
  }

  function setFavorites(list) {
    global.storage.lsSet(LS_FAVORITES, list);
  }

  function formatAmount(value) {
    const n = typeof value === 'number' ? value : parseFloat(value) || 0;
    const locale = lang() === 'en' ? 'en-GB' : 'sr-RS';
    return n.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDateLong(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const locale = lang() === 'en' ? 'en-GB' : 'sr-RS';
    return d.toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /* ---------- LOAD ---------- */

  function loadRates(forceRefresh) {
    return global.nbs.getRates(forceRefresh).then(function (res) {
      state.rates = res.rates;
      state.date = res.date;
      state.updatedAt = res.updatedAt;
      state.error = res.error || null;
      return res;
    }).catch(function (err) {
      state.error = err.message || 'Greška.';
      throw err;
    });
  }

  /* ---------- HOME WIDGET ---------- */

  /**
   * Renderuje mali widget na Početnoj.
   * Ako NBS ne radi — sakrije ceo #homeRatesSection.
   */
  function renderHomeWidget(container) {
    if (!container) return;

    /* Prikaži loading samo kratko */
    container.innerHTML = '<div class="rates-widget-loading">' + t('rates.loading', 'Učitavanje kursa...') + '</div>';

    const timeoutTimer = setTimeout(function () {
      /* Ako NBS ne odgovori za 8 sekundi → sakrij sekciju */
      hideHomeRatesSection();
    }, 8000);

    loadRates().then(function () {
      clearTimeout(timeoutTimer);
      renderHomeWidgetContent(container);
    }).catch(function () {
      clearTimeout(timeoutTimer);
      /* Ako ne radi — sakrij sekciju, ne prikazuj grešku */
      hideHomeRatesSection();
    });
  }

  function hideHomeRatesSection() {
    const section = document.getElementById('homeRatesSection');
    if (section) {
      section.style.display = 'none';
    }
  }

  function showHomeRatesSection() {
    const section = document.getElementById('homeRatesSection');
    if (section) {
      section.style.display = '';
    }
  }

  function renderHomeWidgetContent(container) {
    const favorites = getFavorites();
    const rates = state.rates;

    if (!rates) {
      hideHomeRatesSection();
      return;
    }

    /* Prikaži sekciju */
    showHomeRatesSection();

    const rows = favorites.map(function (code) {
      const r = rates[code];
      if (!r) return '';
      const flag = global.currencies.getFlag(code);
      return [
        '<div class="rates-widget-row">',
        '  <span class="rates-widget-flag">' + flag + '</span>',
        '  <span class="rates-widget-code">' + code + '</span>',
        '  <span class="rates-widget-value">' + formatAmount(r.middle) + ' RSD</span>',
        '</div>'
      ].join('');
    }).filter(Boolean).join('');

    /* Ako nema nijedne valute — sakrij sekciju */
    if (!rows) {
      hideHomeRatesSection();
      return;
    }

    let dateText = '';
    if (state.date) {
      const d = new Date(state.date);
      if (!isNaN(d.getTime())) {
        const locale = lang() === 'en' ? 'en-GB' : 'sr-RS';
        dateText = d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
      } else {
        dateText = state.date;
      }
    }

    const stale = state.error;

    container.innerHTML = [
      '<div class="rates-widget">',
      '  <div class="rates-widget-list">' + rows + '</div>',
      '  <div class="rates-widget-footer">',
      '    <div class="rates-widget-meta">',
      dateText ? '      <span>' + t('rates.date', 'Datum kursa') + ': ' + dateText + '</span>' : '',
      stale ? '      <span class="rates-stale">' + t('rates.stale', 'Poslednji sačuvan kurs') + '</span>' : '',
      '    </div>',
      '    <button type="button" class="rates-widget-open" data-open-converter>',
      '      <span>' + t('rates.openConverter', 'Otvori konverter') + '</span>',
      '      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
      '    </button>',
      '  </div>',
      '</div>'
    ].join('');

    const openBtn = container.querySelector('[data-open-converter]');
    if (openBtn) {
      openBtn.addEventListener('click', function () {
        if (global.converter && global.converter.openModal) {
          global.converter.openModal();
        }
      });
    }
  }

  /* ---------- FULL PAGE ---------- */

  function renderFullPage(container) {
    if (!container) return;
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'rates-header';
    header.innerHTML = [
      '<h2 class="rates-title">' + t('rates.title', 'Kursna lista NBS') + '</h2>',
      '<button type="button" class="rates-refresh-btn" data-refresh-rates>',
      '  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '    <polyline points="23 4 23 10 17 10"></polyline>',
      '    <polyline points="1 20 1 14 7 14"></polyline>',
      '    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>',
      '  </svg>',
      '  <span>' + t('rates.refresh', 'Osveži') + '</span>',
      '</button>'
    ].join('');
    container.appendChild(header);

    const info = document.createElement('div');
    info.className = 'rates-info';
    info.innerHTML = '<div class="rates-loading">' + t('rates.loading', 'Učitavanje kursa...') + '</div>';
    container.appendChild(info);

    const convWrap = document.createElement('div');
    convWrap.className = 'rates-converter-wrap';
    convWrap.innerHTML = [
      '<h3 class="rates-section-title">' + t('conv.title', 'Konverter valuta') + '</h3>',
      global.converter.renderHTML({ amount: 100, fromCode: 'RSD', toCode: 'EUR' })
    ].join('');
    container.appendChild(convWrap);
    global.converter.bind(convWrap);

    const listWrap = document.createElement('div');
    listWrap.className = 'rates-list';
    listWrap.innerHTML = '<div class="rates-loading">' + t('rates.loading', 'Učitavanje kursa...') + '</div>';
    container.appendChild(listWrap);

    function load(force) {
      info.innerHTML = '<div class="rates-loading">' + t('rates.loading', 'Učitavanje kursa...') + '</div>';
      listWrap.innerHTML = '<div class="rates-loading">' + t('rates.loading', 'Učitavanje kursa...') + '</div>';

      const timer = setTimeout(function () {
        info.innerHTML = '<div class="rates-error">' + t('rates.timeout', 'Kurs trenutno nije dostupan.') + '</div>';
        listWrap.innerHTML = '';
      }, 10000);

      loadRates(force).then(function () {
        clearTimeout(timer);
        renderInfo(info);
        renderFullList(listWrap);
      }).catch(function () {
        clearTimeout(timer);
        info.innerHTML = '<div class="rates-error">' + t('rates.unavailable', 'Kurs trenutno nije dostupan.') + '</div>';
        listWrap.innerHTML = '';
      });
    }

    header.querySelector('[data-refresh-rates]').addEventListener('click', function () {
      const btn = header.querySelector('[data-refresh-rates]');
      btn.classList.add('loading');
      load(true);
      setTimeout(function () { btn.classList.remove('loading'); }, 1500);
    });

    load(false);
  }

  function renderInfo(container) {
    let dateText = '';
    if (state.date) {
      const d = new Date(state.date);
      if (!isNaN(d.getTime())) {
        const locale = lang() === 'en' ? 'en-GB' : 'sr-RS';
        dateText = d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
      } else {
        dateText = state.date;
      }
    }

    const updatedText = formatDateLong(state.updatedAt);
    const stale = state.error;

    container.innerHTML = [
      dateText ? '  <div class="rates-info-row"><span class="rates-info-label">' + t('rates.date', 'Datum kursa') + ':</span><span class="rates-info-value">' + dateText + '</span></div>' : '',
      updatedText ? '  <div class="rates-info-row"><span class="rates-info-label">' + t('rates.updated', 'Ažurirano') + ':</span><span class="rates-info-value">' + updatedText + '</span></div>' : '',
      stale ? '  <div class="rates-stale-note">' + t('rates.stale', 'Prikazan poslednji sačuvani kurs.') + '</div>' : '',
      '  <div class="rates-note">' + t('conv.nbsNote', 'Referentni srednji kurs NBS. Banke i menjačnice mogu primenjivati drugačiji kurs.') + '</div>'
    ].join('');
  }

  function renderFullList(container) {
    if (!state.rates) {
      container.innerHTML = '';
      return;
    }

    const favorites = getFavorites();
    const all = global.currencies.getAll().filter(function (c) {
      return c.code !== 'RSD' && state.rates[c.code];
    });

    all.sort(function (a, b) {
      const aFav = favorites.indexOf(a.code) !== -1 ? 0 : 1;
      const bFav = favorites.indexOf(b.code) !== -1 ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.code.localeCompare(b.code);
    });

    container.innerHTML = '';

    all.forEach(function (c) {
      const r = state.rates[c.code];
      if (!r) return;
      const isFav = favorites.indexOf(c.code) !== -1;

      const row = document.createElement('div');
      row.className = 'rates-row' + (isFav ? ' favorite' : '');

      const flag = c.flag;
      const name = lang() === 'en' ? c.name_en : c.name_sr;

      row.innerHTML = [
        '<div class="rates-row-left">',
        '  <span class="rates-flag">' + flag + '</span>',
        '  <div class="rates-row-text">',
        '    <div class="rates-code">' + c.code + '</div>',
        '    <div class="rates-name">' + name + '</div>',
        '  </div>',
        '</div>',
        '<div class="rates-row-right">',
        '  <div class="rates-value">' + formatAmount(r.middle) + '</div>',
        '  <div class="rates-unit">RSD</div>',
        '</div>',
        '<button type="button" class="rates-fav-btn' + (isFav ? ' active' : '') + '" aria-label="' + (isFav ? t('rates.removeFav', 'Ukloni iz omiljenih') : t('rates.addFav', 'Dodaj u omiljene')) + '">',
        '  <svg viewBox="0 0 24 24" width="18" height="18" fill="' + (isFav ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
        '    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
        '  </svg>',
        '</button>'
      ].join('');

      const favBtn = row.querySelector('.rates-fav-btn');
      favBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleFavorite(c.code);
        renderFullList(container);
        const homeWidget = document.querySelector('#homeRates');
        if (homeWidget && homeWidget.querySelector('.rates-widget')) {
          renderHomeWidgetContent(homeWidget);
        }
      });

      container.appendChild(row);
    });
  }

  function toggleFavorite(code) {
    const favs = getFavorites();
    const idx = favs.indexOf(code);
    if (idx === -1) {
      favs.push(code);
    } else {
      favs.splice(idx, 1);
    }
    setFavorites(favs);
  }

  global.ratesWidget = {
    renderHomeWidget: renderHomeWidget,
    renderFullPage: renderFullPage,
    loadRates: loadRates
  };
})(window);
