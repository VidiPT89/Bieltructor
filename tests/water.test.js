import test from "node:test";
import assert from "node:assert/strict";
import { flowWater, around } from "../src/water.js";
import { WATER, waterLevel } from "../src/world.js";

const STONE = 2;
// A stone floor at y = 0 from -8 to 8; returns a tiny world to flow in.
function pool() {
  const blocks = new Map();
  for (let x = -8; x <= 8; x++)
    for (let z = -8; z <= 8; z++) blocks.set(`${x},0,${z}`, STONE);
  const typeAt = (x, y, z) => blocks.get(`${x},${y},${z}`);
  const inside = (x, y, z) => Math.abs(x) <= 8 && Math.abs(z) <= 8 && y >= 1;
  // Runs the water until nothing changes any more.
  const settle = (start) => {
    let dirty = new Set(start);
    for (let i = 0; i < 200 && dirty.size; i++) {
      const { changes, dirty: next } = flowWater(dirty, typeAt, inside);
      for (const [x, y, z, t] of changes)
        if (t === null) blocks.delete(`${x},${y},${z}`);
        else blocks.set(`${x},${y},${z}`, t);
      dirty = next;
      if (!changes.length) break;
    }
  };
  return { blocks, typeAt, settle };
}
const level = (w, x, y, z) => waterLevel(w.typeAt(x, y, z));

test("a source on the ground spreads three steps, getting shallower", () => {
  const w = pool();
  w.blocks.set("0,1,0", WATER);
  w.settle(around([0, 1, 0]));
  assert.equal(level(w, 0, 1, 0), 4);
  assert.equal(level(w, 1, 1, 0), 3);
  assert.equal(level(w, 2, 1, 0), 2);
  assert.equal(level(w, 3, 1, 0), 1);
  assert.equal(level(w, 4, 1, 0), 0);
  assert.equal(level(w, 1, 1, 1), 2);
});

test("water falls down before spreading, and stops at walls", () => {
  const w = pool();
  w.blocks.set("0,4,0", STONE);
  w.blocks.set("0,5,0", WATER);
  w.blocks.set("2,1,0", STONE);
  w.settle(around([0, 5, 0]));
  assert.equal(level(w, 1, 5, 0), 3, "spreads on top of its stone");
  assert.equal(level(w, 1, 4, 0), 3, "then falls");
  assert.equal(level(w, 1, 1, 0), 3, "all the way down");
  assert.equal(level(w, 2, 1, 0), 0, "the stone stays");
  assert.equal(w.typeAt(2, 1, 0), STONE);
});

test("taking the source away makes the flowing water dry up", () => {
  const w = pool();
  w.blocks.set("0,1,0", WATER);
  w.settle(around([0, 1, 0]));
  w.blocks.delete("0,1,0");
  w.settle(around([0, 1, 0]));
  for (let x = -4; x <= 4; x++)
    for (let z = -4; z <= 4; z++)
      assert.equal(level(w, x, 1, z), 0, `${x},${z}`);
});

test("a big flood is spread over several steps", () => {
  const w = pool();
  const { changes, dirty } = flowWater(
    new Set(Array.from({ length: 100 }, (_, i) => `${i},1,0`)),
    w.typeAt,
    () => true,
    10,
  );
  assert.equal(changes.length, 0);
  assert(dirty.size >= 90, "unvisited cells wait for the next step");
});
