// Kamera-Presets: { pos, target, fov }. Shots referenzieren sie per Name (cam.from / cam.to)
// oder geben pos/target direkt an. Neue Gebäude → neue Presets hier ergänzen.
export const CAMS = {
  shedWide:    { pos: [5.5, 3.4, 15.5], target: [0.2, 1.5, 1.6], fov: 40 },
  shedWide2:   { pos: [3.2, 3.0, 14.0], target: [0.2, 1.4, 1.6], fov: 40 },
  signFar:     { pos: [-0.1, 2.3, 12.4], target: [-3.3, 1.5, 5.4], fov: 34 },
  signClose:   { pos: [-1.2, 1.8, 9.8], target: [-3.3, 1.45, 5.4], fov: 32 },
  nickFar:     { pos: [3.4, 2.3, 10.0], target: [0.8, 1.3, 2.3], fov: 32 },
  nickMed:     { pos: [2.2, 1.75, 6.9], target: [0.8, 1.2, 2.3], fov: 30 },
  doorClose:   { pos: [-2.4, 1.6, 6.6], target: [-0.2, 1.2, 1.4], fov: 36 },
  roofPan:     { pos: [-2.8, 3.1, 7.4], target: [0.2, 2.1, 0.8], fov: 38 },
  benchClose:  { pos: [6.2, 2.0, 9.0], target: [1.7, 1.0, 2.4], fov: 36 },
  benchClose2: { pos: [5.4, 1.8, 8.2], target: [1.6, 1.1, 2.4], fov: 34 },
  shopDemoFar: { pos: [1.8, 3.6, 13.6], target: [5.4, 1.5, 2.8], fov: 40 },
  shopDemo:    { pos: [3.0, 2.6, 10.4], target: [5.8, 1.6, 2.8], fov: 40 },
  nightWide:   { pos: [4.5, 3.0, 14.5], target: [-0.6, 1.6, 2.6], fov: 40 },
  nightSign:   { pos: [1.2, 2.6, 13.0], target: [-1.6, 1.7, 3.6], fov: 38 },
  goalFar:     { pos: [0.8, 13.0, 16.5], target: [0, 4.0, -100], fov: 48 },
  goalNear:    { pos: [0.5, 12.4, 13.2], target: [0, 5.0, -100], fov: 46 },
};

const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const EASE = {
  linear: t => t,
  in: t => t * t,
  out: t => 1 - (1 - t) * (1 - t),
  inout: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};
const resolve = c => (typeof c === 'string' ? CAMS[c] : c);

/** p = 0..1 Fortschritt im Shot */
export function camAt(cam, p) {
  const e = EASE[cam.ease || 'inout'](Math.min(1, Math.max(0, p)));
  if (cam.type === 'orbit') {
    const r = lerp(cam.radius[0], cam.radius[1], e);
    const h = lerp(cam.height[0], cam.height[1], e);
    const a = lerp(cam.angle[0], cam.angle[1], e);
    const c = cam.center;
    return { pos: [c[0] + Math.sin(a) * r, c[1] + h, c[2] + Math.cos(a) * r], target: c, fov: cam.fov || 40 };
  }
  const A = resolve(cam.from || cam), B = resolve(cam.to || cam.from || cam);
  return { pos: lerp3(A.pos, B.pos, e), target: lerp3(A.target, B.target, e), fov: lerp(A.fov || 40, B.fov || 40, e) };
}
