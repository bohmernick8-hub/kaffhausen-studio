// Zeitgesteuerte HTML-Einblendungen. Jede Funktion bekommt (o, t, ctx) – t = Sekunden seit o.in.
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const backOut = t => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const outCubic = t => 1 - Math.pow(1 - clamp(t), 3);
const fmt = n => Math.round(n).toLocaleString('de-DE');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pop = (t, d = 0.35) => `transform: scale(${backOut(t / d).toFixed(3)}); opacity:${clamp(t / 0.08).toFixed(2)};`;
const slideDown = (t, d = 0.4) => `transform: translateY(${((1 - outCubic(t / d)) * -140).toFixed(1)}px); opacity:${clamp(t / 0.15).toFixed(2)};`;

const R = {
  tagBadge(o, t, { episode }) {
    return `<div class="tag-badge" style="${pop(t, 0.4)} transform-origin: 20% 50%;">
      <div class="t">TAG ${episode.day}</div><div class="s">${episode.day === 1 ? 'KAFFHAUSEN GEGRÜNDET' : 'KAFFHAUSEN'}</div></div>`;
  },

  counter(o, t) {
    const k = clamp((t - 0.25) / 1.0); const n = o.from + (o.to - o.from) * outCubic(k);
    return `<div class="counter" style="top:${o.top || 430}px"><div class="lbl" style="${pop(t)}">${esc(o.label || 'EINWOHNER')}</div>
      <div class="num ${o.color || ''}" style="${pop(t - 0.1, 0.4)}">${fmt(n)}</div></div>`;
  },

  dim(o, t) {
    return `<div class="dim" style="opacity:${clamp(t / 0.25).toFixed(2)}"></div>`;
  },

  // Echter TikTok-Profil-Screenshot + rot eingekreiste Follower-Zahl + großer Einwohner-Zähler
  profile(o, t, { episode }) {
    const img = '/' + episode.profileScreenshot; const hl = episode.profileHighlight;
    const W0 = episode.profileSize?.[0] || 545; const H0 = episode.profileSize?.[1] || 210;
    const S = 960 / W0; const pad = 14;
    const ex = (hl.x + hl.w / 2) * S, ey = (hl.y + hl.h / 2) * S, rx = hl.w * S / 2 + pad + 10, ry = hl.h * S / 2 + pad;
    const draw = clamp((t - 0.6) / 0.4); const len = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);
    const cnt = clamp((t - 1.15) / 0.9);
    const from = o.from ?? 0, to = episode.einwohner;
    return `<div class="profile-shot" style="${pop(t, 0.4)}">
        <img src="${img}" style="width:960px;height:${H0 * S}px">
        <svg width="960" height="${H0 * S}" viewBox="0 0 960 ${H0 * S}"><ellipse cx="${ex}" cy="${ey}" rx="${rx}" ry="${ry}" transform="rotate(-3 ${ex} ${ey})"
          fill="none" stroke="#ff3b47" stroke-width="8" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${len * (1 - draw)}"/></svg>
      </div>
      ${t > 1.1 ? `<div class="counter" style="top:${330 + H0 * S + 110}px"><div class="lbl" style="${pop(t - 1.1)}">EINWOHNER</div>
        <div class="num ${to === 0 ? 'red' : 'mint'}" style="${pop(t - 1.15, 0.4)}">${fmt(from + (to - from) * outCubic(cnt))}</div></div>` : ''}`;
  },

  rulePill(o, t) {
    return `<div class="rule-pill" style="${pop(t, 0.4)}">${esc(o.text)}</div>`;
  },

  kasse(o, t) {
    const stamp = o.empty && t > 1.7;
    return `<div class="kasse-card" style="${pop(t, 0.4)}"><div class="hd">🏦 STADTKASSE</div>
      <div class="amt ${o.amount === 0 ? 'red' : ''}">${fmt(o.amount)} €</div>
      <div class="note">${o.note ? esc(o.note) : '2 € Steuern pro Einwohner'}</div>
      ${stamp ? `<div class="stamp" style="transform: rotate(-12deg) scale(${(2 - backOut((t - 1.7) / 0.3)).toFixed(3)})">LEER</div>` : ''}</div>`;
  },

  comment(o, t, { config }) {
    const pfp = o.pfp ? '/' + o.pfp : '';
    return `<div class="comment-wrap" style="${slideDown(t)}"><div class="card comment">
      <div class="pfp" style="${pfp ? `background-image:url('${pfp}')` : 'background:#8fb3ff'}">${pfp ? '' : '👤'}</div>
      <div style="flex:1"><div class="who">@${esc(o.user)} <span class="badge">👑 TOP-KOMMENTAR</span>${o.example ? '<span class="badge ex">BEISPIEL</span>' : ''}</div>
      <div class="txt">${esc(o.text)}</div></div>
      <div class="likes"><div class="h">♥</div>${fmt(o.likes || 0)}</div></div></div>`;
  },

  poll(o, t) {
    const opts = o.opts.map((txt, i) => {
      const ti = t - 1.0 - i * 0.6; if (ti < 0) return '';
      const pct = o.reveal ? o.pct[i] : null;
      return `<div class="opt ${o.reveal && i === o.winner ? 'win' : ''}" style="${pop(ti, 0.3)}">
        ${pct != null ? `<div class="bar" style="width:${pct * outCubic((t - 2.8) / 0.8)}%"></div>` : ''}
        <span>${esc(typeof txt === 'string' ? txt : txt[0])}</span><span class="pct">${pct != null ? pct + '%' : '?'}</span></div>`;
    }).join('');
    return `<div class="poll-wrap" style="${pop(t, 0.4)}"><div class="card poll"><div class="q">${esc(o.q)}</div>${opts}
      <div class="meta">${o.reveal ? fmt(o.votes || 0) + ' Stimmen · Kaffhausen hat entschieden' : 'Ihr stimmt ab 🗳️'}</div></div></div>`;
  },

  goal(o, t) {
    return `<div class="goal"><div class="g1" style="${pop(t, 0.45)}">${esc(o.title)}:</div>
      <div class="g2" style="${pop(t - 0.5, 0.45)}">${esc(o.sub)}</div></div>`;
  },

  nameTag(o, t, { project }) {
    const [x, y, vis] = project(o.anchor); if (!vis) return '';
    return `<div class="name-tag" style="left:${x}px; top:${y}px; ${pop(t, 0.35)}"><div class="n">${esc(o.name)}</div>${o.sub ? `<div class="s">${esc(o.sub)}</div>` : ''}</div>`;
  },

  endCard(o, t, { config }) {
    const done = t > 1.2; const press = t > 1.05 && t < 1.25 ? 0.88 : 1;
    return `<div class="end-card" style="${pop(t, 0.45)}">
      <div class="pfp-wrap"><div class="pfp" style="background-image:url('/${config.channel.pfp}')"></div>
        <div class="follow ${done ? 'done' : ''}" style="transform: translateX(-50%) scale(${press})">${done ? '✓' : '+'}</div></div>
      <div class="e1">FOLGEN = <span>EINZIEHEN</span> 🏠</div>
      ${t > 1.6 ? `<div class="e2" style="${pop(t - 1.6)}">Schreib, was du in Kaffhausen sein willst 👇</div>` : ''}
    </div>`;
  },
};

export function renderOverlays(shot, t, ctx) {
  let html = '';
  for (const o of shot.overlays || []) {
    const tin = o.in || 0; if (t < tin) continue;
    if (o.out != null && t > o.out + 0.2) continue;
    const fn = R[o.type]; if (!fn) continue;
    let h = fn(o, t - tin, ctx);
    if (o.out != null && t > o.out) h = `<div style="opacity:${(1 - (t - o.out) / 0.2).toFixed(2)}">${h}</div>`;
    html += h;
  }
  return html;
}

// ---------- Untertitel: 1–3 Wörter, Keywords gelb ----------
export function buildSubtitleChunks(words, keywords) {
  const kw = keywords.map(k => k.toLowerCase());
  const chunks = []; let cur = [];
  const norm = w => w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '');
  words.forEach((w, i) => {
    cur.push({ ...w, key: kw.includes(norm(w.w)) });
    const endPunct = /[.,!?:;]$/.test(w.w);
    if (cur.length >= 3 || endPunct || i === words.length - 1) { chunks.push(cur); cur = []; }
  });
  return chunks.map(c => ({ words: c, s: c[0].s, e: c[c.length - 1].e }));
}

export function renderSubtitles(shot, T) {
  const ch = shot.chunks || []; let cur = null;
  for (let i = 0; i < ch.length; i++) {
    const next = ch[i + 1];
    if (T >= ch[i].s && (next ? T < next.s : T < ch[i].e + 0.35)) { cur = ch[i]; break; }
  }
  if (!cur) return '';
  const k = backOut((T - cur.s) / 0.12) * 0.12 + 0.88;
  const txt = cur.words.map(w => `<span class="${w.key ? 'k' : ''}">${esc(w.w.replace(/[,;]$/, ''))}</span>`).join(' ');
  return `<div class="sub" style="transform: scale(${k.toFixed(3)})">${txt}</div>`;
}
