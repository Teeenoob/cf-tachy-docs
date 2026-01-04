(async function () {
  const listView = id('list-view');
  const detailView = id('detail-view');
  const listEl = id('list');
  const detailEl = id('detail');
  const searchInput = id('search');
  const effectFilterEl = id('effectFilter');
  const resultCountEl = id('resultCount');
  const errorEl = id('error');

  async function loadJSON() {
    const res = await fetch('./data/custom_attributes.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  function normalize(raw) {
    const arr = Object.entries(raw).map(([id, data]) => {
      const d = data || {};
      return {
        id,
        name: String(d.name ?? `attribute ${id}`),
        attribute_class: d.attribute_class ?? null,
        description_string: d.description_string ?? null,
        description_format: d.description_format ?? null,
        effect_type: d.effect_type ?? null,
        hidden: (d.hidden === "1" || d.hidden === 1 || d.hidden === true),
        stored_as_integer: (d.stored_as_integer === "1" || d.stored_as_integer === 1 || d.stored_as_integer === true),
        raw: d
      };
    });
    arr.sort((a, b) => Number(a.id) - Number(b.id));
    return arr;
  }

  function renderList(attrs, opts = {}) {
    listEl.innerHTML = '';
    const q = (opts.q || '').trim().toLowerCase();
    const effectFilter = opts.effect || 'all';

    const filtered = attrs.filter(a => {
      if (effectFilter !== 'all' && (a.effect_type ?? 'none') !== effectFilter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.attribute_class || '').toLowerCase().includes(q) ||
        (a.description_string || '').toLowerCase().includes(q) ||
        a.id === q
      );
    });

    resultCountEl.textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="card"><div>No attributes match your search/filter.</div></div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const a of filtered) {
      const card = document.createElement('div');
      card.className = 'card';
      const left = document.createElement('div');
      const h3 = document.createElement('div');
      h3.innerHTML = `<a href="#/attr/${a.id}">${escapeHtml(a.name)}</a>`;
      left.appendChild(h3);
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `ID: ${a.id}` + (a.attribute_class ? ` • ${a.attribute_class}` : '') + (a.description_format ? ` • ${a.description_format}` : '');
      left.appendChild(meta);

      const right = document.createElement('div');
      right.className = 'right';
      right.innerHTML = `<div>${escapeHtml(a.effect_type ?? 'n/a')}</div><div style="color:${a.hidden ? '#999' : '#999'}">${a.hidden ? 'hidden' : 'visible'}</div>`;

      card.appendChild(left);
      card.appendChild(right);
      fragment.appendChild(card);
    }
    listEl.appendChild(fragment);
  }

  function renderDetail(attr) {
    detailEl.innerHTML = '';
    if (!attr) {
      detailEl.innerHTML = '<h2>Attribute not found</h2>';
      return;
    }
    const title = document.createElement('h2');
    title.textContent = attr.name;
    detailEl.appendChild(title);

    const dl = document.createElement('div');
    dl.innerHTML = `
      <div class="detail-row"><dt>ID</dt><dd>${escapeHtml(attr.id)}</dd></div>
      <div class="detail-row"><dt>attribute_class</dt><dd>${escapeHtml(attr.attribute_class ?? '—')}</dd></div>
      <div class="detail-row"><dt>description_string</dt><dd>${escapeHtml(attr.description_string ?? '—')}</dd></div>
      <div class="detail-row"><dt>description_format</dt><dd>${escapeHtml(attr.description_format ?? '—')}</dd></div>
      <div class="detail-row"><dt>effect_type</dt><dd>${escapeHtml(attr.effect_type ?? '—')}</dd></div>
      <div class="detail-row"><dt>hidden</dt><dd>${attr.hidden ? 'true' : 'false'}</dd></div>
      <section style="margin-top:12px">
        <h3>Raw data</h3>
        <pre class="raw">${escapeHtml(JSON.stringify(attr.raw, null, 2))}</pre>
      </section>
    `;
    detailEl.appendChild(dl);
  }

  function buildEffectOptions(attrs) {
    const set = new Set(attrs.map(a => a.effect_type ?? 'none'));
    const all = ['all', ...Array.from(set)];
    effectFilterEl.innerHTML = all.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  }

  function handleHash(attrs) {
    const h = location.hash || '#/';
    if (h.startsWith('#/attr/')) {
      const id = h.replace('#/attr/', '');
      const attr = attrs.find(a => a.id === id) || null;
      listView.classList.add('hidden');
      detailView.classList.remove('hidden');
      renderDetail(attr);
    } else {
      detailView.classList.add('hidden');
      listView.classList.remove('hidden');
      renderList(attrs, { q: searchInput.value, effect: effectFilterEl.value, showHidden: true });
    }
  }

  function id(n) { return document.getElementById(n); }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  try {
    const raw = await loadJSON();
    const attrs = normalize(raw);
    buildEffectOptions(attrs);
    renderList(attrs, { q: '', effect: 'all', showHidden: true });

    let debounceTimer = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => handleHash(attrs), 180);
    });
    effectFilterEl.addEventListener('change', () => handleHash(attrs));
    window.addEventListener('hashchange', () => handleHash(attrs));

    handleHash(attrs);
  } catch (err) {
    errorEl.classList.remove('hidden');
    errorEl.textContent = 'Failed to load data/custom_attributes.json — Error: ' + String(err);
    console.error(err);
  }
})();
