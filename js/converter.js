/* =========================================================
   ALATIKA PRO — converter.js
   Konverter valuta:
   - UI komponenta koja se ugrađuje bilo gde
   - Koristi NBS kurs (preko js/nbs.js)
   - Kopiranje rezultata u clipboard
   - Brza zamena valuta (swap)
   - Prikaz datuma i kursa
   ========================================================= */

(function (global) {
  'use strict';

  function t(key, fallback) {
    return (global.i18n && global.i18n.t) ? global.i18n.t(key, fallback) : (fallback || key);
  }

  function lang() {
    return (global.i18n && global.i18n.getLang) ? global.i18n.getLang() : 'sr';
  }

  function formatAmount(value, currencyCode) {
    const n = typeof value === 'number' ? value : parseFloat(value) || 0;
    const locale = lang() === 'en' ? 'en-GB' : 'sr-RS';
    const formatted = n.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatted + (currencyCode ? ' ' + currencyCode : '');
  }

  /* ---------- KONVERTER KOMPONENTA ---------- */

  /**
   * Pravi HTML za konverter.
   * opts:
   *   - compact: bool (manji prikaz, bez datuma kursa)
   *   - fromCode: string (default 'RSD')
   *   - toCode: string (default 'EUR')
   *   - amount: number (default 100)
   */
  function renderHTML(opts) {
    opts = opts || {};
    const fromCode = opts.fromCode || 'RSD';
    const toCode = opts.toCode || 'EUR';
    const amount = opts.amount || 100;
    const compact = !!opts.compact;

    const fromOptions = global.currencies.getAll().map(function (c) {
      const selected = c.code === fromCode ? ' selected' : '';
      const label = c.flag + ' ' + c.code;
      return '<option value="' + c.code + '"' + selected + '>' + label + '</option>';
    }).join('');

    const toOptions = global.currencies.getAll().map(function (c) {
      const selected = c.code === toCode ? ' selected' : '';
      const label = c.flag + ' ' + c.code;
      return '<option value="' + c.code + '"' + selected + '>' + label + '</option>';
    }).join('');

    return [
      '<div class="converter' + (compact ? ' converter-compact' : '') + '" data-converter>',

      /* Red 1: iznos + valuta */
      '  <div class="conv-row">',
      '    <input type="text" inputmode="decimal" class="conv-amount" data-conv-amount value="' + amount + '" placeholder="0,00" />',
      '    <select class="conv-currency" data-conv-from>' + fromOptions + '</select>',
      '  </div>',

      /* Swap dugme */
      '  <div class="conv-swap-row">',
      '    <button type="button" class="conv-swap" data-conv-swap aria-label="' + t('conv.swap', 'Zameni valute') + '">',
      '      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '        <polyline points="17 1 21 5 17 9"></polyline>',
      '        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>',
      '        <polyline points="7 23 3 19 7 15"></polyline>',
      '        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>',
      '      </svg>',
      '    </button>',
      '  </div>',

      /* Red 2: rezultat + valuta */
      '  <div class="conv-row">',
      '    <input type="text" class="conv-result" data-conv-result readonly placeholder="0,00" />',
      '    <select class="conv-currency" data-conv-to>' + toOptions + '</select>',
      '  </div>',

      /* Info ispod */
      '  <div class="conv-info" data-conv-info></div>',

      /* Dugmad */
      '  <div class="conv-actions">',
      '    <button type="button" class="conv-btn" data-conv-copy>',
      '      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '        <rect x="9" y="9" width="13" height="13" rx="2"></rect>',
      '        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
      '      </svg>',
      '      <span>' + t('conv.copy', 'Kopiraj') + '</span>',
      '    </button>',
      '    <button type="button" class="conv-btn" data-conv-reset>',
      '      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '        <polyline points="1 4 1 10 7 10"></polyline>',
      '        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>',
      '      </svg>',
      '      <span>' + t('conv.reset', 'Resetuj') + '</span>',
      '    </button>',
      '  </div>',

      '</div>'
    ].join('');
  }

  /**
   * Povezuje event-e na konverter unutar datog root-a.
   * Poziva se posle svakog rendera.
   */
  function bind(root) {
    root = root || document;
    const converters = root.querySelectorAll('[data-converter]');

    converters.forEach(function (conv) {
      if (conv.dataset.bound) return;
      conv.dataset.bound = '1';

      const amountInput = conv.querySelector('[data-conv-amount]');
      const resultInput = conv.querySelector('[data-conv-result]');
      const fromSelect = conv.querySelector('[data-conv-from]');
      const toSelect = conv.querySelector('[data-conv-to]');
      const swapBtn = conv.querySelector('[data-conv-swap]');
      const infoEl = conv.querySelector('[data-conv-info]');
      const copyBtn = conv.querySelector('[data-conv-copy]');
      const resetBtn = conv.querySelector('[data-conv-reset]');

      /* Učitaj NBS kurseve ako još nisu */
      function ensureRates() {
        if (global.nbs && global.nbs.hasRates()) {
          return Promise.resolve();
        }
        if (!global.nbs) return Promise.reject(new Error('NBS modul nije dostupan.'));
        return global.nbs.getRates().then(function () {});
      }

      function recalc() {
        const amount = global.utils.parseAmount(amountInput.value);
        const from = fromSelect.value;
        const to = toSelect.value;

        if (!amount || amount <= 0) {
          resultInput.value = '';
          infoEl.innerHTML = '';
          return;
        }

        ensureRates().then(function () {
          const result = global.nbs.convert(amount, from, to);

          if (result === null) {
            resultInput.value = '—';
            infoEl.innerHTML = '<span class="conv-error">' + t('conv.error', 'Kurs nije dostupan.') + '</span>';
            return;
          }

          resultInput.value = formatAmount(result, '').trim();

          /* Info o kursu */
          const rate1 = global.nbs.getRate(from);
          const rate2 = global.nbs.getRate(to);
          const date = global.nbs.getDate();
          const updated = global.nbs.getUpdatedAt();

          let infoText = '';
          if (from === 'RSD') {
            infoText = '1 ' + to + ' = ' + formatAmount(rate2, 'RSD').trim();
          } else if (to === 'RSD') {
            infoText = '1 ' + from + ' = ' + formatAmount(rate1, 'RSD').trim();
          } else {
            infoText = '1 ' + from + ' = ' + formatAmount(rate1 / rate2, to).trim();
          }

          /* Datum kursa */
          let dateText = '';
          if (date) {
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
              const locale = lang() === 'en' ? 'en-GB' : 'sr-RS';
              dateText = d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
            } else {
              dateText = date;
            }
          } else if (updated) {
            const d = new Date(updated);
            const locale = lang() === 'en' ? 'en-GB' : 'sr-RS';
            dateText = d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
          }

          const stale = global.nbs.getError();
          const staleMark = stale ? ' · <span class="conv-stale">' + t('conv.stale', 'poslednji sačuvan') + '</span>' : '';

          let html = '<span class="conv-rate-info">' + infoText + '</span>';
          if (dateText) {
            html += ' · <span class="conv-rate-date">' + t('conv.date', 'na dan') + ' ' + dateText + '</span>';
          }
          html += staleMark;

          /* Napomena o NBS */
          html += '<br><span class="conv-note">' + t('conv.nbsNote', 'Referentni srednji kurs NBS. Banke i menjačnice mogu primenjivati drugačiji kurs.') + '</span>';

          infoEl.innerHTML = html;
        }).catch(function (err) {
          resultInput.value = '';
          infoEl.innerHTML = '<span class="conv-error">' + t('conv.noInternet', 'Kurs nije dostupan bez interneta.') + '</span>';
        });
      }

      /* Event-i */
      amountInput.addEventListener('input', global.utils.debounce(recalc, 250));
      fromSelect.addEventListener('change', recalc);
      toSelect.addEventListener('change', recalc);

      /* Swap */
      swapBtn.addEventListener('click', function () {
        const f = fromSelect.value;
        const t2 = toSelect.value;
        fromSelect.value = t2;
        toSelect.value = f;

        /* Rotacija ikone */
        swapBtn.classList.add('rotating');
        setTimeout(function () {
          swapBtn.classList.remove('rotating');
        }, 300);

        recalc();
      });

      /* Copy */
      copyBtn.addEventListener('click', function () {
        if (!resultInput.value) return;
        const to = toSelect.value;
        const text = resultInput.value.replace(/\s/g, '') + ' ' + to;

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copyBtn.classList.add('copied');
            setTimeout(function () { copyBtn.classList.remove('copied'); }, 1200);
            if (global.home) global.home.showToast(t('conv.copied', 'Kopirano!'));
          }).catch(function () {
            fallbackCopy(text);
          });
        } else {
          fallbackCopy(text);
        }
      });

      function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          if (global.home) global.home.showToast(t('conv.copied', 'Kopirano!'));
        } catch (e) {}
        document.body.removeChild(ta);
      }

      /* Reset */
      resetBtn.addEventListener('click', function () {
        amountInput.value = '100';
        fromSelect.value = 'RSD';
        toSelect.value = 'EUR';
        recalc();
      });

      /* Prvo računanje */
      recalc();
    });
  }

  /**
   * Otvara konverter u modalu (za Sesiju 6 — dugme "Otvori konverter").
   */
  function openModal() {
    /* Ukloni postojeći ako postoji */
    const existing = document.getElementById('converterModal');
    if (existing) existing.parentNode.removeChild(existing);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'converterModal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title">' + t('conv.title', 'Konverter valuta') + '</h3>',
      renderHTML({ amount: 100, fromCode: 'RSD', toCode: 'EUR' }),
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-secondary" id="convClose">' + t('common.close', 'Zatvori') + '</button>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);
    bind(overlay);

    overlay.querySelector('#convClose').addEventListener('click', function () {
      overlay.classList.remove('show');
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 200);
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.classList.remove('show');
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 200);
      }
    });

    requestAnimationFrame(function () {
      overlay.classList.add('show');
    });
  }

  global.converter = {
    renderHTML: renderHTML,
    bind: bind,
    openModal: openModal
  };
})(window);
