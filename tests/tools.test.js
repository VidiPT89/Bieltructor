import test from "node:test";
import assert from "node:assert/strict";
import {
  ITEMS,
  breakTime,
  drops,
  toolUses,
  TOOL_MATERIALS,
} from "../src/items.js";
import { RECIPES } from "../src/recipes.js";
import { SMELT } from "../src/smelting.js";
import { Inventory } from "../src/inventory.js";
import { interact } from "../src/creatures.js";
import { difficultyRules, newWorld, validateWorld } from "../src/worlds.js";
import {
  makeTerrain,
  COPPER_ORE,
  BEE_NEST,
  WATER,
  STONE_BRICK,
  PLANKS,
} from "../src/world.js";

test("every tool family comes in four materials, each with a recipe", () => {
  for (const tool of ["pickaxe", "sword", "axe", "shovel", "hoe"])
    for (const [i, material] of TOOL_MATERIALS.entries()) {
      const id = `${material}_${tool}`;
      assert.equal(ITEMS[id]?.tier, i + 1, id);
      assert(
        RECIPES.some((r) => r.out[0] === id),
        `recipe for ${id}`,
      );
    }
  for (const id of ["shears", "bucket", "bottle", "copper_block"])
    assert(
      RECIPES.some((r) => r.out[0] === id),
      id,
    );
  assert.equal(SMELT.copper_ore, "copper_ingot");
});

test("each tool is fast on its own blocks, and better materials are faster", () => {
  assert(breakTime(4, "stone_axe") < breakTime(4, null));
  assert(breakTime(4, "iron_axe") < breakTime(4, "wooden_axe"));
  assert(breakTime(1, "wooden_shovel") < breakTime(1, null));
  assert(breakTime(5, "shears") < breakTime(5, null));
  assert.equal(
    breakTime(2, "iron_axe"),
    breakTime(2, null),
    "an axe does not help on stone",
  );
  assert.deepEqual(drops(COPPER_ORE, "wooden_pickaxe", 0.5), [
    ["copper_ore", 1],
  ]);
  assert.deepEqual(drops(COPPER_ORE, null, 0.5), []);
  assert.deepEqual(drops(BEE_NEST, null, 0.5), [["bee_nest", 1]]);
});

test("tools wear out with a warning first; buckets never do", () => {
  const inv = new Inventory();
  inv.add("wooden_pickaxe");
  const uses = toolUses("wooden_pickaxe");
  const results = [];
  for (let i = 0; i < uses; i++) results.push(inv.wearOut(0));
  assert.equal(results.filter((r) => r === "tired").length, 1);
  assert.equal(results.at(-1), "broke");
  assert.equal(inv.slots[0], null);
  inv.add("bucket");
  assert.equal(inv.wearOut(0), null);
  assert.equal(toolUses("water_bucket"), 0);
  assert(toolUses("crystal_axe") > toolUses("iron_axe"));
});

test("wear is saved with the backpack and checked when loaded", () => {
  const inv = new Inventory();
  inv.add("stone_shovel");
  inv.wearOut(0);
  inv.wearOut(0);
  const back = Inventory.from(JSON.parse(JSON.stringify(inv)));
  assert.equal(back.slots[0].wear, 2);
  assert.equal(
    Inventory.from([["stone_shovel", 1, 9999]]).slots[0].wear,
    undefined,
  );
  assert.equal(Inventory.from([["apple", 3]]).slots[0].wear, undefined);
});

test("tools wear out only on Normal and Hard", () => {
  assert.equal(difficultyRules.peaceful.toolWear, false);
  assert.equal(difficultyRules.easy.toolWear, false);
  assert.equal(difficultyRules.normal.toolWear, true);
  assert.equal(difficultyRules.hard.toolWear, true);
});

test("shears give a sheep one more wool and wear a little", () => {
  const sheep = { type: "sheep", readyAt: 0, color: "" };
  const res = interact(sheep, "shears", 10);
  assert.equal(res.result, "shorn");
  assert.deepEqual(res.give, ["wool", 3]);
  assert.equal(interact({ type: "sheep", readyAt: 0 }, null, 10).give[1], 2);
});

test("new worlds use generation 2; older saved worlds keep generation 1", () => {
  const w = newWorld({ id: "a", seed: 5, size: "small" });
  assert.equal(w.gen, 2);
  assert.equal(
    validateWorld(JSON.parse(JSON.stringify(w)), { id: "a" }).gen,
    2,
  );
  const old = { ...JSON.parse(JSON.stringify(w)) };
  delete old.gen;
  assert.equal(validateWorld(old, { id: "a" }).gen, 1);
});

test("generation 2 adds copper, lakes, wells and bee nests; generation 1 does not", () => {
  const count = (blocks, type) =>
    [...blocks.values()].filter((t) => t === type).length;
  let found = null;
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const blocks = makeTerrain(seed, 48, 2).generate();
    if (
      count(blocks, COPPER_ORE) &&
      count(blocks, WATER) &&
      count(blocks, BEE_NEST)
    ) {
      found = { seed, blocks };
      break;
    }
  }
  assert(found, "some seed has copper, water and nests");
  const old = makeTerrain(found.seed, 48, 1).generate();
  assert.equal(
    count(old, COPPER_ORE) + count(old, WATER) + count(old, BEE_NEST),
    0,
  );
  // Wells: water with stone bricks around it and a plank roof above.
  let wells = 0;
  for (let seed = 1; seed <= 12 && !wells; seed++) {
    const blocks = makeTerrain(seed, 64, 2).generate();
    for (const [k, t] of blocks) {
      if (t !== WATER) continue;
      const [x, y, z] = k.split(",").map(Number);
      if (
        blocks.get(`${x + 1},${y},${z}`) === STONE_BRICK &&
        blocks.get(`${x},${y},${z - 1}`) === STONE_BRICK &&
        blocks.get(`${x},${y + 4},${z}`) === PLANKS
      )
        wells++;
    }
  }
  assert(wells > 0, "a well somewhere in the plains");
});
