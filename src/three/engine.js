import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildShowroom, BAYS, WALK, ROOM, PLINTH_H, SHADOW_TEX } from './showroom.js';
import { buildTable } from './tables.js';
import { getSurface, getVerticalWood, setMaxAnisotropy } from './textures.js';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

const FINISH = {
  gloss: { roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.5, specularIntensity: 1 },
  satin: { roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.18, envMapIntensity: 0.38, specularIntensity: 0.8 },
  matte: { roughness: 0.78, clearcoat: 0.08, clearcoatRoughness: 0.5, envMapIntensity: 0.28, specularIntensity: 0.5 },
};

const OUTSIDE = {
  pos: new THREE.Vector3(0, 1.75, 17),
  look: new THREE.Vector3(0, 3.1, 5),
};

export class ShowroomEngine extends EventTarget {
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.state = 'landing';
    this.isTouch = matchMedia('(pointer: coarse)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, this.isTouch ? 1.5 : 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = renderer;
    setMaxAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

    const scene = new THREE.Scene();
    this.scene = scene;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.32;

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 140);
    this.camera.position.copy(OUTSIDE.pos);
    this.camera.lookAt(OUTSIDE.look);

    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(scene, this.camera));
    // Bloom bilinçli olarak yok: parlak vernik yansımalarında kamera hareketiyle yanıp sönme yapıyordu.
    this.composer.addPass(new OutputPass());

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 0.8;
    this.controls.maxDistance = 5;
    this.controls.maxPolarAngle = 1.48;
    this.controls.autoRotateSpeed = 0.7;
    this.controls.addEventListener('start', () => (this.controls.autoRotate = false));

    this.walk = { z: WALK.zMax, zT: WALK.zMax, yaw: 0, yawT: 0, pitch: -0.04, pitchT: -0.04, bob: 0 };
    this.keys = new Set();
    this.pointer = new THREE.Vector2();
    this.mouse = { x: 0, y: 0 };
    this.raycaster = new THREE.Raycaster();
    this.hovered = -1;
    this.tweens = new Set();
    this.viewShift = { x: 0, y: 0 };
    this.scrollProgress = 0;
    this.bays = [];
    this.paused = false;
    this.perf = { frames: 0, time: 0, level: 0 };
    this.lowEnd = this.isTouch && (navigator.hardwareConcurrency || 4) <= 4;
    this.clock = new THREE.Clock();
    this._tmp = new THREE.Vector3();

    this._bindInput();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  // ---------------------------------------------------------------- kurulum
  async build(stations, initial, onProgress = () => {}) {
    const sr = buildShowroom(this.scene, stations);
    this.room = sr;
    this.doors = sr.doors;
    const metal = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.45, metalness: 0.6 });
    for (let i = 0; i < BAYS.length; i++) {
      const bay = sr.bays[i];
      const holder = new THREE.Group();
      holder.position.set(bay.x, PLINTH_H, bay.z);
      holder.rotation.y = Math.PI / 2;
      holder.userData.bay = i;
      this.scene.add(holder);
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.003;
      holder.add(shadow);
      this.bays.push({
        ...bay,
        index: i,
        station: stations[i],
        holder,
        shadow,
        model: null,
        mats: {
          top: new THREE.MeshPhysicalMaterial({ color: 0xffffff, bumpScale: 0.6 }),
          leg: new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.45, metalness: 0.6 }),
          legWood: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
          metal,
          resin: new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transmission: this.lowEnd ? 0 : 1,
            transparent: this.lowEnd,
            opacity: this.lowEnd ? 0.35 : 1,
            thickness: 0.05,
            roughness: 0.04,
            ior: 1.5,
            clearcoat: 1,
            clearcoatRoughness: 0.03,
            attenuationColor: new THREE.Color(0xd8e4e2),
            attenuationDistance: 0.6,
          }),
        },
      });
      onProgress((i + 0.2) / BAYS.length);
      await new Promise((r) => setTimeout(r, 0));
      const cfg = initial[i];
      this.setBay(i, cfg.visual, cfg.dims);
      onProgress((i + 1) / BAYS.length);
      await new Promise((r) => setTimeout(r, 0));
    }
    this.doors.set(0);
    this._loop();
  }

  /** Bir sergi alanındaki masayı verilen görünüm ve ölçüyle yeniden kurar. */
  setBay(i, visual, dims) {
    const b = this.bays[i];
    const surf = getSurface({ size: [1024, 512], planks: 0, ...visual.surface });
    const top = b.mats.top;
    top.map = surf.map;
    top.roughnessMap = surf.roughnessMap;
    top.bumpMap = surf.map;
    top.envMap = this.scene.environment;
    Object.assign(top, FINISH[visual.finish] || FINISH.satin);
    top.needsUpdate = true;

    const leg = b.mats.leg;
    if (visual.legColor === 'white') {
      leg.color.set(0xecebe7);
      leg.metalness = 0.15;
      leg.roughness = 0.45;
    } else {
      leg.color.set(0x161616);
      leg.metalness = 0.6;
      leg.roughness = 0.45;
    }
    if (visual.legWood) {
      const vw = getVerticalWood(visual.legWood, 5);
      b.mats.legWood.map = vw.map;
      b.mats.legWood.needsUpdate = true;
    }

    if (b.model) {
      b.holder.remove(b.model.group);
      b.model.group.traverse((o) => o.geometry && o.geometry.dispose());
    }
    const model = buildTable(visual, dims, b.mats);
    model.group.traverse((o) => {
      if (o.isMesh) o.userData.bay = i;
    });
    b.holder.add(model.group);
    b.model = model;
    b.shadow.scale.set(model.footprint.L * 1.35 + 0.2, model.footprint.W * 1.45 + 0.2, 1);
    b.topY = PLINTH_H + model.topY;
    b.footprint = model.footprint;
    b.visual = visual;
    b.dims = dims;
  }

  // ---------------------------------------------------------------- ekran
  resize() {
    const w = innerWidth;
    const h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w < 700 ? 66 : 55;
    this._applyViewShift();
  }

  _applyViewShift() {
    const w = innerWidth;
    const h = innerHeight;
    if (Math.abs(this.viewShift.x) > 0.5 || Math.abs(this.viewShift.y) > 0.5) {
      this.camera.setViewOffset(w, h, this.viewShift.x, this.viewShift.y, w, h);
    } else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  /** Panel açıkken sahneyi panelin dışına kaydırır. */
  shiftView(x, y, dur = 0.8) {
    const sx = this.viewShift.x;
    const sy = this.viewShift.y;
    return this.tween(dur, (p) => {
      this.viewShift.x = sx + (x - sx) * p;
      this.viewShift.y = sy + (y - sy) * p;
      this._applyViewShift();
    });
  }

  tween(duration, fn, ease = easeInOut) {
    return new Promise((resolve) => {
      this.tweens.add({ t0: performance.now(), duration: duration * 1000, fn, ease, resolve });
    });
  }

  _setState(s) {
    this.state = s;
    this.dispatchEvent(new CustomEvent('state', { detail: s }));
  }

  // ---------------------------------------------------------------- akışlar
  async enter() {
    if (this.state !== 'landing') return;
    this._setState('entering');
    const p0 = this.camera.position.clone();
    const curve = new THREE.CatmullRomCurve3([
      p0,
      new THREE.Vector3(0, 1.7, 9.5),
      new THREE.Vector3(0, 1.66, ROOM.front + 0.6),
      new THREE.Vector3(0, WALK.eye, WALK.zMax),
    ]);
    const look0 = OUTSIDE.look.clone();
    const look1 = new THREE.Vector3(0, 1.5, -12);
    await this.tween(
      3.6,
      (p) => {
        this.doors.set(Math.min(1, p / 0.42) ** 0.8 * 1.62);
        const e = easeInOutSine(p);
        curve.getPointAt(e, this.camera.position);
        this._tmp.lerpVectors(look0, look1, easeInOut(Math.min(1, p * 1.25)));
        this.camera.lookAt(this._tmp);
      },
      (t) => t
    );
    this._syncWalkFromCamera();
    this.walk.z = this.walk.zT = WALK.zMax;
    this._setState('walk');
    this.tween(1.4, (p) => this.doors.set(1.62 * (1 - p)));
  }

  async exit() {
    if (this.state === 'inspect') await this.uninspect(true);
    if (this.state !== 'walk') return;
    this._setState('exiting');
    const p0 = this.camera.position.clone();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const l0 = p0.clone().addScaledVector(dir, 4);
    const lBack = new THREE.Vector3(0, 1.7, 20);
    // önce kapıya dön
    await this.tween(1.1, (p) => {
      this._tmp.lerpVectors(l0, lBack, p);
      this.camera.lookAt(this._tmp);
    });
    const curve = new THREE.CatmullRomCurve3([p0, new THREE.Vector3(0, 1.66, ROOM.front - 0.8), new THREE.Vector3(0, 1.7, 9), new THREE.Vector3(0, 1.75, 13)]);
    await this.tween(2.6, (p) => {
      this.doors.set(Math.min(1, p / 0.35) * 1.62);
      curve.getPointAt(easeInOutSine(p), this.camera.position);
      this._tmp.copy(this.camera.position).add(new THREE.Vector3(0, 0, 5));
      this.camera.lookAt(this._tmp);
    });
    // geri dönüp vitrine bak
    const from = this.camera.position.clone();
    await this.tween(1.6, (p) => {
      this.camera.position.lerpVectors(from, OUTSIDE.pos, p);
      const back = new THREE.Vector3(0, 1.7, 30);
      this._tmp.lerpVectors(back, OUTSIDE.look, p);
      this.camera.lookAt(this._tmp);
      this.doors.set(1.62 * (1 - p));
    });
    this._setState('landing');
  }

  _syncWalkFromCamera() {
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    this.walk.yaw = this.walk.yawT = Math.atan2(-d.x, -d.z);
    this.walk.pitch = this.walk.pitchT = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
  }

  /** Koridorda ilgili masanın önüne yürü ve ona dön. */
  goToBay(i) {
    if (this.state !== 'walk') return;
    const b = this.bays[i];
    const z = THREE.MathUtils.clamp(b.z + 1.3, WALK.zMin, WALK.zMax);
    this.walk.zT = z;
    const target = Math.atan2(-b.x, -(b.z - z));
    this.walk.yawT = this.walk.yaw + wrapPi(target - this.walk.yaw);
    this.walk.pitchT = -0.22;
  }

  inspectPose(i) {
    const b = this.bays[i];
    const size = Math.max(b.footprint.L, b.footprint.W);
    const center = new THREE.Vector3(b.x, Math.max(0.35, b.topY - 0.12), b.z);
    const dist = size * 0.95 + (size < 0.8 ? 1.0 : 1.45);
    const dir = new THREE.Vector3(-b.side * 0.82, 0, 0.58).normalize();
    const pos = center.clone().addScaledVector(dir, dist);
    pos.y = center.y + dist * 0.55;
    return { center, pos, dist };
  }

  async inspect(i) {
    if (this.state !== 'walk' && this.state !== 'inspect') return;
    const fromInspect = this.state === 'inspect';
    this._setState('moving');
    this.controls.enabled = false;
    const { center, pos, dist } = this.inspectPose(i);
    const p0 = this.camera.position.clone();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const l0 = fromInspect ? this.controls.target.clone() : p0.clone().addScaledVector(dir, 3);
    // koridorun ortasından geçerek uç
    const mid = new THREE.Vector3((p0.x + pos.x) / 2 * 0.3, Math.max(p0.y, pos.y) + 0.15, (p0.z + pos.z) / 2);
    const curve = new THREE.QuadraticBezierCurve3(p0, mid, pos);
    const travel = p0.distanceTo(pos);
    this.inspecting = i;
    this.dispatchEvent(new CustomEvent('inspect', { detail: i }));
    await this.tween(THREE.MathUtils.clamp(0.9 + travel * 0.08, 1.1, 2.4), (p) => {
      curve.getPoint(p, this.camera.position);
      this._tmp.lerpVectors(l0, center, easeInOut(Math.min(1, p * 1.3)));
      this.camera.lookAt(this._tmp);
    });
    this.controls.target.copy(center);
    this.controls.minDistance = Math.max(0.6, dist * 0.45);
    this.controls.maxDistance = dist * 2;
    this.controls.enabled = true;
    this.controls.autoRotate = true;
    this.controls.update();
    this._setState('inspect');
  }

  async uninspect(fast = false) {
    if (this.state !== 'inspect') return;
    const i = this.inspecting;
    this._setState('moving');
    this.controls.enabled = false;
    const b = this.bays[i];
    const z = THREE.MathUtils.clamp(b.z + 1.6, WALK.zMin, WALK.zMax);
    const p0 = this.camera.position.clone();
    const p1 = new THREE.Vector3(0, WALK.eye, z);
    const l0 = this.controls.target.clone();
    const l1 = new THREE.Vector3(b.x * 0.9, 0.9, b.z);
    this.dispatchEvent(new CustomEvent('inspect', { detail: -1 }));
    await this.tween(fast ? 0.7 : 1.2, (p) => {
      this.camera.position.lerpVectors(p0, p1, p);
      this._tmp.lerpVectors(l0, l1, p);
      this.camera.lookAt(this._tmp);
    });
    this.inspecting = -1;
    this._syncWalkFromCamera();
    this.walk.z = this.walk.zT = z;
    this._setState('walk');
  }

  // ---------------------------------------------------------------- giriş
  _bindInput() {
    const c = this.canvas;
    let down = null;
    c.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), type: e.pointerType, moved: 0 };
      if (this.state === 'walk') c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / innerHeight) * 2 + 1;
      if (down && this.state === 'walk') {
        const dx = e.clientX - down.lx;
        const dy = e.clientY - down.ly;
        down.lx = e.clientX;
        down.ly = e.clientY;
        down.moved += Math.abs(dx) + Math.abs(dy);
        if (down.type === 'touch') {
          this.walk.yawT += dx * 0.0055;
          this.walk.zT = THREE.MathUtils.clamp(this.walk.zT + dy * 0.025, WALK.zMin, WALK.zMax);
        } else {
          this.walk.yawT += dx * 0.0042;
          this.walk.pitchT = THREE.MathUtils.clamp(this.walk.pitchT + dy * 0.003, -0.6, 0.45);
        }
      }
      if (!down) this._needsHover = true;
    });
    const up = (e) => {
      if (!down) return;
      const click = down.moved < 8 && performance.now() - down.t < 600;
      down = null;
      if (click) {
        const i = this._pick(e.clientX, e.clientY);
        if (i >= 0 && (this.state === 'walk' || this.state === 'inspect')) {
          if (this.state === 'inspect' && i === this.inspecting) return;
          this.inspect(i);
        }
      }
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', () => (down = null));
    c.addEventListener(
      'wheel',
      (e) => {
        if (this.state !== 'walk') return;
        e.preventDefault();
        this.walk.zT = THREE.MathUtils.clamp(this.walk.zT - e.deltaY * 0.0045, WALK.zMin, WALK.zMax);
      },
      { passive: false }
    );
    addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input,textarea,select')) return;
      this.keys.add(e.key.toLowerCase());
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());
  }

  _pick(x, y) {
    this.pointer.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objs = this.bays.map((b) => b.model && b.model.group).filter(Boolean);
    const hit = this.raycaster.intersectObjects(objs, true)[0];
    if (!hit || hit.distance > 16) return -1;
    return hit.object.userData.bay ?? -1;
  }

  // ---------------------------------------------------------------- döngü
  _updateWalk(dt) {
    const w = this.walk;
    const k = this.keys;
    const fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const turn = (k.has('a') || k.has('arrowleft') ? 1 : 0) - (k.has('d') || k.has('arrowright') ? 1 : 0);
    if (fwd) {
      // bakılan yöne göre ileri/geri
      const dir = -Math.cos(w.yaw) >= 0 ? 1 : -1;
      w.zT = THREE.MathUtils.clamp(w.zT + fwd * dir * 3.2 * dt, WALK.zMin, WALK.zMax);
    }
    if (turn) w.yawT += turn * 1.6 * dt;
    const pz = w.z;
    w.z = damp(w.z, w.zT, 3.2, dt);
    w.yaw = damp(w.yaw, w.yawT, 6, dt);
    w.pitch = damp(w.pitch, w.pitchT, 6, dt);
    const speed = Math.abs(w.z - pz) / Math.max(dt, 1e-4);
    w.bob += speed * dt * 5.2;
    const bob = Math.sin(w.bob) * 0.018 * Math.min(1, speed / 1.5);
    // fare ile hafif bakış
    const ly = this.isTouch ? 0 : -this.mouse.x * 0.08;
    const lp = this.isTouch ? 0 : this.mouse.y * 0.04;
    this.camera.position.set(0, WALK.eye + bob, w.z);
    this.camera.rotation.set(w.pitch + lp, w.yaw + ly, 0, 'YXZ');
  }

  _updateLanding(dt) {
    const s = this.scrollProgress;
    const target = this._tmp.set(OUTSIDE.pos.x + this.mouse.x * 0.5, OUTSIDE.pos.y + this.mouse.y * 0.15 + s * 0.4, OUTSIDE.pos.z - s * 4.5);
    this.camera.position.x = damp(this.camera.position.x, target.x, 3, dt);
    this.camera.position.y = damp(this.camera.position.y, target.y, 3, dt);
    this.camera.position.z = damp(this.camera.position.z, target.z, 3, dt);
    this.camera.lookAt(OUTSIDE.look.x, OUTSIDE.look.y - s * 0.6, OUTSIDE.look.z);
  }

  _updateHover() {
    if (!this._needsHover) return;
    this._needsHover = false;
    let i = -1;
    if (this.state === 'walk' || this.state === 'inspect') {
      i = this._pick((this.mouse.x + 1) * 0.5 * innerWidth, (1 - this.mouse.y) * 0.5 * innerHeight);
      if (this.state === 'inspect' && i === this.inspecting) i = -1;
    }
    if (i !== this.hovered) {
      this.hovered = i;
      this.canvas.style.cursor = i >= 0 ? 'pointer' : '';
      this.dispatchEvent(new CustomEvent('hover', { detail: i }));
    }
  }

  /** Kare süresi uzun süre yüksekse çözünürlüğü bir kademe düşürür (en fazla 2 kez, 1x altına inmez). */
  _adapt(dt) {
    const p = this.perf;
    if (p.level >= 2 || dt > 0.25 || this.tweens.size || this.state === 'landing') return;
    p.frames++;
    p.time += dt;
    if (p.frames < 150) return;
    const avg = p.time / p.frames;
    p.frames = 0;
    p.time = 0;
    if (avg < 1 / 32) return;
    const pr = this.renderer.getPixelRatio();
    if (pr <= 1) {
      p.level = 2;
      return;
    }
    p.level++;
    this._setPixelRatio(Math.max(1, pr - 0.4));
  }

  _setPixelRatio(pr) {
    this.renderer.setPixelRatio(pr);
    this.composer.setPixelRatio(pr);
    this.resize();
  }

  /** Etiket konumları için ekran koordinatı. */
  project(i) {
    const b = this.bays[i];
    const v = this._tmp.set(b.x, b.topY + 0.55, b.z);
    const dist = v.distanceTo(this.camera.position);
    v.project(this.camera);
    return { x: (v.x + 1) * 0.5 * innerWidth, y: (1 - v.y) * 0.5 * innerHeight, visible: v.z < 1, dist };
  }

  _loop() {
    const tick = () => {
      requestAnimationFrame(tick);
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const now = performance.now();
      const busy = this.tweens.size > 0 || this.state !== 'landing';
      if ((this.paused || document.hidden) && !busy) return;
      this._adapt(rawDt);
      for (const tw of this.tweens) {
        const p = Math.min(1, (now - tw.t0) / tw.duration);
        tw.fn(tw.ease(p), p);
        if (p >= 1) {
          this.tweens.delete(tw);
          tw.resolve();
        }
      }
      if (this.state === 'landing') this._updateLanding(dt);
      else if (this.state === 'walk') this._updateWalk(dt);
      else if (this.state === 'inspect') {
        this.controls.update();
        const p = this.camera.position;
        p.x = THREE.MathUtils.clamp(p.x, -ROOM.halfW + 0.4, ROOM.halfW - 0.4);
        p.y = THREE.MathUtils.clamp(p.y, 0.3, ROOM.height - 0.3);
      }
      this._updateHover();
      for (const b of this.bays) {
        const s = b.holder.parent && this.room.spots[b.index];
        if (s) s.intensity = damp(s.intensity, s.userData.base * (b.index === this.hovered ? 1.15 : 1), 3, dt);
      }
      this.dispatchEvent(new Event('frame'));
      this.composer.render(dt);
    };
    tick();
  }
}
