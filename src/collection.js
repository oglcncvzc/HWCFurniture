// Ürün kartı + koleksiyon sayfası — hwcfurniture.com (Shopify Horizon) temasına göre
import COLLS from './data/collections.json';
import { PRODUCTS, STATION_OF, findVariant, shipTime, formatTRY } from './catalog.js';
import { addToCart } from './cart.js';
import { $, $$, img, esc, priceInfo, discount } from './util.js';

export const COLLECTIONS = COLLS.map((c) => ({ ...c, products: c.products.filter((h) => PRODUCTS[h]) }));
export const COLL_BY = Object.fromEntries(COLLECTIONS.map((c) => [c.handle, c]));

// Eski kısa adresler → orijinal koleksiyon adresleri
export const OLD_COLLECTION_SLUGS = {
  'tum-masalar': 'tum-masalar',
  'yemek-masalari': 'yemek-mutfak-masalari',
  'calisma-masalari': 'ofis-ve-calisma-masalari',
  'epoksi-masalar': 'epoksi-masa-modelleri',
  sehpalar: 'sehpa-modelleri',
  'hemen-teslim': 'hemen-teslim-urunler',
};

export const TYPE_TO_COLLECTION = {
  'Yemek Masası': 'yemek-mutfak-masalari',
  'Epoksi Yemek Masası': 'epoksi-masa-modelleri',
  'Çalışma Masası': 'ofis-ve-calisma-masalari',
  'Yan Sehpa': 'sehpa-modelleri',
  'Orta Sehpa': 'sehpa-modelleri',
};

// ---------------------------------------------------------------------------
// Ürün kartı
// ---------------------------------------------------------------------------
const ICON_CART = `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M3.5 7h13l-1 9.2a1 1 0 0 1-1 .8h-9a1 1 0 0 1-1-.8L3.5 7Z"/><path d="M7 7V5.5a3 3 0 0 1 6 0V7"/><path d="M13.5 11.5h4M15.5 9.5v4"/></svg>`;
const ICON_L = `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 10H4m5-5-5 5 5 5"/></svg>`;
const ICON_R = `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 10h12m-5-5 5 5-5 5"/></svg>`;

export function cardHTML(p) {
  const { price, compare, soldOut } = priceInfo(p);
  const d = discount(price, compare);
  const badge = soldOut ? 'Tükendi' : d ? 'İndirimde' : '';
  const has3d = !!STATION_OF[p.handle];
  const imgs = p.images.slice(0, 4);
  return `
  <article class="pcard" data-handle="${p.handle}" data-i="0">
    <div class="pcard-media">
      <a href="/products/${p.handle}" aria-label="${esc(p.title)}" class="pcard-link">
        ${imgs.map((u, k) => `<img src="${img(u, 720)}" alt="${k ? '' : esc(p.title)}" loading="lazy" class="${k ? '' : 'on'}" />`).join('')}
      </a>
      ${badge ? `<span class="pbadge">${badge}</span>` : ''}
      ${imgs.length > 1 ? `<button class="pnav prev" data-img-step="-1" aria-label="Önceki görsel">${ICON_L}</button><button class="pnav next" data-img-step="1" aria-label="Sonraki görsel">${ICON_R}</button>` : ''}
      ${has3d ? `<button class="p3d" data-open3d="${p.handle}" title="3D showroom'da incele">3D</button>` : ''}
      ${soldOut ? '' : `<button class="pquick" data-quick="${p.handle}" aria-label="${p.variants.length > 1 ? 'Seçenekleri gör' : 'Sepete ekle'}">${ICON_CART}</button>`}
    </div>
    <a class="pcard-info" href="/products/${p.handle}">
      <p class="ptitle">${esc(p.title)}</p>
      <p class="pprice"><span>${formatTRY(price)}</span>${d ? `<s>${formatTRY(compare)}</s>` : ''}</p>
      <p class="pship ${soldOut ? 'out' : ''}">${soldOut ? 'Şu an stokta yok' : shipTime(p)}</p>
    </a>
  </article>`;
}

export function initCards(navigate) {
  document.addEventListener('click', (e) => {
    const step = e.target.closest('[data-img-step]');
    if (step) {
      e.preventDefault();
      const card = step.closest('.pcard');
      const imgs = $$('.pcard-link img', card);
      const i = (+card.dataset.i + +step.dataset.imgStep + imgs.length) % imgs.length;
      card.dataset.i = i;
      imgs.forEach((im, k) => im.classList.toggle('on', k === i));
      return;
    }
    const q = e.target.closest('[data-quick]');
    if (q) {
      e.preventDefault();
      const p = PRODUCTS[q.dataset.quick];
      if (p.variants.length === 1) addToCart(p.handle, p.variants[0], 1);
      else navigate(`/products/${p.handle}`);
    }
  });
}

// ---------------------------------------------------------------------------
// Koleksiyon sayfası
// ---------------------------------------------------------------------------
const SORTS = [
  ['manual', 'Öne çıkan'],
  ['best-selling', 'En çok satan'],
  ['title-ascending', 'Alfabetik olarak, A-Z'],
  ['title-descending', 'Alfabetik olarak, Z-A'],
  ['price-ascending', 'Fiyat, düşükten yükseğe'],
  ['price-descending', 'Fiyat, yüksekten düşüğe'],
  ['created-ascending', 'Tarih, eskiden yeniye'],
  ['created-descending', 'Tarih, yeniden eskiye'],
];
const BEST = COLL_BY['cok-satanlar']?.products || [];
const NEWEST = COLL_BY['yeni-gelenler']?.products || [];
const state = { sort: 'manual', inStock: false, outStock: false, min: '', max: '', dense: false, open: '' };
let current = '';

function sorted(list) {
  const pr = (h) => priceInfo(PRODUCTS[h]).price;
  const tr = (h) => PRODUCTS[h].title;
  const rankIn = (arr, h) => (arr.includes(h) ? arr.indexOf(h) : 999);
  const cmp = {
    manual: () => 0,
    'best-selling': (a, b) => rankIn(BEST, a) - rankIn(BEST, b),
    'title-ascending': (a, b) => tr(a).localeCompare(tr(b), 'tr'),
    'title-descending': (a, b) => tr(b).localeCompare(tr(a), 'tr'),
    'price-ascending': (a, b) => pr(a) - pr(b),
    'price-descending': (a, b) => pr(b) - pr(a),
    'created-ascending': (a, b) => rankIn(NEWEST, b) - rankIn(NEWEST, a),
    'created-descending': (a, b) => rankIn(NEWEST, a) - rankIn(NEWEST, b),
  }[state.sort];
  return [...list].sort(cmp);
}

function filtered(c) {
  return c.products.filter((h) => {
    const { soldOut, price } = priceInfo(PRODUCTS[h]);
    if (state.inStock !== state.outStock && (state.inStock ? soldOut : !soldOut)) return false;
    if (state.min !== '' && price < +state.min) return false;
    if (state.max !== '' && price > +state.max) return false;
    return true;
  });
}

const chevron = `<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.3"><path d="m2.5 4.5 3.5 3.5 3.5-3.5"/></svg>`;

function sectionsHTML(c) {
  return c.sections
    .map((s) => {
      const blocks = s.blocks
        .map((b) => {
          if (b.t === 'h2') return `<h2>${esc(b.text)}</h2>`;
          if (b.t === 'h3') return `<h3>${esc(b.text)}</h3>`;
          if (b.t === 'li') return `<p class="li">${esc(b.text)}</p>`;
          if (b.t === 'table')
            return `<table class="steps-table"><thead><tr>${b.rows[0].map((x) => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${b.rows
              .slice(1)
              .map((r) => `<tr>${r.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`)
              .join('')}</tbody></table>`;
          if (b.href) return `<p><a class="text-link" href="${esc(b.href)}">${esc(b.text)}</a></p>`;
          return `<p>${esc(b.text)}</p>`;
        })
        .join('');
      return `<div class="coll-extra ${s.image ? 'has-img' : ''}"><div class="coll-extra-text">${blocks}</div>${
        s.image ? `<figure><img src="${img(s.image, 1100)}" alt="" loading="lazy" /></figure>` : ''
      }</div>`;
    })
    .join('');
}

function faqHTML(c) {
  if (!c.faq.length) return '';
  return `<div class="coll-faq">
    <p class="kicker">Merak edilenler</p>
    <h2>Sık sorulan sorular</h2>
    ${c.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
  </div>`;
}

export function renderCollection(handle) {
  const c = COLL_BY[handle] || COLL_BY['tum-masalar'];
  if (current !== c.handle) {
    Object.assign(state, { inStock: false, outStock: false, min: '', max: '', open: '' });
    current = c.handle;
  }
  const all = c.products;
  const inN = all.filter((h) => !priceInfo(PRODUCTS[h]).soldOut).length;
  const list = sorted(filtered(c));
  const maxPrice = Math.max(...all.map((h) => priceInfo(PRODUCTS[h]).price), 0);
  const active = state.inStock || state.outStock || state.min !== '' || state.max !== '';
  $('#urunler').innerHTML = `
    <header class="coll-head">
      <h1>${esc(c.h1)}</h1>
      ${c.desc.map((d) => `<p>${esc(d)}</p>`).join('')}
    </header>
    <div class="facets">
      <div class="facets-left">
        <div class="facet ${state.open === 'stock' ? 'open' : ''}">
          <button class="facet-btn" data-facet="stock">Stok Durumu ${chevron}</button>
          <div class="facet-pop">
            <label><input type="checkbox" data-f="inStock" ${state.inStock ? 'checked' : ''} /> Stokta (${inN})</label>
            <label><input type="checkbox" data-f="outStock" ${state.outStock ? 'checked' : ''} /> Stokta yok (${all.length - inN})</label>
          </div>
        </div>
        <div class="facet ${state.open === 'price' ? 'open' : ''}">
          <button class="facet-btn" data-facet="price">Fiyat ${chevron}</button>
          <div class="facet-pop price-pop">
            <p>En yüksek fiyat ${formatTRY(maxPrice)}</p>
            <div class="price-range">
              <label>₺ <input type="number" min="0" placeholder="0" data-f="min" value="${esc(state.min)}" /></label>
              <span>—</span>
              <label>₺ <input type="number" min="0" placeholder="${maxPrice}" data-f="max" value="${esc(state.max)}" /></label>
            </div>
          </div>
        </div>
        ${active ? `<button class="facet-clear" data-facet-clear>Filtreleri temizle</button>` : ''}
      </div>
      <div class="facets-right">
        <span class="coll-count">${list.length} ürün</span>
        <label class="sort-label">Sırala
          <select data-sort>${SORTS.map(([v, t]) => `<option value="${v}" ${v === state.sort ? 'selected' : ''}>${t}</option>`).join('')}</select>
        </label>
        <div class="density">
          <button data-dense="0" class="${state.dense ? '' : 'on'}" aria-label="Büyük görünüm"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg></button>
          <button data-dense="1" class="${state.dense ? 'on' : ''}" aria-label="Sık görünüm"><svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><circle cx="3" cy="3" r="1"/><circle cx="8" cy="3" r="1"/><circle cx="13" cy="3" r="1"/><circle cx="3" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="13" cy="8" r="1"/><circle cx="3" cy="13" r="1"/><circle cx="8" cy="13" r="1"/><circle cx="13" cy="13" r="1"/></svg></button>
        </div>
      </div>
    </div>
    <div class="pgrid ${state.dense ? 'dense' : ''}">${list.map((h) => cardHTML(PRODUCTS[h])).join('') || '<p class="empty">Bu filtrelere uyan ürün yok.</p>'}</div>
    ${sectionsHTML(c)}
    ${faqHTML(c)}`;
  document.title = c.metaTitle || `${c.h1} | HWC`;
  return c.h1;
}

export function initCollection() {
  const root = $('#urunler');
  root.addEventListener('click', (e) => {
    const f = e.target.closest('[data-facet]');
    if (f) {
      state.open = state.open === f.dataset.facet ? '' : f.dataset.facet;
      renderCollection(current);
      return;
    }
    if (e.target.closest('[data-facet-clear]')) {
      Object.assign(state, { inStock: false, outStock: false, min: '', max: '' });
      renderCollection(current);
      return;
    }
    const d = e.target.closest('[data-dense]');
    if (d) {
      state.dense = d.dataset.dense === '1';
      renderCollection(current);
    }
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-sort]')) state.sort = t.value;
    else if (t.matches('[data-f="inStock"], [data-f="outStock"]')) state[t.dataset.f] = t.checked;
    else if (t.matches('[data-f="min"], [data-f="max"]')) state[t.dataset.f] = t.value;
    else return;
    renderCollection(current);
  });
  document.addEventListener('click', (e) => {
    if (state.open && !e.target.closest('.facet')) {
      state.open = '';
      if (document.body.dataset.page === 'koleksiyon') renderCollection(current);
    }
  });
}

export { findVariant };
