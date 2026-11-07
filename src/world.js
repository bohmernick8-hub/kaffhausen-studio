import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- helpers ----------
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
let seed = 7;
export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const setSeed = s => (seed = s);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// ---------- textures ----------
function plankTex(base = '#8a5a3b', boards = 7, weathered = true) {
  return canvasTex(512, 512, (g, w, h) => {
    const bw = w / boards;
    for (let i = 0; i < boards; i++) {
      const l = 0.85 + rnd() * 0.3;
      const col = new THREE.Color(base).multiplyScalar(l);
      g.fillStyle = '#' + col.getHexString();
      g.fillRect(i * bw, 0, bw, h);
      // grain
      g.globalAlpha = 0.12;
      for (let k = 0; k < 18; k++) {
        g.fillStyle = rnd() > 0.5 ? '#000' : '#fff';
        g.fillRect(i * bw + rnd() * bw, 0, 1 + rnd() * 2, h);
      }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(i * bw, 0, 3, h);
      if (weathered && rnd() > 0.6) { // knots
        g.fillStyle = 'rgba(40,20,10,0.5)';
        g.beginPath(); g.ellipse(i * bw + bw / 2, rnd() * h, 6, 10, 0, 0, 7); g.fill();
      }
    }
  });
}
function corrugatedTex() {
  return canvasTex(512, 512, (g, w, h) => {
    for (let x = 0; x < w; x += 16) {
      const grd = g.createLinearGradient(x, 0, x + 16, 0);
      grd.addColorStop(0, '#6f7378'); grd.addColorStop(0.5, '#a9adb1'); grd.addColorStop(1, '#5d6166');
      g.fillStyle = grd; g.fillRect(x, 0, 16, h);
    }
    // rust patches
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(${140 + rnd() * 50},${60 + rnd() * 30},20,${0.25 + rnd() * 0.4})`;
      g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 10 + rnd() * 50, 6 + rnd() * 30, rnd() * 3, 0, 7); g.fill();
    }
  });
}
function grassTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#6aa845'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const c = new THREE.Color().setHSL(0.25 + rnd() * 0.05, 0.5, 0.36 + rnd() * 0.08); g.fillStyle = '#' + c.getHexString(); g.globalAlpha = 0.35; g.beginPath(); g.arc(rnd() * w, rnd() * h, 20 + rnd() * 60, 0, 7); g.fill(); }
    g.globalAlpha = 0.5;
    for (let i = 0; i < 14000; i++) {
      const c = new THREE.Color().setHSL(0.24 + rnd() * 0.07, 0.5, 0.3 + rnd() * 0.18);
      g.fillStyle = '#' + c.getHexString();
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 1.5, 2 + rnd() * 3);
    }
    g.globalAlpha = 1;
  });
}

// ---------- props ----------
export function makeShed() {
  const g = new THREE.Group();
  const wood = std(0xffffff, { map: plankTex('#8b5e3c', 8) });
  const woodDark = std(0x5b3a24);
  // walls (slightly crooked)
  const body = mesh(new THREE.BoxGeometry(3.2, 2.3, 2.6), wood, 0, 1.15, 0, g);
  // trim posts
  for (const [x, z] of [[-1.62, 1.32], [1.62, 1.32], [-1.62, -1.32], [1.62, -1.32]])
    mesh(new THREE.BoxGeometry(0.16, 2.4, 0.16), woodDark, x, 1.2, z, g);
  // roof: corrugated metal, single slope
  const roofMat = std(0xffffff, { map: corrugatedTex(), roughness: 0.55, metalness: 0.45 });
  const roof = mesh(new THREE.BoxGeometry(3.9, 0.08, 3.3), roofMat, 0, 2.55, 0.05, g);
  roof.rotation.x = 0.16; roof.rotation.z = 0.03;
  // door
  const door = mesh(new THREE.BoxGeometry(0.95, 1.75, 0.08), std(0xffffff, { map: plankTex('#6e4a30', 4) }), -0.6, 0.9, 1.33, g);
  door.rotation.y = -0.05;
  mesh(new THREE.BoxGeometry(0.95, 0.1, 0.1), woodDark, -0.6, 1.25, 1.39, g).rotation.z = 0.35; // Z brace
  mesh(new THREE.SphereGeometry(0.05, 12, 8), std(0x333333, { metalness: 0.8, roughness: 0.3 }), -0.25, 0.9, 1.4, g);
  // window with warm light
  const frame = mesh(new THREE.BoxGeometry(0.9, 0.75, 0.1), woodDark, 0.75, 1.35, 1.33, g);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.6), new THREE.MeshStandardMaterial({ color: 0xffc46b, emissive: 0xffa53c, emissiveIntensity: 1.4 }));
  glass.position.set(0.75, 1.35, 1.39); g.add(glass);
  mesh(new THREE.BoxGeometry(0.06, 0.62, 0.04), woodDark, 0.75, 1.35, 1.41, g);
  mesh(new THREE.BoxGeometry(0.76, 0.06, 0.04), woodDark, 0.75, 1.35, 1.41, g);
  const winLight = new THREE.PointLight(0xffa04a, 2.5, 4, 2);
  winLight.position.set(0.75, 1.35, 1.9); g.add(winLight);
  // patched board
  const patch = mesh(new THREE.BoxGeometry(0.7, 0.22, 0.04), std(0x9b7450), 1.0, 0.45, 1.34, g); patch.rotation.z = -0.12;
  // stovepipe
  const pipe = mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 14), std(0x3a3a3a, { metalness: 0.6, roughness: 0.5 }), 1.1, 3.0, -0.6, g);
  pipe.rotation.z = 0.06;
  mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.12, 14), std(0x2a2a2a, { metalness: 0.6 }), 1.13, 3.55, -0.6, g);
  // step stone + crate + bucket
  mesh(new RoundedBoxGeometry(1.0, 0.16, 0.5, 2, 0.05), std(0x9a9a92), -0.6, 0.08, 1.65, g);
  mesh(new RoundedBoxGeometry(0.5, 0.45, 0.5, 2, 0.03), std(0xffffff, { map: plankTex('#a77c4f', 4) }), 1.85, 0.23, 1.1, g).rotation.y = 0.4;
  mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.32, 16), std(0x5d84a8, { metalness: 0.5, roughness: 0.4 }), 1.9, 0.6, 1.1, g);
  g.rotation.y = 0.02;
  return g;
}

export function makeBench() {
  const g = new THREE.Group();
  const wood = std(0xffffff, { map: plankTex('#9c6b43', 3) });
  const iron = std(0x2d2f33, { metalness: 0.6, roughness: 0.45 });
  for (let i = 0; i < 3; i++) mesh(new RoundedBoxGeometry(1.8, 0.07, 0.16, 2, 0.02), wood, 0, 0.48, -0.2 + i * 0.19, g);
  for (let i = 0; i < 2; i++) { const b = mesh(new RoundedBoxGeometry(1.8, 0.16, 0.06, 2, 0.02), wood, 0, 0.75 + i * 0.2, -0.33, g); b.rotation.x = -0.15; }
  for (const x of [-0.75, 0.75]) {
    mesh(new THREE.BoxGeometry(0.07, 0.48, 0.07), iron, x, 0.24, 0.12, g);
    mesh(new THREE.BoxGeometry(0.07, 1.0, 0.07), iron, x, 0.5, -0.33, g).rotation.x = -0.12;
    mesh(new THREE.BoxGeometry(0.07, 0.07, 0.55), iron, x, 0.6, -0.08, g);
  }
  return g;
}

export function makeLamp() {
  const g = new THREE.Group();
  const iron = std(0x24272b, { metalness: 0.7, roughness: 0.35 });
  mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.3, 16), iron, 0, 0.15, 0, g);
  mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 12), iron, 0, 1.75, 0, g);
  mesh(new THREE.CylinderGeometry(0.24, 0.14, 0.12, 6), iron, 0, 3.35, 0, g);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffb45a, emissiveIntensity: 4 });
  mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.42, 6), glassMat, 0, 3.62, 0, g).castShadow = false;
  mesh(new THREE.ConeGeometry(0.32, 0.28, 6), iron, 0, 3.97, 0, g);
  mesh(new THREE.SphereGeometry(0.05, 8, 6), iron, 0, 4.13, 0, g);
  const l = new THREE.PointLight(0xffb060, 14, 10, 1.5);
  l.position.set(0, 3.55, 0); l.castShadow = true; l.shadow.mapSize.set(512, 512); l.shadow.bias = -0.002;
  g.add(l);
  return g;
}

export function makeTree(scale = 1, hue = 0.27) {
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.14, 0.24, 1.8, 8), std(0x6b4630), 0, 0.9, 0, g);
  trunk.rotation.z = (rnd() - 0.5) * 0.12;
  const n = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const c = new THREE.Color().setHSL(hue + (rnd() - 0.5) * 0.04, 0.5, 0.33 + rnd() * 0.1);
    const geo = new THREE.IcosahedronGeometry(0.75 + rnd() * 0.4, 1);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (1 + (rnd() - 0.5) * 0.15), p.getY(k) * (1 + (rnd() - 0.5) * 0.15), p.getZ(k) * (1 + (rnd() - 0.5) * 0.15));
    geo.computeVertexNormals();
    const a = (i / n) * Math.PI * 2;
    const r = i === 0 ? 0 : 0.55;
    mesh(geo, std(c, { flatShading: true, roughness: 0.9 }), Math.cos(a) * r, 2.2 + rnd() * 0.6 + (i === 0 ? 0.5 : 0), Math.sin(a) * r, g);
  }
  g.scale.setScalar(scale);
  return g;
}

export function makePine(scale = 1) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.8, 6), std(0x5a3a26), 0, 0.4, 0, g);
  const c = new THREE.Color().setHSL(0.33 + rnd() * 0.04, 0.45, 0.24 + rnd() * 0.06);
  for (let i = 0; i < 3; i++) mesh(new THREE.ConeGeometry(0.9 - i * 0.22, 1.2, 7), std(c, { flatShading: true }), 0, 1.1 + i * 0.6, 0, g);
  g.scale.setScalar(scale);
  return g;
}

function drawSign(c, w, h, name, sub) {
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#f5c518'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#111'; c.lineWidth = 26; c.strokeRect(34, 34, w - 68, h - 68);
  c.fillStyle = '#111'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = 'bold 150px "Arial Narrow", Arial, sans-serif';
  c.fillText(name, w / 2, h * 0.42, w - 140);
  c.font = 'bold 74px Arial, sans-serif';
  c.fillText(sub, w / 2, h * 0.72);
}

export function makeSign(name = 'KAFFHAUSEN', sub = 'Einwohner: 0') {
  const g = new THREE.Group();
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 640;
  const ctx = cv.getContext('2d');
  drawSign(ctx, 1024, 640, name, sub);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const metal = std(0x9aa0a6, { metalness: 0.7, roughness: 0.35 });
  for (const x of [-0.55, 0.55]) mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.1, 10), metal, x, 1.05, -0.04, g);
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 });
  mesh(new RoundedBoxGeometry(1.6, 1.0, 0.05, 2, 0.02), [metal, metal, metal, metal, front, metal], 0, 1.65, 0, g);
  let cur = name + '|' + sub;
  g.userData.setText = (n, s2) => {
    if (n + '|' + s2 === cur) return;
    cur = n + '|' + s2; drawSign(ctx, 1024, 640, n, s2); tex.needsUpdate = true;
  };
  return g;
}

export function makeTrashBin() {
  const g = new THREE.Group();
  const m = std(0x3b4a3f, { roughness: 0.6 });
  mesh(new RoundedBoxGeometry(0.6, 0.9, 0.6, 2, 0.04), m, 0, 0.45, 0, g);
  mesh(new RoundedBoxGeometry(0.66, 0.08, 0.66, 2, 0.03), std(0x2f3b33), 0, 0.93, 0, g).rotation.x = 0.08;
  for (const x of [-0.2, 0.2]) mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), std(0x111111), x, 0.07, 0.32, g).rotation.x = Math.PI / 2;
  return g;
}

export function makeFence(len = 4) {
  const g = new THREE.Group();
  const wood = std(0xa07a52);
  const n = Math.round(len / 0.7);
  for (let i = 0; i <= n; i++) {
    const p = mesh(new THREE.BoxGeometry(0.1, 0.8 + rnd() * 0.12, 0.1), wood, i * 0.7, 0.42, 0, g);
    p.rotation.z = (rnd() - 0.5) * 0.12;
  }
  for (const y of [0.32, 0.62]) mesh(new THREE.BoxGeometry(n * 0.7 + 0.1, 0.08, 0.05), wood, n * 0.35, y, 0.05, g);
  return g;
}

export function makeRock(s = 0.4) {
  const geo = new THREE.DodecahedronGeometry(s, 0);
  geo.scale(1, 0.6, 0.9);
  const m = mesh(geo, std(0x8c8f8a, { flatShading: true }), 0, s * 0.3, 0);
  m.rotation.y = rnd() * 6;
  return m;
}

export function makeFlowers(count = 30, radius = 3) {
  const g = new THREE.Group();
  const cols = [0xffffff, 0xffd84a, 0xff7aa8, 0xb48cff];
  const stem = std(0x3e7d34);
  for (let i = 0; i < count; i++) {
    const a = rnd() * 6.28, r = rnd() * radius;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 4), stem, x, 0.09, z, g).castShadow = false;
    mesh(new THREE.SphereGeometry(0.045, 8, 6), std(cols[i % 4], { emissive: cols[i % 4], emissiveIntensity: 0.15 }), x, 0.19, z, g).castShadow = false;
  }
  return g;
}

// grass tufts instanced
export function makeGrassTufts(count, area, avoid = () => false) {
  const parts = [];
  for (let k = 0; k < 6; k++) {
    const b = new THREE.ConeGeometry(0.022, 0.16 + rnd() * 0.12, 3);
    b.translate(0, 0.1, 0); b.rotateZ((rnd() - 0.5) * 0.7); b.rotateX((rnd() - 0.5) * 0.7);
    b.translate((rnd() - 0.5) * 0.12, 0, (rnd() - 0.5) * 0.12);
    parts.push(b);
  }
  const blade = mergeGeometries(parts);
  const mat = std(0xffffff, { roughness: 1 });
  const im = new THREE.InstancedMesh(blade, mat, count);
  const d = new THREE.Object3D(); const c = new THREE.Color();
  let i = 0;
  while (i < count) {
    const x = (rnd() - 0.5) * area, z = (rnd() - 0.5) * area;
    if (avoid(x, z)) continue;
    d.position.set(x, 0, z); d.rotation.set((rnd() - 0.5) * 0.5, rnd() * 6, (rnd() - 0.5) * 0.5);
    d.scale.setScalar(0.6 + rnd() * 0.9); d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
    im.setColorAt(i, c.setHSL(0.24 + rnd() * 0.06, 0.55, 0.38 + rnd() * 0.12));
    i++;
  }
  im.receiveShadow = true;
  return im;
}

// ---------- ground / sky ----------
export function makeGround() {
  const g = new THREE.Group();
  const tex = grassTex(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(14, 14);
  const geo = new THREE.PlaneGeometry(200, 200, 120, 120);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i); const d = Math.hypot(x, y);
    // flat center, rolling hills far away
    const h = d < 18 ? 0 : (Math.sin(x * 0.08) * Math.cos(y * 0.07) * 3 + Math.sin(x * 0.03 + 1) * 4) * Math.min(1, (d - 18) / 25);
    p.setZ(i, h);
  }
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, std(0xffffff, { map: tex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  g.add(ground);
  return g;
}

// dirt path as flat shape
export function makePath(points, width = 1.3) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0.012, z)));
  const N = 80; const pos = []; const idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N; const p = curve.getPoint(t); const tan = curve.getTangent(t);
    const nx = -tan.z, nz = tan.x; const w = width * (0.85 + Math.sin(i * 1.7) * 0.08);
    pos.push(p.x + nx * w / 2, p.y, p.z + nz * w / 2, p.x - nx * w / 2, p.y, p.z - nz * w / 2);
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const tex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#a8865c'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { c.fillStyle = rnd() > 0.5 ? 'rgba(80,55,30,.35)' : 'rgba(210,180,130,.35)'; c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 2 + rnd() * 3); }
  });
  const m = new THREE.Mesh(geo, std(0xffffff, { map: tex, side: THREE.DoubleSide }));
  m.receiveShadow = true;
  return m;
}

export function makeSky(top = '#3b5b9a', mid = '#f39a6b', bottom = '#ffd7a0') {
  const tex = canvasTex(16, 512, (c, w, h) => {
    const grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, top); grd.addColorStop(0.3, '#6f86d6'); grd.addColorStop(0.42, '#e7a3b8'); grd.addColorStop(0.48, mid); grd.addColorStop(0.53, bottom); grd.addColorStop(1, bottom);
    c.fillStyle = grd; c.fillRect(0, 0, w, h);
  });
  const geo = new THREE.SphereGeometry(400, 32, 16);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  return m;
}

export function makeClouds(n = 10) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffe3d0, emissive: 0xff9e7a, emissiveIntensity: 0.25, roughness: 1, flatShading: true, fog: false });
  for (let i = 0; i < n; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + rnd() * 3, 1), mat);
      s.position.set(k * 4 - 8, rnd() * 2, rnd() * 2); s.scale.y = 0.6; c.add(s);
    }
    const a = -0.9 + rnd() * 1.8 - Math.PI / 2;
    c.position.set(Math.cos(a) * 160, 40 + rnd() * 35, Math.sin(a) * 160);
    c.lookAt(0, c.position.y, 0);
    g.add(c);
  }
  return g;
}

// fireflies / dust motes
export function makeFireflies(n = 60) {
  const geo = new THREE.BufferGeometry(); const pos = [];
  for (let i = 0; i < n; i++) pos.push((rnd() - 0.5) * 16, 0.4 + rnd() * 3, (rnd() - 0.5) * 12);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const tex = canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,240,170,1)'); g.addColorStop(0.3, 'rgba(255,200,90,.6)'); g.addColorStop(1, 'rgba(255,180,60,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.22, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.userData.base = pos.slice();
  return pts;
}

// ---------- Gebäude für Einwohner (Top-Kommentare) ----------
function signTex(text, bg = '#1d1f24', fg = '#ffc93c') {
  return canvasTex(1024, 256, (c, w, h) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.strokeStyle = fg; c.lineWidth = 12; c.strokeRect(14, 14, w - 28, h - 28);
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 130px "Lilita One", "Arial Black", Arial, sans-serif';
    c.fillText(text, w / 2, h / 2 + 6, w - 70);
  });
}
function awningTex(color) {
  return canvasTex(256, 128, (c, w, h) => {
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff6e8' : color; c.fillRect(i * w / 8, 0, w / 8, h); }
  });
}

/** Laden mit Schild, z. B. { title: 'JADENS DÖNER', color: '#e5533d' } */
export function makeShop({ title = 'LADEN', color = '#e5533d', wall = '#f3e3c3' } = {}) {
  const g = new THREE.Group();
  const wallM = std(wall, { roughness: 0.9 });
  mesh(new RoundedBoxGeometry(3.0, 2.6, 2.6, 2, 0.05), wallM, 0, 1.3, 0, g);
  // flat roof with rim
  mesh(new RoundedBoxGeometry(3.2, 0.22, 2.8, 2, 0.04), std(0x6d5a4a), 0, 2.7, 0, g);
  // shop window glowing
  const glass = new THREE.MeshStandardMaterial({ color: 0xffc46b, emissive: 0xffa53c, emissiveIntensity: 1.2, roughness: 0.2 });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), glass); win.position.set(0.55, 1.05, 1.311); g.add(win);
  mesh(new THREE.BoxGeometry(1.62, 0.08, 0.08), std(0x3a2f28), 0.55, 0.53, 1.33, g);
  // door
  mesh(new THREE.BoxGeometry(0.8, 1.6, 0.06), std(new THREE.Color(color).multiplyScalar(0.7)), -0.85, 0.8, 1.32, g);
  // awning
  const aw = mesh(new THREE.BoxGeometry(3.1, 0.06, 0.8), std(0xffffff, { map: awningTex(color) }), 0, 1.85, 1.62, g);
  aw.rotation.x = 0.35;
  // sign
  const sign = new THREE.Mesh(new RoundedBoxGeometry(2.8, 0.6, 0.08, 2, 0.03), [std(0x1d1f24), std(0x1d1f24), std(0x1d1f24), std(0x1d1f24), new THREE.MeshStandardMaterial({ map: signTex(title), emissive: 0xffffff, emissiveMap: signTex(title), emissiveIntensity: 0.35 }), std(0x1d1f24)]);
  sign.position.set(0, 2.3, 1.36); sign.castShadow = true; g.add(sign);
  const l = new THREE.PointLight(0xffb060, 3, 5, 2); l.position.set(0.5, 1.2, 2.2); g.add(l);
  return g;
}

/** Wohnhaus */
export function makeHouse({ wall = '#f1e6d2', roof = '#c2553a' } = {}) {
  const g = new THREE.Group();
  mesh(new RoundedBoxGeometry(2.6, 2.0, 2.4, 2, 0.04), std(wall, { roughness: 0.9 }), 0, 1.0, 0, g);
  const roofGeo = new THREE.CylinderGeometry(0.01, 1.9, 1.3, 4, 1); roofGeo.rotateY(Math.PI / 4); roofGeo.scale(1.05, 1, 0.98);
  mesh(roofGeo, std(roof, { flatShading: true }), 0, 2.65, 0, g);
  const glass = new THREE.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffb45a, emissiveIntensity: 1.1 });
  for (const x of [-0.65, 0.65]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), glass); w.position.set(x, 1.2, 1.211); g.add(w); }
  mesh(new THREE.BoxGeometry(0.6, 1.1, 0.05), std(0x6b4630), 0, 0.55, 1.22, g);
  return g;
}

export const BUILDERS = {
  shed: () => makeShed(),
  bench: () => makeBench(),
  lamp: () => makeLamp(),
  tree: (b) => makeTree(b.scale || 1),
  pine: (b) => makePine(b.scale || 1),
  sign: (b) => makeSign(b.name || 'KAFFHAUSEN', b.sub || 'Einwohner: 0'),
  bin: () => makeTrashBin(),
  fence: (b) => makeFence(b.length || 3),
  shop: (b) => makeShop(b),
  house: (b) => makeHouse(b),
};
