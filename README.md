# Kaffhausen Studio 🏠

**1 Follower = 1 Einwohner.** Automatische TikTok-Folgen für @wirbauenkaffhausen:
3D-Stadt (three.js), die mit jedem Video wächst, Stimme/Musik/Sounds über ElevenLabs (v4).

## Einrichten (einmalig)
```bash
npm install
cp .env.example .env      # ELEVENLABS_API_KEY eintragen (falls nicht schon in der Umgebung)
```

## Neue Folge
1. Ordner `episodes/NNN/` anlegen, TikTok-Profil-Screenshot als `profile.png` + Kommentar-Screenshots/Profilbilder rein.
2. Claude Code: „Mach Folge NNN“ → schreibt `episode.json`, aktualisiert `city/city.json` (siehe `CLAUDE.md`).
3. `npm run make -- NNN` → `out/epNNN/kaffhausen_tagN.mp4`

| Befehl | Was passiert |
|---|---|
| `npm run audio -- 001` | Stimme pro Shot, SFX + Musik (nur fehlende), Timeline, Mix |
| `npm run still -- 001 2 10 30` | Einzelbilder zum Prüfen |
| `npm run render -- 001` | Finales Video 1080×1920, 30 fps |
| `npm run preview -- 001` | Schnelle Vorschau 540×960 |

## Struktur
```
config.json          Kanal, Stimme (Voice-ID + v4), Musik-/SFX-Prompts, Mix
city/city.json       Aktueller Stand der Stadt (Einwohner, Kasse, Gebäude, Bewohner, Verlauf)
episodes/NNN/        episode.json (Skript + Regie), profile.png, Profilbilder
src/                 world.js (Gebäude), character.js (Figuren), player.js (Szene/Timeline),
                     overlays.js + ui.css (Einblendungen), cameras.js (Kamera-Presets)
tools/               audio.mjs, render.mjs, still.mjs, make.mjs, elevenlabs.mjs
assets/              pfp.png, sfx/, music/ (werden einmal erzeugt und wiederverwendet)
```
