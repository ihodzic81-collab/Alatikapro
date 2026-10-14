/* =========================================================
   ALATIKA PRO — items.js
   Modul Moje stvari.
   ========================================================= */

(function (global) {
  'use strict';

  const STORE = 'items';
  const STORE_FILES = 'files';

  const CATEGORIES = [
    { id: 'personal', nameKey: 'items.category.personal', descKey: 'items.category.personal.desc', color: 'blue',   icon: 'user' },
    { id: 'family',   nameKey: 'items.category.family',   descKey: 'items.category.family.desc',   color: 'green',  icon: 'family' },
    { id: 'business', nameKey: 'items.category.business', descKey: 'items.category.business.desc', color: 'purple', icon: 'briefcase' },
    { id: 'other',    nameKey: 'items.category.other',    descKey: 'items.category.other.desc',    color: 'orange', icon: 'image' }
  ];

  const state = {
    items: [],
    filter: 'all',
    search: '',
    activeCategory: null,
    editingId: null
  };

  function t(key, fallback) {
    return (global.i18n && global.i18n.t) ? global.i18n.t(key, fallback) : (fallback || key);
  }

  function lang() {
    return (global.i18n && global.i18n.getLang) ? global.i18n.getLang() : 'sr';
  }

  function categoryLabel(catId) {
    const c = CATEGORIES.find(function (x) { return x.id === catId; });
    if (!c) return catId;
    return t(c.nameKey, catId);
  }

  function categoryDesc(catId) {
    const c = CATEGORIES.find(function (x) { return x.id === catId; });
    if (!c) return '';
    return t(c.descKey, '');
  }

  function categoryColor(catId) {
    const c = CATEGORIES.find(function (x) { return x.id === catId; });
    return c ? c.color : 'blue';
  }

  const ICONS = {
    user: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    family: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    briefcase: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
    image: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
    file: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
    star: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    starFilled: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    download: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>'
  };

  function optimizeImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) {
        resolve(file);
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        const MAX = 1600;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > MAX || h > MAX) {
          if (w >= h) { h = Math.round(h * (MAX / w)); w = MAX; }
          else { w = Math.round(w * (MAX / h)); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob); else resolve(file);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Greška pri učitavanju slike.'));
      };
      img.src = url;
    });
  }

  function saveFile(file) {
    const id = global.utils.uid('file');
    const now = new Date().toISOString();
    return optimizeImage(file).then(function (optimized) {
      const record = {
        id: id,
        name: file.name || 'attachment',
        type: optimized.type || file.type || 'application/octet-stream',
        size: optimized.size || file.size || 0,
        blob: optimized,
        createdAt: now
      };
      return global.storage.save(STORE_FILES, record).then(function () { return id; });
    });
  }

  function loadFile(fileId) { return global.storage.load(STORE_FILES, fileId); }
  function deleteFile(fileId) { if (!fileId) return Promise.resolve(); return global.storage.delete(STORE_FILES, fileId); }

  function getFileURL(fileId) {
    return loadFile(fileId).then(function (rec) {
      if (!rec || !rec.blob) return null;
      return { url: URL.createObjectURL(rec.blob), type: rec.type, name: rec.name };
    });
  }

  function loadAll() {
    return global.storage.loadAll(STORE).then(function (list) {
      state.items = (list || []).sort(function (a, b) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      return state.items;
    });
  }

  function applyFilter(list) {
    let out = list.slice();

    if (state.activeCategory) {
      out = out.filter(function (it) { return it.category === state.activeCategory; });
    }

    if (state.filter === 'favorites') {
      out = out.filter(function (it) { return it.favorite === true; });
    } else if (state.filter === 'expiring') {
      out = out.filter(function (it) {
        if (!it.expiryDate) return false;
        const days = global.utils.daysFromToday(it.expiryDate);
        return days >= 0 && days <= 30;
      });
    } else if (state.filter === 'expired') {
      out = out.filter(function (it) {
        if (!it.expiryDate) return false;
        return global.utils.daysFromToday(it.expiryDate) < 0;
      });
    }

    if (state.search) {
      const q = state.search.toLowerCase();
      out = out.filter(function (it) {
        const tags = Array.isArray(it.tags) ? it.tags.join(' ') : (it.tags || '');
        return (it.name || '').toLowerCase().indexOf(q) !== -1 ||
               (it.description || '').toLowerCase().indexOf(q) !== -1 ||
               (it.institution || '').toLowerCase().indexOf(q) !== -1 ||
               tags.toLowerCase().indexOf(q) !== -1;
      });
    }

    return out;
  }

  function computeStats() {
    const total = state.items.length;
    const favorites = state.items.filter(function (it) { return it.favorite; }).length;
    let expiring = 0;
    let expired = 0;
    state.items.forEach(function (it) {
      if (!it.expiryDate) return;
      const days = global.utils.daysFromToday(it.expiryDate);
      if (days < 0) expired++;
      else if (days <= 30) expiring++;
    });
    return { total: total, favorites: favorites, expiring: expiring, expired: expired };
  }

  function countByCategory(catId) {
    return state.items.filter(function (it) { return it.category === catId; }).length;
  }

  function renderInto(view) {
    let header = view.querySelector('.module-header');
    if (!header) {
      view.innerHTML = '';
      header = buildHeader();
      view.appendChild(header);
    }

    while (header.nextSibling) view.removeChild(header.nextSibling);

    if (state.activeCategory) renderCategoryDetail(view);
    else renderCategoriesGrid(view);

    toggleFabVisibility();
  }

  function renderCategoriesGrid(view) {
    const grid = document.createElement('div');
    grid.className = 'items-categories';

    CATEGORIES.forEach(function (cat) {
      const count = countByCategory(cat.id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'item-cat-card cat-' + cat.color;
      card.innerHTML = [
        '<div class="item-cat-icon cat-' + cat.color + '">' + (ICONS[cat.icon] || ICONS.file) + '</div>',
        '<div class="item-cat-body">',
        '  <div class="item-cat-name">' + t(cat.nameKey, cat.id) + '</div>',
        '  <div class="item-cat-desc">' + t(cat.descKey, '') + '</div>',
        '</div>',
        '<div class="item-cat-count">' + count + '</div>'
      ].join('');

      card.addEventListener('click', function () {
        state.activeCategory = cat.id;
        renderInto(view);
      });

      grid.appendChild(card);
    });

    view.appendChild(grid);

    const recent = state.items.slice(0, 5);
    if (recent.length > 0) {
      const recentTitle = document.createElement('h3');
      recentTitle.className = 'home-section-title';
      recentTitle.style.marginTop = '1.25rem';
      recentTitle.textContent = t('items.recent', 'Nedavno dodato');
      view.appendChild(recentTitle);

      const listWrap = document.createElement('div');
      listWrap.className = 'items-list';
      recent.forEach(function (it) {
        listWrap.appendChild(buildItemRow(it, view));
      });
      view.appendChild(listWrap);
    }

    if (state.items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'items-empty';
      empty.innerHTML = [
        '<div class="items-empty-icon">' + ICONS.file + '</div>',
        '<p>' + t('items.empty', 'Još uvek nemaš dokumenata. Dodaj prvi!') + '</p>'
      ].join('');
      view.appendChild(empty);
    }
  }

  function renderCategoryDetail(view) {
    const backRow = document.createElement('button');
    backRow.type = 'button';
    backRow.className = 'items-category-back';
    backRow.innerHTML = [
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
      '<span>' + t('items.category.all', 'Sve kategorije') + '</span>'
    ].join('');
    backRow.addEventListener('click', function () {
      state.activeCategory = null;
      state.search = '';
      state.filter = 'all';
      renderInto(view);
    });
    view.appendChild(backRow);

    const catTitle = document.createElement('h2');
    catTitle.className = 'items-category-title';
    catTitle.textContent = categoryLabel(state.activeCategory);
    view.appendChild(catTitle);

    const search = document.createElement('div');
    search.className = 'bills-search';
    search.innerHTML = [
      '<svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="20" y1="20" x2="16.65" y2="16.65"></line></svg>',
      '<input type="search" id="itemsSearchInput" placeholder="' + t('items.search', 'Pretraga dokumenata...') + '" value="' + global.utils.escapeHtml(state.search) + '" />'
    ].join('');
    view.appendChild(search);
    const inp = search.querySelector('#itemsSearchInput');
    inp.addEventListener('input', global.utils.debounce(function () {
      state.search = inp.value.trim();
      const listWrap = view.querySelector('.items-list');
      if (listWrap) renderItemsList(listWrap, view);
    }, 180));

    const filters = document.createElement('div');
    filters.className = 'bills-filters';
    const defs = [
      { id: 'all',       label: t('items.filter.all', 'Svi') },
      { id: 'favorites', label: t('items.filter.favorites', 'Omiljeni') },
      { id: 'expiring',  label: t('items.filter.expiring', 'Uskoro ističu') },
      { id: 'expired',   label: t('items.filter.expired', 'Istekli') }
    ];
    defs.forEach(function (d) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bills-filter' + (state.filter === d.id ? ' active' : '');
      btn.textContent = d.label;
      btn.addEventListener('click', function () {
        state.filter = d.id;
        filters.querySelectorAll('.bills-filter').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        const listWrap = view.querySelector('.items-list');
        if (listWrap) renderItemsList(listWrap, view);
      });
      filters.appendChild(btn);
    });
    view.appendChild(filters);

    const listWrap = document.createElement('div');
    listWrap.className = 'items-list';
    view.appendChild(listWrap);
    renderItemsList(listWrap, view);
  }

  function renderItemsList(listWrap, view) {
    listWrap.innerHTML = '';
    const filtered = applyFilter(state.items);

    if (filtered.length === 0) {
      listWrap.innerHTML = [
        '<div class="items-empty">',
        '  <div class="items-empty-icon">' + ICONS.file + '</div>',
        '  <p>' + (state.search
          ? t('items.emptySearch', 'Nema rezultata za pretragu.')
          : t('items.empty', 'Još uvek nemaš dokumenata. Dodaj prvi!')) + '</p>',
        '</div>'
      ].join('');
      return;
    }

    filtered.forEach(function (it) {
      listWrap.appendChild(buildItemRow(it, view));
    });
  }

  function buildItemRow(it, view) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'item-row';

    const thumb = document.createElement('div');
    thumb.className = 'item-thumb';
    if (it.attachmentId) {
      getFileURL(it.attachmentId).then(function (info) {
        if (!info) return;
        if (info.type && info.type.indexOf('image/') === 0) {
          const img = document.createElement('img');
          img.src = info.url;
          img.alt = '';
          thumb.innerHTML = '';
          thumb.appendChild(img);
        } else {
          thumb.innerHTML = ICONS.file;
        }
      });
    } else {
      thumb.innerHTML = ICONS.file;
    }
    row.appendChild(thumb);

    const body = document.createElement('div');
    body.className = 'item-body';

    const nameRow = document.createElement('div');
    nameRow.className = 'item-name-row';
    nameRow.appendChild(document.createTextNode(it.name || t('items.untitled', '(Bez naziva)')));
    body.appendChild(nameRow);

    const meta = document.createElement('div');
    meta.className = 'item-meta';

    if (it.institution) {
      const inst = document.createElement('span');
      inst.className = 'item-meta-item';
      inst.textContent = it.institution;
      meta.appendChild(inst);
    }

    if (it.expiryDate) {
      const days = global.utils.daysFromToday(it.expiryDate);
      let cls = 'item-meta-item';
      let label = '';
      if (days < 0) { cls += ' expired'; label = t('items.expiry.expired', 'Istekao'); }
      else if (days === 0) { cls += ' expiring'; label = t('items.expiry.today', 'Ističe danas'); }
      else if (days <= 30) { cls += ' expiring'; label = t('items.expiry.soon', 'Ističe za') + ' ' + days + ' ' + t('items.expiry.days', 'dana'); }
      else { label = global.utils.formatDate(it.expiryDate); }
      const exp = document.createElement('span');
      exp.className = cls;
      exp.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg> ' + label;
      meta.appendChild(exp);
    }

    body.appendChild(meta);
    row.appendChild(body);

    const favBtn = document.createElement('button');
    favBtn.type = 'button';
    favBtn.className = 'item-fav-btn' + (it.favorite ? ' active' : '');
    favBtn.setAttribute('aria-label', it.favorite
      ? t('items.favorite.remove', 'Ukloni iz omiljenih')
      : t('items.favorite.add', 'Dodaj u omiljene'));
    favBtn.innerHTML = it.favorite ? ICONS.starFilled : ICONS.star;
    favBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      it.favorite = !it.favorite;
      global.storage.save(STORE, it).then(function () {
        if (view) renderInto(view);
      });
    });
    row.appendChild(favBtn);

    row.addEventListener('click', function () {
      openDetail(it);
    });

    return row;
  }

  let formOverlay = null;
  let currentAttachment = { id: null, isNew: false, removed: false };

  function openForm(existing) {
    if (formOverlay) return;
    state.editingId = existing ? existing.id : null;

    const isEdit = !!existing;
    const item = existing ? Object.assign({}, existing) : {
      name: '',
      category: state.activeCategory || 'personal',
      description: '',
      issueDate: '',
      expiryDate: '',
      institution: '',
      tags: '',
      favorite: false,
      attachmentId: ''
    };

    currentAttachment = {
      id: item.attachmentId || null,
      isNew: false,
      removed: false
    };

    formOverlay = document.createElement('div');
    formOverlay.className = 'modal-overlay';
    formOverlay.setAttribute('role', 'dialog');

    const catOptions = CATEGORIES.map(function (c) {
      const selected = item.category === c.id ? ' selected' : '';
      return '<option value="' + c.id + '"' + selected + '>' + global.utils.escapeHtml(t(c.nameKey, c.id)) + '</option>';
    }).join('');

    /* Tags: prikaži kao string */
    const tagsString = Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '');

    formOverlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <h3 class="modal-title">' + (isEdit ? t('items.edit', 'Izmeni dokument') : t('items.new', 'Novi dokument')) + '</h3>',
      '  <form id="itemForm" novalidate>',
      '    <div class="bill-form-section"><div id="uploadArea"></div></div>',
      '    <div class="form-group">',
      '      <label class="label">' + t('items.field.name', 'Naziv dokumenta') + ' *</label>',
      '      <input class="input" type="text" name="name" required value="' + global.utils.escapeHtml(item.name || '') + '" placeholder="' + t('items.field.namePlaceholder', 'npr. Pasoš') + '" />',
      '    </div>',
      '    <div class="form-group">',
      '      <label class="label">' + t('items.field.category', 'Kategorija') + ' *</label>',
      '      <select class="select" name="category">' + catOptions + '</select>',
      '    </div>',
      '    <div class="form-row">',
      '      <div class="form-group">',
      '        <label class="label">' + t('items.field.issueDate', 'Datum izdavanja') + '</label>',
      global.utils.dateInputHTML('issueDate', item.issueDate || '', {}),
      '      </div>',
      '      <div class="form-group">',
      '        <label class="label">' + t('items.field.expiryDate', 'Datum isteka') + '</label>',
      global.utils.dateInputHTML('expiryDate', item.expiryDate || '', {}),
      '      </div>',
      '    </div>',
      '    <div class="form-group">',
      '      <label class="label">' + t('items.field.institution', 'Institucija') + '</label>',
      '      <input class="input" type="text" name="institution" value="' + global.utils.escapeHtml(item.institution || '') + '" placeholder="' + t('items.field.institutionPlaceholder', 'npr. MUP Srbije') + '" />',
      '    </div>',
      '    <div class="form-group">',
      '      <label class="label">' + t('items.field.tags', 'Oznake') + '</label>',
      '      <input class="input" type="text" name="tags" value="' + global.utils.escapeHtml(tagsString) + '" placeholder="' + t('items.field.tagsHint', 'Odvoji zarezom') + '" />',
      '    </div>',
      '    <div class="form-group">',
      '      <label class="label">' + t('items.field.description', 'Opis') + '</label>',
      '      <textarea class="textarea" name="description">' + global.utils.escapeHtml(item.description || '') + '</textarea>',
      '    </div>',
      '    <div class="form-group">',
      '      <label class="label">',
      '        <input type="checkbox" name="favorite" ' + (item.favorite ? 'checked' : '') + ' style="margin-right:0.4rem;" />',
      '        ' + t('items.field.favorite', 'Omiljeno') + '</label>',
      '    </div>',
      '    <div class="form-error" id="itemFormError"></div>',
      '    <div class="modal-actions">',
      '      <button type="button" class="btn btn-secondary" id="itemCancel">' + t('common.cancel', 'Otkaži') + '</button>',
      '      <button type="submit" class="btn btn-primary">' + t('common.save', 'Sačuvaj') + '</button>',
      '    </div>',
      '  </form>',
      '</div>'
    ].join('');

    document.body.appendChild(formOverlay);
    global.utils.bindDateInputs(formOverlay);

    renderUploadArea(formOverlay.querySelector('#uploadArea'));

    formOverlay.querySelector('#itemCancel').addEventListener('click', closeForm);
    formOverlay.addEventListener('click', function (e) {
      if (e.target === formOverlay) closeForm();
    });
    formOverlay.querySelector('#itemForm').addEventListener('submit', function (e) {
      e.preventDefault();
      submitForm(formOverlay);
    });

    requestAnimationFrame(function () {
      formOverlay.classList.add('show');
    });
  }

  function renderUploadArea(container) {
    container.innerHTML = '';

    if (currentAttachment.id && !currentAttachment.removed) {
      getFileURL(currentAttachment.id).then(function (info) {
        if (!info) return;
        const wrap = document.createElement('div');
        wrap.className = 'upload-preview';

        if (info.type && info.type.indexOf('image/') === 0) {
          const img = document.createElement('img');
          img.src = info.url;
          img.alt = '';
          wrap.appendChild(img);
        } else {
          wrap.innerHTML = '<div style="padding: 1rem; text-align: center;"><div style="color: var(--color-module-items);">' + ICONS.file + '</div><p style="margin-top:0.5rem; font-size: 0.85rem;">' + global.utils.escapeHtml(info.name) + '</p></div>';
        }

        const actions = document.createElement('div');
        actions.className = 'upload-preview-actions';

        const changeBtn = document.createElement('button');
        changeBtn.type = 'button';
        changeBtn.className = 'btn btn-secondary';
        changeBtn.textContent = t('items.attachment.change', 'Promeni');
        changeBtn.addEventListener('click', pickFile);
        actions.appendChild(changeBtn);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-secondary';
        removeBtn.style.color = 'var(--color-danger)';
        removeBtn.textContent = t('items.attachment.remove', 'Ukloni');
        removeBtn.addEventListener('click', function () {
          currentAttachment.removed = true;
          currentAttachment.id = null;
          renderUploadArea(container);
        });
        actions.appendChild(removeBtn);

        container.appendChild(wrap);
        container.appendChild(actions);
      });
      return;
    }

    const zone = document.createElement('div');
    zone.className = 'upload-zone';
    zone.innerHTML = [
      '<div class="upload-zone-icon" style="background-color: rgba(139, 92, 246, 0.12); color: #8B5CF6;">',
      '  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
      '</div>',
      '<div class="upload-zone-title">' + t('items.attachment.add', 'Dodaj fajl') + '</div>',
      '<div class="upload-zone-hint">' + t('items.attachment.hint', 'Izaberi sliku, PDF ili drugi dokument. Ostaje samo na tvom uređaju.') + '</div>'
    ].join('');

    zone.addEventListener('click', pickFile);
    container.appendChild(zone);
  }

  function pickFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf,.doc,.docx,.txt';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      const file = input.files && input.files[0];
      if (!file) { document.body.removeChild(input); return; }
      saveFile(file).then(function (id) {
        currentAttachment.id = id;
        currentAttachment.isNew = true;
        currentAttachment.removed = false;
        const area = formOverlay && formOverlay.querySelector('#uploadArea');
        if (area) renderUploadArea(area);
      }).catch(function (err) {
        if (global.home) global.home.showToast(t('common.error', 'Greška: ') + (err.message || ''));
      }).then(function () {
        document.body.removeChild(input);
      });
    });
    input.click();
  }

  function closeForm() {
    if (!formOverlay) return;
    formOverlay.classList.remove('show');
    setTimeout(function () {
      if (formOverlay && formOverlay.parentNode) formOverlay.parentNode.removeChild(formOverlay);
      formOverlay = null;
      currentAttachment = { id: null, isNew: false, removed: false };
    }, 200);
  }

  function submitForm(overlay) {
    const form = overlay.querySelector('#itemForm');
    const errEl = overlay.querySelector('#itemFormError');
    errEl.textContent = '';

    const tagsRaw = form.tags.value.trim();
    const tags = tagsRaw ? tagsRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];

    /* ISPRAVNO čitanje datuma — preko utils.getDateValue */
    const issueDateISO = global.utils.getDateValue(overlay, 'issueDate');
    const expiryDateISO = global.utils.getDateValue(overlay, 'expiryDate');

    const data = {
      name: form.name.value.trim(),
      category: form.category.value,
      description: form.description.value.trim(),
      issueDate: issueDateISO,
      expiryDate: expiryDateISO,
      institution: form.institution.value.trim(),
      tags: tags,
      favorite: form.favorite.checked
    };

    if (!data.name) {
      errEl.textContent = t('items.err.name', 'Naziv je obavezan.');
      return;
    }
    if (!data.category) {
      errEl.textContent = t('items.err.category', 'Kategorija je obavezna.');
      return;
    }

    let record;
    if (state.editingId) {
      const existing = state.items.find(function (x) { return x.id === state.editingId; });
      if (!existing) return;
      record = Object.assign({}, existing, data);

      if (currentAttachment.removed && existing.attachmentId) {
        deleteFile(existing.attachmentId);
        record.attachmentId = '';
      } else if (currentAttachment.id) {
        record.attachmentId = currentAttachment.id;
      } else {
        record.attachmentId = existing.attachmentId || '';
      }
    } else {
      record = Object.assign({
        id: global.utils.uid('item'),
        attachmentId: currentAttachment.id || '',
        createdAt: new Date().toISOString()
      }, data);
    }

    global.storage.save(STORE, record).then(function () {
      closeForm();
      loadAll().then(function () {
        const view = document.getElementById('view-items');
        if (view) renderInto(view);
        if (global.home) global.home.refresh();
      });
    }).catch(function (err) {
      errEl.textContent = (err && err.message) ? err.message : t('common.error', 'Greška.');
    });
  }

  function openDetail(it) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');

    let attachmentHTML = '';
    if (it.attachmentId) {
      attachmentHTML = '<div id="itemDetailAttachment" style="margin-top: 0.75rem;"></div>';
    } else {
      attachmentHTML = '<p class="text-muted text-sm" style="margin-top: 0.75rem; text-align: center;">' + t('items.attachment.noFile', 'Nema priloženog fajla') + '</p>';
    }

    overlay.innerHTML = [
      '<div class="modal-sheet">',
      '  <div style="display: flex; justify-content: space-between; align-items: start; gap: 0.5rem;">',
      '    <h3 class="modal-title" style="flex: 1 1 auto;">' + global.utils.escapeHtml(it.name || '') + '</h3>',
      '    <button type="button" class="item-fav-btn' + (it.favorite ? ' active' : '') + '" id="itemDetailFav" style="width: 36px; height: 36px; border-radius: 10px; background-color: var(--color-surface-2);">' + (it.favorite ? ICONS.starFilled : ICONS.star) + '</button>',
      '  </div>',
      '  <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">',
      '    <span class="rem-category-chip">' + categoryLabel(it.category) + '</span>',
      '  </div>',
      it.institution ? '  <div class="detail-row"><span class="detail-label">' + t('items.field.institution', 'Institucija') + '</span><span class="detail-value">' + global.utils.escapeHtml(it.institution) + '</span></div>' : '',
      it.issueDate ? '  <div class="detail-row"><span class="detail-label">' + t('items.field.issueDate', 'Izdato') + '</span><span class="detail-value">' + global.utils.formatDate(it.issueDate) + '</span></div>' : '',
      it.expiryDate ? '  <div class="detail-row"><span class="detail-label">' + t('items.field.expiryDate', 'Ističe') + '</span><span class="detail-value">' + global.utils.formatDate(it.expiryDate) + '</span></div>' : '',
      it.description ? '  <div class="detail-row" style="flex-direction: column; align-items: flex-start;"><span class="detail-label">' + t('items.field.description', 'Opis') + '</span><span class="detail-value" style="text-align: left;">' + global.utils.escapeHtml(it.description) + '</span></div>' : '',
      Array.isArray(it.tags) && it.tags.length > 0
        ? '  <div class="detail-row" style="flex-direction: column; align-items: flex-start;"><span class="detail-label">' + t('items.field.tags', 'Oznake') + '</span><div style="margin-top: 0.3rem; display: flex; flex-wrap: wrap; gap: 0.3rem;">' +
            it.tags.map(function (tg) { return '<span class="rem-category-chip">' + global.utils.escapeHtml(tg) + '</span>'; }).join('') +
          '</div></div>'
        : '',
      attachmentHTML,
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-secondary" id="itemDetailClose">' + t('common.close', 'Zatvori') + '</button>',
      '    <button type="button" class="btn btn-secondary" id="itemDetailEdit" style="color: var(--color-brand);">' + t('common.edit', 'Izmeni') + '</button>',
      '    <button type="button" class="btn btn-danger" id="itemDetailDelete">' + t('common.delete', 'Obriši') + '</button>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    if (it.attachmentId) {
      getFileURL(it.attachmentId).then(function (info) {
        if (!info) return;
        const container = overlay.querySelector('#itemDetailAttachment');
        if (!container) return;

        if (info.type && info.type.indexOf('image/') === 0) {
          const img = document.createElement('img');
          img.src = info.url;
          img.style.width = '100%';
          img.style.borderRadius = '12px';
          img.style.display = 'block';
          container.appendChild(img);
        }

        const link = document.createElement('a');
        link.href = info.url;
        link.download = info.name || 'document';
        link.className = 'btn btn-secondary btn-block';
        link.style.textDecoration = 'none';
        link.style.marginTop = '0.5rem';
        link.innerHTML = ICONS.download + ' ' + t('items.download', 'Preuzmi') + ' ' + global.utils.escapeHtml(info.name || '');
        link.target = '_blank';
        container.appendChild(link);
      });
    }

    overlay.querySelector('#itemDetailFav').addEventListener('click', function () {
      it.favorite = !it.favorite;
      global.storage.save(STORE, it).then(function () {
        document.body.removeChild(overlay);
        const view = document.getElementById('view-items');
        if (view) renderInto(view);
      });
    });

    overlay.querySelector('#itemDetailClose').addEventListener('click', function () {
      document.body.removeChild(overlay);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
    overlay.querySelector('#itemDetailEdit').addEventListener('click', function () {
      document.body.removeChild(overlay);
      openForm(it);
    });
    overlay.querySelector('#itemDetailDelete').addEventListener('click', function () {
      const ok = global.confirm(t('items.deleteConfirm', 'Obrisati ovaj dokument?'));
      if (!ok) return;
      if (it.attachmentId) deleteFile(it.attachmentId);
      global.storage.delete(STORE, it.id).then(function () {
        document.body.removeChild(overlay);
        loadAll().then(function () {
          const view = document.getElementById('view-items');
          if (view) renderInto(view);
          if (global.home) global.home.refresh();
        });
      });
    });

    requestAnimationFrame(function () {
      overlay.classList.add('show');
    });
  }

  function buildFAB() {
    let fab = document.getElementById('itemsFab');
    if (!fab) {
      fab = document.createElement('button');
      fab.type = 'button';
      fab.id = 'itemsFab';
      fab.className = 'fab-bills';
      fab.style.backgroundColor = '#8B5CF6';
      document.body.appendChild(fab);
    }
    fab.setAttribute('aria-label', t('items.add', 'Dodaj dokument'));
    fab.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
    fab.onclick = function () { openForm(null); };
  }

  function toggleFabVisibility() {
    const fab = document.getElementById('itemsFab');
    if (!fab) return;
    const route = global.router && global.router.current ? global.router.current() : 'home';
    fab.style.display = route === 'items' ? '' : 'none';
  }

  function buildHeader() {
    const header = document.createElement('div');
    header.className = 'module-header';
    header.innerHTML = [
      '<div class="module-title-wrap">',
      '  <button type="button" class="back-btn" id="itemsBack" aria-label="' + t('common.back', 'Nazad') + '">',
      '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
      '  </button>',
      '  <div class="module-icon color-purple" aria-hidden="true" style="width:38px;height:38px;">',
      '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
      '  </div>',
      '  <div>',
      '    <h2>' + t('items.title', 'Moje stvari') + '</h2>',
      '    <p class="text-muted text-sm">' + t('items.subtitle', 'Važni dokumenti uvek pri ruci.') + '</p>',
      '  </div>',
      '</div>',
      '<div class="header-actions-inline">',
      '  <button type="button" class="icon-btn" id="itemsHelp" aria-label="' + t('common.help', 'Pomoć') + '">',
      '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
      '  </button>',
      '  <button type="button" class="icon-btn" data-module-lock="items" title="' + t('pin.lock', 'Zaključaj') + '">',
      '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>',
      '  </button>',
      '</div>'
    ].join('');

    header.querySelector('#itemsBack').addEventListener('click', function () {
      global.router.navigate('home');
    });

    header.querySelector('#itemsHelp').addEventListener('click', function () {
      if (global.help) global.help.open('items');
    });

    return header;
  }

  function init() {
    const view = document.getElementById('view-items');
    if (view && !view.querySelector('.module-header')) {
      view.innerHTML = '';
      view.appendChild(buildHeader());
    }

    loadAll().then(function () {
      const v = document.getElementById('view-items');
      if (v) {
        renderInto(v);
        buildFAB();
        toggleFabVisibility();
      }
    });

    global.addEventListener('alatikapro:langchange', function () {
      const v = document.getElementById('view-items');
      if (v) {
        v.innerHTML = '';
        v.appendChild(buildHeader());
        renderInto(v);
        buildFAB();
        if (global.home && global.home.bindModuleLocks) global.home.bindModuleLocks();
      }
    });

    if (global.router && global.router.onRouteChange) {
      global.router.onRouteChange(function (route) {
        toggleFabVisibility();
        if (route === 'items') {
          const v = document.getElementById('view-items');
          if (v) {
            if (!v.querySelector('.module-header')) {
              v.innerHTML = '';
              v.appendChild(buildHeader());
            }
            loadAll().then(function () {
              renderInto(v);
              buildFAB();
              toggleFabVisibility();
            });
          }
        }
      });
    }
  }

  global.items = {
    init: init,
    loadAll: loadAll,
    openForm: openForm,
    CATEGORIES: CATEGORIES.slice()
  };
})(window);
