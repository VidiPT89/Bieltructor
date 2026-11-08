import test from "node:test";
import assert from "node:assert/strict";
import {
  generate,
  height,
  key,
  collides,
  validateSave,
  SIZE,
} from "../src/world.js";
test("world is deterministic with an unbroken floor and safe spawn", () => {
  const a = generate(),
    b = generate();
  assert.deepEqual(a, b);
  for (let x = -SIZE; x <= SIZE; x++)
    for (let z = -SIZE; z <= SIZE; z++) assert(a.has(key(x, 0, z)));
  assert(!collides(a, { x: 0, y: height(0, 0) + 0.51, z: 0 }));
});
test("collision checks feet, head and horizontal body edges", () => {
  const b = new Map([
    [key(0, 0, 0), 2],
    [key(1, 2, 0), 2],
  ]);
  assert(collides(b, { x: 0, y: 0, z: 0 }));
  assert(!collides(b, { x: 0, y: 0.51, z: 0 }));
  assert(collides(b, { x: 0.3, y: 0.51, z: 0 }));
});
test("save validation rejects unsupported versions and unsafe blocks", () => {
  assert.equal(validateSave({ version: 2, edits: [] }), null);
  assert.equal(validateSave({ version: 1, edits: "bad" }), null);
  assert.deepEqual(
    validateSave({
      version: 1,
      edits: [
        [0, 1, 0, 6],
        [0, 2, 0, null],
        [0, 0, 0, null],
        [999, 3, 0, 1],
        [0, 3, 0, 99],
        ["0", 2, 0, 1],
      ],
    }),
    [
      [0, 1, 0, 6],
      [0, 2, 0, null],
    ],
  );
});
