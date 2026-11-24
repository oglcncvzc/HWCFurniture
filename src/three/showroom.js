import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getFloorTexture, getVerticalWood, logoTexture } from './textures.js';
import { mulberry32 } from './noise.js';

export const ROOM = { halfW: 7, front: 5, back: -26, height: 4.4, wall: 0.3 };
export const PLINTH_H = 0.12;
const ROWS = [-1.2, -7.6, -14, -20.4];
export const WALK = { zMax: 3.4, zMin: -21.5, eye: 1.62 };

/** 8 sergi alanı: sırayla sol, sağ, sol, sağ… */
export const BAYS = ROWS.flatMap((z) => [
  { x: -3.85, z, side: -1 },
  { x: 3.85, z, side: 1 },
]);

const DOOR = { w: 2.6, h: 3.1 };

/** Yüzeye çok yakın düzlemler için: derinlik çakışmasını (z-fighting) önler. */
function decal(mat, strength = 1) {
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -2 * strength;
  mat.polygonOffsetUnits = -4 * strength;
  return mat;
}

function std(color, rough = 0.8, metal = 0, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
}

function addBox(parent, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------------------
function makePlant(rand, scale = 1, tall = false) {
  const g = new THREE.Group();
  const potMat = std(0x8e857a, 0.75);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * scale, 0.2 * scale, 0.55 * scale, 28), potMat);
  pot.position.y = 0.275 * scale;
  g.add(pot);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.24 * scale, 20), std(0x2b2119, 1));
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 0.53 * scale;
  g.add(soil);
  const trunkMat = std(0x5b4636, 0.9);
  const leafMats = [std(0x46603a, 0.85, 0, { flatShading: true }), std(0x587347, 0.85, 0, { flatShading: true }), std(0x3a5232, 0.85, 0, { flatShading: true })];
  const h = (tall ? 2.1 : 1.3) * scale;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * scale, 0.04 * scale, h, 8), trunkMat);
  trunk.position.y = 0.5 * scale + h / 2;
  g.add(trunk);
  const n = tall ? 14 : 9;
  for (let i = 0; i < n; i++) {
    const r = (0.18 + rand() * 0.2) * scale;
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leafMats[i % 3]);
    const a = rand() * Math.PI * 2;
    const d = rand() * 0.32 * scale;
    leaf.position.set(Math.cos(a) * d, 0.5 * scale + h * (0.55 + rand() * 0.5), Math.sin(a) * d);
    leaf.scale.y = 0.8 + rand() * 0.4;
    g.add(leaf);
  }
  return g;
}

function contactShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.25)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  return t;
}
export const SHADOW_TEX = contactShadowTexture();

// ---------------------------------------------------------------------------
export function buildShowroom(scene, stations) {
  const root = new THREE.Group();
  scene.add(root);
  const { halfW, front, back, height, wall } = ROOM;
  const len = front - back;
  const midZ = (front + back) / 2;
  const rand = mulberry32(7);

  // ---------------- Malzemeler
  const floorTex = getFloorTexture();
  floorTex.map.repeat.set((2 * halfW) / 2.5, len / 2.5);
  floorTex.roughnessMap.repeat.copy(floorTex.map.repeat);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex.map,
    roughnessMap: floorTex.roughnessMap,
    roughness: 0.55,
    metalness: 0,
  });
  const plasterMat = std(0xb9afa3, 0.95);
  const ceilingMat = std(0x8f877e, 0.95);
  const facadeMat = std(0x2c2a28, 0.88);
  const darkMetal = std(0x1b1b1b, 0.45, 0.6);
  const stoneMat = std(0x9d958b, 0.6);
  const slatWood = getVerticalWood('ceviz', 3);
  const slatMat = new THREE.MeshStandardMaterial({ map: slatWood.map, roughness: 0.7, color: 0xffffff });
  const cladWood = getVerticalWood('meseKoyu', 9);
  const cladMat = new THREE.MeshStandardMaterial({ map: cladWood.map, roughness: 0.75 });
  const stripMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff3e2, emissiveIntensity: 2.2 });

  // ---------------- Zemin, duvarlar, tavan
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * halfW, len), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, midZ);
  root.add(floor);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(len, height), plasterMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-halfW, height / 2, midZ);
  root.add(leftWall);
  const rightWall = leftWall.clone();
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.x = halfW;
  root.add(rightWall);
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(2 * halfW, height), plasterMat);
  backWall.position.set(0, height / 2, back);
  root.add(backWall);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(2 * halfW, len), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, height, midZ);
  root.add(ceiling);

  // süpürgelik
  for (const s of [-1, 1]) addBox(root, 0.02, 0.08, len, darkMetal, s * (halfW - 0.01), 0.04, midZ);

  // ---------------- Tavan ışık bantları
  for (let z = front - 2; z > back + 1; z -= 2.6) {
    addBox(root, 3.6, 0.03, 0.08, stripMat, 0, height - 0.016, z);
  }
  for (const s of [-1, 1]) {
    addBox(root, 0.06, 0.03, len - 1.2, stripMat, s * (halfW - 0.5), height - 0.016, midZ);
  }

  // ---------------- Ön cephe (iç yüzü z=front)
  const fz = front + wall / 2;
  const win = { x0: 2.9, x1: 6.3, y0: 0.5, y1: 3.3 };
  const seg = (x0, x1, y0, y1) => addBox(root, x1 - x0, y1 - y0, wall, facadeMat, (x0 + x1) / 2, (y0 + y1) / 2, fz);
  const FH = 7.5;
  const FW = 16;
  for (const s of [-1, 1]) {
    const m = (a) => a * s;
    const xs = (a, b) => [Math.min(m(a), m(b)), Math.max(m(a), m(b))];
    seg(...xs(win.x1, FW), 0, FH);
    seg(...xs(win.x0, win.x1), 0, win.y0);
    seg(...xs(win.x0, win.x1), win.y1, FH);
    seg(...xs(DOOR.w / 2, win.x0), 0, FH);
    // vitrin camı + çerçeve
    const gx = s * (win.x0 + win.x1) / 2;
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(win.x1 - win.x0, win.y1 - win.y0),
      new THREE.MeshPhysicalMaterial({ color: 0x9fb0b8, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.4 })
    );
    glass.position.set(gx, (win.y0 + win.y1) / 2, front + wall * 0.6);
    root.add(glass);
    const fw = win.x1 - win.x0;
    const fy = (win.y0 + win.y1) / 2;
    addBox(root, fw + 0.08, 0.06, 0.08, darkMetal, gx, win.y0, front + wall * 0.6);
    addBox(root, fw + 0.08, 0.06, 0.08, darkMetal, gx, win.y1, front + wall * 0.6);
    addBox(root, 0.06, win.y1 - win.y0, 0.08, darkMetal, s * win.x0, fy, front + wall * 0.6);
    addBox(root, 0.06, win.y1 - win.y0, 0.08, darkMetal, s * win.x1, fy, front + wall * 0.6);
    addBox(root, 0.04, win.y1 - win.y0, 0.06, darkMetal, gx, fy, front + wall * 0.6);
    // girişi çevreleyen ahşap kaplama
    const clad = new THREE.Mesh(new THREE.BoxGeometry(win.x0 - DOOR.w / 2 - 0.2, 4.6, 0.04), cladMat);
    clad.position.set(s * ((win.x0 + DOOR.w / 2) / 2), 2.3, front + wall + 0.02);
    root.add(clad);
  }
  seg(-DOOR.w / 2, DOOR.w / 2, DOOR.h, FH);
  const cladTop = new THREE.Mesh(new THREE.BoxGeometry(DOOR.w + 0.02, 4.6 - DOOR.h, 0.04), cladMat);
  cladTop.position.set(0, DOOR.h + (4.6 - DOOR.h) / 2, front + wall + 0.02);
  root.add(cladTop);
  // kapı kasası
  addBox(root, DOOR.w + 0.1, 0.05, wall + 0.04, darkMetal, 0, DOOR.h + 0.025, fz);
  for (const s of [-1, 1]) addBox(root, 0.05, DOOR.h, wall + 0.04, darkMetal, s * (DOOR.w / 2 + 0.025), DOOR.h / 2, fz);

  // tente + tabela
  addBox(root, 4.4, 0.12, 1.5, darkMetal, 0, 4.75, front + wall + 0.75);
  const downMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffe2b8, emissiveIntensity: 6 });
  for (const x of [-1.4, 0, 1.4]) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), downMat);
    d.rotation.x = Math.PI / 2;
    d.position.set(x, 4.685, front + wall + 0.9);
    root.add(d);
  }
  const sign = logoTexture('EL YAPIMI MASİF AHŞAP · ANKARA');
  const signMat = decal(new THREE.MeshBasicMaterial({ map: sign, transparent: true, color: new THREE.Color(1.6, 1.45, 1.25) }));
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), signMat);
  signMesh.position.set(0, 5.95, front + wall + 0.012);
  root.add(signMesh);

  // ---------------- Kapılar
  const doorWood = getVerticalWood('cevizKoyu', 13);
  const doorMat = new THREE.MeshStandardMaterial({ map: doorWood.map, roughness: 0.55 });
  const brass = std(0xb8925a, 0.3, 1);
  const doorGlass = decal(new THREE.MeshPhysicalMaterial({ color: 0xdfe8ea, roughness: 0.05, transparent: true, opacity: 0.25 }));
  const leaves = [];
  for (const dir of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(-dir * (DOOR.w / 2), 0, fz);
    const lw = DOOR.w / 2 - 0.01;
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(lw, DOOR.h - 0.02, 0.07), doorMat);
    frameL.position.set((dir * lw) / 2, DOOR.h / 2, 0);
    pivot.add(frameL);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(lw * 0.5, DOOR.h * 0.72, 0.075), doorGlass);
    gl.position.set(dir * lw * 0.5, DOOR.h * 0.52, 0);
    pivot.add(gl);
    for (const side of [-1, 1]) {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.3, 12), brass);
      handle.position.set(dir * (lw - 0.13), 1.25, side * 0.09);
      pivot.add(handle);
    }
    root.add(pivot);
    leaves.push({ pivot, dir });
  }
  const doors = {
    angle: 0,
    set(a) {
      this.angle = a;
      for (const l of leaves) l.pivot.rotation.y = l.dir * a;
    },
  };

  // ---------------- Dış çevre
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(90, 32, 16),
    new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: skyTexture(), fog: false, depthWrite: false })
  );
  sky.position.set(0, 0, front + 10);
  root.add(sky);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), std(0x36332f, 0.72));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.005, front + wall + 30);
  root.add(ground);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(5, 14), decal(std(0x6b655d, 0.6)));
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(0, 0.002, front + wall + 7);
  root.add(walk);
  // dış saksılar
  for (const s of [-1, 1]) {
    const p = makePlant(rand, 1.35, true);
    p.position.set(s * 2.25, 0, front + wall + 0.9);
    root.add(p);
  }
  // babalar (bollard)
  const bollardLight = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd9a8, emissiveIntensity: 3 });
  for (let i = 0; i < 4; i++) {
    for (const s of [-1, 1]) {
      const b = addBox(root, 0.14, 0.7, 0.14, darkMetal, s * 2.8, 0.35, front + wall + 2.5 + i * 3);
      const l = addBox(root, 0.142, 0.08, 0.142, bollardLight, 0, 0.25, 0);
      b.add(l);
    }
  }

  // ---------------- Işıklar
  scene.add(new THREE.HemisphereLight(0xfff4e8, 0x6b5a4a, 0.22));
  for (const z of [2, -5.5, -12.5, -19.5]) {
    const p = new THREE.PointLight(0xffe6cc, 5, 0, 2);
    p.position.set(0, height - 0.5, z);
    scene.add(p);
  }
  const canopySpot = new THREE.SpotLight(0xffd9a8, 60, 0, 0.9, 0.8, 2);
  canopySpot.position.set(0, 4.6, front + wall + 1);
  canopySpot.target.position.set(0, 0, front + wall + 2.2);
  scene.add(canopySpot, canopySpot.target);
  const facadeWash = new THREE.SpotLight(0xffe0bc, 90, 0, 0.7, 0.9, 2);
  facadeWash.position.set(0, 0.3, front + wall + 6);
  facadeWash.target.position.set(0, 5, front + wall);
  scene.add(facadeWash, facadeWash.target);
  const moon = new THREE.DirectionalLight(0x9db4d8, 0.35);
  moon.position.set(-10, 20, 30);
  scene.add(moon);

  // ---------------- Sergi alanları
  const slatGeo = new THREE.BoxGeometry(0.045, 3.4, 0.045);
  const slatCount = BAYS.length * 52 + 150;
  const slats = new THREE.InstancedMesh(slatGeo, slatMat, slatCount);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let si = 0;
  const addSlat = (x, z, rotY) => {
    dummy.position.set(x, 0.2 + 1.7, z);
    dummy.rotation.set(0, rotY, 0);
    dummy.updateMatrix();
    slats.setMatrixAt(si, dummy.matrix);
    const t = 0.85 + rand() * 0.3;
    slats.setColorAt(si, col.setRGB(t, t * 0.97, t * 0.94));
    si++;
  };
  const backerMat = decal(std(0x1d1814, 0.9));

  const spots = [];
  const bayRefs = [];
  BAYS.forEach((bay, i) => {
    const st = stations[i];
    // podyum
    const plinth = new THREE.Mesh(new RoundedBoxGeometry(3.2, PLINTH_H, 4.4, 3, 0.03), stoneMat);
    plinth.position.set(bay.x, PLINTH_H / 2, bay.z);
    root.add(plinth);
    // duvar çıtaları
    const wx = bay.side * (halfW - 0.05);
    const backer = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 3.4), backerMat);
    backer.rotation.y = -bay.side * Math.PI / 2;
    backer.position.set(bay.side * (halfW - 0.015), 1.9, bay.z);
    root.add(backer);
    for (let k = 0; k < 52; k++) addSlat(wx, bay.z - 2.4 + k * 0.094, 0);
    // tavan spotu
    const spot = new THREE.SpotLight(0xfff1de, 34, 0, 0.5, 0.7, 2);
    spot.position.set(bay.x - bay.side * 0.6, height - 0.1, bay.z);
    spot.target.position.set(bay.x, 0.6, bay.z);
    scene.add(spot, spot.target);
    spot.userData.base = 34;
    spots.push(spot);
    // sarkıt lamba
    if (st && st.pendant) addPendant(root, bay, st.pendant, height);
    bayRefs.push({ ...bay, plinthTop: PLINTH_H });
  });

  // arka duvar: tam genişlik çıtalar + logo plaketi
  for (let x = -halfW + 0.2; x < halfW - 0.2; x += 0.094) addSlat(x, back + 0.05, Math.PI / 2);
  const backBacker = new THREE.Mesh(new THREE.PlaneGeometry(2 * halfW, 3.4), backerMat);
  backBacker.position.set(0, 1.9, back + 0.015);
  root.add(backBacker);
  slats.count = si;
  slats.instanceMatrix.needsUpdate = true;
  if (slats.instanceColor) slats.instanceColor.needsUpdate = true;
  root.add(slats);

  const plaque = new THREE.Mesh(new RoundedBoxGeometry(5.6, 1.7, 0.08, 3, 0.03), std(0x1a1716, 0.6));
  plaque.position.set(0, 2.3, back + 0.14);
  root.add(plaque);
  const logo = logoTexture('ATÖLYEDEN SOFRANIZA', '#f6ead8');
  const logoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 1.25),
    new THREE.MeshBasicMaterial({ map: logo, transparent: true, color: new THREE.Color(1.5, 1.38, 1.2) })
  );
  logoMesh.position.set(0, 2.3, back + 0.19);
  root.add(logoMesh);
  const backSpot = new THREE.SpotLight(0xffe2bf, 50, 0, 0.8, 0.9, 2);
  backSpot.position.set(0, height - 0.1, back + 3.5);
  backSpot.target.position.set(0, 1.8, back);
  scene.add(backSpot, backSpot.target);

  // bitkiler
  const plantSpots = [
    [-6.2, 3.8],
    [6.2, 3.8],
    [-6.3, -4.4],
    [6.3, -4.4],
    [-6.3, -10.8],
    [6.3, -10.8],
    [-6.3, -17.2],
    [6.3, -17.2],
    [-6.2, -24.6],
    [6.2, -24.6],
  ];
  plantSpots.forEach(([x, z], i) => {
    const p = makePlant(rand, 1 + (i % 3) * 0.12, i % 2 === 0);
    p.position.set(x, 0, z);
    p.rotation.y = rand() * 6;
    root.add(p);
  });

  // giriş paspası + karşılama bankosu
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), decal(std(0x3b3632, 1)));
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(0, 0.003, front - 0.9);
  root.add(mat);

  return { root, doors, spots, bays: bayRefs };
}

function addPendant(root, bay, kind, height) {
  const black = std(0x161616, 0.5, 0.4);
  const glow = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffe0b0, emissiveIntensity: 5 });
  const y = 2.15;
  if (kind === 'dome') {
    const shade = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), black);
    shade.material.side = THREE.DoubleSide;
    shade.position.set(bay.x, y, bay.z);
    root.add(shade);
    const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), glow);
    bulb.rotation.x = Math.PI / 2;
    bulb.position.set(bay.x, y - 0.002, bay.z);
    root.add(bulb);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, height - y - 0.26, 6), black);
    cord.position.set(bay.x, (height + y + 0.26) / 2, bay.z);
    root.add(cord);
    return;
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 1.5), black);
  bar.position.set(bay.x, y, bay.z);
  root.add(bar);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.006, 1.44), glow);
  strip.position.set(bay.x, y - 0.026, bay.z);
  root.add(strip);
  for (const dz of [-0.6, 0.6]) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, height - y, 6), black);
    cord.position.set(bay.x, (height + y) / 2, bay.z + dz);
    root.add(cord);
  }
}

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#0f1622');
  g.addColorStop(0.32, '#1d2a3d');
  g.addColorStop(0.46, '#4a4d5c');
  g.addColorStop(0.5, '#b67d58');
  g.addColorStop(0.53, '#3a3330');
  g.addColorStop(1, '#1b1917');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
