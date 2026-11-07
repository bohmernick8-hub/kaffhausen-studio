import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const rel = (...p) => path.join(ROOT, ...p);
export const readJSON = p => JSON.parse(fs.readFileSync(rel(p), 'utf8'));
export const writeJSON = (p, d) => { fs.mkdirSync(path.dirname(rel(p)), { recursive: true }); fs.writeFileSync(rel(p), JSON.stringify(d, null, 2)); };
export const epId = a => String(a || '001').padStart(3, '0');

// .env laden (ELEVENLABS_API_KEY=...)
export function loadEnv() {
  const f = rel('.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// ffmpeg: FFMPEG_PATH > ffmpeg-static > ffmpeg im PATH
export function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { const p = createRequire(import.meta.url)('ffmpeg-static'); if (p && fs.existsSync(p)) return p; } catch {}
  return 'ffmpeg';
}
export function run(cmd, args, { input, quiet = true } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
    let err = ''; p.stderr.on('data', d => (err += d)); p.stdout.on('data', () => {});
    p.on('close', c => (c === 0 ? res(err) : rej(new Error(`${cmd} exit ${c}\n${err.slice(-2000)}`))));
    if (input) { p.stdin.end(input); }
  });
}
// Dauer einer Audiodatei in Sekunden (über ffmpeg -i)
export async function duration(file) {
  const out = await run(ffmpegPath(), ['-i', file, '-f', 'null', '-']).catch(e => e.message);
  const m = [...String(out).matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop() || String(out).match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
}

// statischer Server für player.html
export function startServer() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
  });
  return new Promise(r => server.listen(0, () => r({ server, port: server.address().port })));
}

export async function launchBrowser() {
  const puppeteer = (await import('puppeteer')).default;
  const swiftshader = process.env.SWIFTSHADER === '1';
  const args = ['--no-sandbox', '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
    ...(swiftshader ? ['--use-angle=swiftshader'] : ['--enable-gpu', '--use-angle=default'])];
  return puppeteer.launch({ headless: 'new', executablePath: process.env.CHROME_PATH || undefined, args, protocolTimeout: 600000 });
}
