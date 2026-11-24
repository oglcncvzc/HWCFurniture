import * as THREE from 'three';
import { Noise2D, clamp01, lerp, smooth } from './noise.js';

// ---------------------------------------------------------------------------
// Ahşap türleri ve epoksi renkleri. Değerler sRGB 0-255.
// ---------------------------------------------------------------------------
export const WOODS = {
  ceviz: { light: [150, 100, 63], dark: [66, 40, 24], ring: 0.16, figure: 1.0 },
  cevizKoyu: { light: [100, 66, 43], dark: [38, 24, 15], ring: 0.16, figure: 1.0 },
  mese: { light: [194, 148, 96], dark: [124, 84, 46], ring: 0.2, figure: 0.9 },
  meseKoyu: { light: [140, 99, 62], dark: [60, 41, 26], ring: 0.2, figure: 1.0 },
  kestaneSiyah: { light: [62, 56, 51], dark: [19, 18, 17], ring: 0.14, figure: 1.3 },
  igde: { light: [198, 148, 88], dark: [98, 62, 30], ring: 0.18, figure: 2.4 },
  kayin: { light: [200, 162, 120], dark: [168, 128, 88], ring: 0.25, figure: 0.6 },
  kayinKoyu: { light: [92, 60, 40], dark: [52, 33, 22], ring: 0.25, figure: 0.6 },
};

export const EPOXY = {
  transSiyah: { shore: [92, 70, 52], deep: [16, 14, 13], cloud: 0.35, see: 0.18, label: 'Transparan Siyah' },
  siyah: { shore: [28, 27, 28], deep: [9, 9, 10], cloud: 0.12, label: 'Siyah' },
  seffaf: { shore: [92, 84, 72], deep: [46, 46, 44], cloud: 0.3, see: 0.5, label: 'Şeffaf' },
  koyuYesil: { shore: [40, 128, 88], deep: [8, 58, 38], cloud: 0.35, pearl: true, label: 'Koyu Yeşil' },
  okyanus: { shore: [96, 196, 214], deep: [10, 70, 140], cloud: 0.3, waves: true, label: 'Okyanus Mavisi' },
  acikMavi: { shore: [176, 226, 232], deep: [96, 190, 204], cloud: 0.5, pearl: true, label: 'Açık Mavi' },
  gokMavi: { shore: [110, 190, 228], deep: [34, 120, 190], cloud: 0.45, pearl: true, label: 'Gök Mavisi' },
  mavi: { shore: [60, 110, 210], deep: [16, 44, 150], cloud: 0.45, pearl: true, label: 'Mavi' },
  yesil: { shore: [44, 150, 104], deep: [10, 84, 56], cloud: 0.45, pearl: true, label: 'Yeşil' },
  matYesil: { shore: [70, 140, 108], deep: [28, 92, 66], cloud: 0.45, pearl: true, label: 'Mat Yeşil' },
};

// ---------------------------------------------------------------------------
let maxAniso = 8;
export function setMaxAnisotropy(a) {
  maxAniso = a;
}

const cache = new Map();

function mixColor(out, a, b, t) {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
}

function plankWood(n, prof, x, y, H, planks, out, toneVar = 0.22) {
  const ph = planks > 0 ? H / planks : H;
  const pi = planks > 0 ? Math.floor(y / ph) : 0;
  const ly = y - pi * ph;
  const off = pi * 17.3 + 3.1;
  const tone = 1 - toneVar / 2 + toneVar * n.noise(pi * 7.7 + 0.3, 0.5);
  const warp = n.fbm(x * 0.0024 + off, y * 0.011 + off, 4);
  const big = n.fbm(x * 0.0008 + off, y * 0.0035 + off * 0.7, 3);
  const r = Math.sin(ly * prof.ring * 0.62 + warp * 16 * prof.figure + big * 30 * prof.figure);
  let t = 0.5 + 0.5 * r;
  t = t * t;
  // damar boyunca uzanan renk şeritleri
  const streak = n.fbm(x * 0.0014 + off * 2, y * 0.045 + off, 3);
  const pores = n.noise(x * 0.05 + off, y * 0.9);
  const k = clamp01(0.18 + t * 0.32 + (streak - 0.5) * 1.0 + (warp - 0.5) * 0.5 + pores * 0.14);
  mixColor(out, prof.light, prof.dark, k);
  let m = tone;
  if (planks > 0 && (ly < 1.3 || ly > ph - 1.3)) m *= 0.62;
  out[0] *= m;
  out[1] *= m;
  out[2] *= m;
  out[3] = 0.82 + 0.18 * k;
  return k;
}

// Kuş gözü / kök deseni (mazel, ceviz kökü, karaağaç kökü)
function burlWood(n, light, dark, eyeCol, x, y, out, eyes = 0.7) {
  const w = n.fbm(x * 0.006, y * 0.006, 4);
  const w2 = n.fbm(x * 0.016 + 40, y * 0.016, 3);
  const swirl = 0.5 + 0.5 * Math.sin(w * 30 + w2 * 11);
  const s = swirl * swirl;
  const cluster = smooth(0.48, 0.68, n.fbm(x * 0.0045 + 80, y * 0.0045 + 20, 3));
  const e = n.noise(x * 0.17 + 9, y * 0.17 + 4);
  const eye = smooth(0.74, 0.9, e) * (0.25 + cluster) * eyes;
  const k = clamp01(s * 0.5 + (w - 0.45) * 1.0 + cluster * 0.3);
  mixColor(out, light, dark, k);
  if (eye > 0) {
    out[0] = lerp(out[0], eyeCol[0], eye);
    out[1] = lerp(out[1], eyeCol[1], eye);
    out[2] = lerp(out[2], eyeCol[2], eye);
  }
  out[3] = 0.85;
}

const _wood = [0, 0, 0];
function epoxyColor(n, ep, depth, x, y, out) {
  const cloud = n.fbm(x * 0.012 + 50, y * 0.012 + 20, 3);
  const s = smooth(0, 0.75, depth);
  _wood[0] = out[0];
  _wood[1] = out[1];
  _wood[2] = out[2];
  mixColor(out, ep.shore, ep.deep, s);
  if (ep.see) {
    // şeffaf reçine: altındaki koyulaşmış ahşap tonu hafifçe görünür
    const k = ep.see * (1 - s * 0.5);
    out[0] = lerp(out[0], _wood[0] * 0.55, k);
    out[1] = lerp(out[1], _wood[1] * 0.55, k);
    out[2] = lerp(out[2], _wood[2] * 0.6, k);
  }
  let m = 1 - ep.cloud / 2 + ep.cloud * cloud;
  if (ep.pearl) {
    const sheen = 0.5 + 0.5 * Math.sin(n.fbm(x * 0.006, y * 0.006, 4) * 38 + x * 0.01);
    m *= 0.82 + 0.38 * sheen * sheen;
  }
  out[0] *= m;
  out[1] *= m;
  out[2] *= m;
  if (ep.waves && depth < 0.35) {
    const foam = Math.pow(0.5 + 0.5 * Math.sin(depth * 70 + n.fbm(x * 0.02, y * 0.02, 3) * 12), 6);
    const f = foam * (1 - depth / 0.35) * 0.85;
    out[0] = lerp(out[0], 236, f);
    out[1] = lerp(out[1], 244, f);
    out[2] = lerp(out[2], 246, f);
  }
  out[3] = 0.09;
}

// ---------------------------------------------------------------------------
// spec: { wood, planks, river:{color,count,edges}, pour, seed, size:[w,h] }
// ---------------------------------------------------------------------------
function generate(spec) {
  const [W, H] = spec.size || [1024, 512];
  const n = new Noise2D(spec.seed || 1);
  const n2 = new Noise2D((spec.seed || 1) + 101);
  const out = [0, 0, 0, 1];
  const tmp = [0, 0, 0, 1];
  const color = document.createElement('canvas');
  color.width = W;
  color.height = H;
  const rough = document.createElement('canvas');
  rough.width = W;
  rough.height = H;
  const cctx = color.getContext('2d');
  const rctx = rough.getContext('2d');
  const ci = cctx.createImageData(W, H);
  const ri = rctx.createImageData(W, H);
  const cd = ci.data;
  const rd = ri.data;

  const prof = WOODS[spec.wood];
  const river = spec.river ? { ...spec.river, ep: EPOXY[spec.river.color] } : null;
  const pour = spec.pour ? EPOXY[spec.pour] : null;
  const planks = spec.planks ?? 0;

  // Reclaimed: plakalar açık/koyu ceviz arasında değişir
  const reclaimedTones = [
    { light: [176, 126, 82], dark: [104, 68, 42], ring: 0.18, figure: 1.1 },
    { light: [120, 80, 50], dark: [52, 33, 20], ring: 0.16, figure: 1.0 },
    { light: [154, 104, 66], dark: [78, 50, 30], ring: 0.17, figure: 1.2 },
  ];

  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;

      // --- ahşap tabanı
      if (spec.wood === 'reclaimed') {
        const pcount = planks || 5;
        const pi = Math.floor(v * pcount);
        const pick = reclaimedTones[Math.floor(n2.noise(pi * 3.3 + 0.5, 1.5) * 3) % 3];
        plankWood(n, pick, x, y, H, pcount, out, 0.12);
      } else if (spec.wood === 'mazel') {
        burlWood(n, [214, 166, 100], [122, 78, 36], [62, 36, 16], x, y, out, 0.9);
      } else if (spec.wood === 'cevizKok') {
        burlWood(n, [132, 86, 52], [48, 30, 18], [30, 18, 10], x, y, out, 0.5);
      } else if (spec.wood === 'meseKok') {
        burlWood(n, [176, 124, 70], [84, 52, 26], [52, 30, 14], x, y, out, 0.6);
      } else if (spec.wood === 'karaagacKok') {
        burlWood(n, [222, 178, 112], [150, 100, 52], [104, 66, 34], x, y, out, 0.65);
      } else {
        plankWood(n, prof, x, y, H, planks, out);
      }

      // --- nehir epoksi
      if (river) {
        const ep = river.ep;
        let depth = -1;
        if (river.edges) {
          // Şeffaf epoksi kenarlar: ortada canlı kenarlı tek plaka
          const e1 = 0.12 + 0.07 * (n2.fbm(u * 3.2, 1.1, 3) - 0.5) * 2;
          const e2 = 0.12 + 0.07 * (n2.fbm(u * 3.2, 7.7, 3) - 0.5) * 2;
          if (v < e1) depth = clamp01((e1 - v) / e1);
          else if (v > 1 - e2) depth = clamp01((v - (1 - e2)) / e2);
          if (depth >= 0) {
            epoxyColor(n2, ep, depth * 0.6, x, y, out);
          } else {
            const de = Math.min(v - e1, 1 - e2 - v);
            if (de < 0.018) {
              const m = lerp(0.4, 1, de / 0.018);
              out[0] *= m;
              out[1] *= m;
              out[2] *= m;
            }
          }
        } else {
          const count = river.count || 1;
          for (let r = 0; r < count; r++) {
            const base = count === 1 ? 0.5 : (r + 1) / (count + 1);
            const c = base + (n2.fbm(u * 2.6 + r * 9, 1.7 + r * 3, 3) - 0.5) * (count === 1 ? 0.42 : 0.2);
            const hw = (count === 1 ? 0.07 : 0.045) + (count === 1 ? 0.1 : 0.05) * n2.fbm(u * 3.8 + 10 + r * 5, 3.3, 3);
            const d = Math.abs(v - c) / hw;
            if (d < 1) {
              depth = Math.max(depth, 1 - d);
            } else if (d < 1.14 && depth < 0) {
              // ağacın nehre bakan kabuk kenarı
              const m = lerp(0.32, 1, (d - 1) / 0.14);
              out[0] *= m;
              out[1] *= m;
              out[2] *= m;
            }
          }
          if (depth >= 0) epoxyColor(n2, ep, depth, x, y, out);
        }
      }

      // --- adacık: epoksi zemin içinde ahşap parçaları
      if (spec.islands) {
        const ep = EPOXY[spec.islands.color];
        const sc = spec.islands.scale || 0.0065;
        const f = n2.fbm(x * sc + 12, y * sc + 30, 4);
        const t = 0.5 + (0.5 - spec.islands.wood) * 0.3;
        if (f < t) epoxyColor(n2, ep, clamp01((t - f) / 0.09), x, y, out);
        else if (f < t + 0.012) {
          out[0] *= 0.42;
          out[1] *= 0.42;
          out[2] *= 0.42;
        }
      }

      // --- sehpa dökümleri (çatlak / boşluk dolgusu)
      if (pour) {
        const c = 0.5 + (n2.fbm(u * 2.2, 4.4, 3) - 0.5) * 0.5;
        const hw = 0.05 + 0.08 * n2.fbm(u * 3 + 3, 8.1, 3);
        const d = Math.abs(v - c) / hw;
        const blob = n2.fbm(x * 0.006 + 12, y * 0.006 + 30, 4);
        let depth = -1;
        if (d < 1) depth = 1 - d;
        if (blob > 0.64) depth = Math.max(depth, smooth(0.64, 0.74, blob));
        if (depth >= 0) epoxyColor(n2, pour, depth, x, y, out);
        else if (d < 1.12 || blob > 0.62) {
          out[0] *= 0.55;
          out[1] *= 0.55;
          out[2] *= 0.55;
        }
      }

      const i = (y * W + x) * 4;
      cd[i] = out[0];
      cd[i + 1] = out[1];
      cd[i + 2] = out[2];
      cd[i + 3] = 255;
      const rv = clamp01(out[3]) * 255;
      rd[i] = rv;
      rd[i + 1] = rv;
      rd[i + 2] = rv;
      rd[i + 3] = 255;
    }
  }
  cctx.putImageData(ci, 0, 0);
  rctx.putImageData(ri, 0, 0);
  void tmp;
  return { color, rough };
}

function toTexture(canvas, srgb) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

function swatchFrom(canvas) {
  const s = document.createElement('canvas');
  s.width = s.height = 96;
  const ctx = s.getContext('2d');
  const side = Math.min(canvas.width, canvas.height) * 0.6;
  ctx.drawImage(canvas, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side, 0, 0, 96, 96);
  return s.toDataURL('image/jpeg', 0.85);
}

export function specKey(spec) {
  return JSON.stringify(spec);
}

/** Yüzey dokusunu (renk + pürüzlülük) üretir ve önbelleğe alır. */
export function getSurface(spec) {
  const key = specKey(spec);
  let s = cache.get(key);
  if (s) return s;
  const { color, rough } = generate(spec);
  s = {
    map: toTexture(color, true),
    roughnessMap: toTexture(rough, false),
    canvas: color,
    _swatch: null,
    get swatch() {
      if (!this._swatch) this._swatch = swatchFrom(color);
      return this._swatch;
    },
  };
  cache.set(key, s);
  return s;
}

/** Bacaklar için dikey damarlı ahşap. */
export function getVerticalWood(wood, seed = 7) {
  const key = 'v:' + wood + seed;
  let s = cache.get(key);
  if (s) return s;
  const base = getSurface({ wood, planks: 0, seed, size: [512, 256] });
  const map = base.map.clone();
  const roughnessMap = base.roughnessMap.clone();
  for (const t of [map, roughnessMap]) {
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
    t.needsUpdate = true;
  }
  s = { map, roughnessMap };
  cache.set(key, s);
  return s;
}

/** Parlatılmış beton zemin (2.5 m karo, derz çizgili). */
export function getFloorTexture() {
  if (cache.has('floor')) return cache.get('floor');
  const W = 1024;
  const n = new Noise2D(42);
  const c = document.createElement('canvas');
  c.width = c.height = W;
  const r = document.createElement('canvas');
  r.width = r.height = W;
  const cctx = c.getContext('2d');
  const rctx = r.getContext('2d');
  const ci = cctx.createImageData(W, W);
  const ri = rctx.createImageData(W, W);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const f = n.fbm(x * 0.004, y * 0.004, 5);
      const g = n.noise(x * 0.4, y * 0.4);
      let val = 150 + (f - 0.5) * 40 + (g - 0.5) * 8;
      const joint = x < 2 || y < 2 ? 0.72 : 1;
      val *= joint;
      const i = (y * W + x) * 4;
      ci.data[i] = val * 1.0;
      ci.data[i + 1] = val * 0.965;
      ci.data[i + 2] = val * 0.92;
      ci.data[i + 3] = 255;
      const rv = (0.42 + (f - 0.5) * 0.5) * 255;
      ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = rv;
      ri.data[i + 3] = 255;
    }
  }
  cctx.putImageData(ci, 0, 0);
  rctx.putImageData(ri, 0, 0);
  const s = { map: toTexture(c, true), roughnessMap: toTexture(r, false) };
  cache.set('floor', s);
  return s;
}

/** ".hwc" kalın + "furniture" ince logo yazısı ve alt satır. */
export function logoTexture(subtitle, color = '#fff4e4') {
  const width = 2048;
  const height = 512;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  const family = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  const bold = `800 230px ${family}`;
  const light = `300 230px ${family}`;
  ctx.font = bold;
  ctx.letterSpacing = '-10px';
  const w1 = ctx.measureText('.hwc').width;
  ctx.font = light;
  ctx.letterSpacing = '-2px';
  const w2 = ctx.measureText('furniture').width;
  const x0 = (width - w1 - w2) / 2;
  const base = height * 0.56;
  ctx.font = bold;
  ctx.letterSpacing = '-10px';
  ctx.fillText('.hwc', x0, base);
  ctx.font = light;
  ctx.letterSpacing = '-2px';
  ctx.fillText('furniture', x0 + w1, base);
  if (subtitle) {
    ctx.font = `500 52px ${family}`;
    ctx.letterSpacing = '16px';
    ctx.textAlign = 'center';
    ctx.fillText(subtitle, width / 2, height * 0.86);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

/** Tuval üzerine yazı (tabela, logo) — saydam arka planlı. */
export function textTexture(lines, { width = 2048, height = 512, color = '#fff' } = {}) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const l of lines) {
    ctx.font = l.font;
    if (l.spacing) ctx.letterSpacing = l.spacing;
    ctx.fillText(l.text, width / 2, l.y * height);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}
