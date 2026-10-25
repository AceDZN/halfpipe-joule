# Assets — Halfpipe Joule (ג'ול ברמפה)

All 3D models generated with **Tripo Studio** (https://studio.tripo3d.ai, user's signed-in account, Chrome UI only — no API, no other generator) on 25–26 Oct 2026 by the Visual/Chrome builder. Exported through the UI as GLB, 1k textures. Originals are kept outside the repo in `~/Downloads/halfpipe-joule-originals/` (`hj-*.glb`); the repo copies in `public/models/` are byte-identical (no processing — every file is under 3 MB, so `gltf-transform optimize` was not needed).

Mockups / visual targets: see `docs/visual-targets/PROMPTS.md`.

## Generation settings (all six models)

HD Model, text-to-3D, AI model **H3.1 – Best Quality**, Texture on, 2K texture quality, PBR on, Remove Lighting off, Topology **Triangle**, Polycount **20000**, Privacy "Sharing Only". Displayed cost **30 credits** per generation.

## Common conventions (measured from the GLBs with `@gltf-transform/core`)

- **Y-up, base at y = 0, centred on X/Z, normalised so the largest extent is 1.0** (Tripo default). Scale them in the game (e.g. skater ×1.65 for a 1.65 m teen, lifeguard tower ×5–6, palm ×6–9).
- One mesh, one PBR material, three 1024² JPEG textures (base colour, normal, metallic-roughness). No KHR/EXT extensions.
- Front = **+Z** (verified for the skater from the toe joints; for the props it is the Tripo convention and the side shown in the Tripo viewer by default — check in-engine before relying on it).
- Generated meshes are visual only; never use them as colliders or physics surfaces (ramps/bowls are procedural).

## Credits

| Item | Task | Displayed cost |
|---|---|---|
| Skater generation | 7732263b | 30 |
| Skater **Free Retry** (first roll had purple skin) | same task | 0 ("Free Retry ×3") |
| Skateboard | 54671f60 | 30 |
| Lifeguard tower | 0ff247c2 | 30 |
| Palm | 896752c3 | 30 |
| Backpack | 7edd1636 | 30 |
| Kiosk + bench | 19b2e546 | 30 |
| Auto Rig (Humanoid, Mixamo preset) | 7732263b | 20 |
| 5 preset animations (surf, jump, cheer, fall, idle) | 7732263b | 0 each (balance unchanged when retargeting) |
| **Total spent by this crew** | | **200** |

Account balance (shared with other crews who were generating at the same time): 8095 at start → 6915 at the end. Caps respected: 6 model generations, 1 rig job + 1 animation-preset batch (the presets cost 0 credits; no paid AI animation was used).

---

## skater.glb — hero character (rigged + 5 clips)

- **Prompt:** "Stylized teen skateboarder character for a colourful 3D game, full body, standing in T-pose, arms straight out, feet slightly apart, no skateboard, nothing in hands. Bright yellow short-sleeve t-shirt, teal knee-length shorts, white skate helmet, red high-top sneakers with white soles, light tan skin, friendly cheerful face, slim proportions, clean hand-painted Pixar-like style, game-ready." — T-Pose toggle **on**.
- **Task URL:** https://studio.tripo3d.ai/workspace/generate/7732263b-0f75-41d9-aff3-cfdec018c36d (rig/animate pages use the same id under `/workspace/rigging/` and `/workspace/animate/`)
- **History:** first roll had purple/blue skin texture → used Free Retry (0 credits). Second roll: tan skin, yellow tee, white helmet with ear pads, red high-tops with white soles. **Shorts came out lime/grass green, not teal** — tint in-engine if it matters. No board fused to the feet.
- **Rig:** Auto Rig, Humanoid, Skeleton Preset **Mixamo** (20 credits). **Animations:** Tripo presets, exported with "Export Skeleton" on, all 5 animations selected, **"Animation stay in Place" on**.
- **File:** `public/models/skater.glb` — 2,188,348 bytes (2.09 MB)
- **sha256:** `577f73ec75eb4f0ad4dd384e4ae8042f5671f333003fbc7db3c1780bda3623af`
- **Triangles:** 19,012 (1 skinned mesh)
- **Bounding box (bind pose):** x −0.50…0.50 (arms out), y 0…0.997, z −0.122…0.122. Y-up, feet at y = 0, **faces +Z** (toes at +Z), character's left = +X.
- **Skeleton:** top node `Armature` (identity transform), 65 joints, Mixamo names `mixamorig:*` — `mixamorig:Hips` (root joint, at y ≈ 0.485), Spine/Spine1/Spine2, Neck, Head, HeadTop_End, Left/Right Shoulder/Arm/ForeArm/Hand + full fingers (Thumb/Index/Middle/Ring/Pinky 1–4), Left/Right UpLeg/Leg/Foot/ToeBase/Toe_End. Bind pose is a T-pose.
- **Animation clips** (exact names; channels on all 65 joints, translation+rotation+scale; Hips X/Z constant → in place, only Hips Y moves):

| Clip | Duration | Use in game | Notes |
|---|---|---|---|
| `surf` | 3.67 s | riding stance / crouch-pump on the board | knees bent, wide stance, arms out for balance; hips Y 0.36–0.41 (crouched). Best "on board" clip. |
| `idle` | 15.33 s | standing on the deck before drop-in | relaxed upright idle, long loop |
| `jump` | 2.21 s | ollie | crouch → jump → land; hips Y 0.42–0.67 |
| `cheer` | 12.08 s | target reached / celebrate | arms up cheering |
| `fall` | 3.00 s | bail | falls backwards and ends lying on the ground (hips Y 0.45 → 0.12); play once, clamp |

- **Not available as presets** (would need paid AI animation = a 3rd job, so skipped): a skate **push**, a dedicated **crouch/pump**. Suggest: use `surf` for riding and blend its weight / add a procedural Hips-down offset for the pump; push can be faked with a short `surf` loop + board speed.

## board.glb — skateboard

- **Prompt:** "A single skateboard, stylized game asset: maple deck with upturned kicktail and nose, four chunky white urethane wheels on silver metal trucks. Deck top has black grip tape; deck bottom graphic is a bold yellow lightning bolt shaped like the letter J on a turquoise and orange sunset gradient. Clean hand-painted colourful style, isolated object, wheels down."
- **Task URL:** https://studio.tripo3d.ai/workspace/generate/54671f60-6c10-40d1-a359-444ad230d717
- **File:** `public/models/board.glb` — 1,001,520 bytes (0.96 MB), sha256 `6c48af4bdc8d5e7ac62eed7c45228258e3593523f348244d74afa974c9914d41`
- **Triangles:** 19,106
- **Bounding box:** x −0.221…0.221, y 0…1.0, z −0.336…0.336.
- **Orientation warning:** the board was generated **standing on its tail — long axis along +Y**, deck bottom (yellow lightning bolt on turquoise→yellow→orange watercolour gradient) and the wheels facing the default viewer side (assumed +Z). Rotate −90° about X (then re-centre so the wheels sit at y = 0) to lie it flat, wheels down. Black grip tape on the top side; white wheels, silver trucks. The bolt reads as a lightning bolt more than a clear "J".

## lifeguard-tower.glb — Tel Aviv lifeguard tower (landmark)

- **Prompt:** "Tel Aviv beach lifeguard tower, stylized game asset: a small square wooden cabin hut raised on four tall wooden stilts with diagonal cross braces, a wooden staircase ladder up the side, a flat overhanging roof, big open windows on all sides, painted white and sun-faded light blue wood with a red and white stripe band, a small flag pole on the roof. Clean hand-painted colourful style, standing on a flat base, isolated object."
- **Task URL:** https://studio.tripo3d.ai/workspace/generate/0ff247c2-c8c5-455a-be1c-26bd41ef38c1
- **File:** `public/models/lifeguard-tower.glb` — 1,205,888 bytes (1.15 MB), sha256 `b7c4e973d959fb0141b5ad947629b0e68e91805a0aac49a7a86100c84a701540`
- **Triangles:** 18,458
- **Bounding box:** x −0.276…0.276, y 0…1.0, z −0.316…0.316. Y-up, base on y = 0.
- **Look:** white-washed cabin with sky-blue roof and window frames, two red patches/stripe accents, side railing, natural-wood stilt frame with X braces and a front ladder (ladder side assumed +Z), thin flag pole with a pink/red flag.

## palm.glb — fan palm

- **Prompt:** "A single tall Washingtonia fan palm tree like on the Tel Aviv beach promenade, stylized game asset: slim slightly curved grey-brown ringed trunk, a round crown of bright green fan-shaped fronds on top with a few dry tan fronds hanging below, small round base of sandy soil. Clean hand-painted colourful low-poly-friendly style, isolated object."
- **Task URL:** https://studio.tripo3d.ai/workspace/generate/896752c3-1a08-4f00-8c43-7edec4cb9e41
- **File:** `public/models/palm.glb` — 1,372,240 bytes (1.31 MB), sha256 `cf13ad2a4ba18ed1249e842e19c7d0959ecb08588a111afd27acd09286a427cd`
- **Triangles:** 19,119
- **Bounding box:** x −0.334…0.334, y 0…1.0, z −0.306…0.306. Y-up, sandy base disc on y = 0.
- **Look:** slim grey-brown trunk, dense crown of bright green fan fronds with a skirt of dry tan fronds; proportions are a bit stocky (crown is ~45 % of the height) — scale Y up a little for the tall promenade look if wanted. Alpha-free (solid fronds).

## backpack.glb — heavy red backpack (optional prop, mass levels)

- **Prompt:** "A heavy overstuffed bright red hiking backpack, stylized game asset: bulging rounded body like a sandbag, thick black shoulder straps, chunky buckles, a top flap, a small white weight tag hanging from the zipper, worn canvas texture. Clean hand-painted colourful style, standing upright on its base, isolated object."
- **Task URL:** https://studio.tripo3d.ai/workspace/generate/7edd1636-16a8-4bee-b6dd-3314aef6f4f8
- **File:** `public/models/backpack.glb` — 1,131,400 bytes (1.08 MB), sha256 `c5165e5ab8c70197d2cdcdc3dcde358fd350bf4aed7749f24be832294988a98e`
- **Triangles:** 18,974
- **Bounding box:** x −0.346…0.346, y 0…1.0, z −0.332…0.332. Y-up, base on y = 0.
- **Look:** bright red-orange bulging pack, grey/white straps and buckles on the front, dark brown bottom panel. The "weight tag" did not appear clearly. Front (buckle side) assumed +Z; attach to `mixamorig:Spine2` with the front facing −Z (the skater's back).

## kiosk.glb — promenade kiosk + bench (optional set piece)

- **Prompt:** "Small Tel Aviv beach promenade kiosk, stylized game asset: a compact white and turquoise painted wooden snack kiosk with a striped orange and white fabric awning, an open serving window with a counter, a few cold drink bottles and a stack of colourful beach balls, a round sign on top with a popsicle icon, and a wooden slatted bench with metal legs attached to one side. Clean hand-painted colourful style, standing on a flat base, isolated object."
- **Task URL:** https://studio.tripo3d.ai/workspace/generate/19b2e546-97df-4e77-8a6f-850573d3532f
- **File:** `public/models/kiosk.glb` — 1,099,956 bytes (1.05 MB), sha256 `acbc15b9b315079225a1dd5eabd0f5a9e55ab9b17b308490baebc27fa01d5176`
- **Triangles:** 16,450
- **Bounding box:** x −0.5…0.5, y 0…1.0, z −0.397…0.397. Y-up, on a thin dark base plate at y = 0.
- **Look:** cream-white kiosk with mint/turquoise trim, scalloped orange-and-white striped awning, round sign with a popsicle on the roof, bottles and two beach balls on the counter, small wooden bench on the right side, a stone and a small bucket at the base. Serving window side assumed +Z.

## Not generated

- Ramps, bowls, towers, coping, energy ring, pump ring, energy line, replay bars: procedural (per BUILD_HANDOFF).
- Heavier second skater: skipped (6-generation cap used on board/landmarks/props).
