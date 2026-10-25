# Progress — Halfpipe Joule

## 25–26 Oct 2026

- Read the handoff (COMMON, BUILD_HANDOFF, IDEAS) and round-1 notes. Wrote `GAME_IDENTITY.md`.
- Visual/Chrome helper: 4 ChatGPT gameplay mockups (`docs/visual-targets/`, prompts in `PROMPTS.md`); 6 Tripo models (skater, board, lifeguard tower, palm, backpack, kiosk) + 1 rig (Humanoid/Mixamo) + free preset clips (surf, idle, jump, cheer, fall). 200 credits. Details in `ASSETS.md`.
- Built the pure physics module (`src/sim/`): analytic line/arc ramp profiles, point-mass skater with exact energy bookkeeping (friction heat, pump work, airtime, landing losses, bails, lane switches).
- Six authored levels, tuned with a bot harness (`tests/bot.ts`).
- Game controller (`src/game/run.ts`): goals, level scripts (first-drop pump unlock + slow-mo tutorial, mass prediction, tower choice, transfer line choice), stars, anonymous learning log in localStorage.
- 3D scene: golden-hour promenade (sky shader, sea with sun glitter, beach, tiles, railing, skyline, Tripo palms + lifeguard towers), ramps built from the same profiles, graffiti walls, gold target coping + flag, pump-zone glow, energy line, stars, replay path with heat bars, particles.
- HUD per mockups: RTL top bar, energy ring around the skater (canvas overlay), energy bank with proportional bars + m/h/v, grade-9 formula card, result card "לאן הלכו הג'ולים?" with stacked bar, predict card, done card with takeaway, menu, pause, touch buttons, gamepad.
- Tests: 24 (energy bookkeeping in every level/strategy, ring = module numbers, frictionless conservation, √(2gh) mass-independent, friction per surface, pump/scrub work, each level solvable and each wrong approach failing).
- Fixed after playing: drop-in lips launched the skater (convex arc past ~48°) → 40° lips; L3 margin was ~5 J → target lowered to 2.25 m; roll-back after a lip hop wasn't a miss → detected; Tripo board stood on its tail (30° tilt measured with PCA) → re-oriented; chase-cam rider facing; side view for the gap level.
- In progress: independent science review, fresh-eyes playtest.
