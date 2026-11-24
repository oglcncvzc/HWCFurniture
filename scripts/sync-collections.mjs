// hwcfurniture.com koleksiyonlarını src/data/collections.json dosyasına çeker:
// başlık, açıklama, ürün sırası, ek içerik bölümleri ve SSS.
// Kullanım: npm run sync:collections
import { writeFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';

const STORE = 'https://hwcfurniture.com';
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh) HWC-Sync', 'Accept-Language': 'tr-TR,tr' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s = '') => s.replace(/\s+/g, ' ').trim();

async function get(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return res;
    if (res.status === 429) {
      await sleep(4000 * (i + 1));
      continue;
    }
    throw new Error(`${url} → ${res.status}`);
  }
  throw new Error(`${url} → 429 (çok fazla istek). Birkaç dakika sonra tekrar deneyin.`);
}

// Koleksiyon içindeki ürün/sayfa bağlantılarını yeni sitenin adreslerine çevir
const link = (href = '') => {
  const p = href.replace(/^https?:\/\/(www\.)?hwcfurniture\.com/, '').replace(/^\/en(?=\/)/, '');
  if (/^\/(collections|products|pages|blogs)\//.test(p)) return p.split('?')[0];
  return href;
};

const { collections } = await (await get(`${STORE}/collections.json?limit=250`)).json();
const out = [];
for (const c of collections) {
  const html = await (await get(`${STORE}/collections/${c.handle}`)).text();
  const { document } = parseHTML(html);
  const main = document.querySelector('main');
  const h1 = main.querySelector('h1');
  const headSec = h1 && h1.closest('.shopify-section');
  const desc = headSec
    ? [...headSec.querySelectorAll('p')].map((p) => clean(p.textContent)).filter((t) => t.length > 40)
    : [];

  // ürün sırası: sayfadaki ürün kartlarından
  const products = [];
  for (const a of main.querySelectorAll('product-card a[href*="/products/"], .product-card a[href*="/products/"]')) {
    const h = a.getAttribute('href').split('/products/')[1]?.split(/[?#/]/)[0];
    if (h && !products.includes(h)) products.push(h);
  }

  // ızgaradan sonraki içerik bölümleri (rehber metni, tablo) ve SSS
  const sections = [];
  const faq = [];
  for (const sec of main.querySelectorAll('.shopify-section')) {
    if (sec === headSec || sec.querySelector('product-card')) continue;
    for (const d of sec.querySelectorAll('details')) {
      const q = clean(d.querySelector('summary')?.textContent);
      const a = clean([...d.children].filter((x) => x.tagName !== 'SUMMARY').map((x) => x.textContent).join(' '));
      if (q && a && !/^(Stok Durumu|Fiyat|Sırala)/.test(q)) faq.push({ q, a });
    }
    const blocks = [];
    for (const el of sec.querySelectorAll('h2, h3, p, li, table')) {
      if (el.closest('details') || el.closest('product-card') || el.closest('form')) continue;
      if (/^(Sık sorulan sorular|Merak edilenler|Etkin filtreler|Filtrele)/i.test(clean(el.textContent))) continue;
      if (el.closest('table') && el.tagName !== 'TABLE') continue;
      if (el.tagName === 'TABLE') {
        const rows = [...el.querySelectorAll('tr')].map((tr) => [...tr.children].map((td) => clean(td.textContent)));
        if (rows.length) blocks.push({ t: 'table', rows });
        continue;
      }
      if (el.tagName === 'P' && el.closest('li')) continue;
      const text = clean(el.textContent);
      if (!text || /^(\.|@media|\{)/.test(text)) continue;
      const a = el.tagName === 'P' && el.children.length === 1 && el.querySelector('a') ? el.querySelector('a') : null;
      blocks.push({ t: el.tagName.toLowerCase(), text, ...(a ? { href: link(a.getAttribute('href')) } : {}) });
    }
    const img = sec.querySelector('img');
    if (blocks.length) sections.push({ blocks, image: img ? (img.getAttribute('src') || '').replace(/^\/\//, 'https://').split('?')[0] : '' });
  }

  out.push({
    handle: c.handle,
    title: c.title,
    h1: clean(h1?.textContent) || c.title,
    desc,
    metaTitle: clean(document.querySelector('title')?.textContent),
    metaDesc: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    image: c.image ? c.image.src.split('?')[0] : '',
    products,
    sections,
    faq,
  });
  console.log(`  ${c.handle}: ${products.length} ürün, ${sections.length} bölüm, ${faq.length} soru`);
  await sleep(600);
}

await writeFile(new URL('../src/data/collections.json', import.meta.url), JSON.stringify(out));
console.log(`${out.length} koleksiyon yazıldı → src/data/collections.json`);
