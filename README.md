<p align="center"><img src="docs/logo.png" width="160" alt="Bieltructor logo"></p>

# Bieltructor 🧱

> A voxel adventure for macOS, iPad and iPhone, starring Biel. Explore seeded islands with biomes and caves, build in Creative mode, or gather, craft, farm, make animal friends and get through the night in Adventure mode, on a difficulty made for young players.

[![macOS](https://img.shields.io/badge/macOS-13%2B-black?logo=apple)](https://github.com/VidiPT89/Bieltructor)
[![iPadOS](https://img.shields.io/badge/iOS%20%7C%20iPadOS-16%2B-black?logo=apple)](https://github.com/VidiPT89/Bieltructor)
[![Report Bug](https://img.shields.io/badge/Report-Bug-red)](https://github.com/VidiPT89/Bieltructor/issues)
[![Request Feature](https://img.shields.io/badge/Request-Feature-blue)](https://github.com/VidiPT89/Bieltructor/issues)

<p align="center">
  <img src="docs/screenshot-day.jpg" width="100%" alt="Biel in front of his house on macOS">
</p>
<p align="center">
  <img src="docs/screenshot-night.jpg" width="49%" alt="The same house at night, with stars and a glowing amber lantern">
  <img src="docs/screenshot-menu.jpg" width="49%" alt="Main menu on macOS">
</p>
<p align="center">
  <img src="docs/screenshot-ipad-menu.jpg" width="32%" alt="Main menu on iPad">
  <img src="docs/screenshot-ipad.jpg" width="32%" alt="Playing on iPad with touch controls">
</p>

## ✨ Features

**Worlds and modes**
- ✅ Up to six saved worlds, each with its own name, mode, size, seed and options
- ✅ Islands in three sizes (57, 97 or 129 blocks across) made from a seed, or the original **Classic valley**
- ✅ Biomes: plains with flowers, forests, beaches, deserts with cacti, snowy mountains with spruces and ice, swamps with mushrooms; winding caves underground
- ✅ **Adventure** (gather, craft, survive) or **Creative** (every block, no dangers, fly with a double tap on Jump)
- ✅ Four difficulties plus switches for monsters, animals, hunger, weather, keeping the backpack, day and night and the day length
- ✅ Older worlds open without losing a single block

**Building, crafting and farming**
- ✅ More than 30 blocks, from grass and glass to doors, beds, torches, chests, furnaces, stone bricks and glowstone
- ✅ Breaking takes time in Adventure; pickaxes in wood, stone, iron and crystal break faster and reach deeper ores
- ✅ Coal, iron, gold and rare blue crystal underground; a furnace melts ores into bars and cooks food
- ✅ Backpack with a 9-slot hotbar and 27 more slots, chests with 27 slots, and a visual recipe book (ingredients turn green when you have them)
- ✅ A small farm: till soil with a hoe, grow wheat, carrots and potatoes (faster near water or in the rain), bake bread; a fishing rod to catch fish
- ✅ Ruins and cabins on the islands, each with a treasure chest

**Life on the island**
- ✅ Original animated voxel character, Biel
- ✅ Hearts, food and air in Adventure; damage, hunger and falls follow the difficulty, and falling asleep is gentle
- ✅ Beds become home and sleeping skips the night
- ✅ Friendly chickens, cows, sheep, pigs and rabbits; a dog, a cat and a horse that become friends (and the horse can be ridden); babies when two animals are fed; birds in the sky
- ✅ Silly night monsters (the Sleepy sleepwalker, the bouncy Jelly, the Bony archer) that never appear on Peaceful and vanish in sparkles at sunrise; torches and lanterns keep them away
- ✅ Day and night, sunsets, stars, rain, snow in the cold biome and gentle thunderstorms (Normal and Hard only)

**Helping young players**
- ✅ Optional guided tutorial in new Adventure worlds
- ✅ Twelve challenges with stickers in a sticker book shared by every world
- ✅ A parents' corner behind a simple question: break reminder, highest difficulty allowed and monsters always off

**Everywhere**
- ✅ Mac, iPad and iPhone with the same menus, rules and saves; layouts for iPhone in portrait and landscape
- ✅ Keyboard and mouse, multi-touch, and PlayStation, Xbox and MFi controllers (menus too)
- ✅ Optional iCloud sync of worlds between devices, asking before overwriting anything; JSON export and import always available
- ✅ Portuguese (Portugal) and English, Dark, Light and System appearance with the iVidi.dev palette
- ✅ Calm background music generated live, two quality levels picked automatically on first run, 30 fps in Low Power Mode, fully offline

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| macOS application | Swift, AppKit, WebKit |
| iOS / iPadOS application | Swift, UIKit, WebKit |
| Game controllers | GameController framework (native), Gamepad API (browser) |
| Sync | iCloud Drive (ubiquity container), optional |
| Game renderer | Three.js / WebGL, chunked instanced meshes |
| Music and sound | Web Audio API (generated live, no audio files) |
| Game logic and interface | JavaScript, HTML, CSS |
| Build tools | Vite, Swift compiler, Xcode, XcodeGen |
| Tests | Node.js test runner, integrated WebKit smoke tests and XCUITest |
| Minimum system | macOS 13 / iOS and iPadOS 16 |

## 🚀 Quick Start

### Play on Mac

Build the application as described below, then open `build/Bieltructor.app`. The built app includes its game assets and does not require Node.js, a browser window or an Internet connection to play.

### Build from source

Prerequisites: macOS 13+, Xcode Command Line Tools (or Xcode), Node.js 22.12+ and npm.

```bash
git clone https://github.com/VidiPT89/Bieltructor.git
cd Bieltructor
npm ci
npm run build:macos
open build/Bieltructor.app
```

The script builds for the current Mac architecture and applies an ad-hoc signature for local use. Public distribution requires Developer ID signing and notarization, which are not part of this local build.

### Play on iPad or iPhone

Prerequisites: Xcode, Node.js 22.12+, npm and [XcodeGen](https://github.com/yonaskolb/XcodeGen).

```bash
npm ci
npm run prepare:ios
open Bieltructor.xcodeproj
```

Select **Bieltructor-iOS**, choose your Apple development team under **Signing & Capabilities**, connect the iPad and run. Installation on a physical device requires your signing team and a provisioned device. No App Store or TestFlight upload is included.

Use the directional buttons to walk, **Run** to move faster and **Jump** to jump. Hold movement with one finger while dragging the scene with another to look around. Tap a nearby block to select it, then hold **Break** or press **Build**. Tap an animal to use it and a monster to attack it. The hotbar slots choose what Biel holds, and 🎒 opens the backpack and recipes. Settings includes **Import world** and **Export world**, both integrated with Files; an imported file becomes a new world.

The game and bundled assets work offline. Mac, iPad and browser saves are independent; use JSON export/import to transfer a world. Run `npm run prepare:ios` after changing the shared game before rebuilding in Xcode. `project.yml` is the source of the generated Xcode project.

### Browser development

```bash
npm run dev
```

Open the local address printed by Vite. Browser saves and macOS app saves are separate; export and import a world to move it between them.

## 📖 Controls

| Action | Mac | iPad / iPhone | Controller |
|--------|-----|---------------|------------|
| Move / run | W A S D or arrows, Shift to run | Arrow buttons, Run | Left stick (all the way to run) |
| Look around | Drag the scene | Drag the scene | Right stick |
| Jump / swim up | Space | Jump | A |
| Fly (Creative) | Double tap Space, C to go down | Double tap Jump, Down | Double tap A, B |
| Break | Click (hold in Adventure) | Tap the block, hold Break | Right trigger |
| Build, eat, open, sleep, use an animal | Right-click or Shift + click | Tap the block, then Build | Left trigger |
| Attack | Click the monster or F | Tap the monster, or Attack | X |
| Hotbar | 1–9 or the mouse wheel | Tap the slot | Shoulder buttons |
| Backpack and recipes | E | 🎒 | Y |
| Get off the horse | C | Down | B |
| Pause / menus | Escape | Ⅱ | Menu, then the d-pad, A and B |
| New world · Export · Settings | ⌘N · ⌘E · ⌘, | | |

The bottom layer is protected. Use **Return to spawn** in the pause menu if you get lost. A simple guide in Portuguese for Biel and for parents lives in [`docs/GAMEPLAY.pt.md`](docs/GAMEPLAY.pt.md).

## ☁️ iCloud and distribution

iCloud sync is off by default (Settings › Save to iCloud). It needs the **iCloud** capability with the container `iCloud.dev.ividi.bieltructor` on the App ID, which comes with a paid Apple Developer account. Without it, or without an iCloud account, the game says iCloud is not available and keeps saving locally; worlds can always move between devices with **Export world** and **Import world**.

- **TestFlight (iPad and iPhone):** `TEAM_ID=XXXXXXXXXX scripts/release-ios.sh` archives the app and exports an `.ipa`. It does not upload: send it with Transporter or `xcrun altool`.
- **Mac outside the App Store:** `TEAM_ID=XXXXXXXXXX scripts/release-macos.sh` archives the **Bieltructor-macOS** target and signs it with Developer ID (hardened runtime). Notarization only runs with `--notarize` and a `notarytool` keychain profile in `NOTARY_PROFILE`.
- One bundle identifier (`dev.ividi.bieltructor`) and version (2.0.0, build 2) for every platform, set in `project.yml`. The Mac stays a native AppKit app rather than Mac Catalyst: it is already small and simple, and the game itself is shared.

## 🎨 App icon

The logo lives in `docs/Bieltructor_logo.jpeg`. After changing it, run `npm run icons` (Python 3 with Pillow) to regenerate the macOS `.icns`, the iOS app icon, the in-game logo and the favicon.

## 🧪 Testing

```bash
npm test
npm run build
npm run build:macos
npm run build:ios
# In Xcode: pick an iPad or iPhone simulator, then Product > Test.
```

The unit suite (59 tests) covers terrain and seeds, biomes, caves and ores, collisions, saved worlds and their migration, difficulty rules, stacking, recipes, smelting and treasure, health and hunger, animals, babies, taming and riding, monster rules (including "never on Peaceful" and "never when switched off"), crops, weather, challenges, the tutorial, the parents' rules, controller mapping, iCloud sync decisions and the music generator. The integrated smoke suite (120 checks, shared by the Mac and iOS apps) plays through worlds, building, crafting, farming, fishing, survival, animals, monsters, weather, chests and the furnace, the tutorial and stickers, the parents' corner, a seeded island drawn in chunks, a game controller and iCloud sync with a pretend iCloud. The UI test drives the touch controls in landscape and portrait and passes on iPad, iPhone 17e and iPhone 17 Pro Max. Run a built application with `--smoke-test` in a graphical Mac session; it uses an isolated temporary data store and writes its result to `/tmp/biel-smoke-result.txt`.

## Current scope

Bieltructor is a single-player game. Not included: multiplayer, an endless world (islands go up to 129 × 129), lava, bees and honey, block-by-block lighting (torches use a few real lights near Biel) and tool wear. The Mac build runs its integrated tests on Apple Silicon and the iOS build is tested on iPad and iPhone simulators. Intel Macs, physical devices, real controllers, real iCloud sync between devices and the signed release scripts still need to be tried with a real Apple Developer account.

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

## 👨‍💻 Author

**David Arsénio Martins**

- 🌐 Website: [ividi.dev](https://ividi.dev/)
- 🐙 GitHub: [@VidiPT89](https://github.com/VidiPT89/)

Bug reports and feature requests are welcome on the [issues page](https://github.com/VidiPT89/Bieltructor/issues).

---

<p align="center">Developed by <a href="https://ividi.dev/">David Arsénio Martins</a></p>
<p align="center">⭐ If you like this project, give it a star!</p>
