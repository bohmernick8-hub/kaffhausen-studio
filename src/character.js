import * as THREE from 'three';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });
function m(geo, mat, x, y, z, parent) {
  const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}

/**
 * Bohnen-Kugelkopf-Figur.
 * opts: { skin, shirt, pants, hat: 'beanie'|'cap'|'hair'|'none', hatColor, hairColor, mood: 'happy'|'neutral'|'wow', glasses, beard }
 */
export function makeCharacter(opts = {}) {
  const o = {
    skin: 0xf2c29b, shirt: 0x2f6b5a, pants: 0x3a3f4a, hat: 'beanie', hatColor: 0xf0b429, hairColor: 0x5a3a22,
    mood: 'happy', glasses: false, beard: false, shoe: 0x2b2b2b, ...opts,
  };
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);

  // body: bean / hoodie
  const torso = m(new THREE.CapsuleGeometry(0.34, 0.32, 8, 20), std(o.shirt, { roughness: 0.8 }), 0, 0.62, 0, body);
  torso.scale.set(1, 1, 0.9);
  // hoodie pocket
  const pocket = m(new THREE.CapsuleGeometry(0.07, 0.26, 4, 10), std(new THREE.Color(o.shirt).multiplyScalar(0.8), { roughness: 0.85 }), 0, 0.5, 0.29, body);
  pocket.rotation.z = Math.PI / 2; pocket.scale.z = 0.4;
  // legs / feet
  for (const s of [-1, 1]) {
    m(new THREE.CapsuleGeometry(0.1, 0.12, 4, 10), std(o.pants, { roughness: 0.85 }), s * 0.14, 0.2, 0, body);
    const shoe = m(new THREE.SphereGeometry(0.13, 16, 10), std(o.shoe, { roughness: 0.5 }), s * 0.15, 0.07, 0.05, body);
    shoe.scale.set(1, 0.6, 1.35);
  }
  // arms
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.33, 0.82, 0); body.add(pivot);
    const arm = m(new THREE.CapsuleGeometry(0.08, 0.26, 4, 10), std(o.shirt, { roughness: 0.8 }), 0, -0.18, 0, pivot);
    m(new THREE.SphereGeometry(0.085, 12, 8), std(o.skin), 0, -0.36, 0, pivot);
    pivot.rotation.z = s * 0.25;
    arms.push(pivot);
  }

  // head
  const head = new THREE.Group(); head.position.y = 1.32; body.add(head);
  const skull = m(new THREE.SphereGeometry(0.44, 32, 24), std(o.skin, { roughness: 0.55 }), 0, 0, 0, head);
  skull.scale.set(1.05, 0.95, 0.98);
  // ears
  for (const s of [-1, 1]) { const e = m(new THREE.SphereGeometry(0.09, 12, 8), std(o.skin), s * 0.45, -0.02, 0, head); e.scale.set(0.6, 1, 0.8); }
  // eyes
  const eyeWhite = std(0xffffff, { roughness: 0.25 });
  const pupilMat = std(0x1b1b1f, { roughness: 0.2 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = [];
  for (const s of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(s * 0.165, -0.01, 0.37); head.add(eg);
    const w = m(new THREE.SphereGeometry(0.115, 20, 14), eyeWhite, 0, 0, 0, eg); w.scale.set(1.0, 1.2, 0.55);
    const p = m(new THREE.SphereGeometry(0.068, 16, 12), pupilMat, 0, -0.005, 0.045, eg); p.scale.set(1, 1.15, 0.5);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), shine); sh.position.set(0.025, 0.035, 0.08); eg.add(sh);
    if (o.mood === 'wow') eg.scale.setScalar(1.18);
    eyes.push(eg);
  }
  // brows
  for (const s of [-1, 1]) {
    const b = m(new THREE.CapsuleGeometry(0.018, 0.08, 4, 8), std(o.hairColor), s * 0.165, 0.12, 0.415, head);
    b.rotation.z = Math.PI / 2 + s * (o.mood === 'neutral' ? 0.12 : -0.1);
  }
  // cheeks
  const blush = new THREE.MeshStandardMaterial({ color: 0xff8f86, transparent: true, opacity: 0.55, roughness: 0.8 });
  for (const s of [-1, 1]) { const c = m(new THREE.SphereGeometry(0.06, 12, 8), blush, s * 0.28, -0.15, 0.33, head); c.scale.set(1.2, 0.7, 0.4); c.castShadow = false; }
  // nose
  m(new THREE.SphereGeometry(0.045, 12, 8), std(new THREE.Color(o.skin).multiplyScalar(0.93)), 0, -0.1, 0.43, head);
  // mouth
  const mouthMat = std(0x5a2420, { roughness: 0.5 });
  if (o.mood === 'wow') {
    const mo = m(new THREE.SphereGeometry(0.05, 12, 8), mouthMat, 0, -0.2, 0.39, head); mo.scale.set(1, 1.2, 0.4);
  } else {
    const arc = o.mood === 'happy' ? Math.PI * 0.75 : Math.PI * 0.35;
    const mo = m(new THREE.TorusGeometry(0.08, 0.017, 8, 20, arc), mouthMat, 0, -0.19, 0.39, head);
    mo.rotation.z = Math.PI + (Math.PI - arc) / 2;
  }
  // glasses
  if (o.glasses) {
    const gm = std(0x222222, { metalness: 0.4, roughness: 0.3 });
    for (const s of [-1, 1]) { const r = m(new THREE.TorusGeometry(0.12, 0.015, 8, 24), gm, s * 0.16, 0.04, 0.42, head); }
    m(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), gm, 0, 0.06, 0.43, head).rotation.z = Math.PI / 2;
  }
  if (o.beard) {
    const bd = m(new THREE.SphereGeometry(0.33, 20, 14, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), std(o.hairColor, { roughness: 0.95 }), 0, 0.02, 0.06, head);
    bd.scale.set(1.12, 1.05, 1.1);
  }

  // hat / hair
  const hatMat = std(o.hatColor, { roughness: 0.9 });
  if (o.hat === 'beanie') {
    const cap = m(new THREE.SphereGeometry(0.46, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hatMat, 0, 0.17, -0.03, head);
    cap.scale.set(1.03, 0.9, 1.0);
    const cuff = m(new THREE.TorusGeometry(0.43, 0.075, 10, 32), std(new THREE.Color(o.hatColor).multiplyScalar(0.85), { roughness: 0.95 }), 0, 0.2, -0.03, head);
    cuff.rotation.x = Math.PI / 2; cuff.scale.set(1.04, 1, 1);
    m(new THREE.SphereGeometry(0.11, 14, 10), std(0xfafafa, { roughness: 1 }), 0, 0.6, -0.04, head);
    // hair tuft
    for (const s of [-1, 1]) m(new THREE.SphereGeometry(0.08, 10, 8), std(o.hairColor, { roughness: 0.9 }), s * 0.38, 0.06, 0.1, head).scale.set(0.6, 1, 0.8);
  } else if (o.hat === 'cap') {
    m(new THREE.SphereGeometry(0.455, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), hatMat, 0, 0.05, 0, head);
    const brim = m(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 24, 1, false, -Math.PI / 2, Math.PI), hatMat, 0, 0.2, 0.32, head);
    brim.rotation.x = 0.15;
  } else if (o.hat === 'hair') {
    const hair = m(new THREE.SphereGeometry(0.46, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), std(o.hairColor, { roughness: 0.9 }), 0, 0.04, -0.03, head);
    hair.scale.set(1.04, 1.05, 1.02);
    m(new THREE.SphereGeometry(0.14, 12, 10), std(o.hairColor, { roughness: 0.9 }), 0.12, 0.36, 0.22, head).scale.set(1.4, 0.6, 1);
  }

  root.userData = { body, head, arms, eyes, opts: o };
  return root;
}

// simple idle / wave animation
export function animateCharacter(ch, t, action = 'idle', phase = 0) {
  const { body, head, arms } = ch.userData;
  const tt = t + phase;
  body.position.y = Math.abs(Math.sin(tt * 2.2)) * 0.015;
  body.scale.y = 1 + Math.sin(tt * 2.2) * 0.012;
  head.rotation.z = Math.sin(tt * 1.3) * 0.04;
  head.rotation.y = Math.sin(tt * 0.7) * 0.08;
  if (action !== 'sad') head.rotation.x = 0;
  if (action === 'wave') {
    arms[1].rotation.z = 2.6 + Math.sin(tt * 9) * 0.35;
    arms[0].rotation.z = -0.25;
  } else if (action === 'cheer') {
    arms[0].rotation.z = -2.7 + Math.sin(tt * 8) * 0.2;
    arms[1].rotation.z = 2.7 - Math.sin(tt * 8) * 0.2;
    body.position.y = Math.abs(Math.sin(tt * 6)) * 0.18;
  } else if (action === 'sad') {
    head.rotation.x = 0.28; head.rotation.y = Math.sin(tt * 0.5) * 0.05;
    arms[0].rotation.z = -0.08; arms[1].rotation.z = 0.08;
    body.scale.y = 0.985;
  } else {
    head.rotation.x = 0;
    arms[0].rotation.z = -0.25 - Math.sin(tt * 1.5) * 0.04;
    arms[1].rotation.z = 0.25 + Math.sin(tt * 1.5) * 0.04;
  }
}
