# Halfpipe Joule — ג'ול ברמפה

A 3D browser skateboarding game for Hebrew-speaking middle-school science students (Israeli curriculum, per [Workbook](https://science.workbook.co.il)). Skate a golden-hour Tel Aviv promenade park and **see your energy**: a ring around the skater shows height energy (▲ Ep), motion energy (» Ek) and heat (🔥) in joules, live. You can never ride higher than your energy allows — pump to add work, avoid sand and rough asphalt, and pick lines inside an energy budget.

Grades 7–9: energy forms, transformations and conservation (grade 7 ch. 4), Ep = m·g·h and Ek = ½·m·v² with g = 10 (grade 9 ch. 10), friction (grade 8 ch. 5). See [CURRICULUM.md](CURRICULUM.md).

## Run

```bash
npm install
npm run dev        # http://localhost:5199 (strict port)
npm test           # vitest: physics + level solvability (24 tests)
npm run build      # static bundle in dist/ (relative base, works offline)
npm run preview    # http://localhost:4199
```

URL params: `?level=N` (1–6) jumps straight into a level.

## Controls

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Drop in | ↓ / S / Space | A | "↓ דרופ־אין" |
| Pump (only in the glowing curve at the bottom) | ↑ / W | A / RT | big "↑ שאיבה" (glows when it's the moment) |
| Change lane / pick a tower or line before dropping | ← → / A D | d-pad / left stick | ‹ › |
| Ollie (while rolling) | Space | B | "קפיצה" |
| Trick in the air (style only) | Shift / X / E | X | "טריק" |
| Restart | R | Y | ↻ |
| Pause / mute | P or Esc / M | Start | top-bar buttons |

## Levels (implemented)

1. **הדרופ הראשון** — drop in, watch Ep ⇄ Ek, fall short of a higher deck (heat), then pump and make it.
2. **כבד או קל?** — collect the star; predict what a 25 kg backpack changes; same height, same speed, more joules.
3. **משטחים רעים** — three lanes of smooth concrete, sand and rough asphalt; carve a smooth zig-zag to reach the ramp.
4. **שאיבה בקערה** — reach a coping higher than your start, only by pumping in rhythm.
5. **מהירות בריבוע** (grade 9, live formulas) — pick the drop tower that gives enough Ek to clear the gap: 2× speed needs 4× height. Braking strip shows stopping distance.
6. **קו הטיילת** — transfer level with no hints: choose one of three lines; numbers revealed after the run.

Each level: 1–3 stars. Progress and an anonymous learning log (level, action, outcome, hint state, attempt) stay in `localStorage` only.

## How it's built

- TypeScript + Vite + Three.js. Pure domain modules with no Three.js: `src/sim/` (track curves, physics, levels) and `src/game/run.ts` (goals, scripts, stars, log). The scene (`src/render/`) and HUD (`src/ui/`, `src/main.ts`) only render that state; the ring's numbers are the module's numbers (tested).
- 3D models: Tripo (rigged skater with surf/idle/jump/cheer/fall clips, board, lifeguard tower, palm, backpack, kiosk) — see [ASSETS.md](ASSETS.md). Ramps are procedural from the physics profiles; meshes are never colliders.
- Sound: procedural WebAudio after the first input (wheels by surface, pump, landing, stars, cheer, sea).
- Test hooks: `window.render_game_to_text()` and deterministic `window.advanceTime(ms)`.

## Deploying (Vercel)

Static site; `vercel.json` is included (`framework: vite`, build `npm run build`, output `dist`). Import the GitHub repo in Vercel and deploy, or `npx vercel --prod` from the repo. The build uses a relative base (`./`), so it also works inside a sub-path (e.g. science-games.workbook.co.il/halfpipe-joule/) and offline; fonts and models are bundled, nothing is fetched at runtime.

Measured build (26 Oct 2026): JS 743 kB (198 kB gzip), CSS 20 kB, fonts ~0.9 MB, models ~11 MB, `dist/` 13 MB total.

## Docs

[GAME_IDENTITY.md](GAME_IDENTITY.md) · [CURRICULUM.md](CURRICULUM.md) · [ASSETS.md](ASSETS.md) · [progress.md](progress.md) · [PLAYTEST.md](PLAYTEST.md) · [docs/VISUAL_REVIEW.md](docs/VISUAL_REVIEW.md) · mockups in [docs/visual-targets/](docs/visual-targets/) · handoff in [docs/handoff/](docs/handoff/)
