// The block table (src/blocks.js) against what saved worlds rely on.
import test from "node:test";
import assert from "node:assert/strict";
import { BLOCKS, blockNumber, blockId, blockOf } from "../src/blocks.js";
import { passable, seeThrough, TYPES } from "../src/world.js";
import { LIGHT_SOURCES } from "../src/lighting.js";
import { ITEMS } from "../src/items.js";

// Saved worlds store these numbers. New blocks go at the end of this list
// and of BLOCKS; nothing here is ever moved or removed.
const SAVED_NUMBERS = [
  "grass",
  "dirt",
  "stone",
  "sand",
  "wood",
  "leaves",
  "brick",
  "amber",
  "glass",
  "door",
  "door_open",
  "planks",
  "bench",
  "torch",
  "bed",
  "coal_ore",
  "wool",
  "farmland",
  "wheat_0",
  "wheat_1",
  "wheat_2",
  "wheat_3",
  "carrot_0",
  "carrot_1",
  "carrot_2",
  "carrot_3",
  "potato_0",
  "potato_1",
  "potato_2",
  "potato_3",
  "snow",
  "ice",
  "cactus",
  "iron_ore",
  "gold_ore",
  "crystal_ore",
  "glowstone",
  "flower",
  "tall_grass",
  "mushroom",
  "chest",
  "furnace",
  "stone_brick",
  "ladder",
  "fence",
  "gate",
  "gate_open",
  "trapdoor",
  "trapdoor_open",
  "sign",
  "pot",
  "wool_red",
  "wool_orange",
  "wool_yellow",
  "wool_green",
  "wool_blue",
  "wool_purple",
  "wool_black",
  "water",
  "water_flow_3",
  "water_flow_2",
  "water_flow_1",
  "copper_ore",
  "copper_block",
  "bee_nest",
  "lava",
  "lava_flow",
  "campfire",
  "campfire_out",
  "red_sand",
  "iron_block",
  "gold_block",
  "lantern",
  "blue_flower",
  "white_flower",
  "yellow_flower",
  "bed_orange",
  "bed_yellow",
  "bed_green",
  "bed_blue",
  "bed_purple",
  "bed_black",
  "cobblestone",
];
// How the blocks behaved before the table existed.
const WALK_THROUGH = [
  "door_open",
  "torch",
  "wheat_0",
  "wheat_1",
  "wheat_2",
  "wheat_3",
  "carrot_0",
  "carrot_1",
  "carrot_2",
  "carrot_3",
  "potato_0",
  "potato_1",
  "potato_2",
  "potato_3",
  "flower",
  "tall_grass",
  "mushroom",
  "ladder",
  "gate_open",
  "trapdoor_open",
  "sign",
  "pot",
  "water",
  "water_flow_3",
  "water_flow_2",
  "water_flow_1",
  "lava",
  "lava_flow",
  "lantern",
  "blue_flower",
  "white_flower",
  "yellow_flower",
];
const LIGHT_PASSES = [
  "glass",
  "door_open",
  "torch",
  "bed",
  "wheat_0",
  "wheat_1",
  "wheat_2",
  "wheat_3",
  "carrot_0",
  "carrot_1",
  "carrot_2",
  "carrot_3",
  "potato_0",
  "potato_1",
  "potato_2",
  "potato_3",
  "ice",
  "flower",
  "tall_grass",
  "mushroom",
  "ladder",
  "fence",
  "gate",
  "gate_open",
  "trapdoor",
  "trapdoor_open",
  "sign",
  "pot",
  "water",
  "water_flow_3",
  "water_flow_2",
  "water_flow_1",
  "lava_flow",
  "campfire",
  "campfire_out",
  "lantern",
  "blue_flower",
  "white_flower",
  "yellow_flower",
  "bed_orange",
  "bed_yellow",
  "bed_green",
  "bed_blue",
  "bed_purple",
  "bed_black",
];
const GIVES_LIGHT = {
  amber: 15,
  torch: 14,
  glowstone: 15,
  furnace: 12,
  lava: 15,
  lava_flow: 13,
  campfire: 15,
  lantern: 15,
};

test("every saved block number still means the same block", () => {
  assert.deepEqual(
    BLOCKS.map((block) => block.id),
    SAVED_NUMBERS,
  );
  assert.equal(TYPES, SAVED_NUMBERS.length);
  SAVED_NUMBERS.forEach((id, number) => {
    assert.equal(blockNumber(id), number);
    assert.equal(blockId(number), id);
    assert.equal(blockOf(number), BLOCKS[number]);
  });
  assert.equal(blockId(TYPES), undefined);
  assert.throws(() => blockNumber("no_such_block"), /unknown block/);
});

test("walking through, letting light pass and glowing match the old rules", () => {
  const where = (rule) =>
    BLOCKS.filter((_, number) => rule(number)).map((block) => block.id);
  assert.deepEqual(where(passable), WALK_THROUGH);
  assert.deepEqual(where(seeThrough), LIGHT_PASSES);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(LIGHT_SOURCES).map(([number, light]) => [
        blockId(Number(number)),
        light,
      ]),
    ),
    GIVES_LIGHT,
  );
  // Air and unknown numbers are neither.
  for (const type of [undefined, null, -1, TYPES, "stone"])
    assert(!passable(type) && !seeThrough(type));
});

test("every entry of the block table is well formed", () => {
  const known = ["id", "color", "light", "passable", "clear", "boxes", "cross"];
  const seen = new Set();
  for (const block of BLOCKS) {
    assert.match(block.id, /^[a-z][a-z0-9_]*$/);
    assert(!seen.has(block.id), `${block.id} appears twice`);
    seen.add(block.id);
    for (const field of Object.keys(block))
      assert(known.includes(field), `${block.id}: unknown field ${field}`);
    assert(
      Number.isInteger(block.color) &&
        block.color >= 0 &&
        block.color <= 0xffffff,
      `${block.id}: colour`,
    );
    if ("light" in block)
      assert(
        Number.isInteger(block.light) && block.light >= 1 && block.light <= 15,
        `${block.id}: light`,
      );
    assert(!(block.boxes && block.cross), `${block.id}: two shapes`);
    if (block.cross)
      assert(block.cross > 0 && block.cross <= 1, `${block.id}: cross`);
    for (const box of block.boxes ?? []) {
      assert(
        box.length === 6 && box.every(Number.isFinite),
        `${block.id}: box`,
      );
      // No part reaches outside its own block (gate posts overlap the
      // neighbour by a hair, and an open gate swings out on purpose).
      for (let axis = 0; axis < 3; axis++)
        assert(
          Math.abs(box[axis + 3]) + box[axis] / 2 <= 0.52 ||
            block.id === "gate_open",
          `${block.id}: box outside the block`,
        );
    }
  }
});

test("an item with the name of a block places that block", () => {
  for (const [id, item] of Object.entries(ITEMS)) {
    if (item.block === undefined) continue;
    assert(blockOf(item.block), `${id} places an unknown block`);
    if (BLOCKS.some((block) => block.id === id))
      assert.equal(item.block, blockNumber(id), `${id} places another block`);
  }
});
