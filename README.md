<p align="center"><img src="docs/logo.png" width="160" alt="Bieltructor logo"></p>

# Bieltructor 🧱

> A voxel adventure for macOS, iPad and iPhone, starring Biel. Build in Creative mode, or gather, craft, make friends with animals and get through the night in Adventure mode, on a difficulty made for young players.

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
- ✅ Up to six saved worlds, each with its own name, mode and options
- ✅ **Adventure**: gather materials, craft, look after Biel's health and food, survive the night
- ✅ **Creative**: every block, nothing used up, no dangers, fly with a double tap on Jump
- ✅ Four difficulties (Peaceful, Easy, Normal, Hard) plus switches for monsters, animals, hunger, keeping the backpack, the day and night cycle (normal, always day, always night) and the day length (10, 20 or 30 minutes)
- ✅ Older worlds open as Creative worlds without losing a single block

**Building and crafting**
- ✅ Sixteen blocks: grass, dirt, stone, sand, wood, leaves, brick, amber lantern, glass, door, planks, workbench, torch, bed, coal ore and wool
- ✅ Breaking takes time in Adventure (pickaxes speed up stone) and everything goes into the backpack
- ✅ Backpack with a 9-slot hotbar and 27 more slots, stacks of 64
- ✅ A visual recipe book: ingredients turn green when you have them; advanced recipes need a workbench nearby
- ✅ Tools and weapons in wood and stone, torches, doors, beds, glass, bricks, lanterns, cake and dog treats

**Life in the valley**
- ✅ Original animated voxel character, Biel, with an orange explorer jacket and backpack
- ✅ Hearts, food and air bubbles in Adventure; falls, drowning and hunger hurt only as much as the difficulty allows
- ✅ Falling asleep is gentle: Biel goes home, and on harder levels his backpack waits where he fell asleep
- ✅ Beds become home, and sleeping at night skips to the morning
- ✅ Friendly chickens (eggs), cows (milk), sheep (wool that grows back) and a dog that becomes your friend with a treat, gets a name and follows you
- ✅ Silly night monsters in dark places: the Sleepy sleepwalker, the bouncy Jelly that splits in two and, from Normal, the Bony archer with suction-cup arrows. They vanish in sparkles at sunrise and never appear on Peaceful
- ✅ Torches and lanterns light up the night and keep monsters away; the dog helps chase them off

**World and presentation**
- ✅ A 3D island with hills, trees, sandy shores, animated water, clouds, sunsets, stars and moonlight
- ✅ Calm background music generated live in the game, softer at night, with its own on/off switch
- ✅ Walking, running, jumping, swimming and first/third-person views
- ✅ Portuguese (Portugal) and English, and Dark, Light and System appearance with the iVidi.dev palette
- ✅ Animated introduction with the game logo and developer credits, followed by the main menu
- ✅ macOS window with full screen; iOS/iPadOS app with multi-touch controls, Files import/export, portrait and landscape
- ✅ Automatic local saving, JSON import and export, two quality levels, fully offline

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| macOS application | Swift, AppKit, WebKit |
| iOS / iPadOS application | Swift, UIKit, WebKit |
| Game renderer | Three.js / WebGL |
| Music and sound | Web Audio API (generated live, no audio files) |
| Game logic and interface | JavaScript, HTML, CSS |
| Build tools | Vite, Swift compiler |
| Tests | Node.js test runner and integrated WebKit smoke tests |
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

| Action | Mac | iPad |
|--------|-----|------|
| Move | W A S D or arrow keys | Arrow buttons |
| Run | Shift + movement | Run |
| Jump / swim up | Space | Jump |
| Fly (Creative) | Double tap Space, C to go down | Double tap Jump, Down |
| Look around | Drag the scene | Drag the scene |
| Break a block | Click (hold in Adventure) | Tap the block, hold Break |
| Place a block, eat, open a door, sleep, use an animal | Right-click or Shift + click | Tap the block, then Build |
| Attack | Click the monster or F | Tap the monster, or Attack |
| Choose from the hotbar | 1–9 or the mouse wheel | Tap the slot |
| Backpack and recipes | E | 🎒 |
| Change perspective | V | ◉ |
| Pause | Escape | Ⅱ |
| Full screen | Control + Command + F | |

Building has a seven-block reach. The bottom layer is protected. Use **Return to spawn** in the pause menu if you get lost. Export a world from Settings to keep a backup; importing a file always creates a new world. A simple guide in Portuguese for Biel and for parents lives in [`docs/GAMEPLAY.pt.md`](docs/GAMEPLAY.pt.md).

## 🎨 App icon

The logo lives in `docs/Bieltructor_logo.jpeg`. After changing it, run `npm run icons` (Python 3 with Pillow) to regenerate the macOS `.icns`, the iOS app icon, the in-game logo and the favicon.

## 🧪 Testing

```bash
npm test
npm run build
npm run build:macos
npm run build:ios
# In Xcode: select an iPad simulator, then Product > Test.
```

The unit suite (31 tests) covers terrain and coal generation, collisions, saved worlds and their migration, world options and difficulty rules, stacking and recipes, block drops and break times, health, hunger, healing and air, animals and the dog, monster spawning rules (including "never on Peaceful" and "never when switched off"), light, weapons, the day/night curve, the music generator and multi-touch. The integrated smoke suite (66 checks, shared by the Mac and iPad apps) plays through creating, reopening and deleting worlds, building, breaking and crafting, eating, falling, sleeping, falling asleep and getting the backpack back, the animals and the dog, monsters at night, combat and sunrise, plus rendering, languages, themes, perspective, multi-touch and pause. The iPad UI test also drives the touch controls in landscape and portrait. Run a built application with `--smoke-test` in a graphical Mac session; it uses an isolated temporary data store and writes its result to `/tmp/biel-smoke-result.txt`.

## Current scope

Bieltructor is a single-player game with a finite 57 × 57 block island. Monsters are not saved: each night brings new ones. Not included yet: bigger worlds with chunks, biomes and caves, ores beyond coal, iron and crystal tools, farming, more animals and breeding, weather, achievements and a tutorial, a parents section, game controllers, an iPhone-specific layout and iCloud sync. The macOS build is compiled and its integrated tests run on Apple Silicon; the iOS/iPadOS build is tested on the iPad Pro 11-inch simulator. Intel Macs, iPhones and physical iPads have not been tested yet.

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
