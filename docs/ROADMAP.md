# Roadmap for Bieltructor v3

This follows the 18-phase v3 brief (`prompt-bieltructor-v3.md`). The brief was written against the first version of the game (57 × 57 world, 8 materials, 23 smoke checks). The repository is already far past that, so each phase starts from what exists. One phase, or one part of a phase, per session.

Last updated: 2026-11-12 (phase 0a).

## Where each phase stands

| Phase | State | What exists | What is missing |
|---|---|---|---|
| 0 Foundations | **in progress (0a done)** | Chunks of 16 × 16 with only the edited chunk redrawn, input action layer, F3 overlay, saves that keep only the changes from the seed, seeded terrain, data tables for items, recipes, animals, monsters and difficulty | See "Phase 0 in parts" below |
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
| 18 Parents, saving, tests, docs | partly done | Parents' corner, validated import, autosave, 132 unit tests, 211 in-game checks, UI test | Automatic backups (last three per world), parents' summary, `docs/ARCHITECTURE.md` |

## Phase 0 in parts

Phase 0 changes the ground everything stands on, so it is done in four parts. Each part must leave every in-game check passing.

### 0a: seeded rolls, registry checks, debug numbers (done, 2026-11-12)

- `src/random.js`: a seeded generator (number or text seed, `int`, `fork` for independent jobs).
- Every roll that decides something in the game goes through it: what a block drops, what an animal gives, where animals and monsters wander and appear, the weather, thunder, crops, fishing. It is seeded again for each world from the world's ID and age. `Math.random()` is left only where nothing depends on it: particles, rain drops, stars, sound pitch, the tip on the intro screen, the parents' question and new IDs.
- `tests/registry.test.js`: no recipe ID twice, no block type shared by two items, every item named in both languages, and recipes, furnaces, fuel, treasure, animals, monsters and block drops only name items that exist.
- F3 overlay: block coordinates, biome, light level and milliseconds of work per frame.

### 0b: fixed-step simulation (next)

Twenty ticks a second for the rules (time, growth, animals, monsters, liquids, furnaces), with the drawing interpolated between ticks. Today the rules run once per drawn frame with a variable step. Biel's own movement and the camera should stay per frame at first, since a 20 Hz step changes how jumping feels. The in-game checks call `frame()` and the `update…` functions directly, so they need a `tick()` to call instead. Add the tick time to the F3 overlay.

### 0c: block registry with text IDs

Blocks are numbers in `src/world.js`, and their colour, texture, shape, light and "can walk through" live in separate lists in `src/main.js`, `src/world.js` and `src/lighting.js`. Move them into one table keyed by a text ID (`"stone"`, `"torch"`), so a new block is one entry. Saves keep numbers today; the table maps both ways, so no save changes.

### 0d: drawing and storage for bigger worlds

- One mesh per chunk with hidden faces removed and a texture atlas made at start-up (today: one instanced mesh per block type per chunk, one material each).
- One entity list for animals, monsters and arrows, with shared movement and collision.
- Storage: worlds live in `localStorage`, which is small. Before any world larger than 129 × 129, move worlds to IndexedDB or to files through the Swift bridge. **This changes where saves live, so it will be asked about before it is done.**
- Generating in a Web Worker only if WKWebView proves reliable with the custom `bieltructor://` scheme; otherwise spread over frames.

## Decisions

- **The save format does not change in phase 0.** Saves already keep only the changes from the seeded terrain, carry a version and migrate version 1. The brief's "save v2" is in effect what exists; splitting the changes by chunk waits for 0d, where it matters.
- **Two older generators keep their own arithmetic** (`src/world.js` terrain and the starting animals in `src/creatures.js`). Moving them to `src/random.js` would reshape every existing island and move every starting animal.
- **The workbench has nine squares** although the brief says "no grid to memorise" (asked for by Gabriel on 2026-11-12). Positions do not matter and the recipe book fills the squares, so there is still nothing to memorise.
- Six worlds, and sizes of 57, 97 and 129, stay until storage moves (0d).

## Known problems

- Not yet tried on real devices: mining with a finger, a long session on the 6th generation iPad (fps and heat), physical controllers, iCloud between two devices.
- Items that do not fit in a full backpack when a block is broken are lost (there are no items lying on the ground yet; phase 4).
- `src/main.js` is about 5,700 lines and mixes screens, input and rules. Parts 0b and 0c take rules and tables out of it.
