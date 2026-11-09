import test from "node:test";
import assert from "node:assert/strict";
import {
  useTerrain,
  generate,
  height,
  biomeAt,
  findSpawn,
  inWater,
  key,
  SIZES,
} from "../src/world.js";
import * as W from "../src/world.js";

test("worlds without a seed keep the original valley", () => {
  const before = generate();
  useTerrain({ seed: 1234, size: "small" });
  useTerrain({});
  assert.equal(W.SIZE, 28);
  assert.equal(W.WATER_LEVEL, 2.2);
  assert.deepEqual(generate(), before);
});

test("a seed always makes the same island with several biomes", () => {
  useTerrain({ seed: 42, size: "small" });
  const a = generate(),
    b = generate();
  assert.equal(a.size, b.size);
  assert.equal(W.SIZE, SIZES.small);
  assert(W.WATER_LEVEL > 10);
  const biomes = new Set();
  for (let x = -26; x <= 26; x += 2)
    for (let z = -26; z <= 26; z += 2) biomes.add(biomeAt(x, z));
  assert(biomes.size >= 3, [...biomes].join());
  for (let x = -28; x <= 28; x++)
    for (let z = -28; z <= 28; z++)
      assert(a.has(key(x, 0, z)), "protected floor");
  useTerrain({ seed: 43, size: "small" });
  assert.notDeepEqual(
    [...generate().keys()].slice(0, 500),
    [...a.keys()].slice(0, 500),
  );
  useTerrain({});
});

test("caves exist underground and stay dry", () => {
  useTerrain({ seed: 7, size: "medium" });
  const blocks = generate();
  let holes = 0;
  for (let x = -40; x <= 40; x += 2)
    for (let z = -40; z <= 40; z += 2)
      for (let y = 2; y < height(x, z) - 5; y++)
        if (!blocks.has(key(x, y, z))) holes++;
  assert(holes > 50, `found ${holes} cave spaces`);
  const [sx, sz] = findSpawn();
  assert(height(sx, sz) > W.WATER_LEVEL);
  const deep = [...Array(40)]
    .map((_, i) => i)
    .find((y) => !blocks.has(key(sx, y + 2, sz)) && y + 2 < W.WATER_LEVEL - 1);
  if (deep !== undefined)
    assert(!inWater(blocks, sx, deep + 2, sz), "a cave under land is dry");
  useTerrain({});
});
