// Sayfa yönlendirme + mağaza sayfaları (ana sayfa bölümleri, koleksiyon, ürün detay)
import { PRODUCTS, PRODUCT_LIST, STATION_OF, defaultSelection, findVariant, shipTime, formatTRY, productUrl } from './catalog.js';
import { EPOXY } from './three/textures.js';
import { SLIDES, INSTAGRAM, INSTAGRAM_URL } from './site-data.js';
import { cardHTML, renderCollection, initCollection, initCards, COLL_BY, OLD_COLLECTION_SLUGS, TYPE_TO_COLLECTION } from './collection.js';
import { addToCart, checkoutUrl } from './cart.js';
import { $, $$, img, esc, priceInfo, discount, variantTitle, WHATSAPP } from './util.js';
import { renderBlogList, renderArticle, renderHomePosts } from './blog.js';
import { renderProduct, initProductPage } from './product-page.js';
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
  else if (r.page === 'ozel-uretim') {
    const urun = new URLSearchParams(location.search).get('urun');
    const f = document.getElementById('quoteForm');
    if (urun && f) f.elements.not.value = `İlgilendiğim model: ${urun}`;
  }
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
  initProductPage(deps);
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
