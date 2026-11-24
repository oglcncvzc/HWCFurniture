// hwcfurniture.com blogunu (Rehber) src/data/blog.json dosyasına çeker.
// Kullanım: npm run sync:blog
import { writeFile } from 'node:fs/promises';

const STORE = 'https://hwcfurniture.com';
const UA = { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'tr-TR' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const decode = (s = '') =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');
const pick = (s, re) => (s.match(re) || [])[1] || '';
const text = (h) => decode(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// Yazı içindeki bağlantıları yeni sitenin adreslerine çevir
function rewriteHref(href) {
  const m = href.match(/^(?:https?:\/\/(?:www\.)?hwcfurniture\.com)?(\/[^"#?]*)?([?#][^"]*)?$/i);
  if (!m || !m[1]) return href;
  const path = m[1].replace(/^\/en(?=\/)/, '');
  // site adresleri orijinal mağazayla aynı: /products, /collections, /pages, /blogs/rehber
  if (/^\/(products|collections|blogs\/rehber)(\/|$)/.test(path) || path === '/') return path;
  if (/^\/pages\/(about|ozel-uretim-siparisleri|oturma-ve-masa-boyutu-rehberi|faq|contact)$/.test(path)) return path;
  return `${STORE}${path}${m[2] || ''}`;
}

// Basit temizlik: betik, stil, form ve olay özniteliklerini kaldır
function sanitize(html) {
  return html
    .replace(/<(script|style|form|noscript)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(iframe)(?![^>]*(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com))[\s\S]*?<\/iframe>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+style\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"')
    .replace(/<img /gi, '<img loading="lazy" ')
    .replace(/href="([^"]*)"/gi, (_, h) => {
      const n = rewriteHref(h);
      return n.startsWith('http') ? `href="${n}" target="_blank" rel="noopener"` : `href="${n}"`;
    })
    .replace(/src="\/\//gi, 'src="https://')
    .replace(/<p>\s*(&nbsp;)?\s*<\/p>/gi, '')
    .trim();
}

const res = await fetch(`${STORE}/blogs/rehber.atom`, { headers: UA });
if (!res.ok) {
  console.error(`Atom akışı ${res.status} döndü.`);
  process.exit(1);
}
const atom = await res.text();
const entries = [...atom.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);

const out = [];
for (const e of entries) {
  const url = pick(e, /<link [^>]*href="([^"]+)"/);
  const handle = url.split('/').pop();
  const content = decode(pick(e, /<content[^>]*>([\s\S]*?)<\/content>/));
  const summary = text(decode(pick(e, /<summary[^>]*>([\s\S]*?)<\/summary>/))).replace(/\s*Daha fazla\s*$/, '');
  let image = '';
  let imageAlt = '';
  try {
    const page = await (await fetch(url, { headers: UA })).text();
    image = decode(pick(page, /<meta property="og:image" content="([^"]+)"/)).replace(/^http:/, 'https:');
    imageAlt = decode(pick(page, /<meta property="og:image:alt" content="([^"]+)"/));
  } catch {
    /* kapak yoksa ilk görsel kullanılır */
  }
  if (!image) image = pick(content, /<img[^>]+src="([^"]+)"/).replace(/^\/\//, 'https://');
  image = image.split('?')[0];
  const words = text(content).split(' ').length;
  out.push({
    handle,
    title: decode(pick(e, /<title>([\s\S]*?)<\/title>/)).trim(),
    author: decode(pick(e, /<name>([\s\S]*?)<\/name>/)).trim() || 'HWC Furniture',
    published: pick(e, /<published>([^<]+)<\/published>/),
    summary,
    image,
    imageAlt,
    minutes: Math.max(2, Math.round(words / 200)),
    html: sanitize(content),
  });
  await sleep(400);
}

// Kapak görseli eksik kalanlar için blog listesindeki görselleri kullan
if (out.some((a) => !a.image)) {
  for (let page = 1; page <= 3; page++) {
    const list = await (await fetch(`${STORE}/blogs/rehber?page=${page}`, { headers: UA })).text();
    for (const a of out.filter((x) => !x.image)) {
      const i = list.indexOf(`/blogs/rehber/${a.handle}`);
      if (i < 0) continue;
      const img = list.slice(i, i + 4000).match(/src="(\/\/hwcfurniture\.com\/cdn\/shop\/articles\/[^"?]+)/);
      if (img) a.image = `https:${img[1]}`;
    }
    await sleep(400);
  }
}

await writeFile(new URL('../src/data/blog.json', import.meta.url), JSON.stringify(out));
console.log(`${out.length} yazı yazıldı → src/data/blog.json`);
