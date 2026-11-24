// hwcfurniture.com ürün sayfalarından ürüne özel içeriği src/data/product-pages.json'a çeker:
// tüm görseller, açıklama, açılır bölümler, renk örnekleri, üretim satırları, Judge.me puanı/yorumları.
// Kullanım: npm run sync:product-pages
import { readFile, writeFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';

const STORE = 'https://hwcfurniture.com';
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh) HWC-Sync', 'Accept-Language': 'tr-TR,tr' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s = '') => s.replace(/\s+/g, ' ').trim();
const abs = (u = '') => u.replace(/^\/\//, 'https://').split('?')[0];

async function get(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return res.text();
    if (res.status === 429) {
      await sleep(5000 * (i + 1));
      continue;
    }
    throw new Error(`${url} → ${res.status}`);
  }
  throw new Error(`${url} → 429`);
}

const products = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url), 'utf8'));
const out = {};
for (const p of products) {
  const html = await get(`${STORE}/products/${p.handle}`);
  const { document } = parseHTML(html);
  const main = document.querySelector('main');
  const mainSec = main.querySelector('.shopify-section');

  // görseller: galerideki ürün görselleri (sıra korunur)
  const images = [];
  for (const im of mainSec.querySelectorAll('media-gallery img, .product-media img, [class*="media-gallery"] img')) {
    const src = abs(im.getAttribute('src') || '');
    if (src.includes('/cdn/shop/files/') && !images.includes(src)) images.push(src);
  }

  // açılır bölümler
  const accordions = [...mainSec.querySelectorAll('details')]
    .map((d) => {
      const title = clean(d.querySelector('summary')?.textContent);
      const items = [...d.querySelectorAll('li')].map((li) => clean(li.textContent)).filter(Boolean);
      const paras = items.length ? [] : [...d.querySelectorAll('p')].map((x) => clean(x.textContent)).filter(Boolean);
      return { title, items, paras };
    })
    .filter((a) => a.title && (a.items.length || a.paras.length));

  // açıklama: ürün bilgisi alanındaki, açılır bölümlerin dışındaki paragraflar
  const descEl = mainSec.querySelector('.product-details .rte, .rte, [class*="product__description"]');
  let desc = [];
  if (descEl) desc = [...descEl.querySelectorAll('p')].map((x) => clean(x.textContent)).filter((t) => t.length > 20);
  if (!desc.length) desc = [clean(p.desc)];

  // renk örnekleri (swatch)
  const swatches = {};
  for (const lab of mainSec.querySelectorAll('.variant-option__button-label--has-swatch')) {
    const val = lab.querySelector('input')?.getAttribute('value');
    const m = (lab.innerHTML.match(/--swatch-background:\s*url\(([^)]+)\)/) || [])[1];
    if (val && m) swatches[val] = abs(m.replace(/&amp;/g, '&'));
  }

  // üretim satırları
  const uretim = mainSec.querySelector('.hwc-uretim--sayfa');
  const production = uretim
    ? {
        main: clean(uretim.querySelector('.hwc-uretim__ana')?.textContent),
        ready: uretim.className.includes('hazir'),
        lines: [...uretim.querySelectorAll('.hwc-uretim__alt')].map((x) => [...x.querySelectorAll('span:not(.hwc-uretim__ayrac)')].map((s) => clean(s.textContent)).filter(Boolean).join(' • ') || clean(x.textContent)),
      }
    : null;

  // Judge.me
  const badge = main.querySelector('.jdgm-prev-badge');
  const rating = badge ? { avg: +(badge.getAttribute('data-average-rating') || 0), count: +(badge.getAttribute('data-number-of-reviews') || 0) } : null;
  const reviews = [...main.querySelectorAll('.jdgm-rev')].slice(0, 12).map((r) => ({
    name: clean(r.querySelector('.jdgm-rev__author')?.textContent),
    date: r.querySelector('.jdgm-rev__timestamp')?.getAttribute('data-content') || clean(r.querySelector('.jdgm-rev__timestamp')?.textContent),
    rating: +(r.querySelector('.jdgm-rev__rating')?.getAttribute('data-score') || 5),
    title: clean(r.querySelector('.jdgm-rev__title')?.textContent),
    body: clean(r.querySelector('.jdgm-rev__body')?.textContent),
    verified: !!r.querySelector('.jdgm-rev__buyer-badge'),
  })).filter((r) => r.body || r.title);

  const customCta = mainSec.querySelector('.hwc-custom-size-cta')
    ? { title: clean(mainSec.querySelector('.hwc-custom-size-cta strong')?.textContent), text: clean(mainSec.querySelector('.hwc-custom-size-cta__copy span')?.textContent) }
    : null;

  out[p.handle] = {
    metaTitle: clean(document.querySelector('title')?.textContent),
    metaDesc: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    images,
    desc,
    accordions,
    swatches,
    production,
    rating,
    reviews,
    customCta,
  };
  console.log(`  ${p.handle}: ${images.length} görsel, ${accordions.length} bölüm, ${reviews.length} yorum`);
  await sleep(700);
}

await writeFile(new URL('../src/data/product-pages.json', import.meta.url), JSON.stringify(out));
console.log(`${Object.keys(out).length} ürün sayfası yazıldı → src/data/product-pages.json`);
