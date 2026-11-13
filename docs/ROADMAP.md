# Roadmap for Bieltructor v3

This follows the 18-phase v3 brief (`prompt-bieltructor-v3.md`). The brief was written against the first version of the game (57 × 57 world, 8 materials, 23 smoke checks). The repository is already far past that, so each phase starts from what exists. One phase, or one part of a phase, per session.

Last updated: 2026-11-13 (drawing and storage of phase 0d).

## Where each phase stands

| Phase | State | What exists | What is missing |
|---|---|---|---|
| 0 Foundations | **in progress (0a, 0b, 0c and the first part of 0d done)** | Plain blocks drawn as one mesh a chunk from a texture atlas, one block table with text IDs, rules in fixed ticks of 20 a second with interpolated drawing, chunks of 16 × 16 with only the edited chunk redrawn, input action layer, F3 overlay, saves that keep only the changes from the seed, seeded terrain, data tables for items, recipes, animals, monsters and difficulty | See "Phase 0 in parts" below |
| 1 Worlds, modes, difficulty | mostly done | New-world screen with preview, Creative and Adventure, four difficulties in `difficultyRules`, six worlds with rename, duplicate, export, import and delete | Flat, islands-only and single-biome worlds; 256 and 512 sizes; welcome chest; structures switch; photo mode; magic panel; "one life"; eight worlds instead of six |
| 2 Day, night, light, weather | mostly done | Day and night, block light 0 to 15 in two channels, beds, rain, snow, storms, campfires put out by rain | Moon phases, shooting stars, ambient occlusion, rainbow, fog, wind, light in the hand, seasons |
| 3 World generation | partly done | Six biomes, caves with lakes, ores by depth, water and lava that flow, ruins, cabins and wells with seeded treasure | Height 96, most biomes, tree kinds and saplings, deep stone, falling sand, the larger structures |
| 4 Blocks, items, crafting, farm | partly done | About 75 blocks, building shapes, five tool families in four materials, dyes, backpack, recipe book, workbench with nine squares, furnace, chests, three crops, fishing | Stairs, slabs and walls; armour; gold tools; anvil; dropped items on the ground; recipe unlocking; most decoration blocks; composter |
| 5 Animals | partly done | Chicken, cow, sheep, pig, rabbit, dog, cat, horse, babies, taming, riding, "animals only friends", bees, birds and fish as ambience | The other animals, leads, name tags, saddles, entity limits per quality |
| 6 Monsters | partly done | Sleepy, Jelly, Bony archer, woolly Spider, Puffy, mist Ghost, with the "never on Peaceful" and "never when off" rules tested | Muddy, Paper mummy, Sneak, Grumpy puffer, Clumsy witch, mini-bosses, mischief night, buildable guardians |
| 7 Health, hunger, combat | mostly done | Hearts, food, air, falls, bow, shield, falling asleep, lost backpack | Stars (experience), knockback, soft aim assist |
| 8 Transport and exploring | started | Riding a horse, map, compass, minimap | Boats, carts and rails, glider, home stone, cartographer table |
| 9 Villages and trading | not started | | Everything |
| 10 Spark circuits | not started | | Everything |
| 11 Magic | not started | | Everything |
| 12 Other worlds and the final boss | not started | | Everything |
| 13 Interface and accessibility | partly done | HUD, minimap and big map, large text, icons instead of words, Mine / Build switch on touch | Dressing Biel, sound captions, colour-blind modes, left-handed layout, movable touch buttons, auto-jump |
| 14 Tutorial and challenges | partly done | Guided tutorial, twelve stickers in a book shared by all worlds | Challenge tree with eight branches, per-world statistics |
| 15 Sound and music | mostly done | Sounds and music made live, footsteps by ground, voices, cave music, three volumes | Positional sound, music per place, record player, a "creatures" volume |
| 16 Platforms | mostly done | Mac, iPad and iPhone layouts, controllers, optional iCloud, Low Power Mode, release scripts | Controller remapping, a "High" quality, real-device and real-iCloud validation |
| 17 Playing together | not started | | Everything (an extra) |
| 18 Parents, saving, tests, docs | partly done | Parents' corner, validated import, autosave, automatic backups (last three per world) with Restore, 170 unit tests, 234 in-game checks, UI test, `docs/ARCHITECTURE.md` | Parents' summary |

## Phase 0 in parts

Phase 0 changes the ground everything stands on, so it is done in four parts. Each part must leave every in-game check passing.

### 0a: seeded rolls, registry checks, debug numbers (done, 2026-11-12)

- `src/random.js`: a seeded generator (number or text seed, `int`, `fork` for independent jobs).
- Every roll that decides something in the game goes through it: what a block drops, what an animal gives, where animals and monsters wander and appear, the weather, thunder, crops, fishing. It is seeded again for each world from the world's ID and age. `Math.random()` is left only where nothing depends on it: particles, rain drops, stars, sound pitch, the tip on the intro screen, the parents' question and new IDs.
- `tests/registry.test.js`: no recipe ID twice, no block type shared by two items, every item named in both languages, and recipes, furnaces, fuel, treasure, animals, monsters and block drops only name items that exist.
- F3 overlay: block coordinates, biome, light level and milliseconds of work per frame.

### 0b: fixed-step simulation (done, 2026-11-12)

- `src/simulation.js`: `FixedStep` (20 ticks a second, at most five ticks of catch-up after a stall, nothing carried over a pause) and `EntityInterpolation` (animals, monsters and arrows drawn between their last two ticks).
- `simulationTick()` in `src/main.js` runs the rules: time of day, world age, weather and thunder, animals and breeding, monsters and arrows, crops, fishing, water and lava, furnaces, hunger, air and health, bags on the ground, the autosave and the break reminder.
- Per drawn frame, as before: Biel's movement and the camera, mining, particles, ambience and the swing of legs and tails.
- Fishing and the wait on a full ground bag count in world age (saved) and no longer in the frame clock. Loading a world resets every rule clock.
- F3 overlay: milliseconds of the last tick.
- Tests: the same ticks, seeded rolls and furnace at 20, 30, 60 and 144 frames a second; the catch-up limit; pausing; interpolation. In the game: the same island after one second at 30, 60 and 120 frames a second, and no time passing while paused.

Left for later, on purpose:

- Biel's own movement, jumping and falls are still per frame (a 20 Hz step changes how jumping feels). They move to ticks with the shared entity list of 0d.
- The in-game checks still call some `update…` functions directly with their own step (crops, furnaces, water, lava). They test the rule, not the clock.

### 0c: block registry with text IDs (done, 2026-11-12)

- `src/blocks.js`: one entry per block with its text ID (`"stone"`, `"torch"`), base colour, light, "can walk through", "light passes" and its shape when it is not a whole cube (boxes or crossed panels). The place in the list is the number saved worlds use; `blockNumber()` and `blockId()` map both ways, so no save changes.
- `src/world.js` takes its block names, `passable` and `seeThrough` from the table; `src/lighting.js` its light sources; `src/main.js` its colours and shapes. The four separate lists are gone.
- `tests/block-registry.test.js`: every saved number still means the same block, the three rules match what they were before the table, every entry is well formed, and an item with the name of a block places that block.

Left for later: the special drawings (textures) are still small functions in `src/main.js`, and the families (crops, wool and bed colours, water levels) are still found by arithmetic on their first number. Both move with the texture atlas of 0d.

### 0d: drawing and storage for bigger worlds

Done on 2026-11-12, the drawing of plain blocks:

- `src/chunkmesh.js`: the plain blocks of a chunk (whole cubes that do not glow and are not see-through: grass, dirt, stone, sand, wood, planks, ores, wool...) are one mesh with only the faces that can be seen, all drawn from one atlas picture made at start-up. In the test scene the triangles drawn fell from about 75,000 to about 15,000, and the terrain needs one draw per chunk instead of one per kind of block.
- Each atlas tile has its edges stretched 8 pixels outwards, so no lines show between blocks when they are drawn small.
- Light is still one value per block, painted on its corners, so the look is the same as before. Aiming reads the block from the face that was hit.
- Shaped, see-through and glowing blocks (torches, glass, water, lava, plants, fences, beds, lanterns, furnaces, amber) stay as they were, one instanced mesh per kind per chunk: they are few, and each has its own material.

Still to do:

- Entities, a first step (done, 2026-11-13): `src/entities.js` holds the step over the ground and the fall that animals and monsters share; each keeps its own rule about where it may go. Still to do: one list for animals, monsters and arrows, and Biel's own movement in ticks. Biel's movement changes how the controls feel, so it waits for a try on the real iPad first.
- Storage (done, 2026-11-13; IndexedDB chosen by David on 2026-11-12): `src/storage.js` keeps worlds in IndexedDB, with a second copy in `localStorage` of what fits, written at once. Existing worlds are copied the first time and the old copies are not deleted. Without a working IndexedDB the game uses `localStorage` alone.
- Generating in a Web Worker: a small worker made from a Blob does run in the Mac app under `bieltructor://` (tried on 2026-11-13). Not built yet, because today's largest island loads in well under four seconds; it belongs with the 256 and 512 sizes of phase 1. A bundled module worker and the iOS apps are still to be tried.

## Decisions

- **The save format does not change in phase 0.** Saves already keep only the changes from the seeded terrain, carry a version and migrate version 1. The brief's "save v2" is in effect what exists; splitting the changes by chunk waits for 0d, where it matters.
- **Two older generators keep their own arithmetic** (`src/world.js` terrain and the starting animals in `src/creatures.js`). Moving them to `src/random.js` would reshape every existing island and move every starting animal.
- **The workbench has nine squares** although the brief says "no grid to memorise" (asked for by Gabriel on 2026-11-12). Positions do not matter and the recipe book fills the squares, so there is still nothing to memorise.
- Six worlds, and sizes of 57, 97 and 129, stay for now. Storage has moved (0d), so the larger sizes of phase 1 are no longer held back by it.
- **Backups are kept in the same storage as the worlds** (2026-11-12), every half hour of play at most, and are dropped first when storage is full. They moved to IndexedDB with the worlds, and are not copied to `localStorage`.
- **Ticks are 50 ms and a stall catches up at most 250 ms** (0b). Past that the game slows down instead of freezing to catch up, which is kinder on the old iPad.
- **Leg, head and tail swings are drawing, not rules** (0b). At 20 Hz they looked jerky, so they run every frame from a "moving" flag the tick sets.

## Known problems

- Not yet tried on real devices: mining with a finger, a long session on the 6th generation iPad (fps and heat), physical controllers, iCloud between two devices.
- Mining and animal products wait until everything fits. Combat, hunting and fishing overflow now uses persistent ground bags; individual loose-item models remain phase 4. Ground bags are capped at 64, with collection deferred rather than discarded when no destination has room.
- `src/main.js` is about 5,700 lines and mixes screens, input and rules. Part 0b gathered the rules into one `simulationTick()`, still inside it; part 0c took the block tables out.
