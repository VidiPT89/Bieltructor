import test from "node:test";
import assert from "node:assert/strict";
import { isWatered, growCrop } from "../src/farm.js";
import { cropBlock, cropInfo, passable, CROPS } from "../src/world.js";
import { drops } from "../src/items.js";
import { RECIPES } from "../src/recipes.js";

test("crops have four stages and you can walk through them", () => {
  for (const crop of CROPS)
    for (let stage = 0; stage < 4; stage++) {
      assert.deepEqual(cropInfo(cropBlock(crop, stage)), { crop, stage });
      assert(passable(cropBlock(crop, stage)));
    }
  assert.equal(cropInfo(5), null);
});

test("water nearby makes crops grow faster, and ripe crops stop growing", () => {
  const seed = cropBlock("wheat", 0);
  assert.equal(growCrop(seed, 5, true, 0.05), cropBlock("wheat", 1));
  assert.equal(growCrop(seed, 5, false, 0.05), seed, "dry soil is slower");
  assert.equal(
    growCrop(cropBlock("wheat", 3), 999, true, 0),
    cropBlock("wheat", 3),
  );
  assert(isWatered((x) => (x === 3 ? 1 : 4), 0, 0));
  assert(!isWatered(() => 4, 0, 0));
});

test("harvesting gives food and seeds back, and bread needs wheat", () => {
  assert.deepEqual(drops(cropBlock("wheat", 1), null, 0.9), [
    ["wheat_seeds", 1],
  ]);
  assert.deepEqual(drops(cropBlock("wheat", 3), null, 0.1), [
    ["wheat", 2],
    ["wheat_seeds", 2],
  ]);
  assert.deepEqual(drops(cropBlock("carrot", 3), null, 0.9), [["carrot", 2]]);
  assert.deepEqual(drops(0, null, 0.05), [
    ["dirt", 1],
    ["wheat_seeds", 1],
  ]);
  assert.deepEqual(RECIPES.find((r) => r.id === "bread").needs, { wheat: 3 });
});
