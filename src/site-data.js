// Orijinal ana sayfadaki kampanya slaytları (hwcfurniture.com, Kasım 2026)
const CDN = 'https://hwcfurniture.com/cdn/shop/files';

export const SLIDES = [
  {
    kicker: 'Kasım indirimi',
    title: 'Yükseklik ayarlı<br /><em>masif meşe çalışma masası</em>',
    handle: 'linak-yukseklik-ayarli-masif-mese-calisma-masasi',
    img: `${CDN}/on-dk-004-linak-yukseklik-ayarli-masif-mese-calisma-masasi-anasayfa-banner-kasim.jpg`,
    cta: 'Masayı incele',
  },
  {
    kicker: 'Kasım indirimi',
    title: 'Doğal kenarlı<br /><em>ceviz çalışma masası</em>',
    handle: 'masif-ceviz-ahsap-dogal-kenarli-calisma-masasi-metal-ayakli',
    img: `${CDN}/hf_20260808_170955_8b12f5a0-be8c-4bca-9fc5-480928ed4b76.png`,
    cta: 'Masayı incele',
  },
  {
    kicker: 'Kasım indirimi',
    title: 'Yuvarlak masif<br /><em>ceviz yemek masası</em>',
    handle: 'yuvarlak-ceviz-ahsap-yemek-masasi',
    img: `${CDN}/hf_20260808_205633_198cad92-046e-46ad-8a85-91ab00606b47.png`,
    cta: 'Masayı incele',
  },
  {
    kicker: 'Yeni yıl sofrası',
    title: 'Koyu yeşil epoksi<br /><em>ceviz yemek masası</em>',
    note: 'Yeni yıl için son sipariş 18 Kasım.',
    handle: 'koyu-yesil-epoksi-dogal-kenar-ceviz-yemek-masasi-mutfak-masasi-calisma-masasi-ofis-masasi',
    img: `${CDN}/hf_20260808_123607_b1dacd27-5e3d-43a8-9c6f-5f2d4d20441a.png`,
    cta: 'Masayı incele',
  },
  {
    kicker: 'Hemen teslim',
    title: 'İğde ağacı mavi<br /><em>epoksi yan sehpa</em>',
    note: 'Stoktan 3–6 günde kargoda.',
    handle: 'masif-ahsap-mavi-epoksi-sehpa',
    img: `${CDN}/igde-mavi-epoksi-sehpa-05-yasam-alani.webp`,
    cta: 'Sehpayı incele',
  },
];

// Instagram (@hardenwood.co) — görseller public/instagram altına indirildi
export const INSTAGRAM = [
  { img: '/instagram/ig-01.jpg', caption: 'Sevimli dostlarımızla şahane oldu 👍' },
  { img: '/instagram/ig-02.jpg', video: '/instagram/ig-02.mp4', caption: 'Bugün Yaklaşım Mimarlık ofisindeydik, tasarlayıp ürettiğimiz parçaları yerinde gördük.' },
  { img: '/instagram/ig-03.jpg', video: '/instagram/ig-03.mp4', caption: 'Her masanın bir başlangıç anı var. Şeritte ilk taslak hazırlanıyor.' },
  { img: '/instagram/ig-04.jpg', caption: 'HWC morning routine' },
  { img: '/instagram/ig-05.jpg', caption: 'Gün içinde 5 dakika! Uzun saatler çalışmanın verdiği sırt yorgunluğuna kısa bir mola.' },
  { img: '/instagram/ig-06.jpg', caption: "En keskin tercihimizi Kronberg'den yana yaptık." },
  { img: '/instagram/ig-07.jpg', caption: 'Çalışırken sağlığını düşünenler için kısa bir rehber!' },
  { img: '/instagram/ig-08.jpg', caption: 'Kapılar ardı ardına açılıyordu; bahçemdeki iğde ağacı epoksi ile buluştu.' },
  { img: '/instagram/ig-09.jpg', caption: 'Meşe ama yabani, epoksi ve şeffaf. Doğal kenarlı ağaçlar ile.' },
  { img: '/instagram/ig-10.jpg', caption: 'Kendine hayran bırakan doğal detaylar!' },
];
export const INSTAGRAM_URL = 'https://www.instagram.com/hardenwood.co/';

// Koleksiyon sayfaları
export const COLLECTION_PAGES = [
  {
    slug: 'tum-masalar',
    title: 'Tüm Ürünler',
    intro:
      'HWC koleksiyonu; çalışma masası, yemek masası, doğal kenarlı kütük masa, yuvarlak masa, epoksi tasarımlar ve sehpaları tek yerde karşılaştırmanızı sağlar. Masif ceviz ve meşe yüzeyler ile epoksi detaylar; metal ya da ahşap ayak seçenekleriyle farklı mekân ve kullanım ihtiyaçlarına uyarlanır.',
    test: () => true,
  },
  {
    slug: 'yemek-masalari',
    title: 'Yemek Masaları',
    intro: 'Masif ceviz, meşe ve epoksi yemek masaları; doğal kenarlı, dikdörtgen ve yuvarlak formlarda, 120 cm\'den 240 cm\'ye kadar.',
    test: (p) => /Yemek/.test(p.type),
  },
  {
    slug: 'calisma-masalari',
    title: 'Çalışma Masaları',
    intro: 'Ev ofisi ve ofis için masif ahşap çalışma masaları; LINAK motorlu yükseklik ayarlı model ve hemen teslim reclaimed ceviz seçenekleriyle.',
    test: (p) => p.type === 'Çalışma Masası',
  },
  {
    slug: 'epoksi-masalar',
    title: 'Epoksi Masalar',
    intro: 'Doğal kenarlı ahşabı epoksiyle buluşturan river ve adacık tasarımları. Her plakanın deseni ve epoksinin akışı tektir.',
    test: (p) => p.tags.includes('epoksi'),
  },
  {
    slug: 'sehpalar',
    title: 'Orta ve Yan Sehpalar',
    intro: 'İğde, ceviz kökü ve karaağaç kökünden yan sehpalar ile epoksili orta sehpa. Çoğu stoktan hemen gönderilir.',
    test: (p) => p.tags.includes('sehpa'),
  },
  {
    slug: 'hemen-teslim',
    title: 'Hemen Teslim',
    intro: 'Stokta hazır, siparişten sonra birkaç gün içinde kargoya verilen ürünler.',
    test: (p) => p.tags.includes('hemen-teslim') || p.tags.includes('hazir-stok'),
  },
];

export const TYPE_TO_COLLECTION = {
  'Yemek Masası': 'yemek-masalari',
  'Epoksi Yemek Masası': 'epoksi-masalar',
  'Çalışma Masası': 'calisma-masalari',
  'Yan Sehpa': 'sehpalar',
  'Orta Sehpa': 'sehpalar',
};
