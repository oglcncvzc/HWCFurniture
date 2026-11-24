import RAW from './data/products.json';

export const STORE = 'https://hwcfurniture.com';
export const PRODUCTS = Object.fromEntries(RAW.map((p) => [p.handle, p]));
export const PRODUCT_LIST = RAW;

const EPOXY_BY_LABEL = {
  'Transparan Siyah': 'transSiyah',
  Siyah: 'siyah',
  Şeffaf: 'seffaf',
  'Koyu Yeşil': 'koyuYesil',
  'Okyanus Mavisi': 'okyanus',
};

// Showroom'da çiplerde görünen kısa adlar
export const SHORT = {
  'ceviz-transparan-siyah-river-epoksi-masa': 'Ceviz River',
  'ocean-river-dogal-kenarli-ceviz-ahsap-epoksi-masa-mavi': 'Ocean River',
  'koyu-yesil-epoksi-dogal-kenar-ceviz-yemek-masasi-mutfak-masasi-calisma-masasi-ofis-masasi': 'Koyu Yeşil 3 Parça',
  'mazel-siyah-river-epoksi-masa': 'Mazel · Siyah',
  'seffaf-epoksi-masif-mese-yemek-masasi': 'Meşe · Şeffaf Epoksi',
  'ceviz-kutuk-yemek-masasi-dogal-kenarli': 'Ceviz · Ahşap U',
  'dogal-kenarli-ceviz-masif-ahsap-masa': 'Ceviz · Metal Ayak',
  'dogal-kenar-siyah-kestane-ahsap-kutuk-mutfak-masasi': 'Siyah Kestane',
  'modern-masif-mese-ahsap-masa': 'Modern Meşe',
  'industrial-modern-ahsap-yemek-masasi-masif-mese-metal-ayakli': 'Industrial Meşe',
  'yuvarlak-ceviz-ahsap-yemek-masasi': 'Ceviz',
  'yuvarlak-mese-yemek-masasi': 'Meşe',
  'yuvarlak-epoksi-masa-mazel-agaci-siyah-nehir-epoksi': 'Mazel · Siyah Epoksi',
  'linak-yukseklik-ayarli-masif-mese-calisma-masasi': 'LINAK Meşe',
  'masif-ceviz-ahsap-calisma-masasi-endustriyel-metal-ayakli': 'Endüstriyel Ceviz',
  'koyu-ceviz-ahsap-calisma-masasi': 'Koyu Ceviz',
  'ceviz-ahsap-calisma-masasi-yuvarlak-kenarli-masif-dogal-ahsap': 'Yuvarlatılmış Kenar',
  'masif-ceviz-ahsap-dogal-kenarli-calisma-masasi-metal-ayakli': 'Doğal Kenarlı',
  'reclaimed-ceviz-calisma-masasi-konik-ayakli': 'No. 1',
  'reclaimed-ceviz-calisma-masasi-konik-ayakli-2': 'No. 2',
  'masif-ahsap-mavi-epoksi-orta-sehpa': 'Orta Sehpa · Mavi',
  'masif-ahsap-mavi-epoksi-sehpa': 'İğde · Mavi',
  'masif-ahsap-siyah-epoksi-sehpa': 'İğde · Siyah',
  'masif-ahsap-yesil-epoksi-sehpa': 'İğde · Yeşil',
  'mat-yesil-epoksi-igde-yan-sehpa': 'İğde · Mat Yeşil',
  'ceviz-kok-kaplama-yan-sehpa-parlak': 'Ceviz Kök · Parlak',
  'ceviz-kok-kaplama-yan-sehpa-mat': 'Ceviz Kök · Mat',
  'karaagac-kok-kaplama-yan-sehpa-parlak': 'Karaağaç Kök',
  'ceviz-acik-mavi-epoksi-ikili-yan-sehpa-seti': 'İkili Set · Açık Mavi',
};

const side = (wood, extra = {}) => () => ({
  model: 'side',
  legWood: 'kayinKoyu',
  finish: 'gloss',
  ...extra,
  surface: { wood, seed: extra.seed || 90, size: [512, 512], ...(extra.islands ? { islands: extra.islands } : {}) },
});

// Ürün → 3B görünüm. s = seçili seçenekler { 'Ölçü': '180x90 cm', ... }
const VISUALS = {
  'ceviz-transparan-siyah-river-epoksi-masa': (s) => ({
    model: 'river',
    top: 'oval',
    legs: 'metalU',
    finish: 'gloss',
    surface: { wood: 'ceviz', seed: 5, river: { color: EPOXY_BY_LABEL[s['Epoksi Rengi']] || 'transSiyah' } },
  }),
  'ocean-river-dogal-kenarli-ceviz-ahsap-epoksi-masa-mavi': () => ({
    model: 'river',
    top: 'live',
    seed: 8,
    legs: 'metalX',
    finish: 'gloss',
    surface: { wood: 'ceviz', seed: 8, river: { color: 'okyanus' } },
  }),
  'koyu-yesil-epoksi-dogal-kenar-ceviz-yemek-masasi-mutfak-masasi-calisma-masasi-ofis-masasi': () => ({
    model: 'river',
    top: 'live',
    seed: 12,
    legs: 'metalX',
    finish: 'gloss',
    surface: { wood: 'ceviz', seed: 12, river: { color: 'koyuYesil', count: 2 } },
  }),
  'mazel-siyah-river-epoksi-masa': () => ({
    model: 'river',
    top: 'oval',
    legs: 'metalTrapez',
    finish: 'gloss',
    surface: { wood: 'mazel', seed: 3, river: { color: 'siyah' } },
  }),
  'seffaf-epoksi-masif-mese-yemek-masasi': () => ({
    model: 'river',
    clearEdges: true,
    seed: 6,
    legs: 'woodU',
    legWood: 'mese',
    finish: 'gloss',
    surface: { wood: 'meseKok', seed: 6 },
  }),
  'ceviz-kutuk-yemek-masasi-dogal-kenarli': () => ({ model: 'live', seed: 21, legs: 'woodU', legWood: 'ceviz', surface: { wood: 'ceviz', seed: 21 } }),
  'dogal-kenarli-ceviz-masif-ahsap-masa': () => ({ model: 'live', seed: 22, legs: 'metalTrapez', surface: { wood: 'ceviz', seed: 22 } }),
  'dogal-kenar-siyah-kestane-ahsap-kutuk-mutfak-masasi': () => ({ model: 'live', seed: 23, legs: 'metalU', finish: 'matte', surface: { wood: 'kestaneSiyah', seed: 23 } }),
  'modern-masif-mese-ahsap-masa': () => ({ model: 'rect', legs: 'metalU', surface: { wood: 'mese', planks: 5, seed: 31 } }),
  'industrial-modern-ahsap-yemek-masasi-masif-mese-metal-ayakli': () => ({ model: 'rect', legs: 'metalU', finish: 'matte', surface: { wood: 'meseKoyu', planks: 5, seed: 32 } }),
  'yuvarlak-ceviz-ahsap-yemek-masasi': () => ({ model: 'round', legs: 'bladeWood', legWood: 'ceviz', surface: { wood: 'ceviz', planks: 3, seed: 41, size: [768, 768] } }),
  'yuvarlak-mese-yemek-masasi': () => ({ model: 'round', legs: 'tripodCurved', legWood: 'kayin', surface: { wood: 'mese', planks: 3, seed: 42, size: [768, 768] } }),
  'yuvarlak-epoksi-masa-mazel-agaci-siyah-nehir-epoksi': () => ({
    model: 'round',
    legs: 'bladeBlack',
    finish: 'gloss',
    surface: { wood: 'mazel', seed: 43, size: [768, 768], islands: { color: 'siyah', wood: 0.5, scale: 0.0048 } },
  }),
  'linak-yukseklik-ayarli-masif-mese-calisma-masasi': (s) => ({
    model: 'linak',
    legColor: s.Renk === 'Siyah' ? 'black' : 'white',
    surface: { wood: 'mese', planks: 5, seed: 51 },
  }),
  'masif-ceviz-ahsap-calisma-masasi-endustriyel-metal-ayakli': (s) => ({
    model: 'rect',
    top: (s['Kenar Detayı'] || '').startsWith('Üstten') ? 'chamfer' : 'rect',
    legs: 'metalU',
    surface: { wood: s.Renk === 'Chocolate' ? 'cevizKoyu' : 'ceviz', planks: 4, seed: 61 },
  }),
  'koyu-ceviz-ahsap-calisma-masasi': () => ({ model: 'rect', legs: 'metalU', surface: { wood: 'cevizKoyu', planks: 4, seed: 62 } }),
  'ceviz-ahsap-calisma-masasi-yuvarlak-kenarli-masif-dogal-ahsap': () => ({ model: 'rect', top: 'soft', legs: 'metalU', surface: { wood: 'ceviz', planks: 4, seed: 63 } }),
  'masif-ceviz-ahsap-dogal-kenarli-calisma-masasi-metal-ayakli': () => ({ model: 'live', seed: 64, legs: 'metalTrapez', surface: { wood: 'ceviz', seed: 64 } }),
  'reclaimed-ceviz-calisma-masasi-konik-ayakli': () => ({ model: 'tapered', legWood: 'ceviz', surface: { wood: 'reclaimed', planks: 5, seed: 71 } }),
  'reclaimed-ceviz-calisma-masasi-konik-ayakli-2': () => ({ model: 'tapered', legWood: 'cevizKoyu', surface: { wood: 'reclaimed', planks: 6, seed: 74 } }),
  'masif-ahsap-mavi-epoksi-orta-sehpa': () => ({
    model: 'coffee',
    legWood: 'meseKoyu',
    finish: 'gloss',
    surface: { wood: 'igde', seed: 81, islands: { color: 'gokMavi', wood: 0.5 }, size: [1024, 680] },
  }),
  'masif-ahsap-mavi-epoksi-sehpa': side('igde', { islands: { color: 'mavi', wood: 0.42 }, seed: 91 }),
  'masif-ahsap-siyah-epoksi-sehpa': side('igde', { islands: { color: 'siyah', wood: 0.72 }, seed: 92 }),
  'masif-ahsap-yesil-epoksi-sehpa': side('igde', { islands: { color: 'yesil', wood: 0.5 }, seed: 93 }),
  'mat-yesil-epoksi-igde-yan-sehpa': side('igde', { islands: { color: 'matYesil', wood: 0.55 }, seed: 94, finish: 'matte' }),
  'ceviz-kok-kaplama-yan-sehpa-parlak': side('cevizKok', { seed: 95, blackEdge: true }),
  'ceviz-kok-kaplama-yan-sehpa-mat': side('cevizKok', { seed: 96, blackEdge: true, finish: 'matte' }),
  'karaagac-kok-kaplama-yan-sehpa-parlak': side('karaagacKok', { seed: 97, legWood: 'kayin' }),
  'ceviz-acik-mavi-epoksi-ikili-yan-sehpa-seti': () => ({
    model: 'sidePair',
    legWood: 'kayinKoyu',
    finish: 'gloss',
    surface: { wood: 'ceviz', seed: 98, river: { color: 'acikMavi' }, size: [512, 512] },
  }),
};

export function resolveVisual(handle, selected) {
  const fn = VISUALS[handle];
  const v = fn ? fn(selected) : { model: 'rect', legs: 'metalU', surface: { wood: 'ceviz', planks: 4, seed: 1 } };
  if (!v.finish) v.finish = 'satin';
  return v;
}

/** Seçili ölçü değerinden boyut (metre). */
export function resolveDims(product, selected, visual) {
  let L = 1.8;
  let W = 0.9;
  for (const o of product.options) {
    const val = selected[o.name] || '';
    const m = val.match(/(\d+)\s*x\s*(\d+)/i);
    if (m) {
      L = +m[1] / 100;
      W = +m[2] / 100;
    } else if (o.name === 'Çap') {
      const d = parseInt(val, 10);
      if (d) L = W = d / 100;
    }
  }
  if (visual.model === 'sidePair') L = W = 0.5;
  let H = 0.76;
  if (product.type === 'Çalışma Masası') H = 0.75;
  if (visual.model === 'coffee') H = 0.45;
  if (visual.model === 'side' || visual.model === 'sidePair') H = 0.53;
  return { L, W, H };
}

export function findVariant(product, selected) {
  const names = product.options.map((o) => o.name);
  return (
    product.variants.find((v) => names.every((n, i) => v[i + 1] === selected[n])) || product.variants[0]
  );
}

export function defaultSelection(product, preset = {}) {
  const sel = {};
  for (const o of product.options) {
    if (preset[o.name] && o.values.includes(preset[o.name])) sel[o.name] = preset[o.name];
    else if (/Ölçü|Çap/.test(o.name)) {
      const pref = ['180x90 cm', '160x90 cm', '160x75 cm', '140x75 cm', '100 cm'];
      sel[o.name] = pref.find((p) => o.values.includes(p)) || o.values[Math.floor((o.values.length - 1) / 2)];
    } else sel[o.name] = o.values[0];
  }
  return sel;
}

export function shipTime(p) {
  const t = p.tags;
  if (t.includes('hemen-teslim')) return '3–5 gün içinde kargoda';
  if (t.includes('hazir-stok')) return '3–6 gün içinde kargoda';
  if (t.includes('linak')) return '1–3 hafta içinde kargoda';
  if (t.includes('epoksi')) return '4–6 hafta içinde kargoda';
  return '3–4 hafta içinde kargoda';
}

export const formatTRY = (n) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);

export const productUrl = (handle, variantId) => `${STORE}/products/${handle}${variantId ? `?variant=${variantId}` : ''}`;
export const addToCartUrl = (variantId) => `${STORE}/cart/add?id=${variantId}&quantity=1`;

// ---------------------------------------------------------------------------
// Showroom istasyonları — sol/sağ sıralı yerleşir
// ---------------------------------------------------------------------------
export const STATIONS = [
  {
    id: 'river',
    pendant: 'bar',
    title: 'Epoksi River Masalar',
    kicker: 'İmza koleksiyon',
    products: [
      'ceviz-transparan-siyah-river-epoksi-masa',
      'ocean-river-dogal-kenarli-ceviz-ahsap-epoksi-masa-mavi',
      'koyu-yesil-epoksi-dogal-kenar-ceviz-yemek-masasi-mutfak-masasi-calisma-masasi-ofis-masasi',
      'mazel-siyah-river-epoksi-masa',
      'seffaf-epoksi-masif-mese-yemek-masasi',
    ],
    preset: { 'Epoksi Rengi': 'Okyanus Mavisi' },
  },
  {
    id: 'kutuk',
    pendant: 'bar',
    title: 'Doğal Kenarlı Kütük Masalar',
    kicker: 'Çok satan',
    products: [
      'ceviz-kutuk-yemek-masasi-dogal-kenarli',
      'dogal-kenarli-ceviz-masif-ahsap-masa',
      'dogal-kenar-siyah-kestane-ahsap-kutuk-mutfak-masasi',
    ],
  },
  {
    id: 'yuvarlak',
    pendant: 'dome',
    title: 'Yuvarlak Yemek Masaları',
    kicker: 'Küçük alanlar için',
    products: ['yuvarlak-ceviz-ahsap-yemek-masasi', 'yuvarlak-mese-yemek-masasi', 'yuvarlak-epoksi-masa-mazel-agaci-siyah-nehir-epoksi'],
  },
  {
    id: 'mese',
    pendant: 'bar',
    title: 'Masif Meşe Yemek Masaları',
    kicker: 'Metal U ayaklı',
    products: ['modern-masif-mese-ahsap-masa', 'industrial-modern-ahsap-yemek-masasi-masif-mese-metal-ayakli'],
  },
  {
    id: 'linak',
    title: 'Yükseklik Ayarlı Çalışma Masası',
    kicker: 'LINAK DL6 motor',
    products: ['linak-yukseklik-ayarli-masif-mese-calisma-masasi'],
  },
  {
    id: 'calisma',
    title: 'Ceviz Çalışma Masaları',
    kicker: 'Ev ofisi',
    products: [
      'masif-ceviz-ahsap-calisma-masasi-endustriyel-metal-ayakli',
      'koyu-ceviz-ahsap-calisma-masasi',
      'ceviz-ahsap-calisma-masasi-yuvarlak-kenarli-masif-dogal-ahsap',
      'masif-ceviz-ahsap-dogal-kenarli-calisma-masasi-metal-ayakli',
    ],
  },
  {
    id: 'sehpa',
    title: 'Orta ve Yan Sehpalar',
    kicker: 'Hazır stok',
    products: [
      'masif-ahsap-mavi-epoksi-orta-sehpa',
      'masif-ahsap-mavi-epoksi-sehpa',
      'masif-ahsap-siyah-epoksi-sehpa',
      'masif-ahsap-yesil-epoksi-sehpa',
      'mat-yesil-epoksi-igde-yan-sehpa',
      'ceviz-kok-kaplama-yan-sehpa-parlak',
      'ceviz-kok-kaplama-yan-sehpa-mat',
      'karaagac-kok-kaplama-yan-sehpa-parlak',
      'ceviz-acik-mavi-epoksi-ikili-yan-sehpa-seti',
    ],
  },
  {
    id: 'reclaimed',
    title: 'Reclaimed Ceviz — Hemen Teslim',
    kicker: 'Tek parça',
    products: ['reclaimed-ceviz-calisma-masasi-konik-ayakli', 'reclaimed-ceviz-calisma-masasi-konik-ayakli-2'],
  },
];

export const STATION_OF = {};
for (const s of STATIONS) for (const h of s.products) STATION_OF[h] = s.id;
