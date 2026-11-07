// npm run audio -- 001 [--mock] [--force]
// Erzeugt Stimme (pro Shot), fehlende SFX + Musik über ElevenLabs, baut timeline.json und mix.wav.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { rel, readJSON, writeJSON, epId, loadEnv, ffmpegPath, run, duration } from './lib.mjs';
import * as EL from './elevenlabs.mjs';

loadEnv();
const args = process.argv.slice(2);
const ep = epId(args.find(a => !a.startsWith('--')));
const MOCK = args.includes('--mock');
const FORCE = args.includes('--force');
const cfg = readJSON('config.json');
const episode = readJSON(`episodes/${ep}/episode.json`);
const outDir = `out/ep${ep}`;
fs.mkdirSync(rel(outDir), { recursive: true });
fs.mkdirSync(rel('out/cache/tts'), { recursive: true });
const FF = ffmpegPath();

// ---------- 1) SFX + Musik (einmal erzeugen, dann wiederverwenden) ----------
const usedSfx = new Set(episode.shots.flatMap(s => (s.sfx || []).map(x => x.name)));
if (episode.ambience) usedSfx.add(episode.ambience);
for (const name of usedSfx) {
  const def = cfg.sfx[name]; const file = rel(`assets/sfx/${name}.mp3`);
  if (!def) { console.warn(`⚠ SFX "${name}" nicht in config.json definiert`); continue; }
  if (fs.existsSync(file) && !FORCE) continue;
  if (MOCK) continue;
  console.log(`SFX erzeugen: ${name}`);
  EL.save(file, await EL.soundEffect(cfg, def.prompt, def.duration));
}
const theme = cfg.music.theme; const themeFile = rel(theme.file);
if (!fs.existsSync(themeFile) && !MOCK) {
  console.log('Musik erzeugen: theme');
  EL.save(themeFile, await EL.music(cfg, theme.prompt, theme.lengthMs));
}

// ---------- 2) Stimme pro Shot ----------
const lines = [];
for (const shot of episode.shots) {
  const model = cfg.elevenlabs.ttsModel;
  const hash = crypto.createHash('md5').update([shot.text, cfg.elevenlabs.voiceId, model, MOCK ? 'mock' : ''].join('|')).digest('hex').slice(0, 12);
  const mp3 = rel(`out/cache/tts/${hash}.mp3`), meta = rel(`out/cache/tts/${hash}.json`);
  if (!fs.existsSync(mp3) || !fs.existsSync(meta) || FORCE) {
    if (MOCK) {
      // Platzhalter: Stille mit geschätzter Sprechdauer + gleichmäßige Wort-Zeiten
      const ws = shot.text.split(/\s+/); let t = 0.05; const words = [];
      for (const w of ws) { const d = 0.16 + w.length * 0.055; words.push({ w, s: t, e: t + d }); t += d + 0.06; if (/[.,!?:]$/.test(w)) t += 0.18; }
      await run(FF, ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(t + 0.1), '-q:a', '6', mp3]);
      fs.writeFileSync(meta, JSON.stringify({ words }));
    } else {
      console.log(`Stimme: ${shot.id} – "${shot.text.slice(0, 50)}…"`);
      const r = await EL.tts(cfg, shot.text);
      fs.writeFileSync(mp3, r.audio); fs.writeFileSync(meta, JSON.stringify({ words: r.words }));
    }
  }
  const { words } = JSON.parse(fs.readFileSync(meta, 'utf8'));
  lines.push({ shot, mp3, words, dur: await duration(mp3) });
}

// ---------- 3) Timeline ----------
const LEAD = 0.12; let T = 0; const tShots = [];
for (const { shot, words, dur } of lines) {
  const pad = shot.padAfter ?? cfg.mix.padAfterLine;
  const d = Math.max(LEAD + dur + pad, shot.minDur || 1.2);
  tShots.push({ id: shot.id, start: +T.toFixed(3), dur: +d.toFixed(3), voiceAt: +(T + LEAD).toFixed(3), voiceDur: +dur.toFixed(3),
    words: words.map(w => ({ w: w.w, s: +(T + LEAD + w.s).toFixed(3), e: +(T + LEAD + w.e).toFixed(3) })) });
  T += d;
}
const total = +T.toFixed(3);
writeJSON(`${outDir}/timeline.json`, { ep, fps: cfg.video.fps, total, shots: tShots });
console.log(`Timeline: ${tShots.length} Shots, ${total.toFixed(1)} s`);

// ---------- 4) Mix ----------
const inputs = []; const filters = []; const labels = [];
const add = (file, at, gain, loop = false) => {
  if (loop) inputs.push('-stream_loop', '-1');
  inputs.push('-i', file);
  const idx = labels.length; const ms = Math.max(0, Math.round(at * 1000));
  filters.push(`[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}:all=1,volume=${gain}${loop ? `,atrim=0:${total}` : ''}[a${idx}]`);
  labels.push(`[a${idx}]`);
};
for (let k = 0; k < lines.length; k++) add(lines[k].mp3, tShots[k].voiceAt, cfg.mix.voiceGain);
for (let k = 0; k < episode.shots.length; k++) for (const s of episode.shots[k].sfx || []) {
  const f = rel(`assets/sfx/${s.name}.mp3`); if (fs.existsSync(f)) add(f, tShots[k].start + (s.at || 0), (s.gain ?? 1) * cfg.mix.sfxGain);
}
if (fs.existsSync(themeFile)) add(themeFile, 0, cfg.mix.musicGain, true);
const amb = episode.ambience && rel(`assets/sfx/${episode.ambience}.mp3`);
if (amb && fs.existsSync(amb)) add(amb, 0, 0.35 * cfg.mix.sfxGain, true);

const mixFile = rel(`${outDir}/mix.wav`);
filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=0:${total},afade=t=out:st=${Math.max(0, total - 1.2)}:d=1.2,alimiter=limit=0.95[out]`);
await run(FF, ['-y', ...inputs, '-filter_complex', filters.join(';'), '-map', '[out]', '-ar', '48000', '-ac', '2', mixFile]);
console.log('✓ Audio fertig:', `${outDir}/mix.wav`, MOCK ? '(MOCK – stumm)' : '');
