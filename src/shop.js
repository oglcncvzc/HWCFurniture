// Sayfa yönlendirme + mağaza sayfaları (ana sayfa bölümleri, koleksiyon, ürün detay)
import { PRODUCTS, PRODUCT_LIST, STATION_OF, defaultSelection, findVariant, shipTime, formatTRY, productUrl } from './catalog.js';
import { EPOXY } from './three/textures.js';
import { SLIDES, INSTAGRAM, INSTAGRAM_URL, COLLECTION_PAGES, TYPE_TO_COLLECTION } from './site-data.js';
import { addToCart, checkoutUrl } from './cart.js';
import { $, $$, img, esc, priceInfo, discount, variantTitle, WHATSAPP } from './util.js';
import { renderBlogList, renderArticle, renderHomePosts } from './blog.js';
import { initSearch, renderSearchPage } from './search.js';

const body = document.body;
let deps = {};

// ---------------------------------------------------------------------------
// Ürün kartı
// ---------------------------------------------------------------------------
export function cardHTML(p) {
  const { price, compare, soldOut, multi } = priceInfo(p);
  const d = discount(price, compare);
  const badges = [
    soldOut ? '<span class="badge dark">Tükendi</span>' : '',
    d ? `<span class="badge sale">%${d} indirim</span>` : '',
    p.tags.includes('cok-satan') ? '<span class="badge">Çok satan</span>' : '',
    p.tags.includes('hemen-teslim') ? '<span class="badge">Hemen teslim</span>' : '',
  ].join('');
  const has3d = !!STATION_OF[p.handle];
  return `
  <article class="card">
    <div class="card-wrap">
      <a class="card-media" href="/urun/${p.handle}" aria-label="${esc(p.title)}">
        <img src="${img(p.images[0], 640)}" alt="${esc(p.title)}" loading="lazy" />
        ${p.images[1] ? `<img class="alt" src="${img(p.images[1], 640)}" alt="" loading="lazy" />` : ''}
        <div class="badges">${badges}</div>
      </a>
      ${has3d ? `<button class="card-3d" data-open3d="${p.handle}"><span class="cube"></span>3D'de incele</button>` : ''}
    </div>
    <div class="card-body">
      <p class="card-type">${esc(p.type)}</p>
      <h3><a href="/urun/${p.handle}">${esc(p.title)}</a></h3>
      <div class="price">${multi ? '<small>başlayan</small>' : ''}<strong>${formatTRY(price)}</strong>${d ? `<s>${formatTRY(compare)}</s>` : ''}</div>
      <p class="ship ${soldOut ? 'out' : ''}">${soldOut ? 'Şu an stokta yok' : shipTime(p)}</p>
    </div>
  </article>`;
}

// ---------------------------------------------------------------------------
// Ana sayfa: carousel (ilk slayt 3D showroom)
// ---------------------------------------------------------------------------
let slide = 0;
let slideTimer;

function initHero() {
  const wrap = $('#slides');
  SLIDES.forEach((s, k) => {
    const p = PRODUCTS[s.handle];
    const { price, compare } = priceInfo(p);
    const el = document.createElement('div');
    el.className = 'slide slide-img';
    el.dataset.i = k + 1;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <img class="slide-bg" src="${img(s.img, 1800)}" alt="" ${k ? 'loading="lazy"' : ''} />
      <div class="slide-shade"></div>
      <div class="hero-content">
        <p class="kicker">${esc(s.kicker)}</p>
        <h2 class="slide-title">${s.title}</h2>
        <p class="lead slide-price">${compare ? `<s>${formatTRY(compare)}</s> ` : ''}<strong>${formatTRY(price)}</strong>'den başlayan fiyatlar${s.note ? `<br /><span>${esc(s.note)}</span>` : ''}</p>
        <div class="cta-row">
          <a class="btn btn-light btn-lg" href="/urun/${s.handle}">${esc(s.cta)} <span class="arrow">→</span></a>
          ${STATION_OF[s.handle] ? `<button class="btn btn-outline-light btn-lg" data-open3d="${s.handle}">3D showroom'da gör</button>` : ''}
        </div>
      </div>`;
    wrap.appendChild(el);
  });
  const n = SLIDES.length + 1;
  $('#heroDots').innerHTML = Array.from({ length: n }, (_, k) => `<button data-slide="${k}" aria-label="Slayt ${k + 1}"><span></span></button>`).join('');
  $('#heroDots').addEventListener('click', (e) => {
    const b = e.target.closest('[data-slide]');
    if (b) goSlide(+b.dataset.slide, true);
  });
  $('#heroPrev').addEventListener('click', () => goSlide(slide - 1, true));
  $('#heroNext').addEventListener('click', () => goSlide(slide + 1, true));
  const hero = $('#top');
  let sx = null;
  hero.addEventListener('touchstart', (e) => (sx = e.touches[0].clientX), { passive: true });
  hero.addEventListener('touchend', (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) goSlide(slide + (dx < 0 ? 1 : -1), true);
    sx = null;
  });
  hero.addEventListener('mouseenter', () => (hero.dataset.hover = '1'));
  hero.addEventListener('mouseleave', () => delete hero.dataset.hover);
  goSlide(0);
}

function goSlide(k, user = false) {
  const n = SLIDES.length + 1;
  slide = (k + n) % n;
  $$('#slides .slide').forEach((el) => {
    const on = +el.dataset.i === slide;
    el.classList.toggle('is-active', on);
    el.setAttribute('aria-hidden', on ? 'false' : 'true');
  });
  $$('#heroDots button').forEach((b) => b.classList.toggle('on', +b.dataset.slide === slide));
  body.dataset.slide = slide;
  deps.updatePause?.();
  clearTimeout(slideTimer);
  // 3D slaytında daha uzun kal; kullanıcı dokunduysa biraz bekle
  slideTimer = setTimeout(autoNext, (slide === 0 ? 11000 : 6500) + (user ? 6000 : 0));
}

function autoNext() {
  const hero = $('#top');
  const busy = body.classList.contains('immersive') || body.dataset.page !== 'home' || hero.dataset.hover || scrollY > innerHeight * 0.6 || document.hidden;
  if (busy) {
    slideTimer = setTimeout(autoNext, 3000);
    return;
  }
  goSlide(slide + 1);
}

export function showShowroomSlide() {
  if (slide !== 0) goSlide(0, true);
}

// ---------------------------------------------------------------------------
// Ana sayfa: çok satanlar, koleksiyon kartları, Instagram şeridi
// ---------------------------------------------------------------------------
function initHome() {
  const best = PRODUCT_LIST.filter((p) => p.tags.includes('cok-satan'));
  $('#bestRow').innerHTML = best.map(cardHTML).join('');

  const tiles = [
    { slug: 'epoksi-masalar', title: 'Epoksi Masalar', img: 'https://hwcfurniture.com/cdn/shop/collections/hf_20260808_055937_eccdda4b-b4cb-4290-8a1c-997e0a9e2a69.png' },
    { slug: 'yemek-masalari', title: 'Yemek Masaları', img: 'https://hwcfurniture.com/cdn/shop/collections/hf_20260808_141233_a408d6c8-6916-47a2-ab6f-8930f4dd5e67.png' },
    { slug: 'calisma-masalari', title: 'Çalışma Masaları', img: 'https://hwcfurniture.com/cdn/shop/collections/endustriyel-masif-ceviz-calisma-masasi-chocolate-yasam-alani.webp' },
    { slug: 'sehpalar', title: 'Orta ve Yan Sehpalar', img: 'https://hwcfurniture.com/cdn/shop/collections/hwc-u16-08.webp' },
  ];
  $('#collections').innerHTML = tiles
    .map(
      (c) => `<a class="collection" href="/koleksiyon/${c.slug}">
        <img src="${img(c.img, 700)}" alt="" loading="lazy" />
        <span>${c.title} <i>→</i></span>
      </a>`
    )
    .join('');

  $('#igRow').innerHTML = INSTAGRAM.map(
    (it, k) => `<button class="ig-tile ${it.video ? 'has-video' : ''}" data-ig="${k}" aria-label="${esc(it.caption)}">
      <img src="${it.img}" alt="" loading="lazy" />
      ${it.video ? `<video muted autoplay playsinline loop preload="metadata" poster="${it.img}" src="${it.video}"></video><span class="ig-play" aria-hidden="true"></span>` : ''}
      <span class="ig-cap">${esc(it.caption)}</span>
    </button>`
  ).join('');
  // Videolu kareler ekrandayken sessiz ve döngüde oynar (orijinal sitedeki gibi)
  $$('#igRow video').forEach((v) => {
    v.muted = true;
    v.addEventListener('playing', () => (v.dataset.on = '1'));
  });
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((ents) => ents.forEach((en) => {
        const v = en.target.querySelector('video');
        if (!v) return;
        if (en.isIntersecting) v.play().catch(() => {});
        else v.pause();
      }), { threshold: 0.25 })
    : null;
  if (io) $$('#igRow .ig-tile.has-video').forEach((t) => io.observe(t));
  else $$('#igRow video').forEach((v) => v.play().catch(() => {}));
  $('#igRow').addEventListener('click', (e) => {
    const t = e.target.closest('[data-ig]');
    if (!t) return;
    const it = INSTAGRAM[+t.dataset.ig];
    if (it.video) openVideo(it);
    else window.open(INSTAGRAM_URL, '_blank', 'noopener');
  });
  for (const [btn, dir] of [['#igPrev', -1], ['#igNext', 1], ['#bestPrev', -1], ['#bestNext', 1]]) {
    $(btn).addEventListener('click', () => {
      const row = $(btn.startsWith('#ig') ? '#igRow' : '#bestRow');
      row.scrollBy({ left: dir * row.clientWidth * 0.8, behavior: 'smooth' });
    });
  }
}

function openVideo(it) {
  const m = $('#videoModal');
  const v = $('#videoModal video');
  v.src = it.video;
  v.poster = it.img;
  $('#videoCap').textContent = it.caption;
  m.classList.add('open');
  body.classList.add('lb-open');
  v.play().catch(() => {});
}
function closeVideo() {
  const m = $('#videoModal');
  const v = $('#videoModal video');
  v.pause();
  m.classList.remove('open');
  body.classList.remove('lb-open');
}

// ---------------------------------------------------------------------------
// Koleksiyon sayfası
// ---------------------------------------------------------------------------
const SORTS = {
  onerilen: { label: 'Önerilen', fn: (a, b) => rank(a) - rank(b) },
  'fiyat-artan': { label: 'Fiyat: düşükten yükseğe', fn: (a, b) => priceInfo(a).price - priceInfo(b).price },
  'fiyat-azalan': { label: 'Fiyat: yüksekten düşüğe', fn: (a, b) => priceInfo(b).price - priceInfo(a).price },
  indirim: { label: 'En yüksek indirim', fn: (a, b) => discount(priceInfo(b).price, priceInfo(b).compare) - discount(priceInfo(a).price, priceInfo(a).compare) },
};
const rank = (p) => (p.tags.includes('cok-satan') ? 0 : 1) + (priceInfo(p).soldOut ? 2 : 0);
const coll = { sort: 'onerilen', stock: false };

function renderCollection(slug) {
  const c = COLLECTION_PAGES.find((x) => x.slug === slug) || COLLECTION_PAGES[0];
  $('#collTitle').textContent = c.title;
  $('#collIntro').textContent = c.intro;
  $('#filters').innerHTML = COLLECTION_PAGES.map(
    (x) => `<a href="/koleksiyon/${x.slug}" class="${x.slug === c.slug ? 'on' : ''}">${x.title} <span>${PRODUCT_LIST.filter(x.test).length}</span></a>`
  ).join('');
  let list = PRODUCT_LIST.filter(c.test);
  if (coll.stock) list = list.filter((p) => !priceInfo(p).soldOut);
  list = [...list].sort(SORTS[coll.sort].fn);
  $('#collCount').textContent = `${list.length} ürün`;
  $('#grid').innerHTML = list.map(cardHTML).join('') || '<p class="empty">Bu filtreye uyan ürün yok.</p>';
  document.title = `${c.title} | HWC`;
  return c.title;
}

function initCollectionControls() {
  $('#sortSel').innerHTML = Object.entries(SORTS).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join('');
  $('#sortSel').addEventListener('change', (e) => {
    coll.sort = e.target.value;
    renderCollection(currentArg);
  });
  $('#stockOnly').addEventListener('change', (e) => {
    coll.stock = e.target.checked;
    renderCollection(currentArg);
  });
}

// ---------------------------------------------------------------------------
// Ürün detay sayfası
// ---------------------------------------------------------------------------
const pdp = { handle: null, sel: {}, qty: 1, img: 0 };

function swatch(label) {
  const key = { 'Transparan Siyah': 'transSiyah', Siyah: 'siyah', Şeffaf: 'seffaf', 'Koyu Yeşil': 'koyuYesil', 'Okyanus Mavisi': 'okyanus' }[label];
  const e = EPOXY[key];
  if (!e) return '';
  const c = (a) => `rgb(${a.join(',')})`;
  return `background: radial-gradient(circle at 35% 30%, ${c(e.shore)}, ${c(e.deep)} 75%)`;
}

function renderProduct(handle) {
  const p = PRODUCTS[handle];
  if (!p) {
    $('#pdp').innerHTML = `<div class="notfound"><h1>Ürün bulunamadı</h1><p>Aradığınız ürün kaldırılmış olabilir.</p><a class="btn btn-dark" href="/koleksiyon/tum-masalar">Tüm ürünler</a></div>`;
    return 'Ürün bulunamadı';
  }
  if (pdp.handle !== handle) {
    pdp.handle = handle;
    pdp.sel = defaultSelection(p);
    pdp.qty = 1;
    pdp.img = 0;
  }
  const v = findVariant(p, pdp.sel);
  const d = discount(v[4], v[5]);
  const has3d = !!STATION_OF[handle];
  const collSlug = TYPE_TO_COLLECTION[p.type] || 'tum-masalar';
  const collTitle = COLLECTION_PAGES.find((c) => c.slug === collSlug).title;
  const optText = p.options.map((o) => pdp.sel[o.name]).join(' / ');
  const wa = `${WHATSAPP}?text=${encodeURIComponent(`Merhaba, "${p.title}" (${optText}) hakkında bilgi almak istiyorum.`)}`;
  const related = PRODUCT_LIST.filter((x) => x.handle !== handle && (TYPE_TO_COLLECTION[x.type] || '') === collSlug).slice(0, 4);

  $('#pdp').innerHTML = `
    <nav class="crumbs" aria-label="Sayfa yolu"><a href="/">Ana sayfa</a><span>/</span><a href="/koleksiyon/${collSlug}">${collTitle}</a><span>/</span><span>${esc(p.title)}</span></nav>
    <div class="pdp-grid">
      <div class="pdp-gallery">
        <button class="pdp-main" data-zoom aria-label="Fotoğrafı büyüt">
          <img src="${img(p.images[pdp.img], 1200)}" alt="${esc(p.title)}" />
          <span class="zoom-hint">Büyütmek için tıklayın</span>
        </button>
        <div class="pdp-thumbs">${p.images
          .map((u, k) => `<button class="${k === pdp.img ? 'on' : ''}" data-thumb="${k}" aria-label="Fotoğraf ${k + 1}"><img src="${img(u, 200)}" alt="" /></button>`)
          .join('')}</div>
      </div>
      <div class="pdp-info">
        <p class="kicker">${esc(p.type)}</p>
        <h1>${esc(p.title)}</h1>
        <a class="pdp-rating" href="/#yorumlar"><span>★★★★★</span> 101 değerlendirme</a>
        <div class="price-row">
          <strong>${formatTRY(v[4])}</strong>
          ${d ? `<s>${formatTRY(v[5])}</s><span class="badge sale">%${d} indirim</span>` : ''}
        </div>
        <p class="tax">Vergiler dahil. Türkiye geneli kargo ücretsiz.</p>
        <p class="ship ${v[6] ? '' : 'out'}">${v[6] ? shipTime(p) : 'Bu seçenek şu an stokta yok'}</p>
        ${p.options
          .map((o) => {
            const isColor = o.name === 'Epoksi Rengi';
            return `<div class="opt">
              <div class="opt-label">${esc(o.name)} <span>${esc(pdp.sel[o.name])}</span></div>
              <div class="chips ${isColor ? 'colors' : ''}">${o.values
                .map((val) =>
                  isColor
                    ? `<button class="color ${val === pdp.sel[o.name] ? 'on' : ''}" data-popt="${esc(o.name)}" data-val="${esc(val)}" title="${esc(val)}" style="${swatch(val)}"><span class="sr">${esc(val)}</span></button>`
                    : `<button class="chip ${val === pdp.sel[o.name] ? 'on' : ''}" ${o.values.length === 1 ? 'disabled' : ''} data-popt="${esc(o.name)}" data-val="${esc(val)}">${esc(val)}</button>`
                )
                .join('')}</div>
            </div>`;
          })
          .join('')}
        <div class="buy-row">
          <div class="qty big"><button data-pq="-1" aria-label="Azalt">−</button><span>${pdp.qty}</span><button data-pq="1" aria-label="Artır">+</button></div>
          <button class="btn btn-dark btn-lg" data-add ${v[6] ? '' : 'disabled'}>${v[6] ? 'Sepete ekle' : 'Tükendi'}</button>
        </div>
        ${v[6] ? `<a class="btn btn-outline btn-lg wide" href="${checkoutUrl([{ id: v[0], qty: pdp.qty }])}">Hemen satın al</a>` : ''}
        ${has3d ? `<button class="btn btn-ghost-dark btn-lg wide" data-open3d="${handle}"><span class="cube"></span>3D showroom'da incele</button>` : ''}
        <ul class="trust">
          <li>Ankara atölyemizde siparişinize özel üretilir</li>
          <li>Türkiye geneline ücretsiz, sigortalı kargo</li>
          <li>Standart ölçülerde 14 gün içinde iade</li>
          <li>Kredi kartı, banka kartı ve havale/EFT ile güvenli ödeme</li>
        </ul>
        <a class="wa-line" href="${wa}" target="_blank" rel="noopener">Sorunuz mu var? WhatsApp'tan yazın →</a>
        <div class="pdp-acc">
          <details open><summary>Ürün açıklaması</summary><p>${esc(p.desc)}</p></details>
          <details><summary>Ölçü ve seçenekler</summary><p>${p.options.map((o) => `<b>${esc(o.name)}:</b> ${o.values.map(esc).join(', ')}`).join('<br />')}<br /><b>Yükseklik:</b> ${/Sehpa/.test(p.type) ? (p.type === 'Orta Sehpa' ? '45 cm' : '53 cm') : p.tags.includes('linak') ? 'elektrikli, ayarlanabilir' : '76 cm'}<br />Listede olmayan ölçüler için <a href="/ozel-uretim">özel üretim</a> talep edebilirsiniz.</p></details>
          <details><summary>Yüzey ve bakım</summary><p>Masif ahşap yüzeylerde Rubio Monocoat Oil Plus 2C kullanıyoruz; ahşabın dokusunu korur, lekelenmeye karşı direnç sağlar ve noktasal yenilenebilir. Yüzeyi nemli yumuşak bir bezle silip kurulayın; doğrudan sıcak tencere koymayın, uzun süreli güneş ve aşırı nemden kaçının.</p></details>
          <details><summary>Teslimat ve iade</summary><p>Masif ahşap ürünler 3–4, epoksi ürünler 4–6 haftada hazırlanır; hemen teslim ürünler stoktan gönderilir. Tabla ve ayaklar ayrı, koruyucu ambalajla gelir; kurulum basittir. Standart ölçülerde teslimden itibaren 14 gün içinde iade veya değişim yapılabilir; kişiye özel ölçüler kusur olmadıkça iade kapsamı dışındadır. <a href="https://hwcfurniture.com/pages/iade-ve-degisim" target="_blank" rel="noopener">İade ve Değişim</a></p></details>
        </div>
      </div>
    </div>
    ${related.length ? `<section class="related"><h2>Bunlar da ilginizi çekebilir</h2><div class="grid">${related.map(cardHTML).join('')}</div></section>` : ''}
  `;
  document.title = `${p.title} | HWC`;
  return p.title;
}

function initProductEvents() {
  $('#pdp').addEventListener('click', (e) => {
    const p = PRODUCTS[pdp.handle];
    if (!p) return;
    const t = e.target.closest('[data-thumb]');
    if (t) {
      pdp.img = +t.dataset.thumb;
      $('#pdp .pdp-main img').src = img(p.images[pdp.img], 1200);
      $$('#pdp [data-thumb]').forEach((b) => b.classList.toggle('on', b === t));
      return;
    }
    if (e.target.closest('[data-zoom]')) return deps.openLightbox?.(p, pdp.img);
    const o = e.target.closest('[data-popt]');
    if (o && !o.disabled) {
      pdp.sel[o.dataset.popt] = o.dataset.val;
      renderProduct(pdp.handle);
      return;
    }
    const q = e.target.closest('[data-pq]');
    if (q) {
      pdp.qty = Math.max(1, Math.min(20, pdp.qty + +q.dataset.pq));
      renderProduct(pdp.handle);
      return;
    }
    if (e.target.closest('[data-add]')) addToCart(p.handle, findVariant(p, pdp.sel), pdp.qty);
  });
}

// ---------------------------------------------------------------------------
// Yönlendirme
// ---------------------------------------------------------------------------
const PAGES = {
  '': { page: 'home', title: 'Masif Ahşap ve Epoksi Masa Modelleri | HWC' },
  koleksiyon: { page: 'koleksiyon' },
  urun: { page: 'urun' },
  hakkimizda: { page: 'hakkimizda', title: 'Hakkımızda | HWC', crumb: 'Hakkımızda' },
  'ozel-uretim': { page: 'ozel-uretim', title: 'Özel Üretim Siparişleri | HWC', crumb: 'Özel Üretim Siparişleri' },
  'olcu-rehberi': { page: 'olcu-rehberi', title: 'Oturma ve Masa Boyutu Rehberi | HWC', crumb: 'Oturma ve Masa Boyutu Rehberi' },
  sss: { page: 'sss', title: 'Sıkça Sorulan Sorular | HWC', crumb: 'Sıkça Sorulan Sorular' },
  iletisim: { page: 'iletisim', title: 'İletişim | HWC', crumb: 'İletişim' },
  blog: { page: 'blog' },
  arama: { page: 'arama' },
};
let currentArg = '';

function parse() {
  const parts = location.pathname.replace(/^\/+|\/+$/g, '').split('/');
  const def = PAGES[parts[0]] || { page: 'notfound', title: 'Sayfa bulunamadı | HWC', crumb: 'Sayfa bulunamadı' };
  const arg = decodeURIComponent(parts[1] || '');
  if (def.page === 'blog' && arg) return { page: 'yazi', arg };
  return { ...def, arg };
}

export function route({ keepScroll = false } = {}) {
  const r = parse();
  currentArg = r.arg;
  body.dataset.page = r.page;
  $$('[data-page]').forEach((el) => {
    const on = el.dataset.page.split(/\s+/).includes(r.page);
    el.hidden = !on;
  });
  let crumb = r.crumb;
  if (r.page === 'koleksiyon') crumb = renderCollection(r.arg || 'tum-masalar');
  else if (r.page === 'urun') renderProduct(r.arg);
  else if (r.page === 'blog') renderBlogList();
  else if (r.page === 'yazi') renderArticle(r.arg);
  else if (r.page === 'arama') renderSearchPage();
  if (r.title) document.title = r.title;
  $('#pageCrumb').innerHTML = crumb ? `<a href="/">Ana sayfa</a><span>/</span><span>${esc(crumb)}</span>` : '';
  $$('.nav a, .drop a').forEach((a) => a.classList.toggle('current', a.getAttribute('href') === location.pathname));
  body.classList.remove('menu-open');
  $('.nav-drop')?.classList.remove('open');
  deps.updatePause?.();
  if (keepScroll) return;
  const id = location.hash.slice(1);
  if (id && id !== 'showroom') {
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  } else scrollTo({ top: 0, behavior: 'instant' });
}

export function navigate(url, opts) {
  if (url === location.pathname + location.search + location.hash) return route(opts);
  history.pushState(null, '', url);
  route(opts);
}

function isInternal(a) {
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
  const href = a.getAttribute('href');
  return href && href.startsWith('/') && !href.startsWith('//');
}

export function initShop(d) {
  deps = d;
  initHero();
  initHome();
  renderHomePosts();
  initSearch(navigate);
  initCollectionControls();
  initProductEvents();
  $('#videoModal').addEventListener('click', (e) => {
    if (e.target.closest('[data-vclose]') || e.target.id === 'videoModal') closeVideo();
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#videoModal').classList.contains('open')) closeVideo();
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!isInternal(a) || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(a.getAttribute('href'));
  });
  addEventListener('popstate', () => route({ keepScroll: false }));
  route({ keepScroll: location.hash === '#showroom' });
}

export { productUrl };
