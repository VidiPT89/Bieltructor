// In-game checks, run by the Mac and iOS test targets (index.html?test=1).
// `g` is a window into the running game, built in main.js.
import { normalizeOptions, validateWorld, newWorld } from "../worlds.js";
import {
  collides,
  height,
  key,
  GLASS,
  DOOR,
  DOOR_OPEN,
  SIZE,
  BENCH,
  bedBlock,
  MAX_Y,
  TORCH,
  FARMLAND,
  cropInfo,
  CHEST,
  IRON_ORE,
  LADDER,
  FENCE,
  GATE,
  GATE_OPEN,
  TRAPDOOR,
  TRAPDOOR_OPEN,
  woolBlock,
  WATER,
  isWater,
  inWater,
  BEE_NEST,
  WATER_LEVEL,
  biomeAt,
  COPPER_ORE,
  FURNACE,
  LAVA,
  isLava,
  CAMPFIRE,
  CAMPFIRE_OUT,
} from "../world.js";
import * as THREE from "three";
import { NOON } from "../daynight.js";
import { RECIPES, canCraft } from "../recipes.js";
import { hurt } from "../survival.js";
import { normalizeParents } from "../parents.js";
import { breakTime, toolUses } from "../items.js";
import { Inventory } from "../inventory.js";
import { strings } from "../strings.js";
import { emptyFurnace } from "../smelting.js";

export function installSmokeTests(g) {
  if (new URLSearchParams(location.search).has("test"))
    window.runSmokeTests = async () => {
      const checks = [];
      const hold = (id) => {
        g.inventory.slots[0] = { id, count: 1 };
        g.selected = 0;
      };
      // Build, aimed at the block in g.target: an animal or monster that
      // wanders under the pointer must not take the press.
      const build = () => {
        g.targetAnimal = g.targetMonster = null;
        g.edit(true);
      };
      const check = (name, ok) => {
        checks.push({ name, ok: !!ok });
        if (!ok) throw Error(name);
      };
      // The intro may still be showing on a slower device.
      g.leaveSplash();
      check("menu loaded", g.mode === "menu");
      g.frame(performance.now());
      check("terrain rendered", g.renderer.info.render.triangles > 1000);
      g.action("settings");
      g.$("#language").value = "en";
      g.$("#language").dispatchEvent(new Event("change"));
      check("English settings", g.app.textContent.includes("Appearance"));
      g.$("#appearance").value = "light";
      g.$("#appearance").dispatchEvent(new Event("change"));
      check("light theme", document.documentElement.dataset.theme === "light");
      g.$("#language").value = "pt";
      g.$("#language").dispatchEvent(new Event("change"));
      g.$("#appearance").value = "dark";
      g.$("#appearance").dispatchEvent(new Event("change"));
      g.action("back");
      g.action("play");
      check("first play opens the new world screen", g.mode === "newworld");
      g.draft.mode = "creative";
      g.draft.options = normalizeOptions({ difficulty: "peaceful" });
      // The older checks were written for the classic valley.
      if (g.draft.seed === "") g.draft.size = "classic";
      g.action("create");
      check(
        "creative world created",
        g.world?.mode === "creative" &&
          g.mode === "playing" &&
          g.store.list().length === 1,
      );
      for (let i = 0; i < 30; i++) g.frame(g.last + 16);
      check("spawn above ground", !collides(g.blocks, g.player));
      const before = g.player.clone();
      g.keys.add("KeyW");
      for (let i = 0; i < 25; i++) g.frame(g.last + 16);
      g.keys.delete("KeyW");
      check("movement", g.player.distanceTo(before) > 0.3);
      for (let i = 0; i < 80; i++) g.frame(g.last + 16);
      const jumpStart = g.player.y;
      g.keys.add("Space");
      for (let i = 0; i < 12; i++) g.frame(g.last + 16);
      g.keys.delete("Space");
      check("jump", g.player.y > jumpStart + 0.2);
      for (let i = 0; i < 65; i++) g.frame(g.last + 16);
      const x = 2,
        z = 2,
        y = height(x, z);
      g.target = { p: [x, y, z], normal: new THREE.Vector3(0, 1, 0) };
      hold("brick");
      build();
      check("place block", g.blocks.get(key(x, y + 1, z)) === 6);
      g.target = { p: [x, y + 1, z], normal: new THREE.Vector3(0, 1, 0) };
      g.edit(false);
      check("break block", !g.blocks.has(key(x, y + 1, z)));
      check("quest counts standing blocks", g.placed() === 0);
      // Glass keeps the block behind it visible; doors are two tall and open with Build.
      const gx = -3,
        gz = 3,
        gy = height(gx, gz);
      g.target = { p: [gx, gy, gz], normal: new THREE.Vector3(0, 1, 0) };
      hold("glass");
      build();
      check(
        "glass shows the block below",
        g.blocks.get(key(gx, gy + 1, gz)) === GLASS && g.isRendered(gx, gy, gz),
      );
      g.target = {
        p: [gx + 1, height(gx + 1, gz), gz],
        normal: new THREE.Vector3(0, 1, 0),
      };
      hold("door");
      build();
      const doorY = height(gx + 1, gz) + 1;
      check(
        "door is two blocks tall",
        g.blocks.get(key(gx + 1, doorY, gz)) === DOOR &&
          g.blocks.get(key(gx + 1, doorY + 1, gz)) === DOOR,
      );
      g.target = {
        p: [gx + 1, doorY + 1, gz],
        normal: new THREE.Vector3(1, 0, 0),
      };
      build();
      check(
        "door opens and can be walked through",
        g.blocks.get(key(gx + 1, doorY, gz)) === DOOR_OPEN &&
          !collides(g.blocks, { x: gx + 1, y: doorY - 0.49, z: gz }),
      );
      g.target = { p: [gx + 1, doorY, gz], normal: new THREE.Vector3(0, 1, 0) };
      g.edit(false);
      check(
        "breaking a door removes all of it",
        !g.blocks.has(key(gx + 1, doorY + 1, gz)),
      );
      g.target = { p: [gx, gy + 1, gz], normal: new THREE.Vector3(0, 1, 0) };
      g.edit(false);
      const night = g.applySky(0.75);
      check(
        "night sky with glowing amber",
        night.night &&
          g.scene.background.r < 0.15 &&
          g.amber.emissiveIntensity > 1,
      );
      check(
        "day sky",
        g.applySky(NOON).daylight === 1 && g.amber.emissiveIntensity === 0,
      );
      g.music.start();
      check("music starts", g.music.enabled);
      g.music.stop();
      // Swimming: drop Biel into a dug hole under the water and paddle up.
      let hole = null;
      for (let i = -SIZE + 2; i < SIZE - 2 && !hole; i++)
        for (let j = -SIZE + 2; j < SIZE - 2 && !hole; j++)
          if (height(i, j) === 1) hole = [i, j];
      const holeKey = key(hole[0], 1, hole[1]),
        holeType = g.blocks.get(holeKey);
      g.blocks.delete(holeKey);
      g.player.set(hole[0], 0.51, hole[1]);
      g.velocity = 0;
      g.keys.add("Space");
      for (let i = 0; i < 40; i++) g.frame(g.last + 16);
      g.keys.delete("Space");
      check("swim up", g.player.y > 1);
      g.blocks.set(holeKey, holeType);
      g.spawn();
      g.toast("smoke");
      g.render();
      check(
        "toast survives HUD render",
        g.toastEl.isConnected && g.toastEl.classList.contains("show"),
      );
      g.togglePerspective();
      check(
        "first person crosshair",
        document.documentElement.classList.contains("first-person"),
      );
      g.togglePerspective();
      check("save", g.save());
      check("save round trip", g.store.load(g.world.id).edits.length > 0);
      g.touchInput.press(101, "forward");
      g.touchInput.press(102, "jump");
      check(
        "multitouch movement and jump",
        g.pressed("forward") && g.pressed("jump"),
      );
      g.render();
      check(
        "held controls survive inventory render",
        g.pressed("forward") && g.pressed("jump"),
      );
      g.touchInput.release(102);
      check(
        "independent finger release",
        g.pressed("forward") && !g.pressed("jump"),
      );
      g.action("pause");
      check("touch controls clear on pause", !g.touchInput.has("forward"));
      check("pause menu", g.mode === "paused");
      g.action("play");
      check("resume", g.mode === "playing");
      // A second world, then delete it from the list in two steps.
      const firstId = g.world.id;
      g.action("pause");
      g.action("worlds");
      g.action("newworld");
      g.draft.options = normalizeOptions({ difficulty: "normal" });
      // The older checks were written for the classic valley.
      if (g.draft.seed === "") g.draft.size = "classic";
      g.action("create");
      check(
        "adventure world on normal",
        g.world.mode === "adventure" && g.world.options.monsters,
      );
      check("adventure starts with apples", g.inventory.count("apple") === 3);
      g.target = {
        p: [2, height(2, 2), 2],
        normal: new THREE.Vector3(0, 1, 0),
      };
      g.touchInput.press(201, "break");
      g.updateBreaking(0.1);
      check(
        "breaking takes time in adventure",
        g.blocks.has(key(2, height(2, 2), 2)),
      );
      for (let i = 0; i < 12; i++) {
        g.target = {
          p: [2, height(2, 2), 2],
          normal: new THREE.Vector3(0, 1, 0),
        };
        g.updateBreaking(0.1);
      }
      g.touchInput.release(201);
      check("holding Break collects dirt", g.inventory.count("dirt") === 1);
      g.inventory.add("wood", 1);
      g.action("craft", "planks");
      check("craft planks from wood", g.inventory.count("planks") === 4);
      g.inventory.add("planks", 2);
      const doorRecipe = RECIPES.find((r) => r.id === "door");
      check(
        "door needs a workbench",
        !canCraft(g.inventory, doorRecipe, g.nearBench()),
      );
      g.blocks.set(
        key(
          Math.round(g.player.x) + 2,
          Math.round(g.player.y),
          Math.round(g.player.z),
        ),
        BENCH,
      );
      check(
        "workbench nearby unlocks the door",
        canCraft(g.inventory, doorRecipe, g.nearBench()),
      );
      g.action("inventory");
      check(
        "backpack screen lists recipes",
        g.app.querySelectorAll(".recipe").length === RECIPES.length,
      );
      g.action("back");
      // Survival on Normal: damage, food, falls, beds, falling asleep.
      hurt(g.vitals, 4, g.rules());
      check("normal difficulty hurts", g.vitals.health === 16);
      g.vitals.food = 10;
      hold("apple");
      build();
      check("eating an apple", g.vitals.food === 14 && g.heldId() === null);
      g.vitals.hurtCooldown = 0;
      const healthBeforeFall = g.vitals.health;
      g.player.y += 9;
      g.velocity = 0;
      for (let i = 0; i < 90; i++) g.frame(g.last + 16);
      check(
        "a long fall hurts",
        g.vitals.health < healthBeforeFall && g.grounded,
      );
      const bedPos = [
        Math.round(g.player.x) + 1,
        Math.round(g.player.y),
        Math.round(g.player.z) + 1,
      ];
      // A coloured bed works like the first red one.
      g.blocks.set(key(...bedPos), bedBlock("blue"));
      g.timeOfDay = 0.75;
      g.target = { p: bedPos, normal: new THREE.Vector3(0, 1, 0) };
      build();
      check(
        "sleeping at night skips to morning",
        g.timeOfDay < 0.1 &&
          g.world.day === 2 &&
          g.world.spawnPoint.join() === bedPos.join(),
      );
      g.inventory.add("stone", 5);
      const awayFromHome = [g.player.x + 4, g.player.y, g.player.z];
      g.player.set(...awayFromHome);
      while (collides(g.blocks, g.player)) g.player.y++;
      awayFromHome[1] = g.player.y;
      g.vitals.health = 0;
      g.frame(g.last + 16);
      check(
        "falling asleep leaves the backpack behind on normal",
        g.mode === "asleep" &&
          g.world.backpacks.length === 1 &&
          !g.inventory.count("stone"),
      );
      g.action("wake");
      check(
        "waking up at the bed",
        g.mode === "playing" &&
          g.vitals.health === 20 &&
          Math.abs(g.player.x - bedPos[0]) < 0.5,
      );
      g.player.set(...awayFromHome);
      g.frame(g.last + 16);
      check(
        "walking to the backpack gets everything back",
        g.inventory.count("stone") === 5 && g.world.backpacks.length === 0,
      );
      // Animals: products, waiting time and a dog that becomes a friend.
      check(
        "animals in the new world",
        g.animals.length === 19 && g.animalGroup.children.length === 19,
      );
      const cow = g.animals.find((x) => x.type === "cow"),
        dog = g.animals.find((x) => x.type === "dog");
      g.interactWith(cow);
      check("the cow needs a bucket for milk", !g.inventory.count("milk"));
      hold("bucket");
      g.interactWith(cow);
      check("the cow gives milk", g.inventory.count("milk") === 1);
      g.interactWith(cow);
      check("the cow needs a rest", g.inventory.count("milk") === 1);
      g.interactWith(g.animals.find((x) => x.type === "sheep"));
      check("shearing gives wool", g.inventory.count("wool") === 2);
      hold("apple");
      g.interactWith(dog);
      check("the dog wants a treat", !dog.tamed);
      g.inventory.add("treat", 1);
      hold("treat");
      g.interactWith(dog);
      check("a treat makes a friend", dog.tamed && g.mode === "namedog");
      g.$("#dog-name").value = "Faísca";
      g.action("namedone");
      check(
        "the dog gets a name",
        dog.name === "Faísca" && g.mode === "playing",
      );
      dog.x = g.player.x + 10;
      dog.z = g.player.z;
      for (let i = 0; i < 150; i++) g.frame(g.last + 16);
      check(
        "the dog follows Biel",
        Math.hypot(dog.x - g.player.x, dog.z - g.player.z) < 4,
      );
      g.save();
      check(
        "animals are saved",
        g.store.load(g.world.id).creatures.find((x) => x.type === "dog")
          .name === "Faísca",
      );
      // More animals: babies, a shy rabbit, a cat friend and a horse to ride.
      const [cowA, cowB] = g.animals.filter((x) => x.type === "cow");
      cowB.x = cowA.x + 1;
      cowB.z = cowA.z;
      for (const c of [cowA, cowB]) {
        g.inventory.add("wheat", 1);
        hold("wheat");
        g.interactWith(c);
      }
      const herdBefore = g.animals.length;
      g.breedClock = 0;
      g.frame(g.last + 16);
      const calf = g.animals.find((x) => x.baby && x.type === "cow");
      check(
        "two happy cows have a calf",
        g.animals.length === herdBefore + 1 && calf,
      );
      g.world.age = calf.grownAt + 1;
      g.frame(g.last + 16);
      check("the calf grows up", !calf.baby);
      const bunny = g.animals.find((x) => x.type === "rabbit");
      bunny.x = g.player.x + 1.5;
      bunny.z = g.player.z;
      bunny.y = g.surfaceY(bunny.x, bunny.z, g.player.y + 2);
      g.frame(g.last + 16);
      for (let i = 0; i < 30; i++) g.frame(g.last + 16);
      check(
        "the rabbit hops away",
        Math.hypot(bunny.x - g.player.x, bunny.z - g.player.z) > 2,
      );
      const kitty = g.animals.find((x) => x.type === "cat");
      g.inventory.add("fish", 1);
      hold("fish");
      g.interactWith(kitty);
      check("fish makes the cat a friend", kitty.tamed && g.mode === "namedog");
      g.action("namedone");
      const pony = g.animals.find((x) => x.type === "horse");
      g.inventory.add("apple", 30);
      hold("apple");
      g.inventory.slots[0].count = 30;
      for (let i = 0; i < 30 && !pony.tamed; i++) g.interactWith(pony);
      check("apples make the horse a friend", pony.tamed);
      g.action("namedone");
      g.interactWith(pony);
      check("riding the horse", g.riding === pony);
      // Compare identical unobstructed paths, not two random slopes or trees.
      g.player.set(0, MAX_Y + 2, 0);
      g.flying = true;
      g.velocity = 0;
      g.yaw = 0;
      const rideStart = g.player.clone();
      g.keys.add("KeyW");
      for (let i = 0; i < 30; i++) g.frame(g.last + 16);
      g.keys.delete("KeyW");
      const rideDistance = g.player.distanceTo(rideStart);
      g.dismount();
      g.player.copy(rideStart);
      const walkStart = g.player.clone();
      g.keys.add("KeyW");
      for (let i = 0; i < 30; i++) g.frame(g.last + 16);
      g.keys.delete("KeyW");
      check(
        "the horse is faster than walking",
        rideDistance > g.player.distanceTo(walkStart) * 1.3 &&
          g.riding === null,
      );
      g.flying = false;
      // Monsters on Normal at night: appear, hurt, get chased off, vanish at dawn.
      dog.sitting = true;
      g.spawn();
      for (let i = 0; i < 20; i++) g.frame(g.last + 16);
      g.timeOfDay = 0.75;
      let spawned = null;
      for (let i = 0; i < 6 && !spawned; i++) spawned = g.trySpawnMonster();
      check(
        "monsters appear at night on normal",
        spawned && g.monsters.length >= 1,
      );
      for (const m of [...g.monsters]) g.removeMonster(m, false);
      const sleepyOne = g.addMonster("sleepy", {
        x: g.player.x + 0.9,
        y: g.player.y,
        z: g.player.z,
      });
      g.vitals.hurtCooldown = 0;
      g.vitals.health = 20;
      for (let i = 0; i < 100; i++) g.frame(g.last + 16);
      check(
        "a sleepwalker bumps into Biel",
        g.vitals.health < 20 && g.vitals.health > 0,
      );
      check(
        "you cannot sleep with a monster nearby",
        (() => {
          const day = g.world.day;
          g.sleepIn(bedPos);
          return g.world.day === day;
        })(),
      );
      hold("stone_sword");
      g.targetMonster = sleepyOne;
      g.attackCooldown = 0;
      g.attack();
      g.attackCooldown = 0;
      g.targetMonster = sleepyOne;
      g.attack();
      check(
        "the sword sends it off in sparkles",
        !g.monsters.includes(sleepyOne) && g.inventory.count("stick") >= 2,
      );
      const bigJelly = g.addMonster("jelly", {
        x: g.player.x + 1,
        y: g.player.y,
        z: g.player.z,
      });
      bigJelly.hp = 1;
      g.targetMonster = bigJelly;
      g.attackCooldown = 0;
      g.attack();
      check(
        "a jelly splits in two",
        g.monsters.filter((m) => m.small).length === 2,
      );
      const archerOne = g.addMonster("archer", {
        x: g.player.x + 7,
        y: g.player.y,
        z: g.player.z,
      });
      archerOne.cooldown = 0;
      g.frame(g.last + 16);
      check("the archer shoots suction-cup arrows", g.arrows.length >= 1);
      const monstersBefore = g.monsters.length;
      g.save();
      g.loadWorld(g.store.load(g.world.id));
      check(
        "monsters are saved with the world",
        monstersBefore > 0 && g.monsters.length === monstersBefore,
      );
      g.blocks.set(
        key(
          Math.round(g.player.x),
          Math.round(g.player.y) + 1,
          Math.round(g.player.z) + 3,
        ),
        TORCH,
      );
      g.rebuild();
      check("torches are light sources", g.lightBlocks.length > 0);
      g.timeOfDay = 0.3;
      for (let i = 0; i < 240; i++) g.frame(g.last + 16);
      check("monsters fizzle away at sunrise", g.monsters.length === 0);
      // The newer monsters: a climbing spider, Puffy and the cave ghost.
      g.world.options = normalizeOptions({
        ...g.world.options,
        difficulty: "hard",
        monsters: true,
      });
      g.timeOfDay = 0.75;
      const px0 = Math.round(g.player.x),
        pz0 = Math.round(g.player.z),
        floor0 = Math.round(g.player.y - 0.51);
      g.setBlock([px0 + 2, floor0 + 1, pz0], 2);
      g.setBlock([px0 + 2, floor0 + 2, pz0], 2);
      g.rebuildAt([px0 + 2, floor0 + 1, pz0]);
      const climber = g.addMonster("spider", {
        x: px0 + 3.6,
        y: g.player.y,
        z: pz0,
      });
      let highest = climber.y;
      for (let i = 0; i < 120; i++) {
        g.frame(g.last + 16);
        highest = Math.max(highest, climber.y);
      }
      check("the woolly spider climbs walls", highest > g.player.y + 1.5);
      g.removeMonster(climber, false);
      for (const m of [...g.monsters]) g.removeMonster(m, false);
      const built = [px0 - 1, floor0 + 1, pz0 - 1];
      g.setBlock(built, 6);
      const cloud = g.addMonster("puff", {
        x: px0 - 1.4,
        y: g.player.y,
        z: pz0 - 1,
      });
      cloud.fuse = 0;
      g.vitals.hurtCooldown = 0;
      g.vitals.health = 20;
      const editsBefore = [...g.edits.values()].filter(
        (v) => v === null,
      ).length;
      g.frame(g.last + 16);
      check(
        "Puffy goes PUF: knocks natural blocks but never Biel's builds",
        !g.monsters.includes(cloud) &&
          g.blocks.get(key(...built)) === 6 &&
          [...g.edits.values()].filter((v) => v === null).length >
            editsBefore &&
          g.vitals.health < 20,
      );
      const roofX = Math.round(g.player.x),
        roofZ = Math.round(g.player.z),
        roofY = Math.round(g.player.y);
      // A wide stone roof makes a real cave: dark well inside, even by day.
      const roofCells = [];
      for (let x = -20; x <= 20; x++)
        for (let z = -20; z <= 20; z++) {
          const cell = [roofX + x, roofY + 4, roofZ + z];
          if (
            Math.abs(cell[0]) > SIZE ||
            Math.abs(cell[2]) > SIZE ||
            g.blocks.has(key(...cell))
          )
            continue;
          g.setBlock(cell, 2);
          roofCells.push(cell);
        }
      g.rebuildAt(...roofCells);
      g.timeOfDay = 0.3;
      let caveMonster = null;
      for (let i = 0; i < 30 && !caveMonster; i++)
        caveMonster = g.trySpawnMonster();
      check(
        "on Hard, caves have monsters even by day",
        g.underground() && caveMonster?.cave,
      );
      for (const m of [...g.monsters]) g.removeMonster(m, false);
      const spook = g.addMonster("ghost", {
        x: px0 + 6,
        y: g.player.y + 1,
        z: pz0,
      });
      spook.cave = true;
      const ghostStart = Math.hypot(spook.x - g.player.x, spook.z - g.player.z);
      for (let i = 0; i < 60; i++) g.frame(g.last + 16);
      check(
        "the mist ghost floats through rock",
        Math.hypot(spook.x - g.player.x, spook.z - g.player.z) <
          ghostStart - 0.8,
      );
      for (const m of [...g.monsters]) g.removeMonster(m, false);
      for (const cell of roofCells) {
        g.blocks.delete(key(...cell));
        g.edits.set(key(...cell), null);
      }
      g.rebuildAt(...roofCells);
      g.world.options = normalizeOptions({
        ...g.world.options,
        difficulty: "normal",
      });
      g.world.options = normalizeOptions({
        ...g.world.options,
        monsters: false,
      });
      g.timeOfDay = 0.75;
      for (let i = 0; i < 6; i++) g.trySpawnMonster();
      check("no monsters when switched off", g.monsters.length === 0);
      g.timeOfDay = 0.3;
      const secondId = g.world.id;
      g.action("pause");
      g.action("worlds");
      g.action("deleteworld", secondId);
      check("delete asks for confirmation", g.store.list().length === 2);
      g.action("deleteworld", secondId);
      check("world deleted", g.store.list().length === 1 && g.world === null);
      g.action("openworld", firstId);
      check(
        "first world reopened",
        g.world?.id === firstId && g.edits.size > 0,
      );
      // Tutorial, sticker book and the parents' corner.
      g.action("pause");
      g.action("worlds");
      g.action("newworld");
      check("new worlds offer the tutorial", g.draft.tutorial === true);
      // The older checks were written for the classic valley.
      if (g.draft.seed === "") g.draft.size = "classic";
      g.action("create");
      check(
        "the tutorial starts in a new adventure world",
        g.world.tutorial?.step === 0 && g.app.querySelector(".quest.tutorial"),
      );
      g.tutorialEvent("walk", 5);
      check("walking moves the tutorial on", g.world.tutorial.step === 1);
      g.action("skiptutorial");
      check(
        "the tutorial can be skipped",
        g.world.tutorial === null && !g.app.querySelector(".quest.tutorial"),
      );
      check(
        "placing blocks counts for the shelter sticker",
        (g.progress.counters.place ?? 0) >= 1,
      );
      g.inventory.add("planks", 4);
      g.action("craft", "bench");
      check("a workbench earns a sticker", !!g.progress.done.bench);
      check("the dog sticker from earlier", !!g.progress.done.dog);
      g.action("stickers");
      check(
        "the sticker book shows twelve stickers",
        g.app.querySelectorAll(".sticker").length === 12 &&
          g.app.querySelectorAll(".sticker.done").length >= 2,
      );
      g.action("back");
      g.action("pause");
      g.action("settings");
      g.action("parentsgate");
      g.$("#parents-answer").value = "1";
      g.action("parentscheck");
      check(
        "a wrong answer keeps the parents' corner closed",
        g.mode === "parentsgate",
      );
      g.$("#parents-answer").value = String(g.gate.answer);
      g.action("parentscheck");
      check("the right answer opens the parents' corner", g.mode === "parents");
      g.settings.parents = normalizeParents({
        ...g.settings.parents,
        noMonsters: true,
        maxDifficulty: "easy",
        reminder: 30,
      });
      g.world.options = normalizeOptions({
        ...g.world.options,
        difficulty: "hard",
      });
      g.applyParentLimits();
      check(
        "parents can switch monsters off and cap the difficulty",
        !g.monstersAllowed() && g.world.options.difficulty === "easy",
      );
      g.mode = "playing";
      g.playSeconds = 30 * 60 - 0.001;
      g.frame(g.last + 16);
      check("the break reminder appears", g.mode === "rest");
      g.action("restdone");
      check("and play goes on", g.mode === "playing" && g.playSeconds === 0);
      g.settings.parents = normalizeParents({});
      // Farming: till, plant, grow, harvest, bake; and a little fishing.
      const fx = Math.round(g.player.x) + 2,
        fz = Math.round(g.player.z),
        fy = g.topAt(fx, fz);
      g.setBlock([fx, fy, fz], 1);
      hold("wooden_hoe");
      g.target = { p: [fx, fy, fz], normal: new THREE.Vector3(0, 1, 0) };
      build();
      check(
        "the hoe makes farmland",
        g.blocks.get(key(fx, fy, fz)) === FARMLAND,
      );
      hold("wheat_seeds");
      build();
      check(
        "seeds are planted",
        cropInfo(g.blocks.get(key(fx, fy + 1, fz)))?.stage === 0,
      );
      g.rebuild();
      for (
        let i = 0;
        i < 200 && cropInfo(g.blocks.get(key(fx, fy + 1, fz))).stage < 3;
        i++
      )
        g.growCrops(30);
      check(
        "wheat grows ripe",
        cropInfo(g.blocks.get(key(fx, fy + 1, fz))).stage === 3,
      );
      const wheatBefore = g.inventory.count("wheat");
      g.target = { p: [fx, fy + 1, fz], normal: new THREE.Vector3(0, 1, 0) };
      g.edit(false);
      check(
        "harvesting wheat earns the farmer sticker",
        g.inventory.count("wheat") > wheatBefore && !!g.progress.done.wheat,
      );
      g.inventory.add("wheat", 3);
      g.action("craft", "bread");
      check("bread from wheat", g.inventory.count("bread") >= 1);
      hold("fishing_rod");
      g.fishing = { until: g.elapsed - 1, from: g.player.clone() };
      const fishBefore = g.inventory.count("fish");
      g.updateFishing();
      check(
        "fishing catches a fish",
        g.inventory.count("fish") === fishBefore + 1,
      );
      // Weather: rain comes in gently, waters the farm and greys the sky.
      g.world.weather = { state: "rain", until: g.world.age + 999 };
      g.timeOfDay = 0.3;
      for (let i = 0; i < 320; i++) g.frame(g.last + 16);
      check(
        "rain falls and waters the farm",
        g.rain.visible && g.raining() && g.darkLevel > 0.3,
      );
      check(
        "the clock shows the rain",
        g.app.querySelector(".clock").textContent.includes("🌧"),
      );
      g.world.options = normalizeOptions({
        ...g.world.options,
        weather: false,
      });
      for (let i = 0; i < 320; i++) g.frame(g.last + 16);
      check("no weather when switched off", !g.rain.visible && !g.raining());
      // Chests, the furnace, iron tools and treasure.
      const cx0 = Math.round(g.player.x) + 2,
        cz0 = Math.round(g.player.z) - 2,
        cy0 = g.topAt(cx0, cz0);
      g.inventory.add("chest", 1);
      hold("chest");
      g.target = { p: [cx0, cy0, cz0], normal: new THREE.Vector3(0, 1, 0) };
      // An animal walking past must not take the tap.
      g.targetAnimal = g.targetMonster = null;
      build();
      const chestKey = key(cx0, cy0 + 1, cz0);
      check(
        "a chest is placed empty",
        g.blocks.get(chestKey) === CHEST &&
          g.world.chests[chestKey].length === 0,
      );
      g.target = { p: [cx0, cy0 + 1, cz0], normal: new THREE.Vector3(0, 1, 0) };
      build();
      check("using a chest opens it", g.mode === "chest");
      g.inventory.add("dirt", 5);
      g.moveStack(
        "bag",
        g.inventory.slots.findIndex((x) => x?.id === "dirt"),
      );
      check(
        "things move into the chest",
        g.chestAt(chestKey).count("dirt") >= 5 && !g.inventory.count("dirt"),
      );
      const beforeTransfer = g.inventory.toJSON();
      g.inventory = new Inventory();
      g.inventory.add("wooden_pickaxe", 1, 12);
      g.moveStack("bag", 0);
      const toolIndex = g
        .chestAt(chestKey)
        .slots.findIndex((s) => s?.id === "wooden_pickaxe");
      g.moveStack("chest", toolIndex);
      check(
        "chest transfers keep tool wear",
        g.inventory.slots[0]?.wear === 12,
      );
      g.inventory = new Inventory();
      for (let i = 0; i < 36; i++) g.inventory.add("wooden_sword");
      const chestContents = JSON.stringify(g.world.chests[chestKey]);
      g.action("back");
      g.target = { p: [cx0, cy0 + 1, cz0], normal: new THREE.Vector3(0, 1, 0) };
      g.targetAnimal = g.targetMonster = null;
      g.edit(false);
      check(
        "a full backpack cannot destroy a filled chest",
        g.blocks.get(chestKey) === CHEST &&
          JSON.stringify(g.world.chests[chestKey]) === chestContents,
      );
      g.inventory = Inventory.from(beforeTransfer);
      const fx0 = cx0 + 1;
      g.inventory.add("furnace", 1);
      hold("furnace");
      g.target = {
        p: [fx0, g.topAt(fx0, cz0), cz0],
        normal: new THREE.Vector3(0, 1, 0),
      };
      build();
      const furnaceKey = key(fx0, g.topAt(fx0, cz0), cz0);
      g.target = {
        p: furnaceKey.split(",").map(Number),
        normal: new THREE.Vector3(0, 1, 0),
      };
      build();
      check("using a furnace opens it", g.mode === "furnace");
      g.inventory.add("iron_ore", 3);
      g.inventory.add("coal", 1);
      g.moveStack(
        "bag",
        g.inventory.slots.findIndex((x) => x?.id === "iron_ore"),
      );
      g.moveStack(
        "bag",
        g.inventory.slots.findIndex((x) => x?.id === "coal"),
      );
      for (let i = 0; i < 40; i++) g.updateFurnaces(0.5);
      g.moveStack("output", 0);
      check(
        "the furnace melts iron bars",
        g.inventory.count("iron_ingot") === 3,
      );
      g.action("back");
      g.setBlock(
        [
          Math.round(g.player.x) - 2,
          Math.round(g.player.y),
          Math.round(g.player.z),
        ],
        BENCH,
      );
      g.inventory.add("stick", 2);
      g.action("craft", "iron_pickaxe");
      check(
        "an iron pickaxe earns its sticker",
        g.inventory.count("iron_pickaxe") === 1 &&
          !!g.progress.done.ironPickaxe,
      );
      const oreAt = [Math.round(g.player.x) + 3, 1, Math.round(g.player.z) + 3];
      g.setBlock(oreAt, IRON_ORE);
      hold("iron_pickaxe");
      g.target = { p: oreAt, normal: new THREE.Vector3(0, 1, 0) };
      g.edit(false);
      check(
        "iron ore needs a pickaxe and counts for the ore hunter",
        g.inventory.count("iron_ore") >= 1 &&
          (g.progress.counters["got:iron"] ?? 0) >= 1,
      );
      const treasureKey = key(5, 30, 5);
      delete g.world.chests[treasureKey];
      check(
        "chests in ruins and cabins hold treasure",
        g.chestAt(treasureKey).slots.some(Boolean),
      );
      // Building shapes: ladders, fences, gates, trapdoors, signs, dyed wool.
      const bx0 = Math.round(g.player.x),
        bz0 = Math.round(g.player.z),
        by0 = Math.round(g.player.y);
      for (let y = by0; y <= by0 + 3; y++) g.setBlock([bx0, y, bz0], LADDER);
      g.rebuildAt([bx0, by0, bz0]);
      g.player.set(bx0, by0 - 0.49 + 0.01, bz0);
      g.velocity = 0;
      const ladderStart = g.player.y;
      g.keys.add("Space");
      for (let i = 0; i < 40; i++) g.frame(g.last + 16);
      g.keys.delete("Space");
      check("ladders can be climbed", g.player.y > ladderStart + 1.2);
      for (let y = by0; y <= by0 + 3; y++) {
        g.blocks.delete(key(bx0, y, bz0));
        g.edits.set(key(bx0, y, bz0), null);
      }
      g.rebuildAt([bx0, by0, bz0]);
      g.spawn();
      for (let i = 0; i < 20; i++) g.frame(g.last + 16);
      const gx0 = Math.round(g.player.x) + 2,
        gz0 = Math.round(g.player.z),
        gy0 = g.topAt(gx0, gz0) + 1;
      g.setBlock([gx0, gy0, gz0], FENCE);
      check(
        "fences block the way",
        collides(g.blocks, { x: gx0, y: gy0 - 0.49, z: gz0 }),
      );
      g.setBlock([gx0, gy0, gz0], GATE);
      g.target = { p: [gx0, gy0, gz0], normal: new THREE.Vector3(0, 1, 0) };
      build();
      check(
        "gates open",
        g.blocks.get(key(gx0, gy0, gz0)) === GATE_OPEN &&
          !collides(g.blocks, { x: gx0, y: gy0 - 0.49, z: gz0 }),
      );
      g.setBlock([gx0, gy0, gz0], TRAPDOOR);
      build();
      check(
        "trapdoors open",
        g.blocks.get(key(gx0, gy0, gz0)) === TRAPDOOR_OPEN,
      );
      g.blocks.delete(key(gx0, gy0, gz0));
      g.inventory.add("sign", 1);
      hold("sign");
      g.target = { p: [gx0, gy0 - 1, gz0], normal: new THREE.Vector3(0, 1, 0) };
      build();
      await new Promise((r) => setTimeout(r, 0));
      check("placing a sign asks for its text", g.mode === "signtext");
      g.$("#sign-text").value = "Casa do Biel";
      g.action("signdone");
      check(
        "the sign shows its text",
        g.world.signs[key(gx0, gy0, gz0)] === "Casa do Biel" &&
          g.signGroup.children.length >= 1,
      );
      const ewe = g.animals.find((x) => x.type === "sheep");
      ewe.readyAt = 0;
      g.inventory.add("blue_dye", 1);
      hold("blue_dye");
      g.interactWith(ewe);
      hold("apple");
      g.interactWith(ewe);
      check(
        "a blue sheep gives blue wool",
        ewe.color === "blue" && g.inventory.count("wool_blue") === 2,
      );
      hold("wool_blue");
      g.target = {
        p: [gx0 + 1, g.topAt(gx0 + 1, gz0), gz0],
        normal: new THREE.Vector3(0, 1, 0),
      };
      build();
      check(
        "coloured wool is built",
        g.blocks.get(key(gx0 + 1, g.topAt(gx0 + 1, gz0), gz0)) ===
          woolBlock("blue"),
      );
      // Block light: open sky, a dark closed room, a torch, and darkness again.
      const lx0 = Math.round(g.player.x) - 6,
        lz0 = Math.round(g.player.z) - 6,
        ly0 = g.topAt(lx0, lz0) + 1;
      check("open sky is fully lit", g.light.level(lx0, ly0 + 6, lz0) === 15);
      const roomCells = [];
      for (let x = -2; x <= 2; x++)
        for (let z = -2; z <= 2; z++)
          for (let y = 0; y <= 4; y++)
            if (Math.abs(x) === 2 || Math.abs(z) === 2 || y === 0 || y === 4) {
              g.setBlock([lx0 + x, ly0 + y, lz0 + z], 2);
              roomCells.push([lx0 + x, ly0 + y, lz0 + z]);
            } else {
              g.blocks.delete(key(lx0 + x, ly0 + y, lz0 + z));
            }
      g.rebuildAt(...roomCells);
      check("a closed room is dark", g.light.level(lx0, ly0 + 2, lz0) <= 1);
      g.setBlock([lx0, ly0 + 1, lz0], TORCH);
      g.rebuildAt([lx0, ly0 + 1, lz0]);
      check(
        "a torch lights the room",
        g.light.level(lx0 + 1, ly0 + 2, lz0) >= 12,
      );
      const floorMesh = [...g.chunks.values()]
        .flatMap((c) => c.meshes)
        .find((mm) =>
          mm.userData.cells.some(
            ([a, b, c]) => a === lx0 + 1 && b === ly0 && c === lz0,
          ),
        );
      const at = floorMesh.userData.cells.findIndex(
        ([a, b, c]) => a === lx0 + 1 && b === ly0 && c === lz0,
      );
      check(
        "faces are painted with their light",
        floorMesh.instanceColor && floorMesh.userData.glow[at] >= 12,
      );
      g.blocks.delete(key(lx0, ly0 + 1, lz0));
      g.edits.set(key(lx0, ly0 + 1, lz0), null);
      g.rebuildAt([lx0, ly0 + 1, lz0]);
      check(
        "without the torch the room is dark again",
        g.light.level(lx0 + 1, ly0 + 2, lz0) <= 1,
      );
      for (const [x, y, z] of roomCells) {
        g.blocks.delete(key(x, y, z));
        g.edits.set(key(x, y, z), null);
      }
      g.rebuildAt(...roomCells);
      // Tools, wear, buckets and flowing water, honey and shears.
      const wx0 = Math.round(g.player.x) + 4,
        wz0 = Math.round(g.player.z) - 3,
        wy0 = g.topAt(wx0, wz0);
      g.setBlock([wx0, wy0 + 1, wz0], 4);
      g.target = { p: [wx0, wy0 + 1, wz0], normal: new THREE.Vector3(0, 1, 0) };
      hold("stone_axe");
      check(
        "an axe chops wood faster",
        breakTime(4, g.heldId()) < breakTime(4, null),
      );
      const savedOptions = g.world.options;
      g.world.options = { ...g.world.options, difficulty: "easy" };
      g.edit(false);
      check(
        "tools do not wear out on Easy",
        !g.inventory.slots[0].wear && g.inventory.count("wood") >= 1,
      );
      g.world.options = { ...g.world.options, difficulty: "normal" };
      g.setBlock([wx0, wy0 + 1, wz0], 4);
      g.target = { p: [wx0, wy0 + 1, wz0], normal: new THREE.Vector3(0, 1, 0) };
      g.edit(false);
      check("tools wear out on Normal", g.inventory.slots[0].wear === 1);
      g.render();
      check("the bar shows the wear", !!g.app.querySelector(".hotbar .wear"));
      g.inventory.slots[0].wear = toolUses("stone_axe") - 1;
      g.wearHeld();
      check(
        "a worn-out tool goes away with a kind message",
        g.inventory.slots[0] === null &&
          g.toastEl.textContent.includes("bancada"),
      );
      g.world.options = savedOptions;
      check("the wood was chopped", !g.blocks.has(key(wx0, wy0 + 1, wz0)));
      // A water bucket poured on the ground flows and fills the bucket again.
      g.inventory.slots[0] = { id: "water_bucket", count: 1 };
      g.selected = 0;
      g.target = { p: [wx0, wy0, wz0], normal: new THREE.Vector3(0, 1, 0) };
      g.targetAnimal = g.targetMonster = null;
      build();
      const wellAt = [wx0, wy0 + 1, wz0];
      check(
        "a water bucket pours water",
        g.blocks.get(key(...wellAt)) === WATER && g.heldId() === "bucket",
      );
      for (let i = 0; i < 12; i++) g.updateWater(0.4);
      const wet = [...g.blocks.entries()].filter(
        ([k, v]) => isWater(v) && v !== WATER && k.split(",")[1] <= wy0 + 1,
      ).length;
      check("the water flows around", wet >= 4);
      check("Biel swims in water blocks", inWater(g.blocks, wx0, wy0 + 1, wz0));
      g.pick();
      g.targetWater = wellAt;
      g.targetAnimal = g.targetMonster = null;
      build();
      check(
        "an empty bucket scoops the water back",
        g.heldId() === "water_bucket" && !g.blocks.has(key(...wellAt)),
      );
      for (let i = 0; i < 80 && g.waterDirty.size; i++) g.updateWater(0.4);
      check(
        "the water dries up without its source",
        ![...g.blocks.values()].some((v) => isWater(v)),
      );
      // Lava: a bucket scoops it, it burns on Normal, it is only warm on
      // Easy, and water turns it into stone.
      const lavaAt = [wx0, wy0 + 1, wz0];
      g.setBlock(lavaAt, LAVA);
      g.rebuildAt(lavaAt);
      g.inventory.slots[0] = { id: "bucket", count: 1 };
      g.selected = 0;
      g.targetLava = lavaAt;
      g.targetAnimal = g.targetMonster = null;
      build();
      check(
        "a bucket scoops lava",
        g.heldId() === "lava_bucket" && !g.blocks.has(key(...lavaAt)),
      );
      g.target = { p: [wx0, wy0, wz0], normal: new THREE.Vector3(0, 1, 0) };
      g.targetAnimal = g.targetMonster = null;
      build();
      check(
        "a lava bucket pours lava",
        g.blocks.get(key(...lavaAt)) === LAVA && g.heldId() === "bucket",
      );
      check("lava glows", g.light.level(...lavaAt) >= 14);
      const lavaSaved = { ...g.player },
        lavaOptions = g.world.options;
      Object.assign(g.player, { x: wx0, y: wy0 + 1, z: wz0 });
      g.world.options = { ...lavaOptions, difficulty: "easy" };
      g.vitals.health = 20;
      g.vitals.hurtCooldown = 0;
      g.touchLava(0.1);
      check(
        "on Easy lava is only warm and pushes Biel out",
        g.vitals.health === 20 && g.velocity >= 5,
      );
      g.world.options = { ...lavaOptions, difficulty: "normal" };
      g.touchLava(0.1);
      check("on Normal lava burns", g.vitals.health < 20);
      g.world.options = lavaOptions;
      Object.assign(g.player, lavaSaved);
      g.vitals.health = 20;
      g.setBlock([wx0 + 1, wy0 + 1, wz0], WATER);
      g.rebuildAt([wx0 + 1, wy0 + 1, wz0]);
      g.waterDirty.add(key(...lavaAt));
      g.updateWater(0.4);
      check("water turns lava into stone", g.blocks.get(key(...lavaAt)) === 2);
      for (const p of [lavaAt, [wx0 + 1, wy0 + 1, wz0]]) {
        g.blocks.delete(key(...p));
        g.edits.set(key(...p), null);
      }
      for (let i = 0; i < 40 && g.waterDirty.size; i++) g.updateWater(0.4);
      g.rebuildAt(lavaAt);
      check(
        "no lava is left behind",
        !isLava(g.blocks.get(key(...lavaAt))) &&
          !isLava(g.blocks.get(key(wx0 + 1, wy0 + 1, wz0))),
      );
      // Rain puts out a campfire in the open; tapping lights it again.
      g.setBlock(lavaAt, CAMPFIRE);
      g.rebuildAt(lavaAt);
      const wasRain = g.rainLevel;
      g.rainLevel = 1;
      g.rainOnCampfires();
      check(
        "rain puts out a campfire in the open",
        g.blocks.get(key(...lavaAt)) === CAMPFIRE_OUT,
      );
      g.rainLevel = 0;
      hold("stick");
      g.target = { p: lavaAt, normal: new THREE.Vector3(0, 1, 0) };
      g.targetAnimal = g.targetMonster = null;
      build();
      check(
        "a campfire lights again when the rain stops",
        g.blocks.get(key(...lavaAt)) === CAMPFIRE,
      );
      g.rainLevel = wasRain;
      g.blocks.delete(key(...lavaAt));
      g.edits.set(key(...lavaAt), null);
      g.rebuildAt(lavaAt);
      // Honey from a bee nest, with a bottle.
      g.setBlock([wx0, wy0 + 1, wz0], BEE_NEST);
      g.inventory.slots[0] = { id: "bottle", count: 2 };
      g.target = { p: [wx0, wy0 + 1, wz0], normal: new THREE.Vector3(0, 1, 0) };
      g.targetAnimal = g.targetMonster = null;
      build();
      g.targetAnimal = g.targetMonster = null;
      build();
      check(
        "a bottle collects honey, then the bees need a rest",
        g.inventory.count("honey") === 1 && g.inventory.count("bottle") === 1,
      );
      g.blocks.delete(key(wx0, wy0 + 1, wz0));
      g.edits.set(key(wx0, wy0 + 1, wz0), null);
      g.rebuildAt([wx0, wy0 + 1, wz0]);
      const shorn = g.animals.find((x) => x.type === "sheep");
      shorn.readyAt = 0;
      shorn.color = "";
      const woolBefore = g.inventory.count("wool");
      hold("shears");
      g.interactWith(shorn);
      check(
        "shears give more wool",
        g.inventory.count("wool") === woolBefore + 3,
      );
      // A game controller drives the same actions.
      const padStart = g.player.clone();
      window.nativeGamepad({ ly: -1 });
      for (let i = 0; i < 40; i++) g.frame(g.last + 16);
      check(
        "the left stick walks",
        g.player.distanceTo(padStart) > 1 &&
          document.documentElement.classList.contains("gamepad"),
      );
      window.nativeGamepad({ y: true });
      g.frame(g.last + 16);
      check("Y opens the backpack", g.mode === "inventory");
      window.nativeGamepad({ b: true });
      g.frame(g.last + 16);
      check("B goes back", g.mode === "playing");
      window.nativeGamepad({ start: true });
      g.frame(g.last + 16);
      window.nativeGamepad({ down: true });
      g.frame(g.last + 16);
      const focused = document.activeElement?.textContent;
      window.nativeGamepad({});
      g.frame(g.last + 16);
      check(
        "the d-pad moves between menu buttons",
        g.mode === "paused" && focused && focused !== g.t("continue"),
      );
      window.nativeGamepad({ start: true });
      g.frame(g.last + 16);
      check("start goes back to the game", g.mode === "playing");
      window.nativeGamepad(null);
      g.frame(g.last + 16);
      document.documentElement.classList.remove("gamepad");
      // The pause menu exports; the world list duplicates a world.
      g.action("pause");
      check(
        "the pause menu can export the world",
        !!g.app.querySelector('[data-action="export"]'),
      );
      g.action("worlds");
      for (const w of g.store.list().slice(2)) g.store.remove(w.id);
      const worldsBefore = g.store.list().length,
        original = g.store.load(g.world.id);
      g.action("duplicateworld", g.world.id);
      const copied = g.store
        .list()
        .find((w) => w.id !== original.id && w.name.startsWith(original.name));
      check(
        "a world can be duplicated with everything in it",
        g.store.list().length === worldsBefore + 1 &&
          copied &&
          g.store.load(copied.id).edits.length === original.edits.length,
      );
      // Any world in the list can be renamed, not only the open one.
      if (copied) {
        g.action("renameworld", copied.id);
        g.$("#rename-input").value = "Ilha copiada";
        g.action("renamedone");
        check(
          "a world in the list can be renamed",
          g.store.load(copied.id).name === "Ilha copiada" &&
            g.mode === "worlds",
        );
        g.store.remove(copied.id);
      }
      // The new terrain: a seeded medium island, drawn chunk by chunk.
      g.action("newworld");
      g.draft.size = "medium";
      g.draft.seed = "4242";
      g.render();
      const previewPixels = g
        .$("#world-preview")
        ?.getContext("2d")
        .getImageData(0, 0, 128, 128).data;
      let landPixels = 0;
      for (let i = 0; previewPixels && i < previewPixels.length; i += 4)
        if (previewPixels[i + 1] > 150 && previewPixels[i + 2] < 120)
          landPixels++;
      check("the new world screen shows the island", landPixels > 200);
      g.draft.mode = "creative";
      const t0 = performance.now();
      // The older checks were written for the classic valley.
      if (g.draft.seed === "") g.draft.size = "classic";
      g.action("create");
      const loadMs = performance.now() - t0;
      check(
        "a medium island with a seed",
        g.world.seed === 4242 &&
          SIZE === 48 &&
          WATER_LEVEL > 10 &&
          g.chunks.size > 30,
      );
      check("a medium island loads quickly", loadMs < 4000);
      check(
        "Biel starts on dry land",
        height(Math.round(g.player.x), Math.round(g.player.z)) > WATER_LEVEL &&
          !collides(g.blocks, g.player),
      );
      const biomesHere = new Set();
      for (let x = -46; x <= 46; x += 3)
        for (let z = -46; z <= 46; z += 3) biomesHere.add(biomeAt(x, z));
      check("the island has several biomes", biomesHere.size >= 3);
      const typesHere = new Set(g.blocks.values());
      check(
        "new islands have copper, lakes, bee nests and deep lava",
        g.world.gen === 3 &&
          typesHere.has(COPPER_ORE) &&
          typesHere.has(WATER) &&
          typesHere.has(BEE_NEST) &&
          typesHere.has(LAVA),
      );
      const firstChest = [...g.blocks].find(([, type]) => type === CHEST),
        islandCat = g.animals.find((a) => a.type === "cat");
      if (firstChest && islandCat) {
        const [cx, , cz] = firstChest[0].split(",").map(Number);
        check(
          "the cat starts near a ruin or cabin",
          Math.hypot(islandCat.x - cx, islandCat.z - cz) < 6,
        );
      }
      const nest = g.nestBlocks[0];
      g.player.set(nest[0] + 2, nest[1], nest[2]);
      g.world.options = { ...g.world.options, animals: true };
      g.timeOfDay = 0.3;
      g.rainLevel = 0;
      g.frame(g.last + 16);
      check(
        "bees buzz around their nest",
        g.swarm.children.some(
          (b) =>
            b.visible &&
            Math.hypot(b.position.x - nest[0], b.position.z - nest[2]) < 4,
        ),
      );
      g.spawn();
      const ex = Math.round(g.player.x) + 2,
        ez = Math.round(g.player.z),
        ey = g.topAt(ex, ez) + 1;
      const otherChunk = [...g.chunks.entries()].find(
        ([id]) =>
          id !==
            g.chunkKey(Math.floor(ex / g.CHUNK), Math.floor(ez / g.CHUNK)) &&
          Math.abs(Number(id.split(",")[0]) - Math.floor(ex / g.CHUNK)) > 1,
      );
      const untouched = otherChunk[1].meshes[0];
      g.setBlock([ex, ey, ez], 6);
      g.rebuildAt([ex, ey, ez]);
      check(
        "an edit only redraws its own chunk",
        g.isRendered(ex, ey, ez) && otherChunk[1].meshes[0] === untouched,
      );
      g.save();
      g.action("pause");
      g.action("worlds");
      const classic = g.store
        .list()
        .map((w) => g.store.load(w.id))
        .find((w) => w.seed === null);
      g.action("openworld", classic.id);
      check(
        "classic worlds keep the original valley",
        SIZE === 28 && WATER_LEVEL === 2.2 && g.world.seed === null,
      );
      // Settings and helpers added in the final review.
      if (!g.world) g.loadWorld(g.store.load(g.store.list()[0].id));
      g.mode = "playing";
      g.render();
      g.minimapClock = 0;
      g.frame(g.last + 16);
      const mini = g.app.querySelector(".minimap");
      const px = mini?.getContext("2d").getImageData(66, 66, 1, 1).data;
      check("the minimap is drawn", mini && px[3] === 255);
      g.action("pause");
      g.action("map");
      check(
        "the big map opens from the pause menu",
        g.mode === "map" && g.$(".big-map"),
      );
      g.action("back");
      g.action("settings");
      const fxSlider = g.app.querySelector('[data-volume="fx"]');
      fxSlider.value = "30";
      fxSlider.dispatchEvent(new Event("input"));
      check(
        "effects volume slider",
        g.settings.volume.fx === 0.3 && g.settings.sound,
      );
      g.$("#bigtext").value = "on";
      g.$("#bigtext").dispatchEvent(new Event("change"));
      check(
        "large text",
        document.documentElement.classList.contains("big-text"),
      );
      g.$("#bigtext").value = "off";
      g.$("#bigtext").dispatchEvent(new Event("change"));
      g.action("back");
      g.action("play");
      g.toggleStats();
      g.statsClock = 1;
      g.frame(g.last + 16);
      check(
        "the performance overlay shows numbers",
        /fps/.test(g.statsEl.textContent),
      );
      g.toggleStats();
      g.world.options = normalizeOptions({
        ...g.world.options,
        monsters: true,
        difficulty: "normal",
      });
      // The target stands where Biel aims, with nothing in between.
      for (const other of [...g.monsters]) g.removeMonster(other, false);
      g.inventory = new Inventory();
      hold("bow");
      g.inventory.add("arrows", 2);
      g.firstPerson = true;
      g.pointerKind = "mouse";
      g.yaw = 0;
      g.pitch = 0.05;
      g.frame(g.last + 16);
      const aimDir = new THREE.Vector3();
      g.camera.getWorldDirection(aimDir);
      for (let d = 0.5; d <= 4; d += 0.25) {
        const c = g.camera.position.clone().addScaledVector(aimDir, d);
        for (const dy of [-1, 0]) {
          const k = key(Math.round(c.x), Math.round(c.y) + dy, Math.round(c.z));
          if (g.blocks.has(k)) {
            g.blocks.delete(k);
            g.edits.set(k, null);
          }
        }
      }
      const aimAt = g.camera.position.clone().addScaledVector(aimDir, 3);
      const target0 = g.addMonster("sleepy", {
        x: aimAt.x,
        y: aimAt.y - 0.8,
        z: aimAt.z,
      });
      target0.hp = 3;
      target0.cooldown = 99;
      build();
      for (let i = 0; i < 40; i++) g.frame(g.last + 16);
      check(
        "the bow shoots arrows at monsters",
        !g.monsters.includes(target0) && g.inventory.count("arrows") === 1,
      );
      // A shield in the hotbar takes half of a hit from the front.
      g.inventory = new Inventory();
      g.inventory.slots[4] = { id: "shield", count: 1 };
      const blow = (dz) => {
        g.vitals.health = 20;
        g.vitals.hurtCooldown = 0;
        g.hurtPlayer(4, { x: g.player.x, z: g.player.z + dz });
        return 20 - g.vitals.health;
      };
      g.yaw = 0;
      const front = blow(-2),
        back = blow(2);
      check(
        "a shield stops half of a hit from the front",
        front > 0 && front < back && g.inventory.slots[4]?.wear === 1,
      );
      // The compass says how far home is and which way.
      hold("compass");
      build();
      check(
        "the compass says where home is",
        /🧭|🏠/.test(g.toastEl.textContent),
      );
      // A happy note the first time a torch goes up, once only.
      delete g.progress.firsts["place:torch"];
      g.emit("place:torch");
      check(
        "the first torch gets a happy note",
        g.toastEl.textContent === g.t("firstTorch") &&
          g.progress.firsts["place:torch"] === 1,
      );
      // A quiet save every minute keeps where Biel is.
      g.player.x += 0.5;
      g.autosaveClock = 0.001;
      g.frame(g.last + 16);
      check(
        "the game saves by itself every minute",
        Math.abs(g.store.load(g.world.id).player.x - g.player.x) < 0.3,
      );
      // Held up (Build held down), the shield stops the whole hit.
      g.selected = 4;
      g.drawStart = performance.now();
      check("a shield held up stops the whole hit", blow(-2) === 0);
      g.drawStart = null;
      g.selected = 0;
      // "Animals only friends": on, a pig is safe; off, two hits catch it.
      const pig = g.animals.find((a) => a.type === "pig" && !a.baby);
      if (pig) {
        Object.assign(pig, { x: g.player.x, z: g.player.z - 1.5, hits: 0 });
        const huntOptions = g.world.options;
        g.world.options = { ...huntOptions, friendsOnly: true };
        g.targetAnimal = pig;
        g.targetMonster = null;
        g.attackCooldown = 0;
        g.attack();
        check("with 'Animals only friends' a pig is never hurt", !pig.hits);
        g.world.options = { ...huntOptions, friendsOnly: false };
        for (let i = 0; i < 2; i++) {
          g.targetAnimal = pig;
          g.attackCooldown = 0;
          g.attack();
        }
        check(
          "without it, two hits turn a pig into food",
          !g.animals.includes(pig) && g.inventory.count("pork") === 2,
        );
        g.world.options = huntOptions;
        g.inventory.remove("pork", 2);
      }
      // The world list shows a small picture of each world.
      g.snapThumb();
      check(
        "pausing keeps a picture of the world",
        g.store.thumb(g.world.id)?.startsWith("data:image/jpeg"),
      );
      // Backpack: tapping one stack and then the same item joins them;
      // a picked stack can be split in half.
      g.inventory = new Inventory();
      g.inventory.slots[0] = { id: "dirt", count: 10 };
      g.inventory.slots[1] = { id: "dirt", count: 5 };
      g.action("inventory");
      g.app.querySelector('[data-inv="1"]').click();
      g.app.querySelector('[data-inv="0"]').click();
      check(
        "the backpack joins stacks of the same item",
        g.inventory.slots[0].count === 15 && !g.inventory.slots[1],
      );
      g.app.querySelector('[data-inv="0"]').click();
      g.app.querySelector('[data-action="split"]').click();
      check(
        "the backpack splits a stack in half",
        g.inventory.slots[0].count === 8 && g.inventory.slots[1]?.count === 7,
      );
      g.action("back");
      // "Icons instead of words" puts pictures on the game buttons.
      g.settings.icons = true;
      g.render();
      const jumpButton = g.app.querySelector('[data-key="jump"]');
      check(
        "icons replace the words on the game buttons",
        jumpButton.querySelector(".icon-word") &&
          jumpButton.getAttribute("aria-label") === g.t("jump"),
      );
      g.settings.icons = false;
      g.render();
      g.firstPerson = false;
      g.vitals.health = 6;
      hold("golden_apple");
      build();
      check("a golden apple heals", g.vitals.health === 16);
      g.inventory.add("bone", 1);
      const treatsBefore = g.inventory.count("treat");
      g.action("craft", "treat_bone");
      check(
        "bones make dog treats",
        g.inventory.count("treat") === treatsBefore + 3,
      );
      check(
        "there are tips for the intro",
        strings.pt.tips.length >= 5 &&
          strings.en.tips.length === strings.pt.tips.length,
      );

      const beforePeacefulLoad = g.saveData();
      const peacefulImport = validateWorld({
        ...beforePeacefulLoad,
        options: {
          ...beforePeacefulLoad.options,
          difficulty: "peaceful",
          monsters: true,
        },
        monsters: [{ type: "sleepy", x: 0, y: 3, z: 0, hp: 4 }],
      });
      g.loadWorld(peacefulImport);
      check(
        "loading a peaceful save never restores a saved monster",
        g.monsters.length === 0,
      );
      g.loadWorld(beforePeacefulLoad);

      // A full backpack must not discard the previous furnace ingredient.
      const savedInventory = g.inventory;
      g.inventory = new Inventory();
      for (let i = 0; i < 36; i++)
        g.inventory.slots[i] = { id: "stone", count: 64 };
      g.inventory.slots[0] = { id: "potato", count: 4 };
      const swapFurnaceKey = "0,1,0";
      g.container = { type: FURNACE, key: swapFurnaceKey };
      g.world.furnaces[swapFurnaceKey] = {
        ...emptyFurnace(),
        input: ["iron_ore", 7],
        progress: 0.8,
      };
      g.moveStack("bag", 0);
      check(
        "swapping furnace ingredients keeps items in a full backpack",
        g.inventory.slots[0].id === "iron_ore" &&
          g.inventory.slots[0].count === 7 &&
          g.world.furnaces[swapFurnaceKey].input[0] === "potato" &&
          g.world.furnaces[swapFurnaceKey].progress === 0,
      );
      delete g.world.furnaces[swapFurnaceKey];
      g.inventory = savedInventory;
      g.container = null;

      // iCloud sync, with a pretend iCloud (the test app has no iCloud capability).
      const realCloud = g.cloud.call;
      check(
        "without iCloud the switch explains why",
        await (async () => {
          g.settings.cloud = true;
          await g.cloud.sync();
          return g.cloud.status === "missing" || !g.cloudBridge;
        })(),
      );
      const fakeCloud = new Map();
      g.cloud.call = async (action, extra = {}) => {
        if (action === "status") return { available: true };
        if (action === "list") return [...fakeCloud.values()];
        if (action === "save") {
          // Like CloudBridge.swift: refuse when the file changed since listing.
          const current = fakeCloud.has(extra.worldId)
            ? JSON.parse(fakeCloud.get(extra.worldId)).updatedAt
            : null;
          if ("expected" in extra && current !== extra.expected)
            return { ok: false, changed: true };
          fakeCloud.set(extra.worldId, extra.json);
          return { ok: true };
        }
        return null;
      };
      for (const w of g.store.list().slice(3)) g.store.remove(w.id);
      g.mode = "menu";
      await g.cloud.sync();
      check("worlds go up to iCloud", fakeCloud.size === g.store.list().length);
      const fromIpad = newWorld({
        id: "fromipad",
        name: "Do iPad",
        mode: "creative",
        options: {},
      });
      fromIpad.device = "iPad";
      fakeCloud.set(fromIpad.id, JSON.stringify(fromIpad));
      await g.cloud.sync();
      check(
        "a world made on the iPad comes down",
        g.store.load("fromipad")?.name === "Do iPad",
      );
      const changedHere = g.store.load("fromipad");
      changedHere.updatedAt += 1000;
      g.store.save(changedHere);
      const changedThere = JSON.parse(fakeCloud.get("fromipad"));
      changedThere.updatedAt += 2000;
      changedThere.name = "Do iPad (mudado)";
      fakeCloud.set("fromipad", JSON.stringify(changedThere));
      await g.cloud.sync();
      check(
        "changes on both devices ask which to keep",
        g.mode === "conflict" &&
          g.cloud.conflicts.length === 1 &&
          g.app.textContent.includes("Do iPad"),
      );
      await g.cloud.resolve(false);
      check(
        "keeping the other device's version",
        g.store.load("fromipad").name === "Do iPad (mudado)" &&
          g.mode === "menu",
      );
      // Deleting a world leaves a marker in iCloud for the other devices.
      g.mode = "worlds";
      g.action("deleteworld", "fromipad");
      g.action("deleteworld", "fromipad");
      await g.cloud.sync();
      check(
        "a deleted world leaves a marker in iCloud",
        JSON.parse(fakeCloud.get("fromipad") ?? "{}").deleted === true &&
          !g.store.load("fromipad"),
      );
      g.mode = "menu";
      let unexpectedUploads = 0;
      g.cloud.call = async (action) => {
        if (action === "save") unexpectedUploads++;
        return action === "status" ? { available: true } : null;
      };
      await g.cloud.sync();
      check(
        "an unavailable cloud listing never uploads local worlds",
        unexpectedUploads === 0,
      );
      g.cloud.call = realCloud;
      g.settings.cloud = false;
      if (!g.world) g.loadWorld(g.store.load(g.store.list()[0].id));

      g.action("home");
      g.frame(g.last + 16);
      return { ok: true, checks, triangles: g.renderer.info.render.triangles };
    };
}
