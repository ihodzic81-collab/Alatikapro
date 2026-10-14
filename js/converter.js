/* =========================================================
   ALATIKA PRO — converter.js
   Konverter valuta + refresh dugme u modalu.
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

  function renderHTML(opts) {
    opts = opts || {};
    const fromCode = opts.fromCode || 'RSD';
    const toCode = opts.toCode || 'EUR';
    const amount = opts.amount || '';
    const compact = !!opts.compact;

    const amountAttr = amount ? ' value="' + amount + '"' : '';

    const fromOptions = global.currencies.getAll().map(function (c) {
      const selected = c.code === fromCode ? ' selected' : '';
      return '<option value="' + c.code + '"' + selected + '>' + c.flag + ' ' + c.code + '</option>';
    }).join('');

    const toOptions = global.currencies.getAll().map(function (c) {
      const selected = c.code === toCode ? ' selected' : '';
      return '<option value="' + c.code + '"' + selected + '>' + c.flag + ' ' + c.code + '</option>';
    }).join('');

    return [
      '<div class="converter' + (compact ? ' converter-compact' : '') + '" data-converter>',
      '  <div class="conv-row">',
      '    <input type="text" inputmode="decimal" class="conv-amount" data-conv-amount' + amountAttr + ' placeholder="0,00" />',
      '    <select class="conv-currency" data-conv-from>' + fromOptions + '</select>',
      '  </div>',
      '  <div class="conv-swap-row">',
      '    <button type="button" class="conv-swap" data-conv-swap>',
      '      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '        <polyline points="17 1 21 5 17 9"></polyline>',
      '        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>',
      '        <polyline points="7 23 3 19 7 15"></polyline>',
      '        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>',
      '      </svg>',
      '    </button>',
      '  </div>',
      '  <div class="conv-row">',
      '    <input type="text" class="conv-result" data-conv-result readonly placeholder="0,00" />',
      '    <select class="conv-currency" data-conv-to>' + toOptions + '</select>',
      '  </div>',
      '  <div class="conv-info" data-conv-info></div>',
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

      function ensureRates() {
        if (global.nbs && global.nbs.hasRates()) return Promise.resolve();
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

          const rate1 = global.nbs.getRate(from);
          const rate2 = global.nbs.getRate(to);
          const date = global.nbs.getDate();

          let infoText = '';
          if (from === 'RSD') {
            infoText = '1 ' + to + ' = ' + formatAmount(rate2, 'RSD').trim();
          } else if (to === 'RSD') {
            infoText = '1 ' + from + ' = ' + formatAmount(rate1, 'RSD').trim();
          } else {
            infoText = '1 ' + from + ' = ' + formatAmount(rate1 / rate2, to).trim();
          }

          let dateText = '';
          if (date) {
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
              const locale = lang() === 'en' ? 'en-GB' : 'sr-RS';
              dateText = d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
            } else {
              dateText = date;
            }
          }

          const source = global.nbs.getSource ? global.nbs.getSource() : '';
          const staleMark = (source === 'base' || source === 'cache')
            ? ' · <span class="conv-stale">' + t('conv.stale', 'poslednji sačuvan') + '</span>'
            : '';

          let html = '<span class="conv-rate-info">' + infoText + '</span>';
          if (dateText) {
            html += ' · <span class="conv-rate-date">' + t('conv.date', 'na dan') + ' ' + dateText + '</span>';
          }
          html += staleMark;
          html += '<br><span class="conv-note">' + t('conv.nbsNote', 'Referentni kurs NBS. Banke mogu primenjivati drugačiji kurs.') + '</span>';
          infoEl.innerHTML = html;
        }).catch(function () {
          resultInput.value = '';
          infoEl.innerHTML = '<span class="conv-error">' + t('conv.noInternet', 'Kurs nije dostupan bez interneta.') + '</span>';
        });
      }

      amountInput.addEventListener('input', global.utils.debounce(recalc, 250));
      fromSelect.addEventListener('change', recalc);
      toSelect.addEventListener('change', recalc);

      swapBtn.addEventListener('click', function () {
        const f = fromSelect.value;
        const t2 = toSelect.value;
        fromSelect.value = t2;
        toSelect.value = f;
        swapBtn.classList.add('rotating');
        setTimeout(function () { swapBtn.classList.remove('rotating'); }, 300);
        recalc();
      });

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

      resetBtn.addEventListener('click', function () {
        amountInput.value = '';
        fromSelect.value = 'RSD';
        toSelect.value = 'EUR';
        recalc();
      });

      recalc();
    });
  }

  function openModal() {
    const existing = document.getElementById('converterModal');
    if (existing) existing.parentNode.removeChild(existing);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'converterModal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <div class="converter-modal-header">',
      '    <h3 class="modal-title" style="margin-bottom: 0;">' + t('conv.title', 'Konverter valuta') + '</h3>',
      '    <button type="button" class="conv-modal-refresh" id="convModalRefresh" aria-label="' + t('rates.refresh', 'Osveži') + '">',
      '      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">',
      '        <polyline points="23 4 23 10 17 10"></polyline>',
      '        <polyline points="1 20 1 14 7 14"></polyline>',
      '        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>',
      '      </svg>',
      '    </button>',
      '  </div>',
      renderHTML({ amount: '', fromCode: 'RSD', toCode: 'EUR' }),
      '  <div class="conv-modal-updated" id="convModalUpdated"></div>',
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-secondary" id="convClose">' + t('common.close', 'Zatvori') + '</button>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);
    bind(overlay);

    const updatedEl = overlay.querySelector('#convModalUpdated');

    function updateUpdatedInfo() {
      if (!updatedEl || !global.nbs) return;
      const updated = global.nbs.getUpdatedAt();
      const source = global.nbs.getSource ? global.nbs.getSource() : '';
      if (!updated) { updatedEl.textContent = ''; return; }
      const diff = Date.now() - updated;
      const mins = Math.floor(diff / 60000);
      let timeStr = '';
      if (mins < 1) timeStr = t('rates.justNow', 'upravo sada');
      else if (mins < 60) timeStr = t('rates.minAgo', 'pre') + ' ' + mins + ' ' + t('rates.min', 'min');
      else {
        const hours = Math.floor(mins / 60);
        if (hours < 24) timeStr = t('rates.hourAgo', 'pre') + ' ' + hours + ' ' + t('rates.hours', 'h');
        else {
          const days = Math.floor(hours / 24);
          timeStr = t('rates.dayAgo', 'pre') + ' ' + days + ' ' + t('rates.days', 'd');
        }
      }
      let txt = t('rates.updated', 'Ažurirano') + ': ' + timeStr;
      if (source === 'base') txt += ' · ' + t('rates.offline', 'offline');
      else if (source === 'cache') txt += ' · ' + t('rates.fromCache', 'iz keša');
      updatedEl.textContent = txt;
    }
    updateUpdatedInfo();

    const refreshBtn = overlay.querySelector('#convModalRefresh');
    refreshBtn.addEventListener('click', function () {
      if (refreshBtn.classList.contains('loading')) return;
      refreshBtn.classList.add('loading');
      if (global.home && global.home.showToast) {
        global.home.showToast(t('rates.refreshing', 'Osvežavam kurs...'));
      }
      global.nbs.getRates(true).then(function () {
        overlay.querySelectorAll('[data-converter]').forEach(function (c) {
          delete c.dataset.bound;
        });
        bind(overlay);
        updateUpdatedInfo();
        refreshBtn.classList.remove('loading');
        refreshBtn.classList.add('success');
        setTimeout(function () { refreshBtn.classList.remove('success'); }, 1200);
        const source = global.nbs.getSource ? global.nbs.getSource() : '';
        if (source === 'api') {
          if (global.home && global.home.showToast) {
            global.home.showToast(t('rates.refreshed', '✓ Kursna lista osvežena'));
          }
        } else {
          if (global.home && global.home.showToast) {
            global.home.showToast(t('rates.refreshedOffline', 'Kurs osvežen (offline)'));
          }
        }
      }).catch(function () {
        refreshBtn.classList.remove('loading');
        if (global.home && global.home.showToast) {
          global.home.showToast(t('rates.refreshFailed', 'Ne mogu da osvežim — koristi se keš'));
        }
      });
    });

    const interval = setInterval(updateUpdatedInfo, 30000);

    function closeModal() {
      clearInterval(interval);
      overlay.classList.remove('show');
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 200);
    }

    overlay.querySelector('#convClose').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
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
