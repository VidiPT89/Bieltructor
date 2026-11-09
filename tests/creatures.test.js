import test from "node:test";
import assert from "node:assert/strict";
import { initialAnimals, interact, validateAnimals } from "../src/creatures.js";
import { height } from "../src/world.js";

test("every new world starts with the same friendly animals on dry land", () => {
  const a = initialAnimals(),
    b = initialAnimals();
  assert.deepEqual(a, b);
  assert.equal(a.length, 19);
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
  assert.equal(interact(dog, "apple", 0).result, "wants");
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

test("feeding two animals the right food gives a baby that grows up", async () => {
  const { findCouples, makeBaby, BABY_SECONDS } =
    await import("../src/creatures.js");
  const cows = initialAnimals()
    .filter((x) => x.type === "cow")
    .slice(0, 2);
  cows[1].x = cows[0].x + 1;
  cows[1].z = cows[0].z;
  assert.deepEqual(interact(cows[0], "wheat", 10), {
    result: "love",
    use: "wheat",
  });
  assert.equal(findCouples(cows, 11).length, 0, "it takes two");
  interact(cows[1], "wheat", 12);
  const pairs = findCouples(cows, 13);
  assert.equal(pairs.length, 1);
  const baby = makeBaby(...pairs[0], 13);
  assert(baby.baby && baby.grownAt === 13 + BABY_SECONDS);
  assert.equal(
    interact(cows[0], "wheat", 20).result,
    "notReady",
    "parents rest",
  );
  assert.equal(interact(baby, null, 20).result, "baby");
});

test("cats like fish, horses need apples and can be ridden", () => {
  const all = initialAnimals();
  const cat = all.find((x) => x.type === "cat"),
    horse = all.find((x) => x.type === "horse");
  assert.equal(interact(cat, "treat", 0).result, "wants");
  assert.equal(interact(cat, "fish", 0).result, "tamed");
  assert.equal(interact(horse, "apple", 0, 0.9).result, "tryAgain");
  assert(!horse.tamed);
  assert.equal(interact(horse, "apple", 0, 0.1).result, "tamed");
  assert.equal(interact(horse, null, 0).result, "mount");
  const pig = all.find((x) => x.type === "pig");
  assert.equal(interact(pig, null, 0).result, "happy");
});

test("on an island, animals start in the biomes they like", async () => {
  const { useTerrain, biomeAt } = await import("../src/world.js");
  const { HOMES } = await import("../src/creatures.js");
  useTerrain({ seed: 4, size: "medium", gen: 3 });
  try {
    const animals = initialAnimals(4);
    const athome = animals.filter((a) =>
      HOMES[a.type].includes(biomeAt(a.x, a.z)),
    ).length;
    assert(athome >= animals.length * 0.8, `${athome}/${animals.length}`);
  } finally {
    useTerrain();
  }
});
