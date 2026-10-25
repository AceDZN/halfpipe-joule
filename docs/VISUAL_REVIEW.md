# Visual review — mockups vs real gameplay captures

Targets: ChatGPT mockups in [`visual-targets/`](visual-targets/) (design targets, not evidence). Actual: [`captures/`](captures/), taken from the production build with `node scripts/capture.mjs <url> docs/captures` — headless Chromium on the Apple GPU (ANGLE Metal), 1600×900 (plus 390×844 touch), driven by real key/tap input and the deterministic `window.advanceTime` hook. Captured 26 Oct 2026. No console errors during the capture run.

## 01 · First drop — [target](visual-targets/01-first-drop.png) vs [actual](captures/01-first-drop.png), [fall short](captures/01b-first-drop-short.png), [pump moment](captures/01c-first-drop-pump-zone.png)

| | Target | Actual | Verdict |
|---|---|---|---|
| Camera | Wide ¾ side view, whole mini-ramp across the frame, sea + lifeguard tower behind | Same framing; whole ramp, both decks, tower and sea behind, sun glow left | ✔ |
| Scene | White concrete, steel coping, graffiti side walls, palms, gold target coping + flag | Same elements; Tripo palms, lifeguard tower and kiosk; procedural graffiti ("תל אביב"-style tags, skyline stencil) | ✔ (graffiti less detailed) |
| Skater | Yellow tee, teal shorts, helmet, red shoes, in motion | Tripo rigged skater (lime-green shorts, see ASSETS), `surf` clip while riding, board under the feet | ✔ shorts colour differs |
| Energy ring | Three glowing arcs with icon+number pills: blue top, orange right, red left | Same, arcs proportional to each share of the total (stacked from the top) — so the arcs move as energy changes | ✔ (better: proportional) |
| Energy line | Gold dashed line with "קו אנרגיה" label | Same; label clamped on screen | ✔ |
| Pump ring | Gold dashed ellipse at the ramp bottom + "↑ שאיבה" pill | Gold glowing bands on both curves + "↑ שאיבה" pills that turn into a strong "↑ שאיבה — עכשיו!" when climbing | ≈ different shape: pumps only count while climbing a curve (science review), so the cue sits on the curves, not on the flat bottom |
| Top bar | RTL title right, 3 stars centre, round buttons left | Same (menu button added) | ✔ |
| Energy bank | Bottom-right, three cells, m/h/v row; bars drawn equal (a mockup error) | Same layout; bars proportional; words גובה / תנועה / חום under the icons | ✔ |
| Key hint | — | Top-centre gold pill ("↓ / רווח — דרופ־אין", "↑ שאבו כשאתם בטבעת הזהובה") | addition |

## 02 · Core line — [target](visual-targets/02-core-line.png) vs [actual](captures/02-core-line.png)

| | Target | Actual | Verdict |
|---|---|---|---|
| Camera | Low chase cam behind the skater, vanishing point at a distant quarter-pipe | Same; target ramp with gold coping and energy-line label at the vanishing point | ✔ |
| Lanes | Smooth white concrete / sand / cracked asphalt, kerb lines | Same three surfaces (canvas textures), white kerb lines; asphalt has cracks and patches | ✔ (less photographic) |
| Feedback | Smoke + sparks from the wheels on asphalt, big red heat arc | Smoke puffs + orange sparks on asphalt/sand, heat arc grows live | ✔ |
| Speed | Motion blur, speed lines | Speed lines on the overlay above 6 m/s (off with "פחות תנועה"); no motion blur | ≈ |
| Skater | Seen from behind, crouched | Seen from behind (rider turned to face travel in chase levels) | ✔ |
| Surroundings | Graffiti wall left, sea + tower right | Kiosk, palms, skyline and other ramps; sea + towers to the right | ≈ no long graffiti wall |
| Touch buttons | ‹ › bottom-left | Shown on touch devices only (see 05) | ✔ |

## 03 · Miss + replay — [target](visual-targets/03-bail-replay.png) vs [actual](captures/03-bail-replay.png)

| | Target | Actual | Verdict |
|---|---|---|---|
| Moment | Mini-ramp, skater tumbles at the far coping with "אוי!" | Line level: the skater rolls back below the target; camera swings to the side. Hard landings / pits show the tumble + "אוי!" bubble ([pit](captures/04a-gap-pit.png)) | ≈ different level, same idea |
| Replay | White dotted path, red bars standing where energy became heat, "▶ ריפליי" tag | Same: dotted path in world space, red bars proportional to heat made per stretch (tall on asphalt), red "▶ ריפליי" pill | ✔ |
| Card | "לאן הלכו הג'ולים?", one stacked bar blue/orange/red with captions, big yellow "↻ שוב" | Same; heat segments split per surface (asphalt hatched), full Workbook terms in the legend, one-line explanation, "↻ שוב" | ✔ |
| Shortfall | — | Floating "חסרו 107 ס״מ" at the turn point | addition |

## 04 · Grade-9 HUD — [target](visual-targets/04-hud-closeup.png) vs [actual](captures/04-hud-closeup.png)

| | Target | Actual | Verdict |
|---|---|---|---|
| Towers | Stepped towers with LTR height tags and gold copings | Four towers stepped in depth with "Δh = 0.5 / 1 / 2 / 4 m" pills; the selected one gold-bordered | ✔ (no gold copings on towers) |
| Gap | Kicker → sand gap → landing ramp | Ledge → sand pit → landing ramp → red braking strip; "צריך v ≥ 5.4 m/s" sign | ✔ ledge instead of kicker |
| Formula card | Cream card, LTR math with live values | Same: `Ep = m·g·h = 50·10·5.59 = 2795 J`, `Ek = ½·m·v² = …` | ✔ |
| Readouts | m, g, h, v pills | m, h, v row; zero level labelled "h = 0 m · מישור ייחוס" | ≈ no g pill |
| Ring | Full blue ring with "▲ 1800 J" | Same at the start (all Ep) | ✔ |

## 05 · Phone — [actual](captures/05-mobile.png) (no mockup)

Portrait 390×844: top bar, objective, compact bank top-right, ring, touch buttons (‹ › bottom-left, big "↑ שאיבה" bottom-right, קפיצה / טריק). The drop button hides once riding. The side camera follows the skater, so in portrait the far deck is only in view when the skater is near it — playable, but landscape is better.

## Remaining honest deviations

- Pump cue is gold bands on the curves instead of one ellipse on the flat (a deliberate science choice).
- Graffiti and surfaces are procedural canvas textures: bright and readable but simpler than the mockup's painted look; no motion blur.
- Skater shorts are lime green (Tripo result), not teal.
- No push/crouch animation clips (Tripo has no presets for them): riding uses `surf`, the ollie is a code-driven hop.
- Real-GPU frame rate on student hardware is not measured.
