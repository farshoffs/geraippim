/* Puteri Slayy — independent static dashboard, no backend required. */
(() => {
  'use strict';

  const STORAGE_KEY = 'puteri-slayy-gerai-v1';
  const SEED = {
    settings: { schoolShare: 60 },
    products: [
      { id: 'ramen', name: 'Cheesy Ramen Nachos', icon: '🍜', price: 6, target: 150, sold: 0 },
      { id: 'drinks', name: 'Minuman', icon: '🥤', price: 0, target: 0, sold: 0 },
      { id: 'icecream', name: 'Aiskrim Malaysia', icon: '🍦', price: 1.5, target: 100, sold: 0 }
    ],
    expenses: [
      { id: 'e1', productId: 'ramen', name: 'Nachos', unit: '2 kg', amount: 33.92 },
      { id: 'e2', productId: 'ramen', name: 'Sos Cheese', unit: '2 kg', amount: 27.30 },
      { id: 'e3', productId: 'ramen', name: 'Bekas Burger', unit: '200 pcs', amount: 16.60 },
      { id: 'e4', productId: 'ramen', name: 'Garfu', unit: '—', amount: 6.60 },
      { id: 'e5', productId: 'ramen', name: 'Ramen', unit: '—', amount: 450 },
      { id: 'e6', productId: 'ramen', name: 'Plastik Sampah', unit: '—', amount: 4.40 },
      { id: 'e7', productId: 'drinks', name: 'Air Gas', unit: '—', amount: 26 },
      { id: 'e8', productId: 'drinks', name: 'Straw', unit: '—', amount: 3.50 },
      { id: 'e9', productId: 'drinks', name: 'Cawan', unit: '—', amount: 17 },
      { id: 'e10', productId: 'drinks', name: 'Cup Tutup Bulat', unit: '—', amount: 7 },
      { id: 'e11', productId: 'icecream', name: 'Aiskrim Malaysia', unit: '100 batang', amount: 50 }
    ],
    contributors: [
      { id: 'c1', name: 'Sekolah', amount: 300 },
      { id: 'c2', name: 'Solehah', amount: 238.82 },
      { id: 'c3', name: 'Nabihah', amount: 50 },
      { id: 'c4', name: 'Modal Air', amount: 53.50 }
    ]
  };

  const copy = value => JSON.parse(JSON.stringify(value));
  const round = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const num = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const cash = value => (round(value) < 0 ? '-RM' : 'RM') + Math.abs(round(value)).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = selector => document.querySelector(selector);
  const setHTML = (selector, html) => { const el = $(selector); if (el) el.innerHTML = html; };
  let toastTimeout;

  function validData(candidate) {
    if (!candidate || typeof candidate !== 'object' || !Array.isArray(candidate.products) || !Array.isArray(candidate.expenses) || !Array.isArray(candidate.contributors)) return false;
    return candidate.products.every(x => typeof x.id === 'string' && typeof x.name === 'string') &&
      candidate.expenses.every(x => typeof x.id === 'string' && typeof x.productId === 'string' && typeof x.name === 'string') &&
      candidate.contributors.every(x => typeof x.id === 'string' && typeof x.name === 'string');
  }

  function load() {
    try {
      const incoming = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (validData(incoming)) return {
        settings: { schoolShare: Math.min(100, num(incoming.settings?.schoolShare ?? 60)) },
        products: incoming.products.map(p => ({ ...p, price: num(p.price), target: num(p.target), sold: num(p.sold) })),
        expenses: incoming.expenses.map(e => ({ ...e, amount: num(e.amount) })),
        contributors: incoming.contributors.map(c => ({ ...c, amount: num(c.amount) }))
      };
    } catch { /* damaged local record: use initial data */ }
    return copy(SEED);
  }

  let state = load();
  let activeTab = 'overview';
  let mode = 'projection';
  let formKind = '';

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { $('#save-status').textContent = '⚠ Storan peranti penuh / tidak tersedia'; }
  }

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove('visible'), 3100);
  }

  function calculate() {
    const cost = round(state.expenses.reduce((t, row) => t + num(row.amount), 0));
    const capital = round(state.contributors.reduce((t, row) => t + num(row.amount), 0));
    const products = state.products.map(p => {
      const quantity = mode === 'projection' ? num(p.target) : num(p.sold);
      const expense = round(state.expenses.filter(e => e.productId === p.id).reduce((t, e) => t + num(e.amount), 0));
      const revenue = round(quantity * num(p.price));
      return { ...p, quantity, expense, revenue, profit: round(revenue - expense), unitCost: p.target > 0 ? round(expense / p.target) : null };
    });
    const revenue = round(products.reduce((t, p) => t + p.revenue, 0));
    const profit = round(revenue - cost);
    const distributable = Math.max(0, profit);
    const school = round(distributable * state.settings.schoolShare / 100);
    const reserve = round(distributable - school);
    return { cost, capital, balance: round(capital - cost), revenue, profit, school, reserve, products };
  }

  function stat(label, value, foot, icon, tint = '#f4effc', colored = '') {
    return `<article class="stat-card" style="--icon-bg:${tint};--stat-color:${tint}">
      <div class="stat-top"><span class="stat-icon">${icon}</span>${escapeHTML(label)}</div>
      <div class="stat-value amount ${colored}">${value}</div>
      <div class="stat-foot">${escapeHTML(foot)}</div>
    </article>`;
  }

  function revenueStatCards(m) {
    const isProjection = mode === 'projection';
    return stat('Jumlah modal', cash(m.capital), 'Modal daripada semua penyumbang', '💜') +
      stat('Kos perbelanjaan', cash(m.cost), 'Jumlah semua barang & keperluan', '🛒', '#fff1f0') +
      stat(isProjection ? 'Jualan dijangka' : 'Jualan sebenar', cash(m.revenue), isProjection ? 'Harga × sasaran kuantiti' : 'Harga × kuantiti terjual', '🧾', '#e9f7f2') +
      stat('Untung bersih', cash(m.profit), 'Selepas keseluruhan kos ditolak', '📈', '#f6efff', m.profit < 0 ? 'negative' : 'positive');
  }

  function productProgress(p) {
    const percentage = p.target > 0 ? Math.min(100, p.sold / p.target * 100) : 0;
    const style = p.id === 'drinks' ? 'drink' : (p.id === 'icecream' ? 'icecream' : '');
    return `<div class="product-row">
      <div class="product-emoji ${style}">${escapeHTML(p.icon || '🍽️')}</div>
      <div><div class="product-name">${escapeHTML(p.name)}</div><div class="product-detail">${p.quantity} unit × ${cash(p.price)}</div>
      <div class="progress-track" title="${p.sold} daripada ${p.target} unit"><div class="progress-fill ${style}" style="width:${percentage}%"></div></div></div>
      <div class="product-money">${cash(p.revenue)}<small>Untung: ${cash(p.profit)}</small></div>
    </div>`;
  }

  function distribution(m, donut = true) {
    if (donut) return `<div class="donut-layout">
      <div class="donut" style="--pct:${state.settings.schoolShare}%"><div class="donut-hole"><strong>${cash(Math.max(0, m.profit))}</strong><small>untung agihan</small></div></div>
      <div class="legend">
        <div class="legend-row"><div class="legend-left"><span class="legend-dot"></span>Sekolah (${state.settings.schoolShare}%)</div><b>${cash(m.school)}</b></div>
        <div class="legend-row"><div class="legend-left"><span class="legend-dot light"></span>Simpanan (${100 - state.settings.schoolShare}%)</div><b>${cash(m.reserve)}</b></div>
      </div>
    </div><div class="report-note">${m.profit < 0 ? 'Jualan belum menampung kos. Tiada keuntungan untuk diagihkan buat masa ini.' : 'Modal penyumbang dikira berasingan. Hanya keuntungan bersih positif diagihkan selepas semua kos ditolak.'}</div>`;
    return `<div class="distribution-cards"><div class="distribution-card"><span>🏫 Sekolah (${state.settings.schoolShare}%)</span><strong>${cash(m.school)}</strong></div><div class="distribution-card"><span>💰 Simpanan (${100 - state.settings.schoolShare}%)</span><strong>${cash(m.reserve)}</strong></div></div>`;
  }

  function showAlerts(m) {
    const unresolved = state.products.filter(p => p.target === 0 || p.price === 0);
    const problems = [];
    if (mode === 'projection' && unresolved.length) problems.push(`⚠ Unjuran ${unresolved.map(p => escapeHTML(p.name)).join(', ')} belum lengkap (harga / sasaran masih kosong). Kos tetap ditolak, tetapi hasil jualannya dikira RM0 sehingga diisi.`);
    if (Math.abs(m.balance) > .009) problems.push(`ℹ ${m.balance < 0 ? 'Modal belum mencukupi sebanyak' : 'Baki modal belum digunakan'} ${cash(Math.abs(m.balance))}. Semak modal penyumbang dan perbelanjaan.`);
    setHTML('#data-alerts', problems.map(t => `<div class="alert-strip">${t}</div>`).join(''));
  }

  function quickSales() {
    return state.products.map(p => `<div class="quick-item"><div class="quick-top"><b>${escapeHTML(p.name)}</b><span>${escapeHTML(p.icon || '🍽️')}</span></div>
      <div class="quick-count">${num(p.sold)}</div><small>terjual · ${cash(p.price)} / unit</small>
      <div class="counter-actions"><button data-quick="minus" data-id="${escapeHTML(p.id)}" aria-label="Kurangkan jualan ${escapeHTML(p.name)}">−1</button><button data-quick="plus" data-id="${escapeHTML(p.id)}" aria-label="Tambah jualan ${escapeHTML(p.name)}">+1</button></div></div>`).join('');
  }

  function renderComputed() {
    const m = calculate();
    setHTML('#summary-stats', revenueStatCards(m));
    showAlerts(m);
    setHTML('#overview-products', m.products.map(productProgress).join('') + (m.products.length ? '' : '<p>Tiada menu direkodkan.</p>'));
    setHTML('#profit-distribution', distribution(m));
    setHTML('#quick-sales', quickSales());
    setHTML('#sales-stats', stat('Jualan', cash(m.revenue), 'Jumlah hasil semasa', '💵') + stat('Unit dijual', String(m.products.reduce((a, p) => a + p.quantity, 0)), mode === 'projection' ? 'Sasaran unit semua menu' : 'Jualan sebenar semua menu', '🍽️', '#e9f7f2') + stat('Untung', cash(m.profit), 'Untung selepas semua kos', '📈', '#fff4f4', m.profit < 0 ? 'negative' : 'positive') + stat('Untuk sekolah', cash(m.school), `${state.settings.schoolShare}% daripada keuntungan`, '🏫'));
    setHTML('#expense-stats', stat('Kos keseluruhan', cash(m.cost), 'Jumlah perbelanjaan', '🧾') + stat('Bilangan barang', String(state.expenses.length), 'Rekod pembelian', '🛍️', '#e9f7f2') + stat('Kos ramen', cash(m.products.find(p => p.id === 'ramen')?.expense || 0), 'Kategori ramen', '🍜', '#fff4f4') + stat('Modal berbaki', cash(m.balance), 'Sumbangan tolak perbelanjaan', '💜', '#f4effc', m.balance < 0 ? 'negative' : ''));
    setHTML('#capital-stats', stat('Modal terkumpul', cash(m.capital), 'Jumlah dana disumbangkan', '💰') + stat('Jumlah kos', cash(m.cost), 'Semua pembelian', '🛒', '#fff1f0') + stat('Baki modal', cash(m.balance), 'Modal tolak perbelanjaan', '📉', '#e9f7f2', m.balance < 0 ? 'negative' : 'positive') + stat('Penyumbang', String(state.contributors.length), 'Rekod sumber modal', '🤝'));
    setHTML('#sales-analysis', `<div class="card-heading"><div><h3>Analisis keuntungan menu</h3><p>Hasil jualan ditolak kos berkaitan bagi setiap menu</p></div></div><div class="analysis-pairs">${m.products.map(p => `<div class="analysis-pair"><span>${escapeHTML(p.icon || '🍽️')} ${escapeHTML(p.name)}</span><strong class="${p.profit < 0 ? 'negative' : 'positive'}">${cash(p.profit)}</strong></div>`).join('')}</div>`);
    setHTML('#capital-analysis', `<div class="card-heading"><div><h3>Status dana gerai</h3><p>Semakan modal dan penggunaan</p></div></div><div class="analysis-pairs"><div class="analysis-pair"><span>Modal diterima</span><strong>${cash(m.capital)}</strong></div><div class="analysis-pair"><span>Modal digunakan</span><strong>${cash(m.cost)}</strong></div><div class="analysis-pair"><span>Baki / kekurangan</span><strong class="${m.balance < 0 ? 'negative' : 'positive'}">${cash(m.balance)}</strong></div></div>`);
    setHTML('#report-distribution', distribution(m, false));
    setHTML('#report-preview', escapeHTML(makeReport(m)));
    $('#school-percent').textContent = state.settings.schoolShare + '%';
    $('#school-share').value = state.settings.schoolShare;
    document.querySelectorAll('[data-output-revenue]').forEach(el => { const p = m.products.find(x => x.id === el.dataset.outputRevenue); if (p) el.textContent = cash(p.revenue); });
    document.querySelectorAll('[data-output-profit]').forEach(el => { const p = m.products.find(x => x.id === el.dataset.outputProfit); if (p) el.textContent = cash(p.profit); });
    document.querySelectorAll('[data-output-cost]').forEach(el => { const p = m.products.find(x => x.id === el.dataset.outputCost); if (p) el.textContent = cash(p.expense); });
    document.querySelectorAll('[data-output-unit]').forEach(el => { const p = m.products.find(x => x.id === el.dataset.outputUnit); if (p) el.textContent = p.unitCost === null ? '—' : cash(p.unitCost); });
    document.querySelectorAll('[data-output-target]').forEach(el => { const p = m.products.find(x => x.id === el.dataset.outputTarget); if (p) el.textContent = String(p.target); });
    const grand = $('[data-grand-total]'); if (grand) grand.textContent = cash(m.cost);
    const capitalTotal = $('[data-capital-total]'); if (capitalTotal) capitalTotal.textContent = cash(m.capital);
    const salesTotal = $('[data-sales-total]'); if (salesTotal) salesTotal.textContent = cash(m.revenue);
  }

  function field(entity, id, key, value, type = 'number', cls = '') {
    const attributes = type === 'number' ? 'type="number" inputmode="decimal" min="0" step="any"' : 'type="text"';
    return `<input ${attributes} class="field ${type === 'number' ? 'number-field' : 'name-field'} ${cls}" aria-label="${escapeHTML(key)}" data-entity="${entity}" data-id="${escapeHTML(id)}" data-field="${key}" value="${escapeHTML(value)}" />`;
  }

  function renderTables() {
    const salesRows = state.products.map(p => `<tr>
      <td><div class="item-title">${escapeHTML(p.icon || '🍽️')} ${escapeHTML(p.name)}</div><div class="item-sub">${escapeHTML(p.id)}</div></td>
      <td>${field('products', p.id, 'price', p.price)}</td><td>${field('products', p.id, 'target', p.target)}</td><td>${field('products', p.id, 'sold', p.sold)}</td>
      <td><strong data-output-cost="${escapeHTML(p.id)}"></strong><div class="item-sub">Kos/unit: <span data-output-unit="${escapeHTML(p.id)}"></span></div></td>
      <td><strong data-output-revenue="${escapeHTML(p.id)}"></strong></td><td><strong data-output-profit="${escapeHTML(p.id)}"></strong></td>
      <td><button class="delete-button" data-delete="products" data-id="${escapeHTML(p.id)}" title="Padam menu" aria-label="Padam ${escapeHTML(p.name)}">×</button></td>
    </tr>`).join('');
    setHTML('#sales-table', `<table class="editable-table"><thead><tr><th>Menu</th><th>Harga RM</th><th>Sasaran</th><th>Terjual</th><th>Modal kos</th><th>Hasil</th><th>Untung</th><th></th></tr></thead><tbody>${salesRows}</tbody><tfoot><tr><td colspan="5">JUMLAH HASIL JUALAN</td><td colspan="3" class="table-total" data-sales-total></td></tr></tfoot></table>`);

    setHTML('#expense-groups', state.products.map(p => {
      const expenseRows = state.expenses.filter(e => e.productId === p.id).map(e => `<tr>
        <td>${field('expenses', e.id, 'name', e.name, 'text')}</td>
        <td>${field('expenses', e.id, 'unit', e.unit, 'text', 'unit-field')}</td>
        <td>${field('expenses', e.id, 'amount', e.amount)}</td>
        <td><button class="delete-button" data-delete="expenses" data-id="${escapeHTML(e.id)}" title="Padam barang" aria-label="Padam ${escapeHTML(e.name)}">×</button></td></tr>`).join('');
      return `<div class="panel-card expense-card"><div class="category-banner"><span>${escapeHTML(p.icon || '🍽️')}</span><h3>${escapeHTML(p.name)}</h3></div>
      <div class="table-scroll"><table class="editable-table"><thead><tr><th>Barang</th><th>Kuantiti / Catatan</th><th>Jumlah (RM)</th><th></th></tr></thead><tbody>${expenseRows || '<tr><td colspan="4">Belum ada perbelanjaan.</td></tr>'}</tbody></table></div>
      <div class="category-summary"><span>Jumlah kategori</span><b data-output-cost="${escapeHTML(p.id)}"></b></div></div>`;
    }).join('') + `<div class="panel-card"><div class="category-summary"><span>JUMLAH SEMUA KOS</span><b data-grand-total></b></div></div>`);

    const contributorRows = state.contributors.map(c => `<tr><td>${field('contributors', c.id, 'name', c.name, 'text')}</td><td>${field('contributors', c.id, 'amount', c.amount)}</td><td><button class="delete-button" data-delete="contributors" data-id="${escapeHTML(c.id)}" title="Padam penyumbang" aria-label="Padam ${escapeHTML(c.name)}">×</button></td></tr>`).join('');
    setHTML('#contributors-table', `<table class="editable-table"><thead><tr><th>Nama / Sumber</th><th>Modal (RM)</th><th></th></tr></thead><tbody>${contributorRows}</tbody><tfoot><tr><td>JUMLAH MODAL</td><td colspan="2" class="table-total" data-capital-total></td></tr></tfoot></table>`);
  }

  function render() {
    document.querySelectorAll('.tab-panel').forEach(el => { el.hidden = el.id !== 'panel-' + activeTab; });
    document.querySelectorAll('[data-tab]').forEach(el => { el.classList.toggle('active', el.dataset.tab === activeTab); });
    document.querySelectorAll('[data-mode]').forEach(el => { const on = el.dataset.mode === mode; el.classList.toggle('selected', on); el.setAttribute('aria-pressed', String(on)); });
    renderTables();
    renderComputed();
  }

  function makeReport(m = calculate()) {
    const formatName = mode === 'projection' ? 'ANGGARAN' : 'SEBENAR';
    const lines = [
      '*🍜 LAPORAN KEWANGAN PUTERI SLAYY*',
      '_Hari Kokurikulum SMKBBSL 2026_',
      `*MOD: ${formatName}*`, '',
      '*📌 PERBELANJAAN*'
    ];
    state.products.forEach(p => {
      lines.push(`${p.icon || '🍽️'} *${p.name.toUpperCase()}*`);
      state.expenses.filter(e => e.productId === p.id).forEach(e => lines.push(`✅ ${e.name} (${e.unit}) – ${cash(e.amount)}`));
      const pc = m.products.find(x => x.id === p.id);
      lines.push(`Jumlah: *${cash(pc.expense)}*`, '');
    });
    lines.push(`*TOTAL PERBELANJAAN: ${cash(m.cost)}*`, '', '*🏦 SUMBER MODAL*');
    state.contributors.forEach(c => lines.push(`${c.name}: ${cash(c.amount)}`));
    lines.push(`*JUMLAH MODAL: ${cash(m.capital)}*`, `Baki modal: ${cash(m.balance)}`, '', '*📊 JUALAN & KEUNTUNGAN*');
    m.products.forEach(p => {
      lines.push(`${p.icon || '🍽️'} ${p.name}: ${p.quantity} × ${cash(p.price)} = *${cash(p.revenue)}*`);
      lines.push(`   Kos ${cash(p.expense)} | Untung ${cash(p.profit)}`);
    });
    lines.push('', `*JUMLAH JUALAN: ${cash(m.revenue)}*`, `*KEUNTUNGAN BERSIH: ${cash(m.profit)}*`, '', '*🤝 AGIHAN KEUNTUNGAN*',
      `🏫 Sekolah (${state.settings.schoolShare}%): *${cash(m.school)}*`,
      `💰 Simpanan (${100 - state.settings.schoolShare}%): *${cash(m.reserve)}*`, '',
      '_Keuntungan = jumlah hasil jualan tolak semua perbelanjaan. Hanya untung positif diagihkan. Modal penyumbang dipulangkan secara berasingan._');
    const incomplete = mode === 'projection' && state.products.filter(p => p.price === 0 || p.target === 0);
    if (incomplete && incomplete.length) lines.push(`_Nota: Unjuran ${incomplete.map(p => p.name).join(', ')} belum lengkap; hasil jualan menu tersebut dikira RM0._`);
    return lines.join('\n');
  }

  function openEntry(kind) {
    formKind = kind;
    const fields = {
      products: [{ label: 'Nama menu', name: 'name', type: 'text', required: true }, { label: 'Emoji / simbol', name: 'icon', type: 'text', value: '🍽️' }, { label: 'Harga jualan (RM)', name: 'price', type: 'number', value: 0 }, { label: 'Sasaran kuantiti', name: 'target', type: 'number', value: 0 }],
      expenses: [{ label: 'Barang / keperluan', name: 'name', type: 'text', required: true }, { label: 'Menu / kategori', name: 'productId', type: 'select' }, { label: 'Kuantiti / catatan', name: 'unit', type: 'text', value: '—' }, { label: 'Jumlah kos (RM)', name: 'amount', type: 'number', value: 0 }],
      contributors: [{ label: 'Nama penyumbang', name: 'name', type: 'text', required: true }, { label: 'Jumlah modal (RM)', name: 'amount', type: 'number', value: 0 }]
    }[kind];
    if (!fields || (kind === 'expenses' && !state.products.length)) { toast('Tambah menu terlebih dahulu.'); return; }
    const title = { products: 'Tambah menu baharu', expenses: 'Tambah perbelanjaan', contributors: 'Tambah penyumbang' }[kind];
    $('#dialog-title').textContent = title;
    setHTML('#entry-fields', fields.map(f => `<div class="dialog-field"><label for="add-${f.name}">${f.label}</label>${f.type === 'select' ?
      `<select id="add-${f.name}" name="${f.name}" class="field">${state.products.map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.name)}</option>`).join('')}</select>` :
      `<input id="add-${f.name}" name="${f.name}" class="field" type="${f.type}" value="${escapeHTML(f.value ?? '')}" ${f.type === 'number' ? 'step="any" min="0" inputmode="decimal"' : ''} ${f.required ? 'required' : ''} />`}</div>`).join(''));
    $('#entry-dialog').showModal();
    $('#entry-fields input')?.focus();
  }

  function uid() { return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function saveEntry() {
    const data = new FormData($('#entry-form'));
    const name = String(data.get('name') || '').trim();
    if (!name) { toast('Sila masukkan nama dahulu.'); return; }
    if (formKind === 'products') state.products.push({ id: uid(), name, icon: String(data.get('icon') || '🍽️').trim() || '🍽️', price: num(data.get('price')), target: Math.floor(num(data.get('target'))), sold: 0 });
    if (formKind === 'expenses') state.expenses.push({ id: uid(), name, productId: String(data.get('productId')), unit: String(data.get('unit') || '—'), amount: num(data.get('amount')) });
    if (formKind === 'contributors') state.contributors.push({ id: uid(), name, amount: num(data.get('amount')) });
    persist(); render(); toast('Rekod baharu telah ditambah.');
  }

  function deleteEntry(kind, id) {
    const entry = state[kind]?.find(x => x.id === id);
    if (!entry) return;
    if (kind === 'products' && state.expenses.some(e => e.productId === id)) { toast('Padam kos bagi menu ini dahulu sebelum memadam menu.'); return; }
    if (!confirm(`Padam rekod "${entry.name}"?`)) return;
    state[kind] = state[kind].filter(x => x.id !== id);
    persist(); render(); toast('Rekod telah dipadam.');
  }

  function csvRow(values) { return values.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','); }

  function exportCSV() {
    const m = calculate();
    const rows = [['SEKSYEN', 'NAMA', 'KATEGORI', 'KUANTITI', 'HARGA / AMAUN (RM)', 'JUMLAH (RM)']];
    state.expenses.forEach(e => rows.push(['PERBELANJAAN', e.name, state.products.find(p => p.id === e.productId)?.name || '', e.unit, e.amount, e.amount]));
    state.contributors.forEach(c => rows.push(['MODAL', c.name, '', '', c.amount, c.amount]));
    m.products.forEach(p => rows.push(['JUALAN ' + (mode === 'projection' ? 'UNJURAN' : 'SEBENAR'), p.name, '', p.quantity, p.price, p.revenue]));
    rows.push(['RINGKASAN', 'Jumlah modal', '', '', '', m.capital], ['RINGKASAN', 'Jumlah kos', '', '', '', m.cost], ['RINGKASAN', 'Hasil jualan', '', '', '', m.revenue], ['RINGKASAN', 'Untung bersih', '', '', '', m.profit], ['AGIHAN', `Sekolah ${state.settings.schoolShare}%`, '', '', '', m.school], ['AGIHAN', `Simpanan ${100 - state.settings.schoolShare}%`, '', '', '', m.reserve]);
    download('\ufeff' + rows.map(csvRow).join('\r\n'), 'puteri-slayy-laporan-' + mode + '.csv', 'text/csv;charset=utf-8');
  }

  function download(contents, fileName, mime) {
    const url = URL.createObjectURL(new Blob([contents], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyReport() {
    const content = makeReport();
    try { await navigator.clipboard.writeText(content); toast('Laporan telah disalin untuk WhatsApp!'); }
    catch {
      const ta = document.createElement('textarea'); ta.value = content; ta.style.position = 'fixed'; ta.style.opacity = 0;
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove();
      toast(ok ? 'Laporan telah disalin!' : 'Gagal menyalin. Sila salin daripada pratonton.');
    }
  }

  document.addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (tab) { activeTab = tab.dataset.tab; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const modeButton = e.target.closest('[data-mode]');
    if (modeButton) { mode = modeButton.dataset.mode; render(); return; }
    const quick = e.target.closest('[data-quick]');
    if (quick) {
      const p = state.products.find(x => x.id === quick.dataset.id);
      if (p) { p.sold = Math.max(0, Math.floor(num(p.sold)) + (quick.dataset.quick === 'plus' ? 1 : -1)); persist(); render(); }
      return;
    }
    const del = e.target.closest('[data-delete]');
    if (del) { deleteEntry(del.dataset.delete, del.dataset.id); return; }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'school-share') {
      state.settings.schoolShare = Math.round(num(e.target.value));
      persist(); renderComputed(); return;
    }
    const input = e.target.closest('[data-entity][data-id][data-field]');
    if (!input) return;
    const record = state[input.dataset.entity]?.find(x => x.id === input.dataset.id);
    if (!record) return;
    const key = input.dataset.field;
    record[key] = input.type === 'number' ? (['sold', 'target'].includes(key) ? Math.floor(num(input.value)) : num(input.value)) : input.value;
    persist(); renderComputed();
  });

  document.addEventListener('change', e => {
    if (e.target.matches('[data-entity][data-id][data-field]')) render();
  });

  $('#add-product-button').addEventListener('click', () => openEntry('products'));
  $('#add-expense-button').addEventListener('click', () => openEntry('expenses'));
  $('#add-contributor-button').addEventListener('click', () => openEntry('contributors'));
  $('#close-dialog').addEventListener('click', () => $('#entry-dialog').close());
  $('#cancel-dialog').addEventListener('click', () => $('#entry-dialog').close());
  $('#entry-form').addEventListener('submit', e => { e.preventDefault(); saveEntry(); $('#entry-dialog').close(); });
  $('#copy-whatsapp').addEventListener('click', copyReport);
  $('#copy-report-inline').addEventListener('click', copyReport);
  $('#download-csv').addEventListener('click', exportCSV);
  $('#download-backup').addEventListener('click', () => { download(JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2), 'puteri-slayy-sandaran.json', 'application/json'); toast('Fail sandaran telah dimuat turun.'); });
  $('#import-backup').addEventListener('change', async e => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!validData(imported)) throw new Error('Fail tidak mempunyai format data gerai yang sah.');
      if (!confirm('Import ini akan menggantikan semua data semasa. Teruskan?')) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
      state = load(); render(); toast('Data berjaya dipulihkan daripada sandaran.');
    } catch (error) { toast('Import gagal: ' + error.message); }
    finally { e.target.value = ''; }
  });
  $('#reset-data').addEventListener('click', () => {
    if (!confirm('Semua data semasa akan digantikan dengan data asal. Sila buat sandaran jika perlu. Teruskan?')) return;
    state = copy(SEED); persist(); render(); toast('Data asal telah dipulihkan.');
  });

  render();
})();
