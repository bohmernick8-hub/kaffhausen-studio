// npm run render -- 001 [--preview] [--from 10 --to 20]
// Rendert jedes Frame im Browser (three.js) und schreibt direkt ein MP4 mit dem Audio-Mix.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { rel, readJSON, epId, ffmpegPath, startServer, launchBrowser } from './lib.mjs';

const args = process.argv.slice(2);
const ep = epId(args[0]); // Episode immer als erstes Argument
const opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };
const PREVIEW = args.includes('--preview');
const cfg = readJSON('config.json');
const timeline = readJSON(`out/ep${ep}/timeline.json`);
const W = PREVIEW ? 540 : cfg.video.width, H = PREVIEW ? 960 : cfg.video.height;
const FPS = PREVIEW ? 15 : cfg.video.fps;
const from = +(opt('from') || 0), to = Math.min(+(opt('to') || timeline.total), timeline.total);
const out = rel(`out/ep${ep}/kaffhausen_tag${+ep}${PREVIEW ? '_preview' : ''}.mp4`);

const { server, port } = await startServer();
const browser = await launchBrowser();
const page = await browser.newPage();
page.on('pageerror', e => console.log('[page error]', e.message));
page.on('console', m => m.type() === 'error' && console.log('[page]', m.text()));
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${port}/player.html?ep=${ep}&w=${W}&h=${H}`);
await page.waitForFunction('window.READY === true', { timeout: 300000 });

const mix = rel(`out/ep${ep}/mix.wav`);
const hasAudio = fs.existsSync(mix);
const ff = spawn(ffmpegPath(), [
  '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  ...(hasAudio ? ['-ss', String(from), '-t', String(to - from), '-i', mix] : []),
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', PREVIEW ? '23' : '17', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  ...(hasAudio ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []), '-movflags', '+faststart', out,
], { stdio: ['pipe', 'ignore', 'pipe'] });
let ffErr = ''; ff.stderr.on('data', d => (ffErr += d).length > 20000 && (ffErr = ffErr.slice(-5000)));
const ffDone = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error(ffErr.slice(-1500))))));

const frames = Math.round((to - from) * FPS);
const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  const T = from + f / FPS;
  await page.evaluate(t => window.renderAt(t), T);
  const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % FPS === 0) {
    const el = (Date.now() - t0) / 1000; const eta = (el / (f + 1)) * (frames - f - 1);
    process.stdout.write(`\r  Frame ${f + 1}/${frames}  (${T.toFixed(1)}s)  ETA ${Math.round(eta)}s   `);
  }
}
ff.stdin.end();
await ffDone;
await Promise.race([browser.close(), new Promise(r => setTimeout(r, 5000))]); server.close();
console.log(`\n✓ Video fertig: ${out}`);
process.exit(0);
