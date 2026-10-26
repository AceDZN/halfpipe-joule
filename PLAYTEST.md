# Playtest — Halfpipe Joule

What was verified, how, and what was not. Automation proves rules and solvability; it cannot prove fun or learning.

## Automated (vitest, `npm test`)

- **Energy bookkeeping:** in every level, from every start, with no pumping / one pump / pumping everywhere, Ep + Ek + heat = E0 + work at every sampled frame (worst error < 0.05 J), and heat never decreases.
- **Ring = module:** the ring's arc shares and labels (`ringParts`) equal the physics module's Ep, Ek and heat (rounded joules) at sampled frames; `energies()` equals m·g·h and ½·m·v² of the simulated state.
- **Conservation without friction:** a skater released at 2.0 m never rises above it and returns to it each pass; bottom speed = √(2·g·Δh) for 30, 50 and 100 kg.
- **Friction:** heat per metre on smooth concrete = μ·m·g; asphalt > 4× and sand > 15× smooth.
- **Work:** a pump while climbing a curve adds exactly m·g·0.3 m (the physics module still scrubs mistimed pumps; the one-key controls only fire pumps on a climb).
- **Review exploits** (independent science reviewer's tests): ollies can't bypass the gap, rough lanes or the transfer line; lane switches never change Ep + Ek; the braking distance is measured from the strip; no "pit" fail without a gap.
- **Levels:** L1 fails without pumping (turns ≥ 15 cm below the deck) and succeeds with pumping after the first miss; L2 light and heavy turn at the same height with the same top speed and 1.5× the joules, both collect the star, the high star is unreachable; L3 the all-smooth lane succeeds, the asphalt and sand-patch lanes fail; L4 fails without pumping, succeeds pumping each climb; an early press arms the pump and fires on the climb; pump levels end within 16 s when you stop pumping; L5 towers Δh 0.5/1 fall in the pit, Δh 2 lands, Δh 4 overshoots, for 50 and 75 kg; L6 hints off, only the bowls line works and only with ≥ 1 pump, the "go fast" asphalt line and the sandy shortcut fail even with every pump, for 50 and 75 kg.

## Scripted in the browser (built-in browser pane + headless Playwright, real key input + `advanceTime`)

- L1: drop → fall short → pump zone unlocks with slow-mo → 2 pumps → goal → 3★ done card.
- L2: light run collects the star → predict card → "same" → heavy run with the Tripo backpack → done card with comparison table.
- L3: default asphalt lane misses → replay path with heat bars + "לאן הלכו הג'ולים?" card; the smooth lane (picked with →) reaches the ramp.
- L4: pumping each pass climbs the bowl (ring + pump pill + bank verified on screen).
- L5: forced first drop from Δh 0.5 → pit → card explains the needed speed; tower choice with ←/→.
- L6: line choice with hidden numbers ("?" in the bank, icon-only ring).

## The owner's playtest (26 Oct 2026)

"I barely understood what to do… I don't get the controls… too hard because of the gameflow/controls… I was sure I could use only the space key… the bag is on the side and the board is floating." → Redesigned to **one key** (Space / tap = drop in, then pump; a press arms the pump and it fires on the next climb of a gold curve; no penalty), choices only before the drop (← → or tap a label), L3 turned into a pre-drop lane choice, ollie/trick removed. Rider now rides the `idle` clip with a procedural knee bend and planted feet (the Tripo `surf` clip put the feet off the deck; a 20° yaw and partial lean made it worse); backpack re-attached on the spine.

## Fresh-eyes playtests (helpers who had not seen the design; Playwright, real key/mouse/tap input, frozen page clock + `advanceTime`)

**Round 1–2 (old controls, interrupted):** "golden ring" wording matched nothing on screen; goal easy to miss; HUD behind the title; ring above the pause layer; labels overlapping; "J" read like ג; two stars in L2 confused; skater froze on the wall under the card; backpack not visible from the front. All fixed (goal banner + start/target height labels, gold curves visible from the first pass, one star, the skater keeps rolling under cards, peak + "🎒 +25 kg" labels, Latin font for numbers).

**Round 3 (one-key build, all 6 levels, desktop 1600×900 and phone 390×844 taps only):** "I understood 'Space or tap = go, then press in the golden curve to pump' within 2 seconds on every level"; rider on the board and backpack on the back in every frame checked; no console errors; finished all levels on both. Fixed after it:
- a failed pump ride rocked for 40–70 s before the retry card → the ride ends after 3 turns without a pump, with a card that says to press in the gold curve (tested: < 16 s);
- pump pop-ups piled up when mashing → one "+150 J" per pump, the button/hint light up instead, "only in the gold curve" at most every 3 s;
- phone: bank and formula card covered the choices, lane labels off-screen, ‹ › mirrored by RTL → compact bank, no formula card on phones, labels pinned to the screen and kept below the top bar, ◀ ▶ glyphs, wrapped key hint;
- goal banner stayed over the rider → removed when you go;
- stars unexplained → one line of star rules on the done card;
- L3 lanes named by surface (בטון + חול / אספלט מחוספס / בטון חלק); L5 fail text leads with "צריך מגדל גבוה יותר!"; Space resumes from pause.

Full notes and screenshots: the shared notes folder (`halfpipe-joule-playtest*.md`). Impression from the tester persona: "good for about 15 minutes; L2's same-height and L5's 4 m-is-too-much are the best moments" — an impression, not evidence.

## Not verified

- Real-GPU frame rate (the dev machine was under very heavy load from other crews; the in-page FPS counter read 24–41 in a background pane, which says little).
- Real phones and tablets; real gamepads (code path written, not tested with hardware).
- Audio by ear (WebAudio nodes are created; not listened to).
- Fun and learning gains: hypotheses until students play.
