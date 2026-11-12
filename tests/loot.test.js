import test from "node:test";
import assert from "node:assert/strict";
import { Inventory } from "../src/inventory.js";
import { collectRewards, MAX_GROUND_BAGS } from "../src/loot.js";
import { newWorld, validateWorld } from "../src/worlds.js";

const here = { x: 1, y: 10, z: 2 };
const full = () => {
  const inv = new Inventory();
  for (let i = 0; i < inv.size; i++) inv.add("wooden_sword");
  return inv;
};
const count = (bags, id) =>
  bags.reduce((n, b) => n + Inventory.from(b.items).count(id), 0);

test("rewards fill partial stacks and keep every excess item on the ground", () => {
  const inv = full(),
    bags = [];
  inv.slots[1] = { id: "pork", count: 63 };
  assert.deepEqual(
    collectRewards(
      inv,
      bags,
      [
        ["pork", 2],
        ["fish", 1],
      ],
      here,
    ),
    { ok: true, dropped: 2 },
  );
  assert.equal(inv.count("pork"), 64);
  assert.equal(count(bags, "pork"), 1);
  assert.equal(count(bags, "fish"), 1);
  assert.equal(bags.length, 1);
  const room = new Inventory();
  assert(room.collect(bags[0].items.filter(Boolean)));
  assert.equal(room.count("pork"), 1);
  assert.equal(room.count("fish"), 1);
});

test("nearby ground bags merge but distant bags do not teleport rewards", () => {
  const inv = full(),
    bags = [];
  collectRewards(inv, bags, [["bone", 2]], here);
  collectRewards(inv, bags, [["bone", 2]], { ...here, x: 2 });
  assert.equal(bags.length, 1);
  assert.equal(count(bags, "bone"), 4);
  collectRewards(inv, bags, [["bone", 1]], { ...here, x: 20 });
  assert.equal(bags.length, 2);
  assert.equal(bags[1].x, 20);
});

test("ground capacity failure rolls back partial backpack and ground additions", () => {
  const inv = full();
  inv.slots[1] = { id: "bone", count: 63 };
  const bags = Array.from({ length: MAX_GROUND_BAGS }, () => ({
    ...here,
    items: full().toJSON(),
  }));
  const before = JSON.stringify({ inventory: inv.toJSON(), bags });
  assert.deepEqual(collectRewards(inv, bags, [["bone", 2]], here), {
    ok: false,
    dropped: 0,
  });
  assert.equal(JSON.stringify({ inventory: inv.toJSON(), bags }), before);
  // A full ground does not block rewards that fit in the backpack.
  assert(collectRewards(inv, bags, [["bone", 1]], here).ok);
  assert.equal(inv.count("bone"), 64);
});

test("overflow and lost backpacks retain worn tools across a saved-world round trip", () => {
  const world = newWorld({ id: "loot", name: "Loot", mode: "adventure" });
  for (let i = 0; i < 12; i++) {
    const position = { x: i * 4 - 24, y: 10, z: 0 };
    assert(
      collectRewards(
        new Inventory(0),
        world.backpacks,
        [["iron_sword", 1, 42]],
        position,
      ).ok,
    );
  }
  const restored = validateWorld(JSON.parse(JSON.stringify(world)));
  assert.equal(
    restored.backpacks.length,
    12,
    "do not silently truncate after ten bags",
  );
  assert(
    restored.backpacks.every(
      (bag) => Inventory.from(bag.items).slots[0].wear === 42,
    ),
  );
});

test("oversized imported ground inventory is rejected rather than silently truncated", () => {
  const world = newWorld({ id: "oversized" });
  world.backpacks = Array.from({ length: MAX_GROUND_BAGS + 1 }, () => ({
    ...here,
    items: [["fish", 1]],
  }));
  assert.equal(validateWorld(world), null);
});

test("a reward that fits creates no ground bag and preserves existing bag identity", () => {
  const inv = new Inventory(),
    bag = { ...here, items: [["fish", 1]] },
    bags = [bag];
  assert.deepEqual(collectRewards(inv, bags, [["bone", 2]], here), {
    ok: true,
    dropped: 0,
  });
  assert.equal(bags[0], bag);
  assert.equal(inv.count("bone"), 2);
});
