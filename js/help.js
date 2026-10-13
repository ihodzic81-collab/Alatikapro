/* =========================================================
   ALATIKA PRO — help.js
   Modal sa objašnjenjem za svaki modul.
   Boje prate boju kartice.
   ========================================================= */

(function (global) {
  'use strict';

  function t(key, fallback) {
    return (global.i18n && global.i18n.t) ? global.i18n.t(key, fallback) : (fallback || key);
  }

  /* Definicije help sadržaja za svaki modul */
  const HELP_CONTENT = {
    reminders: {
      titleKey: 'help.reminders.title',
      titleFallback: 'Podsetnici',
      subtitleKey: 'help.reminders.subtitle',
      subtitleFallback: 'Ne zaboravi važne obaveze.',
      icon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>',
      content: function () {
        return [
          '<p>' + t('help.reminders.p1', 'Podsetnici služe da ne zaboraviš važne obaveze — račune, rođendane, preglede, registracije, sastanke.') + '</p>',
          '<div class="help-highlight">',
          '  <span class="help-highlight-icon">💰</span>',
          '  <span class="help-highlight-text">' + t('help.reminders.highlight', 'Ako izabereš kategoriju <strong>"Računi i plaćanja"</strong>, možeš da povežeš podsetnik sa postojećim računom. Kada označiš podsetnik kao završen, trošak se automatski evidentira u modulu <strong>Novac</strong>.') + '</span>',
          '</div>',
          '<p><strong>' + t('help.reminders.tips', 'Saveti:') + '</strong></p>',
          '<ul>',
          '  <li>' + t('help.reminders.tip1', 'Za rođendane izaberi kategoriju <strong>"Porodica i rođendani"</strong> — aplikacija sama računa godine i ponavlja svake godine.') + '</li>',
          '  <li>' + t('help.reminders.tip2', 'Koristi <strong>"Podseti me ranije"</strong> da te obavesti nekoliko dana pre roka.') + '</li>',
          '  <li>' + t('help.reminders.tip3', 'Podsetnici koji su hitni dobijaju <strong>crvenu pulsirajuću tačku</strong>.') + '</li>',
          '</ul>'
        ].join('');
      }
    },
    bills: {
      titleKey: 'help.bills.title',
      titleFallback: 'Računi',
      subtitleKey: 'help.bills.subtitle',
      subtitleFallback: 'Arhiva računa, rata i čekova.',
      icon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6"></path><path d="M9 13h6M9 17h6"></path></svg>',
      content: function () {
        return [
          '<p>' + t('help.bills.p1', 'Ovde vodiš evidenciju svih računa — struja, voda, internet, telefon, kirija, pretplate...') + '</p>',
          '<div class="help-highlight">',
          '  <span class="help-highlight-icon">💰</span>',
          '  <span class="help-highlight-text">' + t('help.bills.highlight', 'Kada označiš račun kao plaćen (klikom na zeleno dugme <strong>✓</strong> pored računa ili u detaljima), trošak se automatski evidentira u modulu <strong>Novac</strong>.') + '</span>',
          '</div>',
          '<p><strong>' + t('help.bills.tabs', 'Tri taba:') + '</strong></p>',
          '<ul>',
          '  <li><strong>' + t('help.bills.tab1Name', 'Računi') + '</strong> — ' + t('help.bills.tab1Desc', 'mesečni računi sa rokovima plaćanja.') + '</li>',
          '  <li><strong>' + t('help.bills.tab2Name', 'Rate') + '</strong> — ' + t('help.bills.tab2Desc', 'krediti i kupovine na rate, pratiš koliko je otplaćeno.') + '</li>',
          '  <li><strong>' + t('help.bills.tab3Name', 'Čekovi') + '</strong> — ' + t('help.bills.tab3Desc', 'kupovina čekovima, automatska realizacija na datum.') + '</li>',
          '</ul>'
        ].join('');
      }
    },
    items: {
      titleKey: 'help.items.title',
      titleFallback: 'Moje stvari',
      subtitleKey: 'help.items.subtitle',
      subtitleFallback: 'Važni dokumenti uvek pri ruci.',
      icon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
      content: function () {
        return [
          '<p>' + t('help.items.p1', 'Ovde čuvaš važne dokumente — lična karta, pasoš, vozačka, zdravstvena knjižica, ugovori, potvrde.') + '</p>',
          '<div class="help-highlight">',
          '  <span class="help-highlight-icon">🔒</span>',
          '  <span class="help-highlight-text">' + t('help.items.highlight', 'Svi fajlovi ostaju <strong>samo na tvom uređaju</strong>. Ništa se ne šalje na internet. Aplikacija radi i offline.') + '</span>',
          '</div>',
          '<p><strong>' + t('help.items.tips', 'Saveti:') + '</strong></p>',
          '<ul>',
          '  <li>' + t('help.items.tip1', 'Unesi <strong>datum isteka</strong> za dokumente koji ga imaju — aplikacija te upozorava 30 dana pre isteka.') + '</li>',
          '  <li>' + t('help.items.tip2', 'Koristi <strong>oznake</strong> (tagove) za lakšu pretragu — npr. "lično", "važno", "posao".') + '</li>',
          '  <li>' + t('help.items.tip3', 'Označi dokumente sa zvezdicom <strong>⭐</strong> da ti budu uvek pri ruci.') + '</li>',
          '</ul>'
        ].join('');
      }
    },
    money: {
      titleKey: 'help.money.title',
      titleFallback: 'Novac',
      subtitleKey: 'help.money.subtitle',
      subtitleFallback: 'Prihodi, rashodi i budžet.',
      icon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v10M9 9.5a2.5 2.5 0 0 1 5 0c0 1.5-5 1.5-5 3a2.5 2.5 0 0 0 5 0"></path></svg>',
      content: function () {
        return [
          '<p>' + t('help.money.p1', 'Ovde pratiš sve prihode i rashode, postavljaš mesečni budžet i vidiš statistiku.') + '</p>',
          '<div class="help-highlight">',
          '  <span class="help-highlight-icon">🔗</span>',
          '  <span class="help-highlight-text">' + t('help.money.highlight', 'Kada u modulu <strong>Računi</strong> označiš račun kao plaćen, ili u <strong>Podsetnicima</strong> završiš podsetnik vezan za račun, trošak se automatski pojavljuje ovde. Ne moraš ručno da unosiš.') + '</span>',
          '</div>',
          '<p><strong>' + t('help.money.tabs', 'Tri taba:') + '</strong></p>',
          '<ul>',
          '  <li><strong>' + t('help.money.tab1Name', 'Transakcije') + '</strong> — ' + t('help.money.tab1Desc', 'lista svih prihoda i rashoda po datumima.') + '</li>',
          '  <li><strong>' + t('help.money.tab2Name', 'Budžet') + '</strong> — ' + t('help.money.tab2Desc', 'postavi mesečni limit potrošnje i prati procenat.') + '</li>',
          '  <li><strong>' + t('help.money.tab3Name', 'Izveštaj') + '</strong> — ' + t('help.money.tab3Desc', 'godišnji pregled, grafikoni po mesecima i kategorijama.') + '</li>',
          '</ul>'
        ].join('');
      }
    }
  };

  let overlay = null;

  function open(moduleKey) {
    if (overlay) return;

    const def = HELP_CONTENT[moduleKey];
    if (!def) return;

    overlay = document.createElement('div');
    overlay.className = 'help-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = [
      '<div class="help-modal help-' + moduleKey + '">',
      '  <button type="button" class="help-modal-close" id="helpCloseX" aria-label="' + t('common.close', 'Zatvori') + '">',
      '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
      '  </button>',
      '  <div class="help-modal-header">',
      '    <span class="help-modal-icon">' + def.icon + '</span>',
      '    <div class="help-modal-titles">',
      '      <div class="help-modal-title">' + t(def.titleKey, def.titleFallback) + '</div>',
      '      <div class="help-modal-subtitle">' + t(def.subtitleKey, def.subtitleFallback) + '</div>',
      '    </div>',
      '  </div>',
      '  <div class="help-modal-content">' + def.content() + '</div>',
      '  <div class="help-modal-actions">',
      '    <button type="button" class="help-modal-btn" id="helpCloseBtn">' + t('common.ok', 'U redu') + '</button>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    function close() {
      overlay.classList.remove('show');
      setTimeout(function () {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
      }, 220);
    }

    overlay.querySelector('#helpCloseX').addEventListener('click', close);
    overlay.querySelector('#helpCloseBtn').addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', escHandler);
      }
    });

    requestAnimationFrame(function () {
      overlay.classList.add('show');
    });
  }

  global.help = {
    open: open,
    HELP_CONTENT: HELP_CONTENT
  };
})(window);
