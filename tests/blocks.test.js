import test from "node:test";
import assert from "node:assert/strict";
import {
  key,
  collides,
  toggleDoor,
  validateSave,
  seeThrough,
  GLASS,
  DOOR,
  DOOR_OPEN,
} from "../src/world.js";

test("a two-block door opens and closes together, and open doors are walkable", () => {
  const b = new Map([
    [key(0, 0, 0), 2],
    [key(0, 1, 0), DOOR],
    [key(0, 2, 0), DOOR],
  ]);
  const standing = { x: 0, y: 0.51 + 0.5, z: 0 };
  assert(collides(b, standing));
  assert.deepEqual(toggleDoor(b, 0, 2, 0), [key(0, 1, 0), key(0, 2, 0)]);
  assert.equal(b.get(key(0, 1, 0)), DOOR_OPEN);
  assert(!collides(b, { x: 0, y: 1.0, z: 0 }));
  toggleDoor(b, 0, 1, 0);
  assert.equal(b.get(key(0, 2, 0)), DOOR);
  assert.deepEqual(toggleDoor(b, 0, 0, 0), []);
});

test("glass and open doors let light through, new block types survive saving", () => {
  assert(seeThrough(GLASS) && seeThrough(DOOR_OPEN) && !seeThrough(DOOR));
  assert.deepEqual(
    validateSave({
      version: 1,
      edits: [
        [0, 1, 0, GLASS],
        [0, 2, 0, DOOR_OPEN],
        [0, 3, 0, 11],
      ],
    }),
    [
      [0, 1, 0, GLASS],
      [0, 2, 0, DOOR_OPEN],
    ],
  );
});
