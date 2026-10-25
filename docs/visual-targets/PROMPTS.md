# Visual targets — Halfpipe Joule (ג'ול ברמפה)

Design targets only — **not** evidence of the implemented game. Hebrew text in the images is mostly right but copy the layout, not the text.

- Tool: ChatGPT image generation (signed-in account, user's Chrome), one chat, 4 prompts, every image accepted on the first roll.
- Chat URL: https://chatgpt.com/c/6ade722e-11e4-83ed-b7f3-91f05e991814
- Date: 25 Oct 2026 (23:18–23:43 IST)
- Native size 1671×941 / 1672×941 (originals kept outside the repo in `~/Downloads/halfpipe-joule-originals/`), saved here resized to **1600×900**.

## Shared look (all four)

- **Palette:** golden hour — sky gradient pink/lavender at the top to peach/orange at the horizon; low warm-white sun sitting on the sea, orange sun-glitter on the water; warm white/beige concrete with soft orange rim light and long blue-violet shadows; graffiti in hot pink, turquoise, yellow, with a white city-skyline motif and the words "תל אביב"; palm trees (date and fan palms) as dark-green silhouettes with backlit edges; wooden lifeguard tower on stilts near the waterline, promenade railings, flags, benches, small crowds. Slight haze toward the horizon.
- **Skater:** slim teen, bright yellow tee, teal shorts, white helmet, white socks, red sneakers; stylized Pixar-ish proportions.
- **Energy ring (world space, around the skater, ~1.6× the skater's height in diameter, facing the camera):** a thick glowing donut split into three arcs, each a rounded segment with an icon + number in a pill (hex values are my eyeballed approximations): **sky-blue** (#2FA8FF → #6FD3FF) on top with "▲ 620 J"; **sunset orange** (#FF9A1F) on the right with "≫ 240 J"; **red** (#FF3B3B) on the left with "🔥 40 J". The arcs have a strong outer glow and a thin bright inner rim; the rest of the ring is a faint blue glow line.
- **Energy line:** golden-yellow dashed line (~4 px dashes with glow) spanning the whole ramp horizontally, with a small Hebrew label "קו אנרגיה" above its right end.
- **Target coping:** the far coping glows gold (thick yellow emissive bar) with a small yellow triangular flag on a pole standing on the deck.
- **Top bar (RTL):** a single full-width dark translucent rounded strip (≈ 50 px tall at 900p, inset 16 px). Right: level name in bold white ("שלב 1 · הדרופ הראשון"). Centre: three gold stars. Left: three round dark buttons with white icons (mute, pause, restart).
- **Energy bank (bottom right):** dark translucent rounded panel (~400×280 at 900p) titled "⚡ בנק אנרגיה". Three tall rounded cells side by side — RTL order in the image is blue ▲ (left), orange ≫ (middle), red 🔥 (right) — each with a coloured block/bar, icon on top and "620 J" under it. Under them a row of three cells: `m = 50 kg` | `h = 1.8 m` | `v = 4.2 m/s` (LTR math inside RTL panel).
- **UI style:** dark navy/charcoal semi-transparent panels (≈ rgba(20,24,36,0.75)), 16–20 px corner radius, thin light border, white bold rounded sans; colour comes only from the three energy colours, gold accents and yellow buttons.

## 01-first-drop.png — the first 30 seconds

Prompt (exact):

> Create an image, wide 16:9 landscape. It must look like a real in-game screenshot of a polished, stylized 3D browser skateboarding game (think Skate / Tony Hawk Pro Skater 1+2 remake / Rocket League polish, colourful and juicy, made for 13-year-olds) with a Hebrew right-to-left UI. Scene: golden-hour Tel Aviv beach promenade skate park: white and warm-grey concrete mini-ramp with steel coping, colourful graffiti (turquoise, pink, yellow) on the ramp walls, promenade tiles, palm trees, a wooden lifeguard tower, the Mediterranean sea behind with a low orange sun, long soft shadows, light haze. Camera: wide three-quarter side view of the mini-ramp so the heights are readable. A teen skater (bright yellow t-shirt, teal shorts, white helmet, red sneakers) is mid-ramp rolling down on a skateboard. Around the skater floats a glowing in-world donut-shaped ENERGY RING HUD with three coloured arcs, each with an icon and a number in joules: sky-blue arc with a triangle icon '▲ 620 J', sunset-orange arc with a double-chevron icon '≫ 240 J', red arc with a flame icon '🔥 40 J'. A glowing dashed horizontal ENERGY LINE spans across the ramp at a height just under the far deck's coping; the far deck's coping glows gold with a small gold flag (the target). At the bottom of the ramp's curve a glowing circular PUMP RING on the ground with a big key hint '↑ שאיבה'. UI: slim top bar right-to-left: level name on the right 'שלב 1 · הדרופ הראשון', three stars in the middle, round buttons (mute, pause, restart) on the left. Bottom right: an 'energy bank' panel with three vertical bars (blue, orange, red) with joule numbers, and small readouts 'm = 50 kg', 'h = 1.8 m', 'v = 4.2 m/s' (numbers left-to-right). Clean rounded semi-transparent dark UI panels with white text and bold colourful accents. No worksheet look, no text paragraphs.

What it shows:
- **Camera:** three-quarter side view, eye height ≈ deck height, looking slightly down the ramp's long axis toward the sea; the whole mini-ramp (left wall → flat → right wall) spans ~90 % of the frame width, so the left and right decks are both visible. FOV feels ~50°.
- **Scene:** left wall foreground-left (graffiti "תל אביב" on its side), flat bottom centre, right wall/deck right with gold coping + flag at about 40 % from the top. Behind: promenade, palms, lifeguard tower dead centre, sun just right of centre above the sea.
- **Action:** skater on the left transition going down, ring around him (blue arc on top, orange right, red left). Dashed energy line at the skater's height, ending a bit **below** the far coping (the "you won't make it" read).
- **Pump ring:** flat gold dashed double ellipse on the ramp bottom (≈ 3 m wide in world) with a dark pill "↑ שאיבה" in its centre (yellow arrow).
- **HUD:** top bar and bank as in "Shared look". Note: the bank's three bars are all drawn the same height here — in the game they must be proportional to the joules (as in 02/04).

## 02-core-line.png — core action mid-play (line level)

Prompt (exact):

> Great, keep exactly this art style, skater, ring and UI style. Now a second in-game screenshot from the same game, 16:9 landscape, different level: a long downhill 'line' level along the Tel Aviv beach promenade at golden hour. Camera: low third-person chase camera close behind and slightly above the skater, strong sense of speed (slight motion blur on the ground and edges, speed lines). The skater (yellow tee, teal shorts, white helmet, red sneakers) is crouched and speeding away from the camera down a long promenade path split into three parallel lanes that look clearly different: left lane smooth white polished concrete, middle lane a patch of beach sand, right lane rough cracked patched dark asphalt. The skater rides the rough asphalt lane and the board's wheels give off small smoke puffs and orange sparks. The energy ring floats around the skater, seen from behind: big orange ≫ motion arc, smaller sky-blue ▲ height arc, and a noticeably bigger red 🔥 heat arc glowing hot, with joule numbers. Far ahead at the end of the line: a white concrete quarter-pipe with glowing gold coping and a gold flag, and a dashed glowing energy line across it. Palm trees, graffiti walls, lifeguard tower, the sea and low orange sun on the right. Same UI: top bar RTL (level name on the right 'שלב 4 · הקו הארוך', stars, round buttons on the left), energy bank panel bottom right with three vertical bars of different heights (blue short, orange tall, red medium) plus 'm = 50 kg', 'h = 0.6 m', 'v = 7.1 m/s'. Bottom left two small round touch arrow buttons for lane carving.

What it shows:
- **Camera:** low chase cam ≈ 1.3 m above ground, ≈ 3 m behind the skater, skater placed right of centre (on the right lane), horizon at ~30 % from top, strong one-point perspective with the vanishing point at the distant quarter-pipe (centre, ~30 % from top). Motion blur on the bottom corners and lane edges, white speed streaks at the screen edges.
- **Lanes (left→right on screen):** smooth glossy white concrete with reflections | beach sand with footprints | dark cracked patched asphalt; separated by white painted kerb lines. The skater's rear wheels throw a grey smoke puff + orange sparks.
- **Ring from behind:** blue ▲ 310 J on top, orange ≫ 460 J right, large glowing red 🔥 920 J left — heat clearly the biggest arc.
- **Target:** small white quarter-pipe at the vanishing point with gold coping, flag, and the dashed energy line drawn across its face.
- **Surroundings:** graffiti wall along the left (pink/turquoise "תל אביב"), sea + sun + lifeguard tower + railing on the right.
- **HUD:** top bar "שלב 4 · הקו הארוך"; bank bottom-right with bars of different fill (blue short, orange medium, red tall) + m/h/v row; two round dark touch buttons with white chevrons (‹ ›) bottom-left.

## 03-bail-replay.png — failure moment / replay

Prompt (exact):

> Perfect. Third in-game screenshot, same game and style, 16:9: the FAILURE moment on the mini-ramp level (same white concrete mini-ramp at golden hour, same wide three-quarter side camera). The skater did not have enough energy to reach the far deck: he fell short just below the gold glowing target coping and is bailing in a funny cartoon way, tumbling backwards in mid-air with arms flailing, the skateboard flipping away spinning, a white comic speech bubble 'אוי!' next to his head. Instant replay overlay: the skater's path is drawn as a glowing white dotted curve along the ramp, and along this path stand thin red glowing vertical bars (like a bar chart standing on the curve) wherever energy turned into heat, taller on the rough parts. A small 'REPLAY' style tag top-left of the scene in Hebrew 'ריפליי'. In the centre-bottom a rounded dark semi-transparent result card titled 'לאן הלכו הג׳ולים?' with one horizontal stacked bar split into sky-blue ▲ height, orange ≫ motion and red 🔥 heat segments with joule numbers, and next to it a big bright round-cornered yellow button '↻ שוב'. Same top bar RTL and energy bank panel bottom right. Fun and light, not a punishment screen.

What it shows:
- **Camera:** same as 01.
- **Bail:** skater horizontal in the air above the right coping, arms and legs flailing, mouth open; board spinning away to his right; white comic bubble "אוי!" with black outline above-left of his head.
- **Replay path:** white dotted line (dots ~8 px with glow) from the left deck down the left wall, across the bottom and up the right wall to the bail point. Thin red glowing vertical bars (≈ 10 px wide, rounded tops) stand on the path — tiny at the bottom left, growing steadily taller up the right wall (up to ~25 % of screen height). Dashed energy line at the reached height.
- **Replay tag:** red pill with white "▶ ריפליי" and a thin red corner-bracket frame, top-left under the top bar.
- **Result card:** centre-bottom dark translucent card (~720×270 at 900p): title "לאן הלכו הג׳ולים?", one rounded stacked bar (blue ▲ 320 J | orange ≫ 180 J | red 🔥 340 J — drawn left-to-right; consider reversing for RTL), small two-line captions under each segment, then a big yellow pill button "↻ שוב" (dark text) centred under it.
- **HUD:** same top bar, same bank (m = 50 kg, h = 1.6 m, v = 3.8 m/s).

## 04-hud-closeup.png — grade-9 level, HUD prominent

Prompt (exact):

> Love it. Fourth in-game screenshot, same game and style, 16:9: a grade-9 'challenge' level and a HUD-focused view. Camera: wide three-quarter side view, slightly closer, of three white concrete drop-in towers of different heights standing side by side on the promenade (short, medium, tall, each with steel coping and a height label '1.2 m', '2.4 m', '3.6 m' in small LTR tags), and in front of them a long run-up ramp ending in a kicker with a gap over a strip of sand to a landing deck with a glowing gold coping and gold flag. The skater (same character) stands on top of the tallest tower with the board tipped over the coping, ready to drop in, with a big pulsing key hint '↓ / רווח — דרופ־אין'. The energy ring around him is almost fully sky-blue ▲ (all height energy) '1800 J'. A dashed glowing energy line at his height across the whole level. The HUD is prominent and bigger: right side a large energy bank panel with three vertical bars (blue full, orange empty, red empty) with joule numbers, and under it a formula card with LTR math inside the RTL panel: 'Ep = m·g·h = 50 · 10 · 3.6 = 1800 J' and 'Ek = ½·m·v² = 0 J', plus readouts 'm = 50 kg', 'g = 10 m/s²', 'h = 3.6 m', 'v = 8 m/s needed' in clean monospace numbers. Top bar RTL: 'שלב 9 · מגדלי הקפיצה' on the right, stars, round buttons on the left. Same golden-hour Tel Aviv promenade, sea, palms, lifeguard tower, graffiti. Still a fun game, not a worksheet.

What it shows:
- **Camera:** three-quarter view from the left-front, slightly lower than 01; towers in the left third rising out of frame-left, the kicker → sand gap → landing quarter-pipe across the bottom-centre, sea/sun/lifeguard tower centre-right.
- **Towers:** drawn as three stepped blocks merged into one structure (1.2 m, 2.4 m, 3.6 m), each with a dark rounded label pill and a gold-glowing coping edge. Graffiti "תל אביב" on the base.
- **Skater:** standing on the 3.6 m top, board's nose over the coping; ring is a full blue circle with a pill "▲ 1800 J" at its top.
- **Key hint:** big dark pill with gold border, "↓ / רווח — דרופ־אין" (yellow arrow), floating right of the skater near the top.
- **Energy line:** dashed gold line at the skater's feet height, across the entire screen width.
- **Gap:** kicker with yellow chevron arrows, a white dashed arc showing the jump over a sand pit, landing quarter-pipe with gold coping and yellow flag.
- **HUD (right column, ≈ 23 % of the width, full height under the top bar):** "⚡ בנק אנרגיה" header; three bar cells (blue full "1800 J", orange and red empty "0 J"); a **cream/off-white formula card** with dark LTR math — `Ep = m·g·h =` / `50·10·3.6 = 1800 J` (result in blue) and `Ek = ½·m·v² = 0 J` (result in red), italic variables, subscripts p/k; then four dark pill readouts stacked: `m = 50 kg`, `g = 10 m/s²`, `h = 3.6 m`, and a gold-bordered `v = 8 m/s (נדרש)`.
