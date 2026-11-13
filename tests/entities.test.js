import test from "node:test";
import assert from "node:assert/strict";
import { step, settle } from "../src/entities.js";

const flat = () => 3;

test("a step moves along the yaw, and only where it is allowed", () => {
  const cow = { x: 0, y: 3, z: 0 };
  assert(step(cow, Math.PI / 2, 2, 0.05, flat, () => true));
  assert(Math.abs(cow.x - 0.1) < 1e-12 && Math.abs(cow.z) < 1e-12);
  let asked = null;
  const moved = step(cow, 0, 2, 0.05, flat, (x, z, ground) => {
    asked = { x, z, ground };
    return false;
  });
  assert(!moved);
  assert.deepEqual(asked, { x: cow.x, z: 0.1, ground: 3 });
  assert(Math.abs(cow.z) < 1e-12, "a refused step changes nothing");
});

test("an entity climbs a step at once and falls at six blocks a second", () => {
  const sheep = { x: 0, y: 3, z: 0 };
  settle(sheep, 0.05, () => 4);
  assert.equal(sheep.y, 4);
  settle(sheep, 0.05, () => 1);
  assert(Math.abs(sheep.y - 3.7) < 1e-12);
  for (let i = 0; i < 20; i++) settle(sheep, 0.05, () => 1);
  assert.equal(sheep.y, 1, "it stops on the ground");
});

test("the ground is looked for from the entity's own height", () => {
  const seen = [];
  const ghost = { x: 2, y: 9, z: 5 };
  settle(ghost, 0.05, (x, z, from) => (seen.push([x, z, from]), 9));
  step(
    ghost,
    0,
    1,
    1,
    (x, z, from) => (seen.push([x, z, from]), 9),
    () => true,
  );
  assert.deepEqual(seen, [
    [2, 5, 9],
    [2, 6, 9],
  ]);
});
