// Ürün + blog araması (istemci tarafında, Türkçe karakter duyarsız)
import { PRODUCT_LIST, SHORT, formatTRY } from './catalog.js';
import { BLOG } from './blog.js';
import { $, img, esc, priceInfo } from './util.js';
import { cardHTML } from './collection.js';

const MAP = { ç: 'c', ğ: 'g', ı: 'i', i̇: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
export const norm = (s) =>
  String(s || '')
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]|i̇/g, (c) => MAP[c] || c)
    .replace(/[-_/·—–]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const PRODUCT_INDEX = PRODUCT_LIST.map((p) => ({
  p,
  title: norm(`${p.title} ${SHORT[p.handle] || ''}`),
  body: norm([p.type, p.tags.join(' '), p.options.map((o) => `${o.name} ${o.values.join(' ')}`).join(' '), p.desc].join(' ')),
}));
const BLOG_INDEX = BLOG.map((a) => ({ a, title: norm(a.title), body: norm(`${a.summary} ${a.html.replace(/<[^>]+>/g, ' ')}`) }));

// Birkaç eş anlamlı / kısaltma
const SYN = { river: 'river epoksi', nehir: 'river', kutuk: 'dogal kenar', sehpa: 'sehpa', ofis: 'calisma', masaustu: 'calisma' };

export function search(q) {
  const tokens = norm(q).split(' ').filter((t) => t.length > 1);
  if (!tokens.length) return { products: [], posts: [] };
  const score = (row) => {
    let s = 0;
    for (const t of tokens) {
      const alt = SYN[t];
      const inTitle = row.title.includes(t) || (alt && row.title.includes(alt));
      const inBody = row.body.includes(t) || (alt && row.body.includes(alt));
      if (!inTitle && !inBody) return 0;
      s += inTitle ? 3 : 1;
    }
    return s;
  };
  const products = PRODUCT_INDEX.map((r) => ({ r, s: score(r) }))
    .filter((x) => x.s)
    .sort((a, b) => b.s - a.s || (priceInfo(a.r.p).soldOut - priceInfo(b.r.p).soldOut))
    .map((x) => x.r.p);
  const posts = BLOG_INDEX.map((r) => ({ r, s: score(r) }))
    .filter((x) => x.s)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.r.a);
  return { products, posts };
}

// ---------------------------------------------------------------- üst arama paneli
const SUGGEST = ['Ceviz', 'Meşe', 'Epoksi', 'Yuvarlak', 'Doğal kenar', 'Çalışma masası', 'Sehpa', 'Hemen teslim'];
let navigateFn = () => {};

function renderQuick(q) {
  const box = $('#searchResults');
  if (!norm(q)) {
    box.innerHTML = `<p class="search-hint">Popüler aramalar</p><div class="chips">${SUGGEST.map((s) => `<button class="chip" data-q="${s}">${s}</button>`).join('')}</div>`;
    return;
  }
  const { products, posts } = search(q);
  if (!products.length && !posts.length) {
    box.innerHTML = `<p class="search-empty">"${esc(q)}" için sonuç bulunamadı. Farklı bir kelime deneyin ya da <a href="/pages/ozel-uretim-siparisleri">özel üretim</a> için bize yazın.</p>`;
    return;
  }
  box.innerHTML = `
    ${products.length ? `<p class="search-hint">Ürünler (${products.length})</p><div class="search-list">${products
      .slice(0, 6)
      .map((p) => {
        const { price } = priceInfo(p);
        return `<a class="sr-item" href="/products/${p.handle}"><img src="${img(p.images[0], 160)}" alt="" /><span><b>${esc(p.title)}</b><small>${esc(p.type)} · ${formatTRY(price)}</small></span></a>`;
      })
      .join('')}</div>` : ''}
    ${posts.length ? `<p class="search-hint">Blog (${posts.length})</p><div class="search-list">${posts
      .slice(0, 3)
      .map((a) => `<a class="sr-item" href="/blogs/rehber/${a.handle}"><img src="${a.image ? img(a.image, 160) : '/hwc-logo.png'}" alt="" /><span><b>${esc(a.title)}</b><small>${a.minutes} dk okuma</small></span></a>`)
      .join('')}</div>` : ''}
    <a class="btn btn-dark search-all" href="/search?q=${encodeURIComponent(q)}">Tüm sonuçları gör</a>`;
}

export function openSearch(q = '') {
  document.body.classList.add('search-open');
  const input = $('#searchInput');
  input.value = q;
  renderQuick(q);
  requestAnimationFrame(() => input.focus());
}
export function closeSearch() {
  document.body.classList.remove('search-open');
}

export function initSearch(navigate) {
  navigateFn = navigate;
  const input = $('#searchInput');
  let t;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => renderQuick(input.value), 80);
  });
  $('#searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    closeSearch();
    navigateFn(`/search?q=${encodeURIComponent(q)}`);
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-search-open]')) {
      e.preventDefault();
      openSearch();
    } else if (e.target.closest('[data-search-close]') || e.target.id === 'searchScrim') closeSearch();
    else if (e.target.closest('#searchResults a')) closeSearch();
    const chip = e.target.closest('#searchResults [data-q]');
    if (chip) {
      input.value = chip.dataset.q;
      renderQuick(chip.dataset.q);
      input.focus();
    }
  });
  addEventListener('keydown', (e) => {
    const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing && !document.body.classList.contains('immersive'))) {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape' && document.body.classList.contains('search-open')) closeSearch();
  });
}

// ---------------------------------------------------------------- /arama sayfası
export function renderSearchPage() {
  const q = new URLSearchParams(location.search).get('q') || '';
  const { products, posts } = search(q);
  $('#searchPage').innerHTML = `
    <nav class="crumbs" aria-label="Sayfa yolu"><a href="/">Ana sayfa</a><span>/</span><span>Arama</span></nav>
    <div class="section-head">
      <h1>${q ? `"${esc(q)}" için sonuçlar` : 'Arama'}</h1>
      <p>${q ? `${products.length} ürün, ${posts.length} blog yazısı bulundu.` : 'Ürün veya yazı arayın.'}</p>
    </div>
    <form class="search-inline" id="searchInline" role="search">
      <input type="search" name="q" value="${esc(q)}" placeholder="Masa, ahşap türü, renk…" aria-label="Ara" />
      <button class="btn btn-dark" type="submit">Ara</button>
    </form>
    ${products.length ? `<h2 class="sp-title">Ürünler</h2><div class="pgrid">${products.map(cardHTML).join('')}</div>` : ''}
    ${posts.length ? `<h2 class="sp-title">Blog yazıları</h2><div class="search-list wide">${posts
      .map((a) => `<a class="sr-item" href="/blogs/rehber/${a.handle}"><img src="${a.image ? img(a.image, 200) : '/hwc-logo.png'}" alt="" /><span><b>${esc(a.title)}</b><small>${esc(a.summary).slice(0, 140)}…</small></span></a>`)
      .join('')}</div>` : ''}
    ${q && !products.length && !posts.length ? `<p class="search-empty">Sonuç bulunamadı. <a href="/collections/tum-masalar">Tüm ürünlere</a> göz atabilir ya da <a href="/pages/ozel-uretim-siparisleri">özel üretim</a> talep edebilirsiniz.</p>` : ''}`;
  $('#searchInline').addEventListener('submit', (e) => {
    e.preventDefault();
    const nq = new FormData(e.target).get('q').trim();
    navigateFn(`/search?q=${encodeURIComponent(nq)}`);
  });
  document.title = q ? `"${q}" araması | HWC` : 'Arama | HWC';
  return 'Arama';
}
