import test from "node:test";
import assert from "node:assert/strict";
import { LightMap, brightness, MAX_LIGHT } from "../src/lighting.js";

const STONE = 2,
  TORCH = 13;
// A tiny world: a stone floor at y = 0, plus whatever a test adds.
function world(extra = {}) {
  const blocks = new Map();
  for (let x = -6; x <= 6; x++)
    for (let z = -6; z <= 6; z++) blocks.set(`${x},0,${z}`, STONE);
  for (const [k, v] of Object.entries(extra)) blocks.set(k, v);
  const map = new LightMap({
    size: 6,
    maxY: 10,
    typeAt: (x, y, z) => blocks.get(`${x},${y},${z}`),
    opaque: (t) => t === STONE,
  });
  return { blocks, map };
}
// A closed stone room from x,z = -2..2 and y = 1..4, with a hollow inside.
function room() {
  const extra = {};
  for (let x = -2; x <= 2; x++)
    for (let z = -2; z <= 2; z++)
      for (let y = 1; y <= 4; y++)
        if (Math.abs(x) === 2 || Math.abs(z) === 2 || y === 4)
          extra[`${x},${y},${z}`] = STONE;
  return extra;
}

test("open sky is fully lit; a closed room is dark", () => {
  const { map } = world(room());
  map.relightAll();
  assert.equal(map.level(5, 1, 5), MAX_LIGHT);
  assert.equal(map.level(0, 2, 0), 0);
});

test("a torch lights its surroundings, one level less per step", () => {
  const { blocks, map } = world({ ...room(), "0,1,0": TORCH });
  map.relightAll();
  assert.equal(map.level(0, 1, 0), 14);
  assert.equal(map.level(1, 1, 0), 13);
  assert.equal(map.level(1, 2, 1), 11);
  blocks.delete("0,1,0");
  map.relight(-3, 3, -3, 3);
  assert.equal(map.level(1, 1, 0), 0, "removing the torch makes it dark again");
});

test("sky light slips sideways into an opening and fades", () => {
  const extra = room();
  delete extra["2,1,0"];
  delete extra["2,2,0"];
  const { map } = world(extra);
  map.relightAll();
  const doorway = map.level(2, 1, 0),
    inside = map.level(0, 1, 0);
  assert(
    doorway >= 13 && inside < doorway && inside > 0,
    `${doorway} ${inside}`,
  );
});

test("night dims the sky but not the torches; faces are never pitch black", () => {
  const { map } = world({ "4,1,4": TORCH });
  map.relightAll();
  assert(map.level(-5, 1, -5, 0.4) < 8);
  assert.equal(map.level(4, 1, 4, 0.4), 14);
  assert(brightness(0) >= 0.2 && brightness(MAX_LIGHT) === 1);
});
