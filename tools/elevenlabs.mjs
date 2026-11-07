// ElevenLabs-API: Stimme (mit Wort-Zeitstempeln), Sound-Effekte, Musik.
import fs from 'node:fs';

const BASE = 'https://api.elevenlabs.io';

function key(cfg) {
  const k = process.env[cfg.elevenlabs.apiKeyEnv || 'ELEVENLABS_API_KEY'];
  if (!k) throw new Error(`ElevenLabs-Key fehlt: ${cfg.elevenlabs.apiKeyEnv} in .env oder Umgebung setzen`);
  return k;
}
async function call(cfg, path, { method = 'GET', body, raw = false } = {}) {
  const res = await fetch(BASE + path, {
    method, headers: { 'xi-api-key': key(cfg), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const t = await res.text(); const e = new Error(`ElevenLabs ${res.status} ${path}: ${t.slice(0, 500)}`); e.status = res.status; throw e; }
  return raw ? Buffer.from(await res.arrayBuffer()) : res.json();
}

// Modell-ID für TTS finden: exakt cfg.ttsModel, sonst erstes Modell, dessen ID ttsModelMatch ("v4") enthält
let cachedModel = null;
export async function resolveTtsModel(cfg) {
  if (cachedModel) return cachedModel;
  const want = cfg.elevenlabs.ttsModel; const match = cfg.elevenlabs.ttsModelMatch || 'v4';
  try {
    const models = await call(cfg, '/v1/models');
    const tts = models.filter(m => m.can_do_text_to_speech !== false);
    const exact = tts.find(m => m.model_id === want);
    const fuzzy = tts.find(m => m.model_id.includes(match));
    cachedModel = (exact || fuzzy)?.model_id;
    if (!cachedModel) throw new Error(`Kein TTS-Modell mit "${match}" gefunden. Verfügbar: ${tts.map(m => m.model_id).join(', ')}`);
  } catch (e) {
    if (e.status) throw e; cachedModel = want;
  }
  console.log('  TTS-Modell:', cachedModel);
  return cachedModel;
}

/** Text → { audio: Buffer(mp3), words: [{w, s, e}] } */
export async function tts(cfg, text) {
  const model = await resolveTtsModel(cfg);
  const el = cfg.elevenlabs;
  const body = { text, model_id: model, voice_settings: el.voiceSettings };
  if (el.languageCode) body.language_code = el.languageCode;
  let r;
  try {
    r = await call(cfg, `/v1/text-to-speech/${el.voiceId}/with-timestamps?output_format=mp3_44100_128`, { method: 'POST', body });
  } catch (e) {
    if (e.status === 400 || e.status === 422) { // manche Modelle kennen language_code / settings nicht
      delete body.language_code; delete body.voice_settings;
      r = await call(cfg, `/v1/text-to-speech/${el.voiceId}/with-timestamps?output_format=mp3_44100_128`, { method: 'POST', body });
    } else throw e;
  }
  return { audio: Buffer.from(r.audio_base64, 'base64'), words: alignmentToWords(r.alignment || r.normalized_alignment) };
}

export function alignmentToWords(a) {
  if (!a) return [];
  const words = []; let cur = null;
  a.characters.forEach((ch, i) => {
    const s = a.character_start_times_seconds[i], e = a.character_end_times_seconds[i];
    if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
    if (!cur) cur = { w: '', s, e };
    cur.w += ch; cur.e = e;
  });
  if (cur) words.push(cur);
  return words;
}

export async function soundEffect(cfg, prompt, seconds) {
  return call(cfg, '/v1/sound-generation', { method: 'POST', raw: true, body: { text: prompt, duration_seconds: seconds, prompt_influence: 0.5 } });
}

export async function music(cfg, prompt, lengthMs) {
  const body = { prompt, music_length_ms: lengthMs };
  if (cfg.elevenlabs.musicModel) body.model_id = cfg.elevenlabs.musicModel;
  try {
    return await call(cfg, '/v1/music', { method: 'POST', raw: true, body });
  } catch (e) {
    if (e.status === 400 || e.status === 422) { delete body.model_id; return call(cfg, '/v1/music', { method: 'POST', raw: true, body }); }
    throw e;
  }
}

export const save = (file, buf) => { fs.mkdirSync(file.replace(/[\\/][^\\/]+$/, ''), { recursive: true }); fs.writeFileSync(file, buf); };
