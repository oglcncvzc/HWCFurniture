// Shopify mağazasındaki ürünleri src/data/products.json dosyasına çeker.
// Kullanım: npm run sync:products
import { writeFile } from 'node:fs/promises';

const STORE = 'https://hwcfurniture.com';
const res = await fetch(`${STORE}/products.json?limit=250`, {
  headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'Accept-Language': 'tr-TR' },
});
if (!res.ok) {
  console.error(`Shopify ${res.status} döndü. Birkaç dakika sonra tekrar deneyin.`);
  process.exit(1);
}
const { products } = await res.json();
const strip = (h = '') => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const out = products.map((p) => ({
  handle: p.handle,
  title: p.title,
  type: p.product_type,
  tags: p.tags,
  options: p.options.map((o) => ({ name: o.name, values: o.values })),
  variants: p.variants.map((v) => [v.id, v.option1, v.option2, v.option3, +v.price, v.compare_at_price ? +v.compare_at_price : null, v.available]),
  images: p.images.slice(0, 4).map((i) => i.src.split('?')[0]),
  desc: strip(p.body_html).slice(0, 420),
}));

await writeFile(new URL('../src/data/products.json', import.meta.url), JSON.stringify(out, null, 0));
console.log(`${out.length} ürün yazıldı → src/data/products.json`);
