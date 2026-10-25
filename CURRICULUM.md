# Curriculum map — Halfpipe Joule (ג'ול ברמפה)

Source of truth: Workbook science (saved snapshots in [`docs/curriculum/`](docs/curriculum/)). Terms used in the game follow Workbook: **אנרגיית גובה** (Ep), **אנרגיית תנועה** (Ek), **חום** / אנרגיה תרמית, **עבודה**, **כוח חיכוך**, joules (J), g = 10 m/s².

| Level | Workbook modules | Skill practised (through play) | Misconception it checks |
|---|---|---|---|
| 1 · הדרופ הראשון (grade 7) | [g7 ch4 potential-energy](https://science.workbook.co.il/grade-7/chapter-4/potential-energy), [kinetic-energy](https://science.workbook.co.il/grade-7/chapter-4/kinetic-energy), [energy-transformations](https://science.workbook.co.il/grade-7/chapter-4/energy-transformations), [thermal-energy](https://science.workbook.co.il/grade-7/chapter-4/thermal-energy) | Watch Ep ⇄ Ek on the ring; see you can't climb higher than the energy line; a little energy becomes heat each pass; pumping (work from your muscles) adds energy. | "Energy gets used up" — the ring keeps its full size; the missing part is red heat. |
| 2 · כבד או קל? (grade 7, grade-9 formula in the takeaway) | [g7 ch4 conservation-law](https://science.workbook.co.il/grade-7/chapter-4/conservation-law), [g9 ch10 conservation-law](https://science.workbook.co.il/grade-9/chapter-10/conservation-law) | Predict, then see: a 75 kg rider has 1.5× the joules but reaches the same height with the same top speed (m·g·h = ½·m·v², the mass cancels). | "Heavier skaters go faster / higher." |
| 3 · משטחים רעים (grade 8) | [g8 ch5 friction](https://science.workbook.co.il/grade-8/chapter-5/friction), [g7 ch4 thermal-energy](https://science.workbook.co.il/grade-7/chapter-4/thermal-energy) | Choose a lane line: sand and rough asphalt have more friction, so more motion energy becomes heat per metre; only the smooth zig-zag reaches the ramp. | "Friction makes energy disappear" (it becomes heat); "all ground is the same". |
| 4 · שאיבה בקערה (grade 7) | [g7 ch4 conservation-law](https://science.workbook.co.il/grade-7/chapter-4/conservation-law), [energy-transformations](https://science.workbook.co.il/grade-7/chapter-4/energy-transformations) | Reach a coping higher than the start only by doing work (pumping) at the right moment; mashing scrubs energy into heat. | "You can get higher just by going faster / by trying harder" without adding energy. |
| 5 · מהירות בריבוע (grade 9) | [g9 ch10 kinetic-energy](https://science.workbook.co.il/grade-9/chapter-10/kinetic-energy), [kinetic-energy-calc](https://science.workbook.co.il/grade-9/chapter-10/kinetic-energy-calc), [potential-energy](https://science.workbook.co.il/grade-9/chapter-10/potential-energy), [energy-units](https://science.workbook.co.il/grade-9/chapter-10/energy-units), bonus [road-safety](https://science.workbook.co.il/grade-9/chapter-10/road-safety) | The gap needs about twice the speed of the smallest tower: twice the speed needs 4× the Ek, so a 4× higher drop (the 2× tower fails, the 8× tower overshoots). The braking strip shows stopping distance growing with v². Live formula card: Ep = m·g·h, Ek = ½·m·v². | "Twice the speed needs twice the energy"; "more is always better". |
| 6 · קו הטיילת — transfer, no hints (grade 9) | [g9 ch10 energy-conversion](https://science.workbook.co.il/grade-9/chapter-10/energy-conversion), [conservation-law](https://science.workbook.co.il/grade-9/chapter-10/conservation-law), [g8 ch5 friction](https://science.workbook.co.il/grade-8/chapter-5/friction) | New park, numbers and energy line hidden. Pick one of three lines before dropping: only the smooth line with dips works, and only if you pump in a dip. The straight "fast" asphalt line and the sandy shortcut lose too much to heat. Numbers are revealed after the run. | "Just go fast everywhere"; picking the steepest/shortest line without thinking about friction. |

## Science rules in the code (`src/sim/`)

- Point mass on authored ramp curves (lines + circular arcs), evaluated analytically (`track.ts`). Not a generic physics engine.
- g = 10; Ep = m·g·h above the lowest ground of each spot (the zero level); Ek = ½·m·v².
- On the ground, mechanical energy changes only by friction heat (rolling friction μ·N, N = m(g·cosθ + v²·κ), μ per surface) and by the rider's work. Ep + Ek + heat = E0 + work at every frame (tested).
- In the air: exact ballistic motion, no drag (labelled as an approximation). On landing, the speed component into the ramp becomes heat ("נחיתות"); too hard a landing is a bail (all motion energy → heat and sound).
- A well-timed pump adds m·g·0.3 m of work (like lifting yourself 30 cm) once per pass through the glowing curve; a mistimed pump scrubs m·g·0.04 m into heat.
- μ values (approximate, chosen in a realistic range and to make the difference visible): smooth concrete 0.010, promenade concrete 0.016, wood 0.012, rough asphalt 0.05, sand 0.22, rubber braking strip 0.45.

## Simplifications (stated honestly)

- Pumping is modelled as a fixed amount of work per well-timed pump, not by simulating the rider's centre of mass.
- Rolling friction is a single coefficient per surface; no air drag.
- The heat bucket also holds sound (landings, bails).
