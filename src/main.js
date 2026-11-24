import { ShowroomEngine } from './three/engine.js';
import { EPOXY } from './three/textures.js';
import {
  STATIONS,
  PRODUCTS,
  PRODUCT_LIST,
  SHORT,
  STATION_OF,
  resolveVisual,
  resolveDims,
  findVariant,
  defaultSelection,
  shipTime,
  formatTRY,
  productUrl,
  addToCartUrl,
} from './catalog.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const img = (url, w) => `${url}?width=${w}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const WHATSAPP = 'https://wa.me/905438985384';
const body = document.body;
const isMobile = () => innerWidth < 860;

// ---------------------------------------------------------------------------
// Ürün yardımcıları
// ---------------------------------------------------------------------------
function priceInfo(p) {
  const avail = p.variants.filter((v) => v[6]);
  const pool = avail.length ? avail : p.variants;
  const v = pool.reduce((a, b) => (b[4] < a[4] ? b : a));
  return { price: v[4], compare: v[5], soldOut: !avail.length, multi: new Set(p.variants.map((x) => x[4])).size > 1 };
}
const discount = (price, compare) => (compare && compare > price ? Math.round((1 - price / compare) * 100) : 0);

// ---------------------------------------------------------------------------
// Ürün ızgarası
// ---------------------------------------------------------------------------
const FILTERS = [
  { id: 'all', label: 'Tümü', test: () => true },
  { id: 'yemek', label: 'Yemek Masaları', test: (p) => /Yemek/.test(p.type) },
  { id: 'calisma', label: 'Çalışma Masaları', test: (p) => p.type === 'Çalışma Masası' },
  { id: 'epoksi', label: 'Epoksi', test: (p) => p.tags.includes('epoksi') },
  { id: 'sehpa', label: 'Sehpalar', test: (p) => p.tags.includes('sehpa') },
  { id: 'hemen', label: 'Hemen Teslim', test: (p) => p.tags.includes('hemen-teslim') || p.tags.includes('hazir-stok') },
];
const ORDER = (p) => (p.tags.includes('cok-satan') ? 0 : 1) + (priceInfo(p).soldOut ? 2 : 0);
let activeFilter = 'all';

function cardHTML(p) {
  const { price, compare, soldOut, multi } = priceInfo(p);
  const d = discount(price, compare);
  const badges = [
    soldOut ? '<span class="badge dark">Tükendi</span>' : '',
    d ? `<span class="badge sale">%${d} indirim</span>` : '',
    p.tags.includes('cok-satan') ? '<span class="badge">Çok satan</span>' : '',
    p.tags.includes('hemen-teslim') ? '<span class="badge">Hemen teslim</span>' : '',
  ].join('');
  return `
  <article class="card">
    <div class="card-media">
      <img src="${img(p.images[0], 640)}" alt="${esc(p.title)}" loading="lazy" data-gallery="${p.handle}" />
      ${p.images[1] ? `<img class="alt" src="${img(p.images[1], 640)}" alt="" loading="lazy" data-gallery="${p.handle}" />` : ''}
      <div class="badges">${badges}</div>
      <button class="card-3d" data-open3d="${p.handle}"><span class="cube"></span>3D'de incele</button>
    </div>
    <div class="card-body">
      <p class="card-type">${esc(p.type)}</p>
      <h3><a href="${productUrl(p.handle)}" target="_blank" rel="noopener">${esc(p.title)}</a></h3>
      <div class="price">${multi ? '<small>başlayan</small>' : ''}<strong>${formatTRY(price)}</strong>${d ? `<s>${formatTRY(compare)}</s>` : ''}</div>
      <p class="ship">${soldOut ? 'Şu an stokta yok' : shipTime(p)}</p>
    </div>
  </article>`;
}

function renderGrid() {
  const f = FILTERS.find((x) => x.id === activeFilter);
  const list = PRODUCT_LIST.filter(f.test).sort((a, b) => ORDER(a) - ORDER(b));
  $('#grid').innerHTML = list.map(cardHTML).join('');
  $$('#filters button').forEach((b) => b.classList.toggle('on', b.dataset.f === activeFilter));
}

function setFilter(id, scroll) {
  activeFilter = id;
  renderGrid();
  if (scroll) $('#urunler').scrollIntoView({ behavior: 'smooth' });
}

$('#filters').innerHTML = FILTERS.map(
  (f) => `<button data-f="${f.id}" role="tab">${f.label} <span>${PRODUCT_LIST.filter(f.test).length}</span></button>`
).join('');
$('#filters').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) setFilter(b.dataset.f);
});

const COLLECTIONS = [
  { f: 'epoksi', title: 'Epoksi Masalar', img: PRODUCTS['ocean-river-dogal-kenarli-ceviz-ahsap-epoksi-masa-mavi'].images[0] },
  { f: 'yemek', title: 'Yemek Masaları', img: PRODUCTS['ceviz-kutuk-yemek-masasi-dogal-kenarli'].images[0] },
  { f: 'calisma', title: 'Çalışma Masaları', img: PRODUCTS['linak-yukseklik-ayarli-masif-mese-calisma-masasi'].images[0] },
  { f: 'sehpa', title: 'Orta ve Yan Sehpalar', img: PRODUCTS['masif-ahsap-mavi-epoksi-orta-sehpa'].images[0] },
];
$('#collections').innerHTML = COLLECTIONS.map(
  (c) => `<button class="collection" data-filter="${c.f}">
    <img src="${img(c.img, 700)}" alt="" loading="lazy" />
    <span>${c.title} <i>→</i></span>
  </button>`
).join('');
renderGrid();

document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-filter]');
  if (f) {
    e.preventDefault();
    setFilter(f.dataset.filter, true);
    body.classList.remove('menu-open');
  }
  const gal = e.target.closest('[data-gallery]');
  if (gal) openLightbox(PRODUCTS[gal.dataset.gallery], 0);
  const o = e.target.closest('[data-open3d]');
  if (o) openInShowroom(o.dataset.open3d);
  if (e.target.closest('[data-action="enter"]')) {
    body.classList.remove('menu-open');
    enterShowroom();
  }
});
$('#menuBtn').addEventListener('click', () => body.classList.toggle('menu-open'));

// ---------------------------------------------------------------------------
// Showroom durumu
// ---------------------------------------------------------------------------
const bayState = STATIONS.map((st) => {
  const handle = st.products[0];
  return { handle, selected: defaultSelection(PRODUCTS[handle], st.preset), height: null };
});

function bayConfig(i) {
  const s = bayState[i];
  const p = PRODUCTS[s.handle];
  const visual = resolveVisual(s.handle, s.selected);
  const dims = resolveDims(p, s.selected, visual);
  if (visual.model === 'linak') dims.H = s.height || 0.74;
  return { visual, dims };
}

function hasWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

/** WebGL2 olmayan tarayıcılarda site normal çalışsın diye boş motor. */
class NoEngine extends EventTarget {
  state = 'none';
  walk = { z: 0, yaw: 0 };
  bays = [];
  inspecting = -1;
  scrollProgress = 0;
  paused = true;
  async build() {
    throw new Error('WebGL2 desteklenmiyor');
  }
  enter() {}
  exit() {}
  inspect() {}
  uninspect() {}
  goToBay() {}
  setBay() {}
  shiftView() {}
  project() {
    return { visible: false, dist: 99, x: 0, y: 0 };
  }
}

let engine;
try {
  if (!hasWebGL2()) throw new Error('webgl2');
  engine = new ShowroomEngine($('#scene'));
} catch (err) {
  console.warn('3D devre dışı:', err);
  engine = new NoEngine();
}
if (import.meta.env.DEV) window.__hwc = { engine, bayState, open: (h) => openInShowroom(h) };
const loaderBar = $('#loaderBar');

engine.addEventListener('state', (e) => {
  body.dataset.state = e.detail;
});

async function boot() {
  await engine.build(
    STATIONS,
    STATIONS.map((_, i) => bayConfig(i)),
    (p) => (loaderBar.style.width = `${Math.round(p * 100)}%`)
  );
  body.dataset.state = 'landing';
  $('#loader').classList.add('done');
  setTimeout(() => $('#loader').remove(), 900);
  if (location.hash === '#showroom') enterShowroom();
}

// ---------------------------------------------------------------------------
// Giriş / çıkış
// ---------------------------------------------------------------------------
async function enterShowroom() {
  if (engine.state !== 'landing') return;
  scrollTo({ top: 0, behavior: 'instant' });
  body.classList.add('immersive');
  history.replaceState(null, '', '#showroom');
  await engine.enter();
  showHint();
}

async function exitShowroom() {
  closePanel(false);
  history.replaceState(null, '', location.pathname);
  await engine.exit();
  body.classList.remove('immersive');
}
$('#exitBtn').addEventListener('click', exitShowroom);

async function openInShowroom(handle) {
  const station = STATION_OF[handle];
  const i = STATIONS.findIndex((s) => s.id === station);
  if (i < 0) return;
  if (bayState[i].handle !== handle) {
    const prev = bayState[i].selected;
    bayState[i].handle = handle;
    bayState[i].selected = defaultSelection(PRODUCTS[handle], prev);
    applyBay(i, true);
  }
  if (engine.state === 'landing') await enterShowroom();
  engine.inspect(i);
}

addEventListener('keydown', (e) => {
  if (lb.open) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lbStep(-1);
    if (e.key === 'ArrowRight') lbStep(1);
    e.stopImmediatePropagation();
    return;
  }
  if (e.key === 'Escape') {
    if (engine.state === 'inspect') engine.uninspect();
    else if (engine.state === 'walk') exitShowroom();
  }
});

// ---------------------------------------------------------------------------
// Ray (sergi alanları listesi) ve etiketler
// ---------------------------------------------------------------------------
const stationMin = (st) => Math.min(...st.products.map((h) => priceInfo(PRODUCTS[h]).price));

$('#rail').innerHTML = STATIONS.map(
  (st, i) => `<button data-bay="${i}"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${st.title}</span></button>`
).join('');
$('#rail').addEventListener('click', (e) => {
  const b = e.target.closest('[data-bay]');
  if (!b) return;
  const i = +b.dataset.bay;
  if (engine.state === 'inspect') engine.inspect(i);
  else engine.goToBay(i);
});

const labels = STATIONS.map((st, i) => {
  const el = document.createElement('button');
  el.className = 'tag';
  el.innerHTML = `<span class="tag-k">${st.kicker}</span><strong>${st.title}</strong><span class="tag-p">${formatTRY(stationMin(st))}'den başlayan</span><em>İncelemek için tıkla</em>`;
  el.addEventListener('click', () => engine.inspect(i));
  $('#labels').appendChild(el);
  return el;
});

engine.addEventListener('hover', (e) => labels.forEach((l, i) => l.classList.toggle('hot', i === e.detail)));

let lastNear = -1;
engine.addEventListener('frame', () => {
  const st = engine.state;
  const show = st === 'walk';
  for (let i = 0; i < labels.length; i++) {
    const el = labels[i];
    if (!show) {
      el.style.opacity = 0;
      el.style.pointerEvents = 'none';
      continue;
    }
    const p = engine.project(i);
    const o = p.visible ? Math.max(0, Math.min(1, (12 - p.dist) / 4)) : 0;
    el.style.opacity = o.toFixed(2);
    el.style.pointerEvents = o > 0.4 ? 'auto' : 'none';
    el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -100%) scale(${(0.75 + 0.25 * o).toFixed(3)})`;
  }
  if (show || st === 'inspect') {
    let near = engine.inspecting >= 0 && st === 'inspect' ? engine.inspecting : -1;
    if (near < 0) {
      const z = engine.walk.z;
      let best = 99;
      engine.bays.forEach((b, i) => {
        const d = Math.abs(b.z + 1.3 - z) + (Math.sign(b.x) === Math.sign(-Math.sin(engine.walk.yaw)) ? 0 : 0.5);
        if (d < best) {
          best = d;
          near = i;
        }
      });
    }
    if (near !== lastNear) {
      lastNear = near;
      $$('#rail button').forEach((b) => b.classList.toggle('on', +b.dataset.bay === near));
    }
  }
});

let hintTimer;
function showHint() {
  const h = $('#hint');
  h.classList.add('show');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => h.classList.remove('show'), 7000);
}

// ---------------------------------------------------------------------------
// İnceleme paneli
// ---------------------------------------------------------------------------
const panel = $('#panel');
let panelBay = -1;

function epoxySwatch(label) {
  const key = { 'Transparan Siyah': 'transSiyah', Siyah: 'siyah', Şeffaf: 'seffaf', 'Koyu Yeşil': 'koyuYesil', 'Okyanus Mavisi': 'okyanus' }[label];
  const e = EPOXY[key];
  if (!e) return '';
  const c = (a) => `rgb(${a.join(',')})`;
  return `background: radial-gradient(circle at 35% 30%, ${c(e.shore)}, ${c(e.deep)} 75%)`;
}

function optionHTML(o, value) {
  const isColor = o.name === 'Epoksi Rengi';
  const single = o.values.length === 1;
  return `<div class="opt">
    <div class="opt-label">${esc(o.name)} <span>${esc(value)}</span></div>
    <div class="chips ${isColor ? 'colors' : ''}">${o.values
      .map((val) =>
        isColor
          ? `<button class="color ${val === value ? 'on' : ''}" data-opt="${esc(o.name)}" data-val="${esc(val)}" title="${esc(val)}" style="${epoxySwatch(val)}"><span class="sr">${esc(val)}</span></button>`
          : `<button class="chip ${val === value ? 'on' : ''}" ${single ? 'disabled' : ''} data-opt="${esc(o.name)}" data-val="${esc(val)}">${esc(val)}</button>`
      )
      .join('')}</div>
  </div>`;
}

function renderPanel(i) {
  const st = STATIONS[i];
  const s = bayState[i];
  const p = PRODUCTS[s.handle];
  const v = findVariant(p, s.selected);
  const d = discount(v[4], v[5]);
  const isLinak = p.tags.includes('linak');
  const h = Math.round((s.height || 0.74) * 100);
  const optText = p.options.map((o) => s.selected[o.name]).join(' / ');
  const wa = `${WHATSAPP}?text=${encodeURIComponent(`Merhaba, 3D showroom'da "${p.title}" (${optText}) modelini inceledim. Bilgi alabilir miyim?`)}`;

  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <p class="kicker">${String(i + 1).padStart(2, '0')} · ${esc(st.title)}</p>
        <h2>${esc(p.title)}</h2>
      </div>
      <button class="close" data-close aria-label="Kapat">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </div>
    <div class="panel-scroll">
      <div class="price-row">
        <strong>${formatTRY(v[4])}</strong>
        ${d ? `<s>${formatTRY(v[5])}</s><span class="badge sale">%${d} indirim</span>` : ''}
      </div>
      <p class="ship ${v[6] ? '' : 'out'}">${v[6] ? shipTime(p) : 'Bu seçenek şu an stokta yok'}</p>
      ${
        st.products.length > 1
          ? `<div class="opt">
              <div class="opt-label">Model ve desen <span>${esc(SHORT[s.handle])}</span></div>
              <div class="models">${st.products
                .map(
                  (hd) => `<button class="model ${hd === s.handle ? 'on' : ''}" data-model="${hd}">
                    <img src="${img(PRODUCTS[hd].images[0], 200)}" alt="" />
                    <span>${esc(SHORT[hd])}</span>
                  </button>`
                )
                .join('')}</div>
            </div>`
          : ''
      }
      ${p.options.map((o) => optionHTML(o, s.selected[o.name])).join('')}
      ${
        isLinak
          ? `<div class="opt">
              <div class="opt-label">Yükseklik <span id="hVal">${h} cm</span></div>
              <input type="range" id="hRange" min="65" max="125" value="${h}" aria-label="Masa yüksekliği" />
              <div class="chips"><button class="chip" data-height="74">Oturarak · 74 cm</button><button class="chip" data-height="112">Ayakta · 112 cm</button></div>
            </div>`
          : ''
      }
      <p class="desc">${esc(p.desc)}</p>
      <div class="photos-label">Gerçek ürün fotoğrafları</div>
      <div class="photos">${p.images.map((u, k) => `<button data-photo="${k}" aria-label="Fotoğraf ${k + 1}"><img src="${img(u, 260)}" alt="" loading="lazy" /></button>`).join('')}</div>
      <p class="note">3D görünüm temsilîdir; masif ahşabın damar ve tonu her üründe farklıdır.</p>
    </div>
    <div class="panel-foot">
      <a class="btn btn-dark ${v[6] ? '' : 'disabled'}" href="${v[6] ? addToCartUrl(v[0]) : '#'}" target="_blank" rel="noopener">Sepete ekle · ${formatTRY(v[4])}</a>
      <div class="foot-row">
        <a class="btn btn-outline" href="${productUrl(p.handle, v[0])}" target="_blank" rel="noopener">Ürün sayfası</a>
        <a class="btn btn-outline" href="${wa}" target="_blank" rel="noopener">WhatsApp'tan sor</a>
      </div>
      <div class="panel-nav">
        <button data-step="-1">← ${esc(STATIONS[(i + STATIONS.length - 1) % STATIONS.length].title)}</button>
        <button data-step="1">${esc(STATIONS[(i + 1) % STATIONS.length].title)} →</button>
      </div>
    </div>`;
  const r = $('#hRange', panel);
  if (r) {
    r.addEventListener('input', () => {
      bayState[i].height = +r.value / 100;
      $('#hVal', panel).textContent = `${r.value} cm`;
      applyBay(i, true);
    });
  }
}

function applyBay(i, immediate = false) {
  const run = () => {
    const c = bayConfig(i);
    engine.setBay(i, c.visual, c.dims);
    panel.classList.remove('busy');
  };
  if (immediate) return run();
  panel.classList.add('busy');
  requestAnimationFrame(() => setTimeout(run, 30));
}

function animateHeight(i, to) {
  const from = bayState[i].height || 0.74;
  const t0 = performance.now();
  const dur = Math.abs(to - from) * 3000 + 300;
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    bayState[i].height = from + (to - from) * e;
    applyBay(i, true);
    const r = $('#hRange', panel);
    if (r) {
      r.value = Math.round(bayState[i].height * 100);
      $('#hVal', panel).textContent = `${r.value} cm`;
    }
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

panel.addEventListener('click', (e) => {
  const i = panelBay;
  if (i < 0) return;
  const s = bayState[i];
  if (e.target.closest('[data-close]')) return engine.uninspect();
  const step = e.target.closest('[data-step]');
  if (step) return engine.inspect((i + +step.dataset.step + STATIONS.length) % STATIONS.length);
  const m = e.target.closest('[data-model]');
  if (m && m.dataset.model !== s.handle) {
    s.selected = defaultSelection(PRODUCTS[m.dataset.model], s.selected);
    s.handle = m.dataset.model;
    applyBay(i);
    renderPanel(i);
    return;
  }
  const o = e.target.closest('[data-opt]');
  if (o && !o.disabled) {
    s.selected[o.dataset.opt] = o.dataset.val;
    applyBay(i);
    renderPanel(i);
    return;
  }
  const ph = e.target.closest('[data-photo]');
  if (ph) return openLightbox(PRODUCTS[s.handle], +ph.dataset.photo);
  const h = e.target.closest('[data-height]');
  if (h) animateHeight(i, +h.dataset.height / 100);
  if (e.target.closest('.disabled')) e.preventDefault();
});

function openPanel(i) {
  panelBay = i;
  renderPanel(i);
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  panel.querySelector('.panel-scroll').scrollTop = 0;
  if (isMobile()) engine.shiftView(0, innerHeight * 0.2);
  else engine.shiftView(Math.min(440, innerWidth * 0.36) / 2, 0);
}

function closePanel(animate = true) {
  panelBay = -1;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  engine.shiftView(0, 0, animate ? 0.8 : 0.01);
}

engine.addEventListener('inspect', (e) => {
  if (e.detail >= 0) openPanel(e.detail);
  else closePanel();
});

// ---------------------------------------------------------------------------
// Fotoğraf galerisi (sayfadan çıkmadan)
// ---------------------------------------------------------------------------
const lbEl = $('#lightbox');
const lb = { open: false, images: [], i: 0 };

function lbRender() {
  const u = lb.images[lb.i];
  const im = $('#lbImg');
  im.classList.add('loading');
  im.onload = () => im.classList.remove('loading');
  im.src = img(u, 1600);
  $('#lbCount').textContent = `${lb.i + 1} / ${lb.images.length}`;
  $$('#lbThumbs button').forEach((b, k) => b.classList.toggle('on', k === lb.i));
  lb.images.forEach((x, k) => {
    if (Math.abs(k - lb.i) === 1) new Image().src = img(x, 1600);
  });
}

function openLightbox(product, index = 0) {
  lb.open = true;
  lb.images = product.images;
  lb.i = index;
  $('#lbTitle').textContent = product.title;
  $('#lbThumbs').innerHTML = lb.images
    .map((u, k) => `<button data-lbi="${k}" aria-label="Fotoğraf ${k + 1}"><img src="${img(u, 160)}" alt="" /></button>`)
    .join('');
  lbEl.classList.add('open');
  lbEl.setAttribute('aria-hidden', 'false');
  body.classList.add('lb-open');
  lbRender();
}

function closeLightbox() {
  lb.open = false;
  lbEl.classList.remove('open');
  lbEl.setAttribute('aria-hidden', 'true');
  body.classList.remove('lb-open');
}

function lbStep(d) {
  lb.i = (lb.i + d + lb.images.length) % lb.images.length;
  lbRender();
}

lbEl.addEventListener('click', (e) => {
  const a = e.target.closest('[data-lb]');
  const t = e.target.closest('[data-lbi]');
  if (a) {
    if (a.dataset.lb === 'close') closeLightbox();
    else lbStep(a.dataset.lb === 'next' ? 1 : -1);
  } else if (t) {
    lb.i = +t.dataset.lbi;
    lbRender();
  } else if (e.target === lbEl || e.target.classList.contains('lb-stage')) closeLightbox();
});

let swipeX = null;
lbEl.addEventListener('touchstart', (e) => (swipeX = e.touches[0].clientX), { passive: true });
lbEl.addEventListener('touchend', (e) => {
  if (swipeX == null) return;
  const dx = e.changedTouches[0].clientX - swipeX;
  if (Math.abs(dx) > 40) lbStep(dx < 0 ? 1 : -1);
  swipeX = null;
});

// ---------------------------------------------------------------------------
// Sayfa kaydırma → vitrin kamerası
// ---------------------------------------------------------------------------
const topbar = $('#topbar');
addEventListener(
  'scroll',
  () => {
    const s = Math.min(1, scrollY / innerHeight);
    engine.scrollProgress = s;
    topbar.classList.toggle('solid', scrollY > innerHeight * 0.75);
    $('#scene').style.opacity = body.classList.contains('immersive') ? 1 : String(1 - s * 0.6);
    // hero'nun altına inildiğinde sahne görünmez: çizimi durdur
    engine.paused = !body.classList.contains('immersive') && scrollY > innerHeight * 1.15;
  },
  { passive: true }
);

boot().catch((err) => {
  console.error(err);
  $('#loaderMsg').textContent = '3D showroom bu cihazda açılamadı. Ürünleri aşağıda inceleyebilirsiniz.';
  setTimeout(() => $('#loader').classList.add('done'), 1800);
  body.classList.add('no-3d');
});
