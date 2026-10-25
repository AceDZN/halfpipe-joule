# Halfpipe Joule — ג'ול ברמפה — game identity

## One line
A sunset skateboarding game on the Tel Aviv promenade where you can **see your energy**: a ring around the skater shows height energy, motion energy and heat in joules, live — and you can never ride higher than your energy allows.

## The first 10 seconds (no reading needed)
1. Camera shows a white concrete mini-ramp at golden hour, the sea and palm trees behind. The skater stands on the left deck, board tipped over the coping. A big pulsing key hint: **↓ / רווח — דרופ־אין**.
2. One press: the skater drops in. The ring around them swaps colour from blue (height) to orange (speed) at the bottom and back to blue on the far side. A glowing horizontal **energy line** across the ramp shows the highest point the current energy can reach.
3. The far deck has a glowing **target coping** (gold flag). The skater rises… stops just below it (the energy line sits a hair under the coping: some energy became red heat) and rolls back.
4. A glowing **pump ring** lights up at the bottom of the curve with **↑ שאיבה**. One well-timed press: "+150 J" pops out with a muscle icon, the energy line jumps above the coping, the skater rolls onto the deck — confetti, cheer, ★.

## Verbs (dead simple)
| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Drop in / start | ↓, S or Space | A | big "דרופ־אין" button |
| Pump (only in the glowing ring at the bottom of a curve) | ↑ or W | A / RT | big round "שאיבה" button (right) |
| Carve between lanes | ← → or A D | left stick | two arrow buttons (left) |
| Ollie | Space (while rolling) | B | "אולי" button |
| Trick in the air (style only, no energy) | Shift / X | X | "טריק" button |
| Restart | R | Y | ↻ button |

Pumping at the wrong moment scrubs a little speed (bad technique): mashing does not win.

## Camera
- Halfpipe / bowl levels: wide three-quarter side view that follows gently, so heights are always readable against the ramp.
- Line levels: low third-person chase camera behind the skater, strong sense of speed; swings wide at the end to show whether the target was reached.

## HUD
- **Energy ring (in world, around the skater):** a donut that always represents the total energy. Three arcs with icon + colour + number: ▲ גובה (Ep, sky-blue), ≫ תנועה (Ek, sunset orange), 🔥 חום (heat, red). Muscle "+150 J עבודה" pops when pumping. Never colour alone.
- **Energy line:** a glowing dashed horizontal line across the ramp at h_max = (Ep + Ek) / (m·g): "you can't get above this".
- **Top bar (RTL):** level name on the right ("שלב 1 · הדרופ הראשון"), stars, mute / pause / restart on the left.
- **Energy bank (bottom right):** three vertical bars with numbers in joules, plus mass, height and speed readouts (`m = 50 kg`, `h = 1.8 m`, `v = 4.2 m/s`). Grade-9 levels add the formulas `Ep = m·g·h`, `Ek = ½·m·v²`.
- **After a miss:** 3-second replay: the path is drawn with red bars standing up wherever energy turned into heat, and a stacked bar "where did my joules go?".

## Look
Tel Aviv promenade at golden hour. White and warm-grey concrete bowls and ramps with steel coping, colourful graffiti (turquoise, pink, yellow), wooden lifeguard tower, palm trees, promenade tiles, the Mediterranean behind with a low orange sun, long soft shadows, a hint of haze. Sand patches and rough patched asphalt look clearly different from smooth concrete. Skater: a teen in a bright yellow tee, teal shorts, white helmet, red sneakers, board with a joule "J" lightning graphic.

## Feel
Flow and speed first. Bails are funny (the skater tumbles, the board flips away, a "אוי!" bubble), recovery is one key press, never a penalty screen. Style points for tricks; energy decides what's possible.

## Science promise
Point-mass physics on authored ramp curves in a pure TypeScript module: g = 10 m/s², Ep = m·g·h, Ek = ½·m·v², rolling friction per surface turns mechanical energy into heat, pumps add a stated amount of work. The ring's numbers are the module's numbers.

## Not this game
No grappling, no cliffs, no distance-gap math puzzles, no courier loop, no worksheet popups.
