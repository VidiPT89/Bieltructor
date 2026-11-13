# Bieltructor architecture

Verified against the source on 2026-11-12.

## Runtime

The same Vite/Three.js game runs in a browser and in WKWebView on macOS and iOS. `src/main.js` owns the scene, game loop, screens, input dispatch and live world.

## Ticks and frames

The rules advance in fixed ticks of 50 ms (20 a second), whatever the drawing rate. `src/simulation.js` holds the two pieces:

- `FixedStep` collects the time of each drawn frame and runs whole ticks from it. A frame longer than 250 ms counts as 250 ms, so a stall catches up at most five ticks. Leaving the game (pause, backpack, menus, the break reminder, falling asleep) throws away the unfinished part of a tick, and the frame that resumes the game adds no time.
- `EntityInterpolation` remembers where each animal, monster and arrow was before and after the last tick, and draws them in between. Before the next tick it puts back the real position, so the rules never read a drawn one. A jump of more than 8 blocks (a pet catching up) is shown at once.

`simulationTick()` in `main.js` runs, in order: time of day and world age, the biome visit, the autosave and break reminder clocks, weather and thunder, animals, breeding, furnaces, monsters and their arrows, Biel's arrows, crops, fishing, water and lava, the lava under Biel, hunger, air and health, and picking up bags on the ground. Fishing and the bag wait use the world's age, which is saved, and no longer the frame clock.

Still once per drawn frame, with a step capped at 40 ms: Biel's movement, jumping, swimming and falls, the camera, mining progress, the bow, particles, bees, birds and fish, the swing of legs, heads and tails (`poseCreatures()`), the sky, rain drops and sound. The horse Biel rides follows him every frame. The ambient fish take their rolls from a fork of the world's generator, so drawing faster or slower never shifts the rolls the rules see.

`src/blocks.js` is the block table: one entry per block with a text ID, base colour, light, whether it can be walked through, whether light passes and its shape when it is not a whole cube. The place of an entry is the number written in saved worlds, so entries are only added at the end. `src/world.js` names the blocks the rules need, and owns terrain, collision and save validation. `src/main.js` builds the materials and geometries from the table, and owns the textures, chunk instances and generated inventory pictures. Changing a block rebuilds its chunk and affected neighbours.

Each chunk of 16 × 16 columns is drawn in two ways. Plain blocks (whole cubes that do not glow and are not see-through) go through `src/chunkmesh.js` into one mesh per chunk: a face is left out when the block next to it is a whole solid cube (`fillsBlock()`), and every face takes its drawing from one atlas picture, where each 16 × 16 tile has an 8 pixel stretched border against bleeding. Every other block (shaped, see-through, glowing, liquid, plant) is an instanced mesh per kind per chunk with its own material. Both carry the block light as a colour, per block; `hitCell()` turns a ray hit of either kind back into a block position. Terrain and initial animals retain their original seeded algorithms so existing worlds do not change.

## Rules and interfaces

- `items.js`, `inventory.js`, `loot.js`, `recipes.js`, `smelting.js`: item definitions, stacks, crafting and furnace rules. `Inventory.collect()` commits a batch only when everything fits. Mining combines container contents and the container block in that same batch. `collectRewards()` plans backpack additions and overflow into nearby persistent ground bags atomically; when all 64 bags are full, it refuses without partial changes. A lost backpack uses the same planner and is retained if storage on the ground is full.
- `creatures.js`, `monsters.js`, `survival.js`: animal interaction, combat and health rules. `entities.js`: the step over the ground and the fall that animals and monsters share. `models.js` builds the render objects. `disposeModel()` releases their owned geometry/materials/textures without destroying cached colours or shared sprite geometry.
- `daynight.js`, `weather.js`, `farm.js`, `water.js`, `lighting.js`: environmental rules.
- `random.js`: seeded gameplay rolls. Visual particles and procedural sound can use unseeded randomness.
- `input/`: shared actions for keyboard, touch and gamepad; each held finger has its own pointer ID.
- `strings.js`, `ui/html.js`, `style.css`: Portuguese/English text, escaped user content and responsive layout.
- `tutorial.js`, `challenges.js`, `parents.js`: guidance, stickers and parental limits.
- `sounds.js`, `music.js`: generated audio, avoiding downloaded audio assets.

## Persistence

`worlds.js` validates version 2 worlds, migrates version 1, and stores an index plus one entry per world in the storage it is given.

`storage.js` is that storage. The game reads and writes it at once, from a map in memory. Behind the map, every write goes to IndexedDB (one table of texts by key, writes one after the other). Whatever fits is also written straight to localStorage, except world pictures and backups: that second copy is written at once, so the last save survives the app being closed a moment later. When the game starts, `reconcile()` takes from localStorage any world whose copy there is newer than the one in IndexedDB. The first time, the worlds, pictures, backups and stickers kept in localStorage are copied to IndexedDB and nothing is deleted. If IndexedDB does not open within four seconds, or fails, the game uses localStorage alone, as it did before. The Mac app waits for pending writes (at most a second and a half) before it quits. Saves contain edits to generated terrain, inventory, creatures, containers and player state. `persistence.js` snapshots the live scene and drives cloud sync; `sync.js` computes conflict and deletion decisions.

The native `CloudBridge.swift` stores one file per world in iCloud Drive with coordinated writes and expected timestamps. Local worlds are not replaced while playing. Tests use a fake bridge; real cross-device iCloud still requires device validation.

Each world keeps its last three earlier copies (`store.backup()`, `backups()`, `restore()` in `worlds.js`). Before a save writes over the stored world, that stored copy becomes a backup if the newest one is at least half an hour old and different. Restoring validates the backup like an import, first keeps the present world as a backup, and stamps the restored world as the newest so iCloud sends it. Backups are local, are deleted with their world, and are the first thing given up when storage is full: a world save that does not fit drops the oldest backup of any world and tries again.

There are still six worlds and a maximum terrain size of 129 × 129: the room is there now, the larger sizes belong to phase 1. Moving storage or enlarging worlds requires the migration work described in phase 0d, not just a larger size constant.

## Native wrappers and builds

- `shared/LocalAssets.swift` serves bundled Web files through `bieltructor://`, normalizing both root and requested paths before checking containment.
- `shared/GamepadBridge.swift` and `CloudBridge.swift` supply controller, cloud and power-saving messages.
- `macos/Bieltructor.swift` / `ios/BieltructorApp.swift` own the window, file import/export and lifecycle.
- `project.yml` is the XcodeGen source of truth. `npm run prepare:ios` regenerates the project and schemes; persistent Xcode settings belong in YAML.
- `npm run build:macos` builds a locally signed Mac app; `npm run build:ios` builds for iOS Simulator. Distribution uses the separate release scripts.

## Verification

`npm test` exercises pure rules. `src/dev/smoke-tests.js` exercises real game state and DOM through the accessors supplied by `main.js`, in an isolated test store. macOS launches with `--smoke-test`; iOS UI tests run the same suite and then drive controls in landscape and portrait. Test hooks are installed only for the test URL; no unrestricted `window.__g` debug handle is exported.

Do not equate simulator success with physical controller, iCloud or long-session performance validation on the A10 iPad. See `REVIEW-2026-11-12.md` and `ROADMAP.md` for the current limits.
