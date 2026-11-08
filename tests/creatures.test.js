import test from "node:test";
import assert from "node:assert/strict";
import { initialAnimals, interact, validateAnimals } from "../src/creatures.js";
import { height } from "../src/world.js";

test("every new world starts with the same friendly animals on dry land", () => {
  const a = initialAnimals(),
    b = initialAnimals();
  assert.deepEqual(a, b);
  assert.equal(a.length, 11);
  assert.equal(a.filter((x) => x.type === "dog").length, 1);
  assert(a.every((x) => height(x.x, x.z) > 2));
});

test("animals give their product and need time before giving again", () => {
  const [cow] = initialAnimals().filter((x) => x.type === "cow");
  assert.deepEqual(interact(cow, null, 10), {
    result: "gave",
    give: ["milk", 1],
  });
  assert.equal(interact(cow, null, 50).result, "notReady");
  assert.equal(interact(cow, null, 131).result, "gave");
  const [sheep] = initialAnimals().filter((x) => x.type === "sheep");
  assert.deepEqual(interact(sheep, null, 0).give, ["wool", 2]);
});

test("the dog becomes a friend with a treat, then sits and follows", () => {
  const [dog] = initialAnimals().filter((x) => x.type === "dog");
  assert.equal(interact(dog, "apple", 0).result, "wantsTreat");
  assert.deepEqual(interact(dog, "treat", 0), {
    result: "tamed",
    use: "treat",
  });
  assert.equal(interact(dog, null, 0).result, "sit");
  assert.equal(interact(dog, null, 0).result, "follow");
});

test("saved animals are cleaned up", () => {
  const out = validateAnimals([
    { type: "cow", x: 1, y: 3, z: 1 },
    { type: "dragon", x: 1, y: 3, z: 1 },
    { type: "chicken", x: 999, y: 3, z: 1 },
    { type: "sheep", x: 2, y: 3, z: 2, tamed: true },
  ]);
  assert.deepEqual(
    out.map((a) => a.type),
    ["cow", "sheep"],
  );
  assert.equal(out[1].tamed, false, "only dogs can be tamed");
});
