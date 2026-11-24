// Sayfa yönlendirme + mağaza sayfaları (ana sayfa bölümleri, koleksiyon, ürün detay)
import { PRODUCTS, PRODUCT_LIST, STATION_OF, defaultSelection, findVariant, shipTime, formatTRY, productUrl } from './catalog.js';
import { EPOXY } from './three/textures.js';
import { SLIDES, INSTAGRAM, INSTAGRAM_URL } from './site-data.js';
import { cardHTML, renderCollection, initCollection, initCards, COLL_BY, OLD_COLLECTION_SLUGS, TYPE_TO_COLLECTION } from './collection.js';
import { addToCart, checkoutUrl } from './cart.js';
import { $, $$, img, esc, priceInfo, discount, variantTitle, WHATSAPP } from './util.js';
import { renderBlogList, renderArticle, renderHomePosts } from './blog.js';
import { initSearch, renderSearchPage } from './search.js';

const body = document.body;
let deps = {};

// ---------------------------------------------------------------------------
// Ana sayfa: carousel (ilk slayt 3D showroom)
// ---------------------------------------------------------------------------
let slide = 0;
let slideTimer;

const heroPrice = (n) => `${new Intl.NumberFormat('tr-TR').format(n)} ₺`;

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
        <p class="lead slide-price">${compare ? `<s>${heroPrice(compare)}</s> ` : ''}<strong>${heroPrice(price)}</strong>'den başlayan fiyatlar${s.note ? `<br /><span>${esc(s.note)}</span>` : ''}</p>
        <div class="cta-row">
          <a class="btn btn-light btn-lg" href="/products/${s.handle}">${esc(s.cta)} <span class="arrow">→</span></a>
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
  // güven bandı: görünür olunca öğeler sırayla belirir
  const trust = $('#avantajlar');
  if ('IntersectionObserver' in window) {
    const tio = new IntersectionObserver((en) => en.forEach((x) => x.isIntersecting && (trust.classList.add('is-visible'), tio.disconnect())), { threshold: 0.2 });
    tio.observe(trust);
  } else trust.classList.add('is-visible');
  const best = (COLL_BY['cok-satanlar']?.products || []).map((h) => PRODUCTS[h]);
  $('#bestRow').innerHTML = best.map(cardHTML).join('');

  const tiles = [
    { slug: 'epoksi-masa-modelleri', title: 'Epoksi Masalar', img: 'https://hwcfurniture.com/cdn/shop/collections/hf_20260808_055937_eccdda4b-b4cb-4290-8a1c-997e0a9e2a69.png' },
    { slug: 'yemek-mutfak-masalari', title: 'Yemek Masaları', img: 'https://hwcfurniture.com/cdn/shop/collections/hf_20260808_141233_a408d6c8-6916-47a2-ab6f-8930f4dd5e67.png' },
    { slug: 'ofis-ve-calisma-masalari', title: 'Çalışma Masaları', img: 'https://hwcfurniture.com/cdn/shop/collections/endustriyel-masif-ceviz-calisma-masasi-chocolate-yasam-alani.webp' },
    { slug: 'sehpa-modelleri', title: 'Orta ve Yan Sehpalar', img: 'https://hwcfurniture.com/cdn/shop/collections/hwc-u16-08.webp' },
  ];
  $('#collections').innerHTML = tiles
    .map(
      (c) => `<a class="ctile" href="/collections/${c.slug}">
        <span class="ctile-img"><img src="${img(c.img, 800)}" alt="${c.title}" loading="lazy" /></span>
        <span class="ctile-title">${c.title}</span>
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
  for (const [btn, dir] of [['#igPrev', -1], ['#igNext', 1]]) {
    $(btn).addEventListener('click', () => {
      const row = $('#igRow');
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
    $('#pdp').innerHTML = `<div class="notfound"><h1>Ürün bulunamadı</h1><p>Aradığınız ürün kaldırılmış olabilir.</p><a class="btn btn-dark" href="/collections/tum-masalar">Tüm ürünler</a></div>`;
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
  const collTitle = COLL_BY[collSlug]?.title || 'Tüm Masalar';
  const optText = p.options.map((o) => pdp.sel[o.name]).join(' / ');
  const wa = `${WHATSAPP}?text=${encodeURIComponent(`Merhaba, "${p.title}" (${optText}) hakkında bilgi almak istiyorum.`)}`;
  const related = (COLL_BY[collSlug]?.products || []).filter((h) => h !== handle).slice(0, 4).map((h) => PRODUCTS[h]);

  $('#pdp').innerHTML = `
    <nav class="crumbs" aria-label="Sayfa yolu"><a href="/">Ana sayfa</a><span>/</span><a href="/collections/${collSlug}">${collTitle}</a><span>/</span><span>${esc(p.title)}</span></nav>
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
          <details><summary>Ölçü ve seçenekler</summary><p>${p.options.map((o) => `<b>${esc(o.name)}:</b> ${o.values.map(esc).join(', ')}`).join('<br />')}<br /><b>Yükseklik:</b> ${/Sehpa/.test(p.type) ? (p.type === 'Orta Sehpa' ? '45 cm' : '53 cm') : p.tags.includes('linak') ? 'elektrikli, ayarlanabilir' : '76 cm'}<br />Listede olmayan ölçüler için <a href="/pages/ozel-uretim-siparisleri">özel üretim</a> talep edebilirsiniz.</p></details>
          <details><summary>Yüzey ve bakım</summary><p>Masif ahşap yüzeylerde Rubio Monocoat Oil Plus 2C kullanıyoruz; ahşabın dokusunu korur, lekelenmeye karşı direnç sağlar ve noktasal yenilenebilir. Yüzeyi nemli yumuşak bir bezle silip kurulayın; doğrudan sıcak tencere koymayın, uzun süreli güneş ve aşırı nemden kaçının.</p></details>
          <details><summary>Teslimat ve iade</summary><p>Masif ahşap ürünler 3–4, epoksi ürünler 4–6 haftada hazırlanır; hemen teslim ürünler stoktan gönderilir. Tabla ve ayaklar ayrı, koruyucu ambalajla gelir; kurulum basittir. Standart ölçülerde teslimden itibaren 14 gün içinde iade veya değişim yapılabilir; kişiye özel ölçüler kusur olmadıkça iade kapsamı dışındadır. <a href="https://hwcfurniture.com/pages/iade-ve-degisim" target="_blank" rel="noopener">İade ve Değişim</a></p></details>
        </div>
      </div>
    </div>
    ${related.length ? `<section class="related"><h2>Bunlar da ilginizi çekebilir</h2><div class="pgrid four">${related.map(cardHTML).join('')}</div></section>` : ''}
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
const TITLE_HOME = 'Masif Ahşap ve Epoksi Masa Modelleri | HWC';
const INFO = {
  about: { page: 'hakkimizda', title: 'Hakkımızda | HWC', crumb: 'Hakkımızda' },
  'ozel-uretim-siparisleri': { page: 'ozel-uretim', title: 'Özel Üretim Siparişleri | HWC', crumb: 'Özel Üretim Siparişleri' },
  'oturma-ve-masa-boyutu-rehberi': { page: 'olcu-rehberi', title: 'Oturma ve Masa Boyutu Rehberi | HWC', crumb: 'Oturma ve Masa Boyutu Rehberi' },
  faq: { page: 'sss', title: 'Sıkça Sorulan Sorular | HWC', crumb: 'Sıkça Sorulan Sorular' },
  contact: { page: 'iletisim', title: 'İletişim | HWC', crumb: 'İletişim' },
};
// İlk sürümdeki kısa adresler → orijinal adresler
const OLD = { hakkimizda: '/pages/about', 'ozel-uretim': '/pages/ozel-uretim-siparisleri', 'olcu-rehberi': '/pages/oturma-ve-masa-boyutu-rehberi', sss: '/pages/faq', iletisim: '/pages/contact' };

function canonical(parts) {
  const [a, b] = parts;
  if (a === 'en') return '/' + parts.slice(1).join('/');
  if (OLD[a]) return OLD[a];
  if (a === 'koleksiyon') return `/collections/${OLD_COLLECTION_SLUGS[b] || b || 'tum-masalar'}`;
  if (a === 'urun') return `/products/${b}`;
  if (a === 'blog') return b ? `/blogs/rehber/${b}` : '/blogs/rehber';
  if (a === 'arama') return `/search${location.search}`;
  if (a === 'collections' && !b) return '/collections/tum-masalar';
  if (a === 'collections' && b === 'all') return '/collections/tum-masalar';
  return null;
}
let currentArg = '';

function parse() {
  const parts = location.pathname.replace(/^\/+|\/+$/g, '').split('/').map(decodeURIComponent);
  const to = canonical(parts);
  if (to) {
    history.replaceState(null, '', to + (to.includes('?') ? '' : location.search.replace(/^\?q=.*/, '')) + location.hash);
    return parse();
  }
  const [a, b, c] = parts;
  if (!a) return { page: 'home', title: TITLE_HOME };
  if (a === 'collections') return { page: 'koleksiyon', arg: b };
  if (a === 'products') return { page: 'urun', arg: b };
  if (a === 'pages' && INFO[b]) return INFO[b];
  if (a === 'blogs' && b === 'rehber') return c ? { page: 'yazi', arg: c } : { page: 'blog' };
  if (a === 'search') return { page: 'arama' };
  return { page: 'notfound', title: 'Sayfa bulunamadı | HWC', crumb: 'Sayfa bulunamadı' };
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
  $$('.nav-drop').forEach((d) => d.classList.remove('open'));
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
  initCollection();
  initCards(navigate);
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
