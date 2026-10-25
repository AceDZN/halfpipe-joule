# Halfpipe Joule — ג'ול ברמפה — build handoff

Read `../COMMON.md` first (especially "Lesson from round 1"). Repo `/Users/acedzn/dev/AceDZN-exp/halfpipe-joule` → public `AceDZN/halfpipe-joule`, port 5199 (preview 4199).

## Promise

A skateboarding game where you can see the energy. Drop into bowls, ramps and rails on a sunny Tel Aviv promenade skate park. A ring around your skater shows **potential energy (height), kinetic energy (speed) and heat (friction)** in joules, live. You can never get higher than your energy allows: pump to add energy, pick smooth concrete over sand and rough asphalt, and chain lines inside an energy budget. The fun is flow, speed and style; the physics is the reason a line works.

Map evidence: Session: Skate Sim × Kerbal Space Program — related ✓, density **0.644**, the emptiest passing blend of both science rounds. **Convergence watch:** Hypotenuse Rush (math) is athletic grappling traversal on red-rock cliffs. Keep this a closed skate park about momentum and energy: no grappling, no distance-gap puzzles, seaside palette.

**Controls must be dead simple** (round-1 lesson): forward/back to pump at the right moment, left/right to carve, one jump/ollie button, one trick button. Gentle auto-balance; bails are funny and instant to recover from. Works with keyboard, gamepad and touch.

## Curriculum

Grade 7, chapter 4: [kinetic-energy](https://science.workbook.co.il/grade-7/chapter-4/kinetic-energy), [potential-energy](https://science.workbook.co.il/grade-7/chapter-4/potential-energy), [thermal-energy](https://science.workbook.co.il/grade-7/chapter-4/thermal-energy), [energy-transformations](https://science.workbook.co.il/grade-7/chapter-4/energy-transformations), [conservation-law](https://science.workbook.co.il/grade-7/chapter-4/conservation-law).
Grade 9, chapter 10: [energy-units](https://science.workbook.co.il/grade-9/chapter-10/energy-units), [potential-energy](https://science.workbook.co.il/grade-9/chapter-10/potential-energy), [kinetic-energy](https://science.workbook.co.il/grade-9/chapter-10/kinetic-energy), [kinetic-energy-calc](https://science.workbook.co.il/grade-9/chapter-10/kinetic-energy-calc), [energy-conversion](https://science.workbook.co.il/grade-9/chapter-10/energy-conversion), [conservation-law](https://science.workbook.co.il/grade-9/chapter-10/conservation-law), [road-safety](https://science.workbook.co.il/grade-9/chapter-10/road-safety) (optional bonus: braking distance).
Grade 8, chapter 5: [friction](https://science.workbook.co.il/grade-8/chapter-5/friction).

Rules (Workbook's own): g = 10 m/s²; Ep = m·g·h; Ek = ½·m·v²; joules; without friction Ep + Ek is constant (a pendulum/skater can't rise above the release height); with friction Ep + Ek = Ep′ + Ek′ + heat (total energy conserved, mechanical energy lost); mgh = ½mv² so speed from a drop doesn't depend on mass; doubling speed quadruples Ek; pumping = doing work (adds energy from the rider's muscles — chemical energy). Grade-7 version uses words and bars; grade-9 levels show numbers.

Scientific qualifications: simulate the board as a point mass along authored ramp curves (spline track physics) in a pure TS module, not a generic physics engine guess; rolling friction coefficient per surface; air drag optional and labelled; the ring's numbers must equal the module's numbers at every frame; pumping adds a stated energy per well-timed pump.

Misconceptions: "energy gets used up" (it becomes heat); "heavier skaters go faster / higher"; "speed at the bottom depends on the ramp's shape" (only on height drop, without friction); "potential energy is something you have only when you're high" (relative to a chosen zero level); force vs energy.

## Core loop

Short challenge lines in a few park areas, each with one clear goal shown in 3D (a glowing coping, a rail, a gap marker): reach it, clear it, or stay under a heat budget. Before a challenge, an optional "predict" ghost line shows the theoretical max height from your current energy; after a fail, a 3-second replay shows where the energy went (bar chart along the path). Score style points for tricks but energy decides what's possible.

## Six areas (vertical slice)

1. **First Drop.** Drop into a mini-ramp, watch Ep turn into Ek and back. Try to reach the far deck — just short (friction). Pump once and make it.
2. **Same Height, Any Mass.** Swap to a heavier skater (or carry a backpack): same max height, same bottom speed from the same drop — the ring scales but the outcome doesn't.
3. **Bad Surfaces.** A sand patch and rough asphalt drain energy into heat (the heat bar grows, the board smokes a little); pick the smooth line.
4. **Bowl Pump.** Reach a coping higher than the drop-in only by pumping at the right moments (work in).
5. **Speed Squared (grade 9 numbers).** A gap needs a minimum Ek; doubling speed quadruples Ek — choose the drop height that gives enough. Optional bonus: a bike-lane braking strip shows stopping distance ∝ v² (road-safety).
6. **Transfer: The Promenade Line.** No ring hints (numbers hidden until after the run): predict which line through a new park reaches the final quarter-pipe; a "just go fast everywhere" strategy loses too much to friction.

## 3D, camera, art

- Third-person chase camera, smooth, slightly low for speed; strong sense of height on ramps.
- Visual thesis: Tel Aviv promenade at golden hour — white concrete bowls, colourful graffiti, palm trees, the sea behind, sunset glow; the energy ring is a clean three-colour HUD-in-world element (shape + colour + number, never colour alone).
- Tripo candidates (≤ 6): skater (rigged, Mixamo preset; animations: push, idle on board, crouch/pump, ollie, a grab trick, bail, celebrate — use Tripo presets or AI animation), the board, a bowl/ramp set piece (visual only — collision curves are procedural splines), a lifeguard tower or promenade landmark, a heavier second skater (optional). Ramps' physics geometry is authored, never from the mesh.

## Acceptance

First 30 seconds: drop in, feel the speed, watch the ring swap Ep↔Ek, fall short of a higher deck, pump, make it, cheer. Energy numbers always agree with the physics module (tests at sampled frames). Area 2 shows mass independence through play. The transfer line is solvable without hints and fails a constant strategy.
