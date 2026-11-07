// npm run still -- 001 2.5 8 15   → out/ep001/still_2.5.png … (Einzelbilder zum Prüfen)
import fs from 'node:fs';
import { rel, epId, startServer, launchBrowser } from './lib.mjs';

const [epArg, ...times] = process.argv.slice(2);
const ep = epId(epArg);
const { server, port } = await startServer();
const browser = await launchBrowser();
const page = await browser.newPage();
page.on('pageerror', e => console.log('[page error]', e.message));
await page.setViewport({ width: 1080, height: 1920 });
await page.goto(`http://localhost:${port}/player.html?ep=${ep}`);
await page.waitForFunction('window.READY === true', { timeout: 300000 });
const total = await page.evaluate(() => window.TOTAL);
const ts = times.length ? times.map(Number) : [0.5, total * 0.25, total * 0.5, total * 0.75, total - 0.5];
fs.mkdirSync(rel(`out/ep${ep}`), { recursive: true });
for (const t of ts) {
  await page.evaluate(x => window.renderAt(x), t);
  const f = rel(`out/ep${ep}/still_${t.toFixed(1)}.png`);
  await page.screenshot({ path: f });
  console.log('✓', f);
}
await Promise.race([browser.close(), new Promise(r => setTimeout(r, 5000))]); server.close();
process.exit(0);
