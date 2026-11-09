import test from "node:test";
import assert from "node:assert/strict";
import { flowLava, quench, around } from "../src/water.js";
import {
  makeTerrain,
  LAVA,
  LAVA_FLOW,
  WATER,
  RED_SAND,
  FLOWERS,
  key,
  isLava,
  passable,
} from "../src/world.js";
import { LIGHT_SOURCES } from "../src/lighting.js";

const STONE = 2;
const count = (blocks, test) => [...blocks.values()].filter(test).length;

test("generation 3 hides lava deep in the caves, never near the start", () => {
  let found = null;
  for (let seed = 1; seed <= 10 && !found; seed++) {
    const blocks = makeTerrain(seed, 48, 3).generate();
    if (count(blocks, (t) => t === LAVA)) found = { seed, blocks };
  }
  assert(found, "some seed has lava");
  for (const [k, t] of found.blocks)
    if (t === LAVA) {
      const [x, y, z] = k.split(",").map(Number);
      assert(y <= 3, "only deep down");
      assert(Math.hypot(x, z) >= 12, "away from the start");
    }
  const older = makeTerrain(found.seed, 48, 2).generate();
  assert.equal(count(older, isLava), 0, "generation 2 worlds stay the same");
  assert.equal(
    count(older, (t) => t === RED_SAND),
    0,
  );
});

test("generation 3 deserts have red sand and meadows have four flowers", () => {
  const kinds = new Set();
  let red = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const blocks = makeTerrain(seed, 64, 3).generate();
    red += count(blocks, (t) => t === RED_SAND);
    for (const t of blocks.values()) if (FLOWERS.includes(t)) kinds.add(t);
  }
  assert(red > 0, "some red sand");
  assert.equal(kinds.size, 4);
});

// A stone floor at y = 0; returns a tiny world for lava to flow in.
function cave() {
  const blocks = new Map();
  for (let x = -6; x <= 6; x++)
    for (let z = -6; z <= 6; z++) blocks.set(key(x, 0, z), STONE);
  const typeAt = (x, y, z) => blocks.get(key(x, y, z));
  const inside = (x, y, z) => Math.abs(x) <= 6 && Math.abs(z) <= 6 && y >= 1;
  const settle = (start) => {
    let dirty = new Set(start);
    for (let i = 0; i < 50 && dirty.size; i++) {
      const { changes, dirty: next } = flowLava(dirty, typeAt, inside);
      for (const [x, y, z, t] of changes)
        if (t === null) blocks.delete(key(x, y, z));
        else blocks.set(key(x, y, z), t);
      dirty = next;
      if (!changes.length) break;
    }
  };
  return { blocks, typeAt, settle };
}

test("lava flows only one block from its source, and falls", () => {
  const c = cave();
  c.blocks.set(key(0, 1, 0), LAVA);
  c.settle(around([0, 1, 0]));
  assert.equal(c.typeAt(1, 1, 0), LAVA_FLOW);
  assert.equal(c.typeAt(2, 1, 0), undefined, "no further");
  c.blocks.set(key(4, 3, 4), LAVA);
  c.blocks.set(key(4, 2, 4), STONE);
  c.settle(around([4, 3, 4]));
  assert.equal(c.typeAt(5, 2, 4), LAVA_FLOW, "falls off the edge");
  c.blocks.delete(key(0, 1, 0));
  c.settle(around([0, 1, 0]));
  assert.equal(c.typeAt(1, 1, 0), undefined, "dries up without its source");
});

test("water touching lava turns it into stone", () => {
  const blocks = new Map([
    [key(0, 1, 0), LAVA],
    [key(1, 1, 0), WATER],
    [key(5, 1, 5), LAVA_FLOW],
    [key(5, 2, 5), WATER],
    [key(9, 1, 9), LAVA],
  ]);
  const typeAt = (x, y, z) => blocks.get(key(x, y, z));
  const changes = quench(
    [...around([0, 1, 0]), ...around([5, 1, 5]), ...around([9, 1, 9])],
    typeAt,
  );
  assert.deepEqual(
    changes.map((c) => c.join()).sort(),
    ["0,1,0,2", "5,1,5,2"].sort(),
  );
});

test("lava glows, and Biel can wade through it", () => {
  assert(LIGHT_SOURCES[LAVA] >= 14);
  assert(passable(LAVA) && passable(LAVA_FLOW));
});
