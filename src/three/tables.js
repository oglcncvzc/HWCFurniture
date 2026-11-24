import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mulberry32 } from './noise.js';

// Bütün masalar yerel koordinatta uzun kenar X, en Z ekseninde, zemin y=0.

/** Üstten/yandan projeksiyonla UV atar: tabla dokusu L×W alanına tam oturur. */
export function planarUV(geo, L, W) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    ab.cross(ac);
    const ax = Math.abs(ab.x);
    const ay = Math.abs(ab.y);
    const az = Math.abs(ab.z);
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(i + k);
      const y = pos.getY(i + k);
      const z = pos.getZ(i + k);
      let u;
      let v;
      if (ay >= ax && ay >= az) {
        u = x / L + 0.5;
        v = z / W + 0.5;
      } else if (ax >= az) {
        u = z / L + 0.5;
        v = y / W + 0.5;
      } else {
        u = x / L + 0.5;
        v = y / W + 0.5;
      }
      uv[(i + k) * 2] = u;
      uv[(i + k) * 2 + 1] = v;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

const mesh = (geo, mat) => new THREE.Mesh(geo, mat);

function boxAt(group, w, h, d, mat, x, y, z, rx = 0, rz = 0) {
  const m = mesh(planarUV(new THREE.BoxGeometry(w, h, d), 0.6, 0.3), mat);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  m.rotation.z = rz;
  group.add(m);
  return m;
}

// ---------------------------------------------------------------------------
// Tabla şekilleri
// ---------------------------------------------------------------------------
function roundedRectShape(L, W, r) {
  const s = new THREE.Shape();
  const x = -L / 2;
  const y = -W / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + L - r, y);
  s.quadraticCurveTo(x + L, y, x + L, y + r);
  s.lineTo(x + L, y + W - r);
  s.quadraticCurveTo(x + L, y + W, x + L - r, y + W);
  s.lineTo(x + r, y + W);
  s.quadraticCurveTo(x, y + W, x, y + W - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function liveEdgeShape(L, W, seed) {
  const rand = mulberry32(seed);
  const ph = [rand() * 6, rand() * 6, rand() * 6, rand() * 6];
  const amp = Math.min(0.035, W * 0.04);
  const wob = (x, p) =>
    amp * (0.55 * Math.sin(x * 4.3 + ph[p]) + 0.3 * Math.sin(x * 9.7 + ph[p + 1]) + 0.15 * Math.sin(x * 23 + ph[p]));
  const s = new THREE.Shape();
  const N = 64;
  s.moveTo(-L / 2, -W / 2 + wob(-L / 2, 0));
  for (let i = 1; i <= N; i++) {
    const x = -L / 2 + (L * i) / N;
    s.lineTo(x, -W / 2 + wob(x, 0) + amp);
  }
  for (let i = N; i >= 0; i--) {
    const x = -L / 2 + (L * i) / N;
    s.lineTo(x, W / 2 - wob(x, 2) - amp);
  }
  s.closePath();
  return s;
}

function extrudeTop(shape, L, W, t, bevel = 0.004) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: t - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: bevel > 0.006 ? 1 : 2,
    curveSegments: 10,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  return planarUV(geo, L, W);
}

function makeTop(kind, L, W, t, opts = {}) {
  switch (kind) {
    case 'live':
      return extrudeTop(liveEdgeShape(L, W, opts.seed || 3), L, W, t, 0.005);
    case 'oval':
      return extrudeTop(roundedRectShape(L, W, Math.min(0.14, W * 0.18)), L, W, t, 0.008);
    case 'soft':
      return extrudeTop(roundedRectShape(L, W, 0.05), L, W, t, 0.015);
    case 'chamfer':
      return extrudeTop(roundedRectShape(L, W, 0.004), L, W, t, 0.012);
    case 'round': {
      // yuvarlatılmış kenarlı yuvarlak tabla (lathe profili)
      const R = L / 2;
      const rr = Math.min(0.014, t * 0.38);
      const pts = [new THREE.Vector2(0, 0)];
      const arc = (cx, cy, a0, a1) => {
        for (let k = 0; k <= 6; k++) {
          const a = a0 + ((a1 - a0) * k) / 6;
          pts.push(new THREE.Vector2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
        }
      };
      arc(R - rr, rr, -Math.PI / 2, 0);
      arc(R - rr, t - rr, 0, Math.PI / 2);
      pts.push(new THREE.Vector2(0, t));
      const g = new THREE.LatheGeometry(pts, 96);
      return planarUV(g, L, W);
    }
    case 'roundSoft': {
      const g = new RoundedBoxGeometry(L, t, W, 3, 0.012);
      g.translate(0, t / 2, 0);
      return planarUV(g, L, W);
    }
    default: {
      const g = new RoundedBoxGeometry(L, t, W, 2, 0.004);
      g.translate(0, t / 2, 0);
      return planarUV(g, L, W);
    }
  }
}

// ---------------------------------------------------------------------------
// Ayak sistemleri
// ---------------------------------------------------------------------------
function legsMetalU(g, L, W, h, mat) {
  const inset = Math.min(0.16, L * 0.1);
  for (const sx of [-1, 1]) {
    const x = sx * (L / 2 - inset);
    const zz = W / 2 - 0.07;
    for (const sz of [-1, 1]) boxAt(g, 0.04, h, 0.07, mat, x, h / 2, sz * zz);
    boxAt(g, 0.04, 0.05, 2 * zz + 0.07, mat, x, h - 0.025, 0);
    boxAt(g, 0.04, 0.04, 2 * zz + 0.07, mat, x, 0.02, 0);
  }
}

function legsMetalTrapez(g, L, W, h, mat) {
  const inset = Math.min(0.2, L * 0.12);
  for (const sx of [-1, 1]) {
    const x = sx * (L / 2 - inset);
    const zt = W / 2 - 0.06;
    const zb = W / 2 - 0.17;
    for (const sz of [-1, 1]) {
      const dz = sz * (zt - zb);
      const len = Math.hypot(h, dz);
      const m = boxAt(g, 0.04, len, 0.05, mat, x, h / 2, sz * (zt + zb) / 2);
      m.rotation.x = Math.atan2(dz, h);
    }
    boxAt(g, 0.04, 0.04, 2 * zt + 0.1, mat, x, h - 0.02, 0);
    boxAt(g, 0.04, 0.03, 2 * zb + 0.06, mat, x, 0.015, 0);
  }
}

function legsMetalX(g, L, W, h, mat) {
  const inset = Math.min(0.3, L * 0.16);
  for (const sx of [-1, 1]) {
    const x = sx * (L / 2 - inset);
    const zz = W / 2 - 0.1;
    for (const s of [-1, 1]) {
      const dz = 2 * zz * s;
      const len = Math.hypot(h, dz);
      const m = boxAt(g, 0.05, len, 0.05, mat, x, h / 2, 0);
      m.rotation.x = Math.atan2(dz, h);
    }
    boxAt(g, 0.05, 0.04, 2 * zz + 0.1, mat, x, h - 0.02, 0);
  }
  boxAt(g, L - 2 * inset, 0.04, 0.04, mat, 0, h - 0.04, 0);
}

function legsWoodU(g, L, W, h, mat) {
  const inset = Math.min(0.18, L * 0.1);
  for (const sx of [-1, 1]) {
    const x = sx * (L / 2 - inset);
    const zz = W / 2 - 0.1;
    for (const sz of [-1, 1]) boxAt(g, 0.07, h, 0.1, mat, x, h / 2, sz * zz);
    boxAt(g, 0.07, 0.09, 2 * zz + 0.1, mat, x, h - 0.045, 0);
    boxAt(g, 0.07, 0.08, 2 * zz + 0.1, mat, x, 0.04, 0);
  }
}

function legsCurved3(g, D, h, wood, metal) {
  const R = D / 2;
  const hubY = h - 0.16;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const pts = [
      new THREE.Vector3(0, h - 0.01, 0).addScaledVector(dir, 0.05),
      new THREE.Vector3(0, hubY, 0).addScaledVector(dir, 0.1),
      new THREE.Vector3(0, h * 0.45, 0).addScaledVector(dir, R * 0.42),
      new THREE.Vector3(0, 0.012, 0).addScaledVector(dir, R * 0.72),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 40, 0.026, 12, false);
    g.add(mesh(planarUV(tube, 0.6, 0.3), wood));
    // ayak ucu
    const cap = mesh(new THREE.SphereGeometry(0.026, 12, 8), wood);
    cap.position.copy(pts[3]);
    g.add(cap);
  }
  const hub = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.11, 32), metal);
  hub.position.y = hubY + 0.03;
  g.add(hub);
}

// Yassı "bıçak" profilli 3 ayak: siyah göbekten yere iner, tablaya Y kolu uzanır
function legsBlade(g, D, h, mat, hubMat) {
  const R = D / 2;
  const hubY = h - 0.15;
  const footR = R * 0.8;
  // alt bacak: göbekten (0.06, hubY) ayağa (footR, 0) incelen düz bıçak
  const dx = footR - 0.06;
  const dy = -hubY;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len; // yukarı-dışa bakan normal
  const ny = dx / len;
  const w0 = 0.062;
  const w1 = 0.03;
  const s = new THREE.Shape();
  s.moveTo(footR + nx * w1 * 0.5, ny * w1 * 0.5);
  s.lineTo(footR - nx * w1 * 0.5, Math.max(0, -ny * w1 * 0.5));
  s.lineTo(0.06 - nx * w0 * 0.5 * 0.2, hubY - 0.07);
  s.lineTo(0.06, hubY + 0.055);
  // tablaya uzanan kol
  s.quadraticCurveTo(0.12, h - 0.02, R * 0.36, h);
  s.lineTo(R * 0.47, h);
  s.quadraticCurveTo(0.2, hubY + 0.06, 0.06 + nx * w0 + (dx / len) * 0.06, hubY + ny * w0 + (dy / len) * 0.06);
  s.lineTo(footR + nx * w1 * 0.5, ny * w1 * 0.5);
  const depth = 0.036;
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 18 });
  geo.translate(0, 0, -depth / 2);
  const uvGeo = planarUV(geo, 0.6, 0.3);
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const m = mesh(uvGeo, mat);
    m.rotation.y = -ang;
    g.add(m);
  }
  const hub = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 32), hubMat);
  hub.position.y = hubY;
  g.add(hub);
}

// Yuvarlak masalar: 3 ayak, siyah göbekte birleşir, tablaya doğru Y şeklinde açılır
function legsTripod(g, D, h, mat, hubMat, curved) {
  const R = D / 2;
  const hubY = h - 0.17;
  const up = new THREE.Vector3(0, 1, 0);
  const strut = (a, b, r0, r1) => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const m = mesh(planarUV(new THREE.CylinderGeometry(r1, r0, len, 16), 0.6, 0.3), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(up, dir.normalize());
    g.add(m);
  };
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const d = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
    const at = (r, y) => new THREE.Vector3(d.x * r, y, d.z * r);
    const foot = at(R * 0.82, 0.006);
    const hub = at(0.055, hubY);
    const top = at(R * 0.5, h - 0.004);
    if (curved) {
      const lower = new THREE.CatmullRomCurve3([foot, at(R * 0.66, h * 0.32), at(R * 0.3, hubY - 0.12), hub]);
      g.add(mesh(planarUV(new THREE.TubeGeometry(lower, 36, 0.024, 12, false), 0.6, 0.3), mat));
      const upper = new THREE.CatmullRomCurve3([hub, at(R * 0.24, hubY + 0.07), top]);
      g.add(mesh(planarUV(new THREE.TubeGeometry(upper, 16, 0.02, 10, false), 0.6, 0.3), mat));
      const cap = mesh(new THREE.SphereGeometry(0.024, 12, 8), mat);
      cap.position.copy(foot);
      g.add(cap);
    } else {
      strut(foot, hub, 0.017, 0.028);
      strut(hub, top, 0.026, 0.018);
    }
  }
  const hubM = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 32), hubMat);
  hubM.position.y = hubY;
  g.add(hubM);
}

function legsMetalCross(g, D, h, mat) {
  const col = mesh(new THREE.CylinderGeometry(0.045, 0.045, h - 0.04, 24), mat);
  col.position.y = h / 2;
  g.add(col);
  for (const r of [Math.PI / 4, -Math.PI / 4]) {
    const bar = boxAt(g, D * 0.7, 0.03, 0.06, mat, 0, 0.015, 0);
    bar.rotation.y = r;
  }
  const plate = boxAt(g, D * 0.45, 0.02, 0.06, mat, 0, h - 0.03, 0);
  plate.rotation.y = Math.PI / 4;
  const plate2 = boxAt(g, D * 0.45, 0.02, 0.06, mat, 0, h - 0.03, 0);
  plate2.rotation.y = -Math.PI / 4;
}

function legsLinak(g, L, W, topY, frame) {
  const colH = topY - 0.05;
  for (const sx of [-1, 1]) {
    const x = sx * (L / 2 - 0.22);
    // ayak tabanı
    boxAt(g, 0.07, 0.04, W - 0.06, frame, x, 0.02, 0);
    // 3 kademeli teleskop kolon
    const s1 = colH * 0.42;
    const s2 = colH * 0.36;
    const s3 = colH - s1 - s2 + 0.02;
    boxAt(g, 0.1, s1, 0.07, frame, x, 0.04 + s1 / 2, 0);
    boxAt(g, 0.09, s2 + 0.02, 0.062, frame, x, 0.04 + s1 + s2 / 2 - 0.01, 0);
    boxAt(g, 0.08, s3, 0.055, frame, x, 0.04 + s1 + s2 + s3 / 2 - 0.02, 0);
    // tabla altı taşıyıcı
    boxAt(g, 0.06, 0.03, W - 0.12, frame, x, topY - 0.015, 0);
  }
  // kiriş + kablo tepsisi
  boxAt(g, L - 0.44, 0.04, 0.04, frame, 0, topY - 0.03, 0);
  boxAt(g, L * 0.5, 0.08, 0.12, frame, 0, topY - 0.07, -W / 2 + 0.12);
  // kontrol paneli
  boxAt(g, 0.12, 0.015, 0.05, frame, L / 2 - 0.5, topY - 0.012, W / 2 - 0.03);
}

function legsTapered(g, L, W, h, wood, metal, splay = 0.05) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const top = new THREE.Vector3(sx * (L / 2 - 0.1), h, sz * (W / 2 - 0.08));
      const bot = new THREE.Vector3(top.x + sx * splay, 0, top.z + sz * splay * 0.8);
      const dir = new THREE.Vector3().subVectors(top, bot);
      const len = dir.length();
      const geo = new THREE.CylinderGeometry(0.03, 0.017, len, 20);
      const m = mesh(planarUV(geo, 0.6, 0.3), wood);
      m.position.copy(bot).addScaledVector(dir, 0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      g.add(m);
      if (metal) {
        const plate = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 20), metal);
        plate.position.set(top.x, h - 0.005, top.z);
        g.add(plate);
      }
    }
  }
}

function legsBlocks(g, L, W, h, wood) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const m = mesh(planarUV(new RoundedBoxGeometry(0.11, h, 0.11, 2, 0.008), 0.6, 0.3), wood);
      m.position.set(sx * (L / 2 - 0.14), h / 2, sz * (W / 2 - 0.13));
      g.add(m);
    }
  }
}

// ---------------------------------------------------------------------------
// Ana kurucu
// visual: { model, legs, top, edge }
// dims: { L, W, H } metre
// mats: { top, leg, legWood, metal }
// ---------------------------------------------------------------------------
export function buildTable(visual, dims, mats) {
  const g = new THREE.Group();
  const { L, W } = dims;
  let H = dims.H;
  const model = visual.model;
  let topY;
  let footprint = { L, W };

  const addTop = (kind, t, y, opts) => {
    const m = mesh(makeTop(kind, L, W, t, opts), mats.top);
    m.position.y = y;
    m.userData.isTop = true;
    g.add(m);
    return m;
  };

  if (model === 'round') {
    const t = 0.045;
    topY = H;
    addTop('round', t, H - t);
    if (visual.legs === 'metalCross') legsMetalCross(g, L, H - t, mats.leg);
    else if (visual.legs === 'tripodMetal' || visual.legs === 'bladeBlack') legsBlade(g, L, H - t, mats.leg, mats.metal);
    else if (visual.legs === 'tripodWood' || visual.legs === 'bladeWood') legsBlade(g, L, H - t, mats.legWood, mats.metal);
    else if (visual.legs === 'tripodCurved') legsTripod(g, L, H - t, mats.legWood, mats.metal, true);
    else legsCurved3(g, L, H - t, mats.legWood, mats.metal);
  } else if (model === 'side' || model === 'sidePair') {
    const tables = model === 'sidePair' ? [{ x: -0.27, z: 0.05, h: 0.53 }, { x: 0.27, z: -0.05, h: 0.48 }] : [{ x: 0, z: 0, h: 0.53 }];
    for (const s of tables) {
      const sub = new THREE.Group();
      const t = 0.036;
      const top = mesh(makeTop('round', L, W, t), mats.top);
      top.position.y = s.h - t;
      sub.add(top);
      const edge = mesh(new THREE.CylinderGeometry(L / 2 + 0.002, L / 2 + 0.002, 0.012, 64, 1, true), mats.metal);
      edge.position.y = s.h - t + 0.004;
      if (visual.blackEdge) sub.add(edge);
      // 3 konik ayak
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const top3 = new THREE.Vector3(Math.cos(a) * 0.14, s.h - t, Math.sin(a) * 0.14);
        const bot = new THREE.Vector3(Math.cos(a) * 0.27, 0, Math.sin(a) * 0.27);
        const dir = new THREE.Vector3().subVectors(top3, bot);
        const len = dir.length();
        const leg = mesh(planarUV(new THREE.CylinderGeometry(0.02, 0.012, len, 16), 0.6, 0.3), mats.legWood);
        leg.position.copy(bot).addScaledVector(dir, 0.5);
        leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        sub.add(leg);
      }
      sub.position.set(s.x, 0, s.z);
      g.add(sub);
    }
    topY = 0.53;
    footprint = model === 'sidePair' ? { L: L * 2.1, W: L * 1.2 } : { L, W };
  } else if (model === 'coffee') {
    const t = 0.05;
    topY = H;
    addTop('soft', t, H - t);
    legsBlocks(g, L, W, H - t, mats.legWood);
  } else if (model === 'linak') {
    const t = 0.03;
    topY = H;
    addTop('soft', t, H - t);
    legsLinak(g, L, W, H - t, mats.leg);
  } else if (model === 'tapered') {
    const t = 0.035;
    topY = H;
    addTop('soft', t, H - t);
    legsTapered(g, L, W, H - t, mats.legWood, null, 0.06);
  } else {
    // rect / live / river
    const t = model === 'rect' ? 0.045 : 0.05;
    topY = H;
    const kind = visual.top || (model === 'live' ? 'live' : 'rect');
    if (visual.clearEdges) {
      const inner = liveEdgeShape(L, W * 0.74, visual.seed || 6);
      const woodTop = mesh(extrudeTop(inner, L, W, t, 0.004), mats.top);
      woodTop.position.y = H - t;
      g.add(woodTop);
      const outer = roundedRectShape(L, W, 0.03);
      outer.holes.push(new THREE.Path(inner.getPoints(64)));
      const resin = mesh(extrudeTop(outer, L, W, t, 0.008), mats.resin);
      resin.position.y = H - t;
      g.add(resin);
    } else addTop(kind, t, H - t, { seed: visual.seed });
    const h = H - t;
    switch (visual.legs) {
      case 'metalTrapez':
        legsMetalTrapez(g, L, W, h, mats.leg);
        break;
      case 'metalX':
        legsMetalX(g, L, W, h, mats.leg);
        break;
      case 'woodU':
        legsWoodU(g, L, W, h, mats.legWood);
        break;
      default:
        legsMetalU(g, L, W, h, mats.leg);
    }
  }

  return { group: g, topY, footprint };
}
