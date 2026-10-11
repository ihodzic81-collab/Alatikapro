/* =========================================================
   ALATIKA PRO — pin-ui.js
   Vizuelni deo PIN zaštite:
   - Ekran za unos PIN-a (preko celog ekrana)
   - Modal za postavljanje/uklanjanje PIN-a
   - Modal za zaključavanje kartica
   ========================================================= */

(function (global) {
  'use strict';

  const state = {
    overlay: null,
    onSuccess: null,
    onCancel: null,
    title: '',
    subtitle: '',
    mode: 'unlock' /* unlock | set | change-old | change-new | change-confirm */
  };

  function tr(key, fallback) {
    return (global.i18n && global.i18n.t) ? global.i18n.t(key, fallback) : (fallback || key);
  }

  /* ---------- KREIRANJE OVERLAY EKRANA ---------- */

  function buildOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'pin-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = [
      '<div class="pin-card">',
      '  <div class="pin-logo" aria-hidden="true">A</div>',
      '  <h2 class="pin-title" id="pinTitle"></h2>',
      '  <p class="pin-subtitle" id="pinSubtitle"></p>',
      '  <div class="pin-dots" id="pinDots">',
      '    <span class="pin-dot"></span>',
      '    <span class="pin-dot"></span>',
      '    <span class="pin-dot"></span>',
      '    <span class="pin-dot"></span>',
      '  </div>',
      '  <p class="pin-error" id="pinError" aria-live="polite"></p>',
      '  <div class="pin-keypad" id="pinKeypad">',
      '    <button type="button" class="pin-key" data-key="1">1</button>',
      '    <button type="button" class="pin-key" data-key="2">2</button>',
      '    <button type="button" class="pin-key" data-key="3">3</button>',
      '    <button type="button" class="pin-key" data-key="4">4</button>',
      '    <button type="button" class="pin-key" data-key="5">5</button>',
      '    <button type="button" class="pin-key" data-key="6">6</button>',
      '    <button type="button" class="pin-key" data-key="7">7</button>',
      '    <button type="button" class="pin-key" data-key="8">8</button>',
      '    <button type="button" class="pin-key" data-key="9">9</button>',
      '    <button type="button" class="pin-key pin-key-empty" disabled></button>',
      '    <button type="button" class="pin-key" data-key="0">0</button>',
      '    <button type="button" class="pin-key pin-key-back" data-key="back" aria-label="Obriši">',
      '      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>',
      '    </button>',
      '  </div>',
      '  <button type="button" class="pin-cancel" id="pinCancel"></button>',
      '</div>'
    ].join('');
    return overlay;
  }

  /* ---------- PRIKAZ ---------- */

  let currentPin = '';
  let firstPin = null;

  function updateDots() {
    const dots = state.overlay.querySelectorAll('.pin-dot');
    dots.forEach(function (dot, i) {
      if (i < currentPin.length) dot.classList.add('filled');
      else dot.classList.remove('filled');
    });
  }

  function showError(msg) {
    const el = state.overlay.querySelector('#pinError');
    if (el) el.textContent = msg || '';
  }

  function resetInput() {
    currentPin = '';
    updateDots();
    showError('');
  }

  function closeOverlay() {
    if (!state.overlay) return;
    state.overlay.classList.remove('show');
    setTimeout(function () {
      if (state.overlay && state.overlay.parentNode) {
        state.overlay.parentNode.removeChild(state.overlay);
      }
      state.overlay = null;
      currentPin = '';
      firstPin = null;
    }, 180);
  }

  function openOverlay(opts) {
    if (state.overlay) return;

    state.onSuccess = opts.onSuccess || null;
    state.onCancel = opts.onCancel || null;
    state.mode = opts.mode || 'unlock';

    const overlay = buildOverlay();
    state.overlay = overlay;
    document.body.appendChild(overlay);

    overlay.querySelector('#pinTitle').textContent = opts.title || tr('pin.title', 'Unesi PIN');
    overlay.querySelector('#pinSubtitle').textContent = opts.subtitle || '';
    overlay.querySelector('#pinCancel').textContent = opts.cancelLabel || tr('common.cancel', 'Otkaži');

    const keypad = overlay.querySelector('#pinKeypad');
    keypad.addEventListener('click', function (e) {
      const btn = e.target.closest('.pin-key');
      if (!btn || btn.disabled) return;
      const key = btn.getAttribute('data-key');
      handleKey(key);
    });

    overlay.querySelector('#pinCancel').addEventListener('click', function () {
      const cb = state.onCancel;
      closeOverlay();
      if (cb) cb();
    });

    document.addEventListener('keydown', onKeyDown);

    requestAnimationFrame(function () {
      overlay.classList.add('show');
    });

    resetInput();
  }

  function onKeyDown(e) {
    if (!state.overlay) return;
    if (e.key >= '0' && e.key <= '9') {
      handleKey(e.key);
    } else if (e.key === 'Backspace') {
      handleKey('back');
    } else if (e.key === 'Escape') {
      const cb = state.onCancel;
      closeOverlay();
      if (cb) cb();
    }
  }

  function handleKey(key) {
    if (!state.overlay) return;
    if (key === 'back') {
      currentPin = currentPin.slice(0, -1);
      updateDots();
      showError('');
      return;
    }
    if (currentPin.length >= 4) return;
    currentPin += key;
    updateDots();
    if (currentPin.length === 4) {
      setTimeout(processPin, 180);
    }
  }

  function processPin() {
    if (!state.overlay) return;
    const pin = currentPin;

    if (state.mode === 'unlock') {
      global.pin.verifyPin(pin).then(function (ok) {
        if (ok) {
          const cb = state.onSuccess;
          closeOverlay();
          document.removeEventListener('keydown', onKeyDown);
          if (cb) cb();
        } else {
          const secs = global.pin.getRemainingLockSeconds();
          if (secs > 0) {
            showError(tr('pin.tooMany', 'Previše pokušaja. Pokušaj za ') + secs + 's.');
          } else {
            showError(tr('pin.wrong', 'Pogrešan PIN. Pokušaj ponovo.'));
          }
          resetInput();
        }
      });
      return;
    }

    if (state.mode === 'set') {
      if (!firstPin) {
        firstPin = pin;
        currentPin = '';
        updateDots();
        state.overlay.querySelector('#pinTitle').textContent = tr('pin.confirm', 'Potvrdi PIN');
        state.overlay.querySelector('#pinSubtitle').textContent = tr('pin.confirmSub', 'Ponovo unesi isti PIN.');
        return;
      }
      if (firstPin !== pin) {
        showError(tr('pin.mismatch', 'PIN-ovi se ne poklapaju.'));
        firstPin = null;
        currentPin = '';
        updateDots();
        state.overlay.querySelector('#pinTitle').textContent = tr('pin.set', 'Postavi PIN');
        state.overlay.querySelector('#pinSubtitle').textContent = '';
        return;
      }
      global.pin.setPin(pin).then(function () {
        const cb = state.onSuccess;
        closeOverlay();
        document.removeEventListener('keydown', onKeyDown);
        if (cb) cb();
      }).catch(function (err) {
        showError(err.message || 'Greška.');
        resetInput();
        firstPin = null;
      });
      return;
    }

    if (state.mode === 'change') {
      if (!firstPin) {
        global.pin.verifyPin(pin).then(function (ok) {
          if (!ok) {
            showError(tr('pin.wrong', 'Pogrešan PIN.'));
            resetInput();
            return;
          }
          firstPin = pin;
          currentPin = '';
          updateDots();
          state.overlay.querySelector('#pinTitle').textContent = tr('pin.new', 'Novi PIN');
          state.overlay.querySelector('#pinSubtitle').textContent = '';
          state.mode = 'change-new';
        });
        return;
      }
    }

    if (state.mode === 'change-new') {
      firstPin = firstPin; /* stari pin */
      state.newPin = pin;
      currentPin = '';
      updateDots();
      state.overlay.querySelector('#pinTitle').textContent = tr('pin.confirm', 'Potvrdi PIN');
      state.overlay.querySelector('#pinSubtitle').textContent = tr('pin.confirmSub', 'Ponovo unesi isti PIN.');
      state.mode = 'change-confirm';
      return;
    }

    if (state.mode === 'change-confirm') {
      if (state.newPin !== pin) {
        showError(tr('pin.mismatch', 'PIN-ovi se ne poklapaju.'));
        currentPin = '';
        updateDots();
        state.mode = 'change-new';
        state.overlay.querySelector('#pinTitle').textContent = tr('pin.new', 'Novi PIN');
        return;
      }
      global.pin.setPin(pin).then(function () {
        const cb = state.onSuccess;
        closeOverlay();
        document.removeEventListener('keydown', onKeyDown);
        if (cb) cb();
      });
      return;
    }
  }

  /* ---------- JAVNE FUNKCIJE ---------- */

  function promptUnlock(moduleName, onSuccess) {
    const titles = {
      reminders: tr('pin.unlock.reminders', 'Otključaj Podsetnike'),
      bills: tr('pin.unlock.bills', 'Otključaj Račune'),
      items: tr('pin.unlock.items', 'Otključaj Moje stvari'),
      money: tr('pin.unlock.money', 'Otključaj Novac')
    };
    openOverlay({
      mode: 'unlock',
      title: titles[moduleName] || tr('pin.title', 'Unesi PIN'),
      subtitle: tr('pin.enter4', 'Unesi 4-cifreni PIN.'),
      onSuccess: onSuccess
    });
  }

  function promptSetPin(onSuccess) {
    openOverlay({
      mode: 'set',
      title: tr('pin.set', 'Postavi PIN'),
      subtitle: tr('pin.setSub', 'Izaberi 4-cifreni PIN.'),
      onSuccess: onSuccess
    });
  }

  function promptChangePin(onSuccess) {
    openOverlay({
      mode: 'change',
      title: tr('pin.old', 'Stari PIN'),
      subtitle: tr('pin.oldSub', 'Unesi postojeći PIN.'),
      onSuccess: onSuccess
    });
  }

  global.pinUI = {
    promptUnlock: promptUnlock,
    promptSetPin: promptSetPin,
    promptChangePin: promptChangePin
  };
})(window);
