# Kaffhausen Studio – Anleitung für Claude Code

TikTok-Kanal **Kaffhausen** (@wirbauenkaffhausen), deutsch. Format: **1 Follower = 1 Einwohner**.
Nick wohnt anfangs allein in einem alten Schuppen. Mit jedem Video wächst die Stadt. Top-Kommentare
ziehen mit ihrem Wunsch ein (z. B. „Jaden will einen Dönerladen“ → „JADENS DÖNER“ wird gebaut).
Die Community entscheidet per Umfrage. Vorbild: FC Asche (@asche348), aber schöner, cleaner, 3D.

**Ziel:** Zuschauerbindung + sichtbares Wachstum. Von Video 1 bis Video 50 muss man riesige Unterschiede sehen.
Jede Episode zeigt die echte, aktuelle Stadt (Drohnenflug am Anfang).

## Befehle

```bash
npm install                    # einmalig (lädt Chrome + ffmpeg mit)
npm run audio -- 002           # ElevenLabs: Stimme pro Shot, fehlende SFX/Musik, timeline.json, mix.wav
npm run still -- 002 1 8 20    # Einzelbilder (out/ep002/still_*.png) zum Prüfen – IMMER vor dem finalen Render ansehen
npm run render -- 002          # finales MP4 1080x1920 30fps → out/ep002/kaffhausen_tag2.mp4
npm run make -- 002            # audio + render in einem
npm run preview -- 002         # schnelle Vorschau 540x960 15fps
node tools/audio.mjs 002 --mock   # ohne API: stumme Platzhalter (nur für Tests)
```
Der ElevenLabs-Key steht in `.env` als `ELEVENLABS_API_KEY` (oder schon in der Umgebung).
Kein Grafikchip/Fehler beim Rendern? → `SWIFTSHADER=1` setzen (langsamer).

## Audio-Regeln (fest)
- Stimme: ElevenLabs Voice-ID `raYPS0b2ZPlIzZWkcD0G`, **immer Modell v4** (nicht v3). `tools/elevenlabs.mjs` sucht das Modell automatisch (`ttsModel` / `ttsModelMatch: "v4"` in config.json).
- Musik und Sounds kommen ebenfalls von ElevenLabs (Music-API + Sound-Effects-API).
- SFX-Bibliothek steht in `config.json → sfx`. Sie wird einmal erzeugt (`assets/sfx/*.mp3`) und dann **immer wiederverwendet** (Wiedererkennung + Kosten). Neue Sounds: Eintrag in `config.json` ergänzen, `npm run audio` erzeugt nur Fehlendes.
- Titelmusik `assets/music/theme.mp3` ist in jeder Folge gleich (Wiedererkennungswert).
- Skripttext: Hochdeutsch, locker, kurze Sätze, ca. 45–60 s pro Folge. Zahlen ausschreiben, wie man sie spricht („zwölftausend“ statt „12.000“ ist sicherer für die Stimme).

## Täglicher Ablauf (neue Folge NNN)

**Nick liefert** (in `episodes/NNN/`):
1. `profile.png` – TikTok-Profil-Screenshot (Follower-Zahl sichtbar)
2. Screenshots der Top-Kommentare (2–4) → du liest Username, Text, Likes ab
3. Profilbilder der Kommentatoren → als `pfp_<username>.png` speichern (zuschneiden quadratisch)
4. Umfrage-Ergebnisse, falls es eine gab

**Du machst:**
1. **Zahlen:** Follower aus dem Screenshot = `einwohner`. Steuern: `kasse += einwohner × steuerProEinwohner` (city.json). Ausgaben für Gebäude abziehen. Die Kasse darf auch mal leer sein (Drama!).
2. **Profil-Highlight:** Pixel-Rechteck um „<Zahl> Follower*innen“ im Screenshot messen (z. B. Bild mit PIL zuschneiden und ansehen) → `profileHighlight: {x,y,w,h}` und `profileSize: [breite, höhe]` in episode.json.
3. **episode.json schreiben** (Vorlage: `episodes/001/episode.json`). Bewährte Struktur:
   - s1 Hook: Drohnenflug über die **aktuelle** Stadt (`cam.type: "orbit"`) + `tagBadge`, z. B. „Gestern hatte Kaffhausen null Einwohner. Heute …“
   - Profil-Screenshot mit eingekreister Zahl (`dim` + `profile`), großer Zähler zählt hoch
   - Stadtkasse (`kasse`) – „X Einwohner mal zwei Euro Steuern …“
   - Top-Kommentar (`comment` mit `pfp`) → neues Gebäude baut sich auf (Gebäude in city.json mit `builtDay` = heute; im Shot per `appear` animieren, s. unten) + `nameTag` über dem Gebäude
   - Umfrage-Ergebnis (`poll` mit `reveal: true`, `pct`, `winner`, `votes`) bzw. neue Umfrage
   - Ab und zu ein Event (Sturm, Bürgermeisterwahl, Investor, Stromausfall …) für Drama
   - Ende: nächste Frage an die Community + `endCard` → bringt Kommentare
4. **city.json aktualisieren:** `day`, `einwohner`, `kasse`, neue `buildings`, `residents` (username, rolle, gebäude), `history`.
5. `npm run audio -- NNN`, dann `npm run still -- NNN` → Bilder ansehen, Kamera/Overlays korrigieren → `npm run render -- NNN`.
6. Commit + Push (`episodes/NNN`, `city/city.json`, Code-Änderungen). `out/` wird nicht committet.

## Stadt-Layout (wichtig für Wachstum)
- Schuppen bei (0,0), Weg läuft Richtung +z. Daraus wird die **Hauptstraße** (entlang z = 4 … 40).
- Grundstücke links/rechts der Straße: x = ±5.5 und ±10, alle 4.5 m in z. Gebäude schauen zur Straße (`rot` ≈ ±1.57 bzw. in Richtung Kamera).
- Später: Querstraßen, Marktplatz, Rathaus in der Mitte. Größere Stadt → `makeGround` ist 200×200, genug Platz. Hintergrund-Bäume (Radius 16–38) bei Bedarf in `player.js` ausdünnen, wo gebaut wird.
- Je größer die Stadt, desto höher/weiter die Drohnen-Orbit-Kamera (radius/height erhöhen).

## Shot-Felder (episode.json)
| Feld | Bedeutung |
|---|---|
| `id`, `text` | Shot-ID und Sprechertext (Untertitel entstehen automatisch, 1–3 Wörter) |
| `keywords` | Wörter, die im Untertitel gelb werden (klein geschrieben) |
| `scene` | `evening` (Standard), `night`, `goal` (Großstadt-Skyline) |
| `nick` | Animation: `idle`, `wave`, `cheer`, `sad` |
| `cam` | `{from, to, ease}` mit Presets aus `src/cameras.js` oder `{pos,target,fov}`; Drohne: `{type:"orbit", center, radius:[a,b], height:[a,b], angle:[a,b]}` |
| `overlays` | Liste, jedes mit `type`, `in` (Sek. ab Shot-Start), optional `out` |
| `sfx` | `[{name, at, gain}]` – Namen aus config.json |
| `sign` | Ortsschild-Text überschreiben, z. B. `["KAFFHAUSEN","Einwohner: ?"]` (Standard: aktuelle Einwohner) |
| `padAfter`, `minDur` | Pause nach dem Satz / Mindestdauer |

**Overlay-Typen** (`src/overlays.js`): `tagBadge`, `counter {label,from,to,color: red|mint, top}`, `dim`, `profile`,
`rulePill {text}`, `kasse {amount, empty, note}`, `comment {user,text,likes,pfp,example}`,
`poll {q, opts, reveal, pct, winner, votes}`, `goal {title, sub}`, `nameTag {name, sub, anchor:[x,y,z]}`, `endCard`.
Neue Overlay-Typen: Funktion in `R` in `src/overlays.js` ergänzen + CSS in `src/ui.css`.

**Neue Gebäude bauen:** In `city.json` eintragen mit `builtDay: <heute>` und
`appear: { "day": <heute>, "shot": "s4", "at": 1.5 }` → in dieser Folge ist es bis zum Shot unsichtbar und baut sich
dort mit Pop-Animation auf (passendes SFX `hammer` + `cheer` setzen). In späteren Folgen steht es einfach da.
**Nur-Beispiel-Gebäude** (nicht dauerhaft): `tempBuildings` in episode.json mit `shots: [...]` und `appearAt`.

## Gebäude-Typen (`src/world.js → BUILDERS`)
`shed`, `bench`, `lamp`, `tree`, `pine`, `sign`, `bin`, `fence`, `shop {title, color, wall}`, `house {wall, roof}`.
Neue Typen (Rathaus, Freibad, Bahnhof, Bäckerei …): Funktion `makeXyz()` in world.js schreiben (Low-Poly, abgerundete
Kanten, warme Fenster mit emissive, Schild mit Besitzername), in `BUILDERS` eintragen, Kamera-Preset in `cameras.js` ergänzen.

## Look (nicht ändern ohne Rücksprache)
- Bohnen-Kugelkopf-Figuren (`src/character.js`), Nick: gelbe Mütze, grüner Hoodie.
- Goldene-Stunde-Abendlicht, warme Fenster, Glühwürmchen, Bloom, Vignette. Nacht-Szenen für Enden/Events.
- Farben: Ortsschild-Gelb `#ffc93c`, Mint `#3fd39a`, Rot `#ff4d5a`, Ink `#1d1f24`. Schrift: Lilita One + Nunito.
- Untertitel groß, weiß mit dunkler Kontur, Keywords gelb. Profilbild: `assets/pfp.png`.
