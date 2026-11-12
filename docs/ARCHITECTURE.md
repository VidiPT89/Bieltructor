# Bieltructor architecture

Verified against the source on 2026-11-12.

## Runtime

The same Vite/Three.js game runs in a browser and in WKWebView on macOS and iOS. `src/main.js` owns the scene, game loop, screens, input dispatch and live world. The loop caps its variable delta at 40 ms; a fixed simulation step remains roadmap phase 0b.

`src/world.js` owns block IDs, terrain, shapes used for collision and save validation. `src/main.js` owns the rendering materials, geometries, chunk instances and generated inventory pictures. Changing a block rebuilds its chunk and affected neighbours. Terrain and initial animals retain their original seeded algorithms so existing worlds do not change.

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
