/* =========================================================
   ALATIKA PRO — i18n.js
   Dvojezičnost SR / EN. Podrazumevani jezik: SR.
   ========================================================= */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'alatikapro.lang';
  const DEFAULT_LANG = 'sr';
  const SUPPORTED = ['sr', 'en'];

  const translations = {
    sr: {
      'app.tagline': 'Sve važno, na jednom mestu.',

      'nav.home': 'Početna',
      'nav.reminders': 'Podsetnici',
      'nav.bills': 'Računi',
      'nav.items': 'Moje stvari',
      'nav.money': 'Novac',

      'home.greet.morning': 'Dobro jutro!',
      'home.greet.day': 'Zdravo!',
      'home.greet.evening': 'Dobro veče!',
      'home.greet.night': 'Laku noć!',
      'home.today': 'Današnji pregled',
      'home.modules': 'Moduli',
      'home.rates': 'Kursna lista',
      'home.ratesPlaceholder': 'Kursna lista se učitava...',
      'home.quickActions': 'Brze akcije',
      'home.today.empty': 'Nema obaveza za danas.',
      'home.today.emptySub': 'Uživaj u slobodnom danu.',

      'home.mod.reminders.sub': 'Obaveze i rokovi.',
      'home.mod.bills.sub': 'Arhiva i plaćanja.',
      'home.mod.items.sub': 'Dokumenta i fajlovi.',
      'home.mod.money.sub': 'Prihodi i rashodi.',

      'home.action.addReminder': 'Novi podsetnik',
      'home.action.addBill': 'Novi račun',
      'home.action.addItem': 'Novi dokument',
      'home.action.addMoney': 'Nova transakcija',
      'home.action.soon': 'Ova funkcija dolazi u narednoj sesiji.',

      'reminders.title': 'Podsetnici',
      'reminders.subtitle': 'Ne zaboravi važne obaveze.',

      'bills.title': 'Računi',
      'bills.subtitle': 'Arhiva računa i statusa plaćanja.',
      'bills.new': 'Novi račun',
      'bills.edit': 'Izmeni račun',
      'bills.add': 'Dodaj račun',
      'bills.tab.bills': 'Računi',
      'bills.tab.rates': 'Rate',
      'bills.tab.checks': 'Čekovi',
      'bills.stat.total': 'Ukupno',
      'bills.stat.paid': 'Plaćeno',
      'bills.stat.pending': 'Na čekanju',
      'bills.filter.all': 'Svi',
      'bills.filter.paid': 'Plaćeni',
      'bills.filter.pending': 'Na čekanju',
      'bills.filter.overdue': 'Istekli',
      'bills.search': 'Pretraga računa...',
      'bills.empty': 'Još uvek nemaš računa za ovaj mesec.',
      'bills.emptySearch': 'Nema rezultata za pretragu.',
      'bills.untitled': '(Bez naziva)',
      'bills.overdue': 'isteklo',
      'bills.today': 'danas',
      'bills.inDays': 'za',
      'bills.days': 'dana',
      'bills.deleteConfirm': 'Obrisati ovaj račun?',
      'bills.download': 'Preuzmi',

      'bills.section.basic': 'Osnovni podaci',
      'bills.section.amount': 'Iznos i valuta',
      'bills.section.dates': 'Period i datumi',
      'bills.section.extra': 'Dodatno',

      'bills.field.name': 'Naziv računa',
      'bills.field.namePlaceholder': 'npr. Struja za oktobar',
      'bills.field.vendor': 'Dobavljač',
      'bills.field.vendorPlaceholder': 'npr. EPS',
      'bills.field.category': 'Kategorija',
      'bills.field.noCategory': '— Bez kategorije —',
      'bills.field.amount': 'Iznos',
      'bills.field.currency': 'Valuta',
      'bills.field.month': 'Mesec',
      'bills.field.issueDate': 'Datum izdavanja',
      'bills.field.dueDate': 'Rok plaćanja',
      'bills.field.paid': 'Plaćeno',
      'bills.field.paidDate': 'Datum plaćanja',
      'bills.field.reference': 'Referentni broj',
      'bills.field.description': 'Opis',

      'bills.attachment.add': 'Dodaj iz galerije',
      'bills.attachment.hint': 'Izaberi fotografiju računa ili PDF dokument. Ostaje samo na tvom uređaju.',
      'bills.attachment.change': 'Promeni',
      'bills.attachment.remove': 'Ukloni',

      'bills.err.name': 'Naziv je obavezan.',
      'bills.err.amount': 'Iznos mora biti veći od 0.',
      'bills.err.month': 'Mesec je obavezan.',
      'bills.err.file': 'Greška: ',

      'bills.status.paid': 'Plaćeno',
      'bills.status.pending': 'Na čekanju',
      'bills.status.overdue': 'Isteklo',

      'rates.stat.total': 'Ukupno',
      'rates.stat.active': 'Aktivne',
      'rates.stat.monthly': 'Mesečno RSD',
      'rates.filter.all': 'Sve',
      'rates.filter.active': 'Aktivne',
      'rates.filter.finished': 'Završene',
      'rates.search': 'Pretraga rata...',
      'rates.empty': 'Još u
