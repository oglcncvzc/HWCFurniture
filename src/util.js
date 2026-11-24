export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const img = (url, w) => `${url}?width=${w}`;
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const WHATSAPP = 'https://wa.me/905438985384';

/** En düşük (stoktaki) varyant fiyatı. */
export function priceInfo(p) {
  const avail = p.variants.filter((v) => v[6]);
  const pool = avail.length ? avail : p.variants;
  const v = pool.reduce((a, b) => (b[4] < a[4] ? b : a));
  return { price: v[4], compare: v[5], soldOut: !avail.length, multi: new Set(p.variants.map((x) => x[4])).size > 1 };
}

export const discount = (price, compare) => (compare && compare > price ? Math.round((1 - price / compare) * 100) : 0);

export const variantTitle = (v) => [v[1], v[2], v[3]].filter(Boolean).join(' / ');
