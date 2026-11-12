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

`src/blocks.js` is the block table: one entry per block with a text ID, base colour, light, whether it can be walked through, whether light passes and its shape when it is not a whole cube. The place of an entry is the number written in saved worlds, so entries are only added at the end. `src/world.js` names the blocks the rules need, and owns terrain, collision and save validation. `src/main.js` builds the materials and geometries from the table, and owns the textures, chunk instances and generated inventory pictures. Changing a block rebuilds its chunk and affected neighbours. Terrain and initial animals retain their original seeded algorithms so existing worlds do not change.

## Rules and interfaces

- `items.js`, `inventory.js`, `loot.js`, `recipes.js`, `smelting.js`: item definitions, stacks, crafting and furnace rules. `Inventory.collect()` commits a batch only when everything fits. Mining combines container contents and the container block in that same batch. `collectRewards()` plans backpack additions and overflow into nearby persistent ground bags atomically; when all 64 bags are full, it refuses without partial changes. A lost backpack uses the same planner and is retained if storage on the ground is full.
- `creatures.js`, `monsters.js`, `survival.js`: animal interaction, combat and health rules. `models.js` builds the render objects. `disposeModel()` releases their owned geometry/materials/textures without destroying cached colours or shared sprite geometry.
- `daynight.js`, `weather.js`, `farm.js`, `water.js`, `lighting.js`: environmental rules.
- `random.js`: seeded gameplay rolls. Visual particles and procedural sound can use unseeded randomness.
- `input/`: shared actions for keyboard, touch and gamepad; each held finger has its own pointer ID.
- `strings.js`, `ui/html.js`, `style.css`: Portuguese/English text, escaped user content and responsive layout.
- `tutorial.js`, `challenges.js`, `parents.js`: guidance, stickers and parental limits.
- `sounds.js`, `music.js`: generated audio, avoiding downloaded audio assets.

## Persistence

`worlds.js` validates version 2 worlds, migrates version 1, and stores an index plus one localStorage entry per world. Saves contain edits to generated terrain, inventory, creatures, containers and player state. `persistence.js` snapshots the live scene and drives cloud sync; `sync.js` computes conflict and deletion decisions.

The native `CloudBridge.swift` stores one file per world in iCloud Drive with coordinated writes and expected timestamps. Local worlds are not replaced while playing. Tests use a fake bridge; real cross-device iCloud still requires device validation.

Storage remains localStorage, with six worlds and maximum terrain size 129 × 129. There is no rolling local backup yet. Moving storage or enlarging worlds requires the migration work described in phase 0d, not just a larger size constant.

## Native wrappers and builds

- `shared/LocalAssets.swift` serves bundled Web files through `bieltructor://`, normalizing both root and requested paths before checking containment.
- `shared/GamepadBridge.swift` and `CloudBridge.swift` supply controller, cloud and power-saving messages.
- `macos/Bieltructor.swift` / `ios/BieltructorApp.swift` own the window, file import/export and lifecycle.
- `project.yml` is the XcodeGen source of truth. `npm run prepare:ios` regenerates the project and schemes; persistent Xcode settings belong in YAML.
- `npm run build:macos` builds a locally signed Mac app; `npm run build:ios` builds for iOS Simulator. Distribution uses the separate release scripts.

## Verification

`npm test` exercises pure rules. `src/dev/smoke-tests.js` exercises real game state and DOM through the accessors supplied by `main.js`, in an isolated test store. macOS launches with `--smoke-test`; iOS UI tests run the same suite and then drive controls in landscape and portrait. Test hooks are installed only for the test URL; no unrestricted `window.__g` debug handle is exported.

Do not equate simulator success with physical controller, iCloud or long-session performance validation on the A10 iPad. See `REVIEW-2026-11-12.md` and `ROADMAP.md` for the current limits.
