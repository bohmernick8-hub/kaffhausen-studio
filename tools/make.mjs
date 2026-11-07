// npm run make -- 001      → Audio (ElevenLabs) + Video in einem Rutsch
// npm run preview -- 001   → schnelle Vorschau (540x960, 15 fps)
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
const preview = args.includes('--preview');
const rest = args.filter(a => a !== '--preview');
const step = (f, extra = []) => { const r = spawnSync(process.execPath, [f, ...rest, ...extra], { stdio: 'inherit' }); if (r.status !== 0) process.exit(r.status || 1); };
step('tools/audio.mjs');
step('tools/render.mjs', preview ? ['--preview'] : []);
