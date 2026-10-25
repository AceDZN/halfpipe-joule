# Playtest — Halfpipe Joule

What was verified, how, and what was not. Automation proves rules and solvability; it cannot prove fun or learning.

## Automated (vitest, `npm test`)

- **Energy bookkeeping:** in every level, from every start, with no pumping / one pump / pumping everywhere, Ep + Ek + heat = E0 + work at every sampled frame (worst error < 0.05 J), and heat never decreases.
- **Ring = module:** the ring's arc shares and labels (`ringParts`) equal the physics module's Ep, Ek and heat (rounded joules) at sampled frames; `energies()` equals m·g·h and ½·m·v² of the simulated state.
- **Conservation without friction:** a skater released at 2.0 m never rises above it and returns to it each pass; bottom speed = √(2·g·Δh) for 30, 50 and 100 kg.
- **Friction:** heat per metre on smooth concrete = μ·m·g; asphalt > 4× and sand > 15× smooth.
- **Work:** a good pump adds exactly m·g·0.3 m; a mistimed pump scrubs energy into heat.
- **Levels:** L1 fails without pumping (turns ≥ 15 cm below the deck) and succeeds with pumping after the first miss; L2 light and heavy turn at the same height with the same top speed and 1.5× the joules, both collect the star, the high star is unreachable; L3 smooth zig-zag succeeds, every single-lane line fails; L4 fails without pumping, succeeds pumping each pass, fails when mashing pump every 0.1 s; L5 towers Δh 0.5/1 fall in the pit, Δh 2 lands, Δh 4 overshoots, for 50 and 75 kg; L6 hints off, only the bowls line works and only with ≥ 1 pump, the "go fast" asphalt line and the sandy shortcut fail even with every pump, for 50 and 75 kg.

## Scripted in the browser (built-in browser pane + headless Playwright, real key input + `advanceTime`)

- L1: drop → fall short → pump zone unlocks with slow-mo → 2 pumps → goal → 3★ done card.
- L2: light run collects the star → predict card → "same" → heavy run with the Tripo backpack → done card with comparison table.
- L3: smooth zig-zag by ←/→ reaches the ramp; straight asphalt line misses → replay path with heat bars + "לאן הלכו הג'ולים?" card.
- L4: pumping each pass climbs the bowl (ring + pump pill + bank verified on screen).
- L5: forced first drop from Δh 0.5 → pit → card explains the needed speed; tower choice with ←/→.
- L6: line choice with hidden numbers ("?" in the bank, icon-only ring).

## Fresh-eyes playtest

_Pending — results and fixes will be listed here._

## Not verified

- Real-GPU frame rate (the dev machine was under very heavy load from other crews; the in-page FPS counter read 24–41 in a background pane, which says little).
- Real phones and tablets; real gamepads (code path written, not tested with hardware).
- Audio by ear (WebAudio nodes are created; not listened to).
- Fun and learning gains: hypotheses until students play.
