import test from "node:test";
import assert from "node:assert/strict";
import {
  tickFurnace,
  emptyFurnace,
  validateFurnace,
  chestLoot,
  SMELT_SECONDS,
} from "../src/smelting.js";
import { Inventory } from "../src/inventory.js";

test("the furnace melts iron with coal, one ingot every few seconds", () => {
  const f = { ...emptyFurnace(), input: ["iron_ore", 2], fuel: ["coal", 1] };
  for (let t = 0; t < SMELT_SECONDS * 2 + 0.5; t += 0.5) tickFurnace(f, 0.5);
  assert.deepEqual(f.output, ["iron_ingot", 2]);
  assert.equal(f.input, null);
  assert.equal(f.fuel, null, "one coal was burnt");
  assert(!tickFurnace(f, 1), "nothing left to cook");
});

test("no fuel, no cooking; things that cannot be cooked stay put", () => {
  const cold = { ...emptyFurnace(), input: ["potato", 1] };
  assert(!tickFurnace(cold, 10));
  assert.equal(cold.output, null);
  const odd = { ...emptyFurnace(), input: ["dirt", 3], fuel: ["coal", 1] };
  assert(!tickFurnace(odd, 10));
  assert.deepEqual(odd.fuel, ["coal", 1], "fuel is not wasted");
  assert.deepEqual(
    validateFurnace({ input: ["x", -2], burn: "a" }),
    emptyFurnace(),
  );
});

test("chest treasure is always the same for the same place", () => {
  assert.deepEqual(chestLoot(5, 1, 20, 3), chestLoot(5, 1, 20, 3));
  assert(chestLoot(5, 1, 20, 3).length > 0);
  const chest = new Inventory(27);
  assert.equal(chest.slots.length, 27);
  for (let i = 0; i < 27; i++) chest.add("wooden_sword");
  assert.equal(chest.add("wooden_sword"), 1, "a chest holds 27 stacks");
});

test("unknown furnace items cannot escape into the backpack", () => {
  assert.equal(validateFurnace({ output: ["unknown", 64] }).output, null);
});
