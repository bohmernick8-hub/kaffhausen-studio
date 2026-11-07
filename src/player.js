import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as W from './world.js';
import { makeCharacter, animateCharacter } from './character.js';
import { camAt } from './cameras.js';
import { renderOverlays, buildSubtitleChunks, renderSubtitles } from './overlays.js';

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.35 }, warm: { value: 0.03 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform float warm; varying vec2 vUv;
    void main(){ vec4 c=texture2D(tDiffuse,vUv); vec2 d=vUv-0.5; float v=1.0-dot(d,d)*amount*2.2;
      c.rgb*=clamp(v,0.0,1.0); c.r+=warm; c.b-=warm*0.5; gl_FragColor=c; }`,
};

const MOODS = {
  evening: { sky: 'evening', fog: 0xf5b48a, fogNear: 30, fogFar: 120, sun: [0xffc48a, 3.0, [-14, 9, 8]], hemi: [0xbfd8ff, 0x6a5a3a, 0.9], rim: 0.6, lamp: 14, exposure: 1.05, warm: 0.03, stars: false },
  night:   { sky: 'night',   fog: 0x1b2647, fogNear: 18, fogFar: 85,  sun: [0x8fb0ff, 0.7, [12, 14, -6]], hemi: [0x3a4d8a, 0x1a1a22, 0.35], rim: 0.25, lamp: 26, exposure: 1.15, warm: 0.0, stars: true },
};

function backOut(t) { t = Math.min(1, Math.max(0, t)); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

function makeStars(n = 900, r = 300, minY = 20) {
  const geo = new THREE.BufferGeometry(); const pos = [];
  for (let i = 0; i < n; i++) {
    const a = W.rnd() * Math.PI * 2; const y = minY + W.rnd() * (r * 0.8);
    const rr = Math.sqrt(Math.max(1, r * r - y * y));
    pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.9, fog: false }));
}

// ---------- Ziel-Szene: Großstadt-Skyline bei Nacht ----------
function windowTex(lit = 0.45) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#0d1324'; g.fillRect(0, 0, 128, 256);
  for (let y = 10; y < 256; y += 30) for (let x = 8; x < 128; x += 30) {
    if (W.rnd() < lit) { g.fillStyle = W.rnd() > 0.25 ? '#ffd27a' : '#bfe3ff'; g.fillRect(x, y, 16, 18); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function buildGoalScene() {
  const s = new THREE.Scene();
  s.fog = new THREE.Fog(0x2a2350, 60, 260);
  s.add(W.makeSky('#070b1f', '#c86a9a', '#ffb07a'));
  s.add(makeStars(1200, 300, 25));
  s.add(new THREE.HemisphereLight(0x5a6ad0, 0x101018, 0.6));
  const moon = new THREE.DirectionalLight(0x9fb4ff, 0.8); moon.position.set(-10, 20, 10); s.add(moon);
  // Hügel im Vordergrund
  const hill = new THREE.Mesh(new THREE.SphereGeometry(30, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a6a48, roughness: 1 }));
  hill.scale.y = 0.3; hill.position.set(0, -1, 6); hill.receiveShadow = true; s.add(hill);
  const plain = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x141a2e, roughness: 1 }));
  plain.rotation.x = -Math.PI / 2; plain.position.y = -1.2; s.add(plain);
  // Skyline
  const tex = [windowTex(0.25), windowTex(0.4), windowTex(0.55)];
  for (let i = 0; i < 190; i++) {
    const x = (W.rnd() - 0.5) * 220; const z = -70 - W.rnd() * 75;
    const center = 1 - Math.min(1, Math.abs(x) / 70);
    let h = 4 + W.rnd() * 9; if (center > 0.2 && W.rnd() < 0.18 + center * 0.25) h += 14 + W.rnd() * 26 * center;
    const w = 3 + W.rnd() * 5, d = 3 + W.rnd() * 5;
    const t = tex[Math.floor(W.rnd() * 3)].clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(h / 4.5)));
    const m = new THREE.MeshStandardMaterial({ color: 0x232b4d, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.4, roughness: 0.8 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, h / 2 - 1, z); s.add(b);
    if (h > 22 && W.rnd() > 0.4) { const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4), new THREE.MeshBasicMaterial({ color: 0xff4d5a })); ant.position.set(x, h + 1, z); s.add(ant); }
  }
  // Fernsehturm
  const tower = new THREE.Group();
  const tm = new THREE.MeshStandardMaterial({ color: 0xb8c0d8, roughness: 0.5, metalness: 0.3 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 44, 16), tm); shaft.position.y = 22; tower.add(shaft);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(3.4, 24, 16), new THREE.MeshStandardMaterial({ color: 0xc0c8e0, emissive: 0xffd27a, emissiveIntensity: 0.25, roughness: 0.3, metalness: 0.4 }));
  ball.position.y = 40; tower.add(ball);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 12), tm); mast.position.y = 49; tower.add(mast);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4d5a })); tip.position.y = 55.5; tower.add(tip);
  tower.position.set(8, -1, -95); tower.scale.setScalar(1.3); s.add(tower);
  // Nick von hinten auf dem Hügel
  const nick = makeCharacter({ shirt: 0x2f6b5a, hatColor: 0xf0b429, hairColor: 0x5a3a22 });
  nick.position.set(-0.6, 7.92, 3.2); nick.rotation.y = Math.PI + 0.15; s.add(nick);
  const rimL = new THREE.PointLight(0xffb07a, 10, 10, 2); rimL.position.set(-0.6, 9.4, -0.8); s.add(rimL);
  const fill = new THREE.PointLight(0x8fa8ff, 4, 14, 2); fill.position.set(2, 11, 8); s.add(fill);
  return { scene: s, nick };
}

export function createPlayer({ width, height, config, city, episode, timeline }) {
  W.setSeed(11);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(width, height);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.getElementById('stage').appendChild(renderer.domElement);

  // ---------- Stadt ----------
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf5b48a, 30, 120);
  const skies = {
    evening: W.makeSky('#2f4f9e', '#ffb98a', '#ffe0ae'),
    night: W.makeSky('#050a1e', '#1d2b5a', '#33406e'),
  };
  for (const k in skies) scene.add(skies[k]);
  const clouds = W.makeClouds(9); scene.add(clouds);
  const stars = makeStars(); scene.add(stars);

  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x6a5a3a, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc48a, 3.0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x9db8ff, 0.6); rim.position.set(10, 6, -10); scene.add(rim);

  scene.add(W.makeGround());
  const occupied = [...city.buildings, ...(episode.tempBuildings || [])].map(b => b.pos);
  const avoid = (x, z) => occupied.some(([bx, bz]) => Math.hypot(x - bx, z - bz) < 2.0) || (Math.abs(x - 0.2) < 0.9 && z > 1.8 && z < 9);
  scene.add(W.makeGrassTufts(2200, 30, avoid));
  scene.add(W.makePath([[-0.6, 1.8], [-0.3, 4], [0.6, 6.5], [0.2, 9], [-1, 13]], 1.2));

  const objects = {}; let signObj = null; const lamps = [];
  function place(b) {
    const fn = W.BUILDERS[b.type]; if (!fn) { console.warn('unknown building', b.type); return null; }
    const o = fn(b); o.position.set(b.pos[0], 0, b.pos[1]); o.rotation.y = b.rot || 0;
    scene.add(o); objects[b.id] = o;
    if (b.type === 'sign') signObj = o;
    if (b.type === 'lamp') o.traverse(c => c.isPointLight && lamps.push(c));
    return o;
  }
  // Gebäude, die erst nach dieser Folge gebaut werden, gar nicht platzieren
  const cityB = city.buildings.filter(b => !(b.builtDay > episode.day));
  cityB.forEach(place);
  const temps = (episode.tempBuildings || []).map(b => ({ b, o: place(b) }));
  // Gebäude, die IN dieser Folge gebaut werden: appear = { day, shot, at }
  const builds = cityB.filter(b => b.appear && b.appear.day === episode.day).map(b => ({ b, o: objects[b.id] }));

  for (const [x, z, s] of [[3.6, 4.4, 0.35], [-4.4, 2.0, 0.45], [5.6, 1.6, 0.25], [1.8, -2.6, 0.3]]) { const r = W.makeRock(s); r.position.x = x; r.position.z = z; scene.add(r); }
  const fl = W.makeFlowers(40, 6); fl.position.set(0, 0, 3); scene.add(fl);
  for (let i = 0; i < 46; i++) {
    const a = W.rnd() * Math.PI * 2; const r = 16 + W.rnd() * 22;
    const t = W.rnd() > 0.45 ? W.makePine(1.2 + W.rnd() * 1.3) : W.makeTree(0.9 + W.rnd() * 0.8);
    t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 4);
    if (t.position.z > 10) continue;
    scene.add(t);
  }
  const ff = W.makeFireflies(70); ff.position.set(0, 0, 2); scene.add(ff);

  const nick = makeCharacter({ shirt: 0x2f6b5a, hatColor: 0xf0b429, hairColor: 0x5a3a22, mood: 'happy' });
  nick.position.set(0.9, 0, 2.3); nick.rotation.y = -0.15; scene.add(nick);

  const goal = buildGoalScene();

  // ---------- Kamera + Post ----------
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 900);
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.45, 0.6, 0.88); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const vignette = new ShaderPass(VignetteShader); composer.addPass(vignette);

  let curMood = null;
  function setMood(name) {
    if (name === curMood) return; curMood = name;
    const m = MOODS[name]; if (!m) return;
    for (const k in skies) skies[k].visible = k === m.sky;
    clouds.visible = name === 'evening'; stars.visible = m.stars;
    scene.fog.color.set(m.fog); scene.fog.near = m.fogNear; scene.fog.far = m.fogFar;
    sun.color.set(m.sun[0]); sun.intensity = m.sun[1]; sun.position.set(...m.sun[2]);
    hemi.color.set(m.hemi[0]); hemi.groundColor.set(m.hemi[1]); hemi.intensity = m.hemi[2];
    rim.intensity = m.rim; lamps.forEach(l => (l.intensity = m.lamp));
    renderer.toneMappingExposure = m.exposure; vignette.uniforms.warm.value = m.warm;
    bloom.strength = name === 'night' ? 0.7 : 0.45;
  }

  // ---------- Timeline ----------
  const shots = timeline.shots.map(ts => ({ ...episode.shots.find(s => s.id === ts.id), ...ts }));
  shots.forEach(s => (s.chunks = buildSubtitleChunks(s.words || [], s.keywords || [])));
  const total = timeline.total;
  const defaultSign = ['KAFFHAUSEN', `Einwohner: ${episode.einwohner.toLocaleString('de-DE')}`];
  const ui = document.getElementById('ui');
  const v = new THREE.Vector3();
  // liefert Koordinaten im 1080x1920-UI-Raum
  const project = (p) => { v.set(...p).project(camera); return [(v.x + 1) / 2 * 1080, (1 - v.y) / 2 * 1920, v.z < 1]; };

  function renderAt(T) {
    let shot = shots[shots.length - 1];
    for (const s of shots) if (T >= s.start && T < s.start + s.dur) { shot = s; break; }
    const t = T - shot.start; const p = t / shot.dur;
    const isGoal = shot.scene === 'goal';
    if (!isGoal) setMood(shot.scene || 'evening');

    if (signObj) signObj.userData.setText(...(shot.sign || defaultSign));
    for (const { b, o } of temps) {
      if (!o) continue;
      const on = (b.shots || []).includes(shot.id); o.visible = on;
      if (on) { const k = b.appearAt != null ? backOut((t - b.appearAt) / 0.55) : 1; o.scale.setScalar(Math.max(0.0001, k)); }
    }
    const shotIdx = shots.indexOf(shot);
    for (const { b, o } of builds) {
      if (!o) continue;
      const ai = shots.findIndex(s => s.id === b.appear.shot);
      if (shotIdx < ai) { o.visible = false; continue; }
      o.visible = true;
      const k = shotIdx > ai ? 1 : backOut((t - (b.appear.at || 0)) / 0.55);
      o.visible = k > 0.001; o.scale.setScalar(Math.max(0.0001, k));
    }
    animateCharacter(nick, T, shot.nick || 'idle');
    animateCharacter(goal.nick, T, 'idle');
    const b = ff.userData.base; const fp = ff.geometry.attributes.position;
    for (let i = 0; i < fp.count; i++) fp.setXYZ(i, b[i * 3] + Math.sin(T * 0.7 + i) * 0.3, b[i * 3 + 1] + Math.sin(T * 1.1 + i * 2) * 0.2, b[i * 3 + 2] + Math.cos(T * 0.6 + i) * 0.3);
    fp.needsUpdate = true;

    const c = camAt(shot.cam, p);
    const drift = [Math.sin(T * 0.8) * 0.03, Math.sin(T * 1.1) * 0.02, 0];
    camera.position.set(c.pos[0] + drift[0], c.pos[1] + drift[1], c.pos[2]);
    camera.fov = c.fov; camera.updateProjectionMatrix();
    camera.lookAt(...c.target);
    camera.updateMatrixWorld();

    renderPass.scene = isGoal ? goal.scene : scene;
    if (isGoal) { renderer.toneMappingExposure = 1.1; bloom.strength = 0.9; curMood = 'goal'; }

    ui.innerHTML = renderOverlays(shot, t, { config, episode, project, width, height, T }) + renderSubtitles(shot, T);
    composer.render();
  }
  return { renderAt, total, shots };
}
