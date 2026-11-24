# HWC Furniture — 3D Showroom

hwcfurniture.com için yeni vitrin sitesi. Ziyaretçi "Showroom'u Gez" dediğinde dış cepheden kapıdan içeri yürüyüp 3D bir showroom'a girer; masaların arasında dolaşır, tıklayıp etrafında döner, model/desen, epoksi rengi ve ölçü seçer. Seçim doğrudan Shopify'daki doğru varyanta bağlanır (Sepete ekle / Ürün sayfası).

## Çalıştırma

```bash
npm install
npm run dev
```

## Yayın

`npm run build` → `dist/` klasörü. Vercel Vite projesini otomatik tanır (Build: `npm run build`, Output: `dist`).

## Ürün verisi

Ürünler `src/data/products.json` içinde (Shopify `products.json`'dan alındı). Güncellemek için:

```bash
npm run sync:products
```

## Yapı

- `src/catalog.js` — ürün → 3D görünüm eşlemesi, showroom istasyonları, fiyat/varyant yardımcıları
- `src/three/engine.js` — kamera akışları (giriş, yürüme, inceleme), etkileşim, render
- `src/three/showroom.js` — bina, cephe, kapılar, ışıklar, sergi alanları
- `src/three/tables.js` — masa geometrileri (tabla formları ve ayak sistemleri)
- `src/three/textures.js` — prosedürel ahşap / kök / epoksi desenleri
- `src/main.js` — site, ürün ızgarası, inceleme paneli, fotoğraf galerisi
