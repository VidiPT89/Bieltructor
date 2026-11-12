// The data tables of the game point at each other by text ID. These checks
// fail when an entry names something that does not exist.
import test from "node:test";
import assert from "node:assert/strict";
import { ITEMS, CREATIVE_BLOCKS, drops } from "../src/items.js";
import { RECIPES } from "../src/recipes.js";
import { SMELT, FUEL, chestLoot } from "../src/smelting.js";
import { MONSTERS } from "../src/monsters.js";
import { ANIMALS } from "../src/creatures.js";
import { strings } from "../src/strings.js";
import { difficultyRules, DIFFICULTIES } from "../src/worlds.js";

const known = (id, where) =>
  assert(ITEMS[id], `${where}: unknown item "${id}"`);

test("every block type belongs to one item only, and every item has a name", () => {
  const seen = new Map();
  for (const [id, item] of Object.entries(ITEMS)) {
    assert(item.block !== undefined || item.icon, `${id} has no block or icon`);
    for (const lang of Object.keys(strings))
      assert(strings[lang].items[id], `${id} has no name in ${lang}`);
    if (item.block === undefined) continue;
    assert(
      !seen.has(item.block),
      `${id} and ${seen.get(item.block)} share a block`,
    );
    seen.set(item.block, id);
  }
  for (const id of CREATIVE_BLOCKS) known(id, "creative list");
});

test("recipes have their own IDs and use items that exist", () => {
  const ids = new Set();
  for (const r of RECIPES) {
    assert(!ids.has(r.id), `recipe "${r.id}" is listed twice`);
    ids.add(r.id);
    known(r.out[0], r.id);
    assert(r.out[1] >= 1 && r.out[1] <= 64, r.id);
    for (const [id, n] of Object.entries(r.needs)) {
      known(id, r.id);
      assert(Number.isInteger(n) && n >= 1, r.id);
    }
  }
});

test("furnaces, treasure, animals and monsters give items that exist", () => {
  for (const [from, to] of Object.entries(SMELT)) {
    known(from, "smelting");
    known(Array.isArray(to) ? to[0] : to, "smelting " + from);
  }
  for (const id of Object.keys(FUEL)) known(id, "fuel");
  for (let seed = 1; seed <= 40; seed++)
    for (const [id, n] of chestLoot(seed, seed, 5, -seed)) {
      known(id, "treasure");
      assert(n >= 1 && n <= 64);
    }
  for (const [type, m] of Object.entries(MONSTERS))
    if (m.drop) known(m.drop[0], type);
  for (const [type, a] of Object.entries(ANIMALS))
    for (const key of ["product", "food", "tameWith", "needs"])
      if (a[key]) known(a[key], `${type}.${key}`);
  // Whatever a block drops, with any roll, is an item.
  for (const item of Object.values(ITEMS))
    if (item.block !== undefined)
      for (const roll of [0, 0.5, 0.99])
        for (const [id] of drops(item.block, "crystal_pickaxe", roll))
          known(id, "drop");
});

test("every difficulty has the same rules", () => {
  const keys = Object.keys(difficultyRules[DIFFICULTIES[0]]).sort();
  for (const d of DIFFICULTIES)
    assert.deepEqual(Object.keys(difficultyRules[d]).sort(), keys, d);
});
