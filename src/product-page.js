// Ürün detay sayfası — hwcfurniture.com ürün sayfasına göre
import PAGES from './data/product-pages.json';
import { PRODUCTS, STATION_OF, defaultSelection, findVariant, formatTRY } from './catalog.js';
import { EPOXY } from './three/textures.js';
import { addToCart, checkoutUrl } from './cart.js';
import { cardHTML, COLL_BY, TYPE_TO_COLLECTION } from './collection.js';
import { $, $$, img, esc, WHATSAPP } from './util.js';

const pdp = { handle: null, sel: {}, qty: 1 };
let deps = {};

const STAR = '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z"/></svg>';
const stars = (n = 5) => `<span class="stars" aria-label="${n} yıldız">${STAR.repeat(Math.round(n))}</span>`;
const CHEV = '<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="m2.5 4.5 3.5 3.5 3.5-3.5"/></svg>';

function epoxySwatch(label) {
  const key = { 'Transparan Siyah': 'transSiyah', Siyah: 'siyah', Şeffaf: 'seffaf', 'Koyu Yeşil': 'koyuYesil', 'Okyanus Mavisi': 'okyanus' }[label];
  const e = EPOXY[key];
  if (!e) return '';
  const c = (a) => `rgb(${a.join(',')})`;
  return `background: radial-gradient(circle at 35% 30%, ${c(e.shore)}, ${c(e.deep)} 75%)`;
}

const fmtDate = (s) => {
  const d = new Date(String(s).replace(' UTC', 'Z').replace(' ', 'T'));
  return isNaN(d) ? '' : new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
};

function optionHTML(p, o, extra) {
  const val = pdp.sel[o.name];
  const swatches = extra.swatches || {};
  const isSwatch = o.values.some((v) => swatches[v]) || o.name === 'Epoksi Rengi';
  if (isSwatch) {
    return `<fieldset class="vopt">
      <legend>${esc(o.name)}<span class="vopt-val">${esc(val)}</span></legend>
      <div class="vswatches">${o.values
        .map((v) => {
          const bg = swatches[v] ? `background-image:url('${img(swatches[v], 120)}')` : epoxySwatch(v);
          return `<button class="vswatch ${v === val ? 'on' : ''}" data-popt="${esc(o.name)}" data-val="${esc(v)}" title="${esc(v)}" aria-label="${esc(v)}" style="${bg}"></button>`;
        })
        .join('')}</div>
    </fieldset>`;
  }
  return `<fieldset class="vopt">
    <legend>${esc(o.name)}</legend>
    <div class="vpills">${o.values
      .map((v) => {
        const sel = { ...pdp.sel, [o.name]: v };
        const avail = findVariant(p, sel)[6];
        return `<button class="vpill ${v === val ? 'on' : ''} ${avail ? '' : 'na'}" data-popt="${esc(o.name)}" data-val="${esc(v)}">${esc(v)}</button>`;
      })
      .join('')}</div>
  </fieldset>`;
}

function reviewsHTML(p, extra) {
  const r = extra.rating;
  const list = extra.reviews || [];
  if (!r || !r.count) return '';
  const lower = [4, 3, 2, 1].map((n) => ({ n, c: list.filter((x) => x.rating === n).length }));
  const dist = [{ n: 5, c: Math.max(0, r.count - lower.reduce((s, x) => s + x.c, 0)) }, ...lower];
  return `<section class="reviews-pdp" id="degerlendirmeler">
    <h2>Müşteri Değerlendirmeleri</h2>
    <div class="rv-summary">
      <div class="rv-score"><strong>${r.avg.toFixed(1)}</strong>${stars(r.avg)}<span>${r.count} değerlendirme</span></div>
      <div class="rv-bars">${dist
        .map(({ n, c }) => {
          const count = c;
          return `<div class="rv-bar"><span>${n} ${STAR}</span><i><b style="width:${r.count ? Math.min(100, (count / r.count) * 100) : 0}%"></b></i><em>${count}</em></div>`;
        })
        .join('')}</div>
      <a class="btn btn-outline" href="${WHATSAPP}?text=${encodeURIComponent(`Merhaba, "${p.title}" için değerlendirme yazmak istiyorum.`)}" target="_blank" rel="noopener">Değerlendirme yazın</a>
    </div>
    <div class="rv-list">${list
      .map(
        (x) => `<article class="rv">
          <header>${stars(x.rating)}<span class="rv-date">${fmtDate(x.date)}</span></header>
          <p class="rv-name">${esc(x.name)}${x.verified ? ' <span class="rv-ver">Doğrulanmış</span>' : ''}</p>
          ${x.title ? `<h3>${esc(x.title)}</h3>` : ''}
          <p>${esc(x.body)}</p>
        </article>`
      )
      .join('')}</div>
  </section>`;
}

export function renderProduct(handle) {
  const p = PRODUCTS[handle];
  if (!p) {
    $('#pdp').innerHTML = `<div class="notfound"><h1>Ürün bulunamadı</h1><p>Aradığınız ürün kaldırılmış olabilir.</p><a class="btn btn-dark" href="/collections/tum-masalar">Tüm ürünler</a></div>`;
    return 'Ürün bulunamadı';
  }
  const extra = PAGES[handle] || {};
  if (pdp.handle !== handle) {
    pdp.handle = handle;
    // Shopify gibi: stoktaki ilk varyant seçili gelir
    const first = p.variants.find((x) => x[6]) || p.variants[0];
    pdp.sel = Object.fromEntries(p.options.map((o, k) => [o.name, first[k + 1]]));
    pdp.qty = 1;
  }
  const v = findVariant(p, pdp.sel);
  const images = extra.images?.length ? extra.images : p.images;
  const has3d = !!STATION_OF[handle];
  const collSlug = TYPE_TO_COLLECTION[p.type] || 'tum-masalar';
  const related = (COLL_BY[collSlug]?.products || []).filter((h) => h !== handle).slice(0, 4).map((h) => PRODUCTS[h]);
  const r = extra.rating;
  const prod = extra.production;
  const custom = extra.customCta;
  const customHref = `/pages/ozel-uretim-siparisleri?urun=${encodeURIComponent(p.title)}&handle=${p.handle}`;

  $('#pdp').innerHTML = `
    <div class="pdp2">
      <div class="pdp2-gallery">${images
        .map((u, k) => `<button class="pdp2-img" data-zoom="${k}" aria-label="Fotoğraf ${k + 1}, büyüt"><img src="${img(u, 900)}" alt="${k ? '' : esc(p.title)}" ${k > 1 ? 'loading="lazy"' : ''} /></button>`)
        .join('')}</div>
      <div class="pdp2-mobile-gallery" aria-hidden="true">${images
        .map((u, k) => `<button class="pdp2-slide" data-zoom="${k}"><img src="${img(u, 900)}" alt="" loading="lazy" /></button>`)
        .join('')}</div>
      <div class="pdp2-info">
        ${r && r.count ? `<a class="pdp2-rating" href="#degerlendirmeler">${stars(r.avg)}<span>${r.count} değerlendirme</span></a>` : ''}
        <h1>${esc(p.title)}</h1>
        <p class="pdp2-price"><span>${formatTRY(v[4])}</span>${v[5] && v[5] > v[4] ? `<s>${formatTRY(v[5])}</s>` : ''}</p>
        <p class="hwc-taksit"><span class="hwc-taksit__amount">3 × ${formatTRY(Math.round((v[4] / 3) * 100) / 100)}</span><span class="hwc-taksit__sep">·</span><span class="hwc-taksit__note">Vade Farksız 3 Taksit</span></p>
        <p class="pdp2-tax">Vergiler dahildir. Ücretsiz kargo.</p>
        <hr />
        ${p.options.map((o) => optionHTML(p, o, extra)).join('')}
        ${custom ? `<div class="hwc-custom-size-cta">
          <div class="hwc-custom-size-cta__copy"><strong>${esc(custom.title)}</strong><span>${esc(custom.text)}</span></div>
          <a class="btn-secondary hwc-custom-size-cta__button" href="${customHref}">Özel ölçü yaptırmak istiyorum</a>
        </div>` : ''}
        <div class="pdp2-buy">
          <div class="pdp2-qty"><button data-pq="-1" aria-label="Adedi azalt">−</button><span>${pdp.qty}</span><button data-pq="1" aria-label="Adedi artır">+</button></div>
          <button class="btn-primary" data-add ${v[6] ? '' : 'disabled'}>${v[6] ? 'Sepete ekle' : 'Tükendi'}</button>
        </div>
        ${v[6] ? `<a class="btn-primary wide" href="${checkoutUrl([{ id: v[0], qty: pdp.qty }])}">Hemen satın alın</a>` : ''}
        ${prod ? `<div class="hwc-uretim hwc-uretim--sayfa ${prod.ready ? 'hwc-uretim--hazir' : ''}">
          <p class="hwc-uretim__ana"><span class="hwc-uretim__nokta" aria-hidden="true"></span>${esc(prod.main)}</p>
          ${prod.lines.map((l) => `<p class="hwc-uretim__alt">${l.split(' • ').map((x) => `<span>${esc(x)}</span>`).join('<span class="hwc-uretim__ayrac" aria-hidden="true">•</span>')}</p>`).join('')}
        </div>` : ''}
        ${has3d ? `<button class="btn-secondary wide pdp2-3d" data-open3d="${handle}">3D showroom'da incele</button>` : ''}
        <div class="pdp2-desc">${(extra.desc || [p.desc]).map((d) => `<p>${esc(d)}</p>`).join('')}</div>
        <div class="pdp2-acc">${(extra.accordions || [])
          .map(
            (a) => `<details><summary>${esc(a.title)}${CHEV}</summary>${
              a.items.length ? `<ul>${a.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : a.paras.map((x) => `<p>${esc(x)}</p>`).join('')
            }</details>`
          )
          .join('')}</div>
      </div>
    </div>
    ${related.length ? `<section class="pdp2-related"><h2>Bunlar da ilginizi çekebilir</h2><div class="pgrid four">${related.map(cardHTML).join('')}</div></section>` : ''}
    ${reviewsHTML(p, extra)}
  `;
  document.title = extra.metaTitle || `${p.title} | HWC`;
  return p.title;
}

export function initProductPage(d) {
  deps = d;
  $('#pdp').addEventListener('click', (e) => {
    const p = PRODUCTS[pdp.handle];
    if (!p) return;
    const z = e.target.closest('[data-zoom]');
    if (z) {
      const extra = PAGES[p.handle] || {};
      return deps.openLightbox?.({ ...p, images: extra.images?.length ? extra.images : p.images }, +z.dataset.zoom);
    }
    const o = e.target.closest('[data-popt]');
    if (o) {
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

export const productImages = (handle) => (PAGES[handle]?.images?.length ? PAGES[handle].images : PRODUCTS[handle]?.images || []);
