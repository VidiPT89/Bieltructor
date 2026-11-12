import test from "node:test";
import assert from "node:assert/strict";
import { Inventory, SLOTS } from "../src/inventory.js";
import { RECIPES, canCraft, craft } from "../src/recipes.js";
import { drops, breakTime, itemForBlock, ITEMS } from "../src/items.js";
import { COAL, DOOR_OPEN, generate, key } from "../src/world.js";

const recipe = (id) => RECIPES.find((r) => r.id === id);

test("items stack to 64, tools never stack, and removing is all or nothing", () => {
  const inv = new Inventory();
  assert.equal(inv.add("dirt", 70), 0);
  assert.deepEqual(inv.slots.slice(0, 2), [
    { id: "dirt", count: 64 },
    { id: "dirt", count: 6 },
  ]);
  inv.add("wooden_pickaxe", 2);
  assert.equal(inv.slots[2].count, 1);
  assert.equal(inv.slots[3].count, 1);
  assert.equal(inv.remove("dirt", 100), false);
  assert.equal(inv.count("dirt"), 70);
  assert(inv.remove("dirt", 65));
  assert.equal(inv.count("dirt"), 5);
  assert.equal(inv.takeFrom(0) ?? inv.takeFrom(1), "dirt");
});

test("a full backpack reports what did not fit and saves cleanly", () => {
  const inv = new Inventory();
  for (let i = 0; i < SLOTS; i++) inv.add("wooden_sword");
  assert.equal(inv.add("apple", 3), 3);
  const back = Inventory.from(JSON.parse(JSON.stringify(inv)));
  assert.equal(back.count("wooden_sword"), SLOTS);
  assert.equal(
    Inventory.from([
      ["nonsense", 3],
      ["apple", -1],
    ]).count("apple"),
    0,
  );
});

test("recipes need their ingredients and, for some, a workbench", () => {
  const inv = new Inventory();
  inv.add("wood", 1);
  assert(craft(inv, recipe("planks"), false));
  assert.equal(inv.count("planks"), 4);
  assert(!canCraft(inv, recipe("door"), true));
  inv.add("planks", 2);
  assert(!canCraft(inv, recipe("door"), false));
  assert(craft(inv, recipe("door"), true));
  assert.equal(inv.count("door"), 1);
  for (const r of RECIPES) {
    assert(ITEMS[r.out[0]], r.id);
    for (const id of Object.keys(r.needs))
      assert(ITEMS[id], `${r.id} needs ${id}`);
  }
});

test("blocks drop the right things and pickaxes speed up stone", () => {
  assert.deepEqual(drops(0, null, 0.5), [["dirt", 1]]);
  assert.deepEqual(drops(COAL, null, 0.5), []);
  assert.deepEqual(drops(COAL, "wooden_pickaxe", 0.5), [["coal", 1]]);
  assert.deepEqual(drops(5, null, 0.1), [["apple", 1]]);
  assert.equal(itemForBlock(DOOR_OPEN), "door");
  assert(breakTime(2, "stone_pickaxe") < breakTime(2, "wooden_pickaxe"));
  assert(breakTime(2, "wooden_pickaxe") < breakTime(2, null));
});

test("coal is generated underground and never in the protected floor", () => {
  const blocks = generate();
  const coal = [...blocks]
    .filter(([, t]) => t === COAL)
    .map(([k]) => k.split(",").map(Number));
  assert(coal.length > 20);
  assert(coal.every(([, y]) => y >= 1));
  assert(!coal.some(([x, y, z]) => !blocks.has(key(x, y + 1, z))));
});

test("moving a stack onto the same item joins them; other items swap", () => {
  const inv = new Inventory();
  inv.slots[0] = { id: "dirt", count: 40 };
  inv.slots[1] = { id: "dirt", count: 50 };
  inv.slots[2] = { id: "apple", count: 3 };
  inv.move(0, 1);
  assert.deepEqual(inv.slots[1], { id: "dirt", count: 64 });
  assert.deepEqual(inv.slots[0], { id: "dirt", count: 26 }, "the rest stays");
  inv.move(2, 0);
  assert.equal(inv.slots[0].id, "apple");
  assert.equal(inv.slots[2].id, "dirt");
  inv.move(5, 0);
  assert.equal(inv.slots[0].id, "apple", "moving an empty slot does nothing");
});

test("splitting puts half a stack into the first empty slot", () => {
  const inv = new Inventory();
  inv.slots[0] = { id: "dirt", count: 9 };
  inv.slots[1] = { id: "stone", count: 1 };
  assert.equal(inv.split(0), 2);
  assert.equal(inv.slots[0].count, 5);
  assert.deepEqual(inv.slots[2], { id: "dirt", count: 4 });
  assert.equal(inv.split(1), -1, "one item cannot be split");
  const full = new Inventory(2);
  full.slots = [
    { id: "dirt", count: 8 },
    { id: "stone", count: 8 },
  ];
  assert.equal(full.split(0), -1, "no room");
});

test("moving tools and recovering serialized loot preserves wear", () => {
  const tool = { id: "wooden_pickaxe", count: 1, wear: 12 };
  const chest = new Inventory(1);
  assert.equal(chest.add(tool.id, tool.count, tool.wear), 0);
  const bag = new Inventory(1);
  assert.equal(bag.add(...chest.toJSON()[0]), 0);
  assert.deepEqual(bag.slots[0], tool);
  assert.equal(bag.add(tool.id, tool.count, tool.wear), 1);
  assert.deepEqual(bag.slots[0], tool);
});

test("emptying a container is all-or-nothing when the backpack is full", () => {
  const bag = new Inventory(2);
  bag.add("dirt", 63);
  bag.add("wooden_pickaxe", 1, 12);
  const before = bag.toJSON();
  assert.equal(
    bag.collect([
      ["dirt", 1],
      ["apple", 1],
    ]),
    false,
  );
  assert.deepEqual(bag.toJSON(), before);
  assert.equal(bag.collect([["dirt", 1]]), true);
  assert.equal(bag.count("dirt"), 64);
  assert.equal(bag.slots[1].wear, 12);
});

test("invalid loot never enters the inventory", () => {
  const bag = new Inventory();
  bag.add("not-an-item", 2);
  bag.add("apple", -1);
  bag.add("apple", 1.5);
  assert(bag.slots.every((s) => s === null));
});

test("the workbench squares make what the recipe book makes", async () => {
  const { RECIPES, GRID, gridFor, gridMatches, pruneGrid } =
    await import("../src/recipes.js");
  for (const r of RECIPES) {
    const cells = gridFor(r);
    assert.equal(cells.length, GRID, r.id);
    assert(gridMatches(cells).includes(r), r.id);
    // Where things sit does not matter.
    assert(gridMatches([...cells].reverse()).includes(r), r.id);
  }
  assert.deepEqual(gridMatches(Array(GRID).fill(null)), []);
  assert.deepEqual(gridMatches(["planks", "coal"]), []);
  // The same things can make two tools: both are offered.
  assert.deepEqual(
    gridMatches(["stone", "stone", "stone", "stick", "stick"]).map((r) => r.id),
    ["stone_pickaxe", "stone_axe"],
  );
  // A pickaxe is drawn as a pickaxe: head on top, handle below.
  assert.deepEqual(gridFor(RECIPES.find((r) => r.id === "stone_pickaxe")), [
    "stone",
    "stone",
    "stone",
    null,
    "stick",
    null,
    null,
    "stick",
    null,
  ]);
  const bag = new Inventory();
  bag.add("planks", 2);
  assert.deepEqual(pruneGrid(["planks", "stick", "planks", "planks"], bag), [
    "planks",
    null,
    "planks",
    null,
  ]);
});
