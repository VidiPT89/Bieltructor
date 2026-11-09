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
  TYPES,
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
        [0, 3, 0, TYPES],
      ],
    }),
    [
      [0, 1, 0, GLASS],
      [0, 2, 0, DOOR_OPEN],
    ],
  );
});

test("gates and trapdoors open and close; shapes let Biel through when open", async () => {
  const {
    OPENS,
    GATE,
    GATE_OPEN,
    TRAPDOOR,
    TRAPDOOR_OPEN,
    LADDER,
    FENCE,
    passable,
    woolBlock,
    WOOL_COLORS,
  } = await import("../src/world.js");
  assert.equal(OPENS[GATE], GATE_OPEN);
  assert.equal(OPENS[OPENS[TRAPDOOR]], TRAPDOOR);
  assert(
    passable(GATE_OPEN) &&
      !passable(GATE) &&
      passable(LADDER) &&
      !passable(FENCE),
  );
  assert.equal(new Set(WOOL_COLORS.map(woolBlock)).size, 7);
  const { itemForBlock } = await import("../src/items.js");
  assert.equal(itemForBlock(GATE_OPEN), "gate");
  assert.equal(itemForBlock(TRAPDOOR_OPEN), "trapdoor");
  assert.equal(itemForBlock(woolBlock("blue")), "wool_blue");
});

test("dyes colour sheep and wool", async () => {
  const { initialAnimals, interact } = await import("../src/creatures.js");
  const { RECIPES } = await import("../src/recipes.js");
  const sheep = initialAnimals().find((a) => a.type === "sheep");
  assert.deepEqual(interact(sheep, "blue_dye", 0), {
    result: "dyed",
    use: "blue_dye",
  });
  assert.deepEqual(interact(sheep, null, 0).give, ["wool_blue", 2]);
  const purple = RECIPES.find((r) => r.id === "wool_purple");
  assert.deepEqual(purple.needs, { wool: 1, purple_dye: 1 });
});

test("beds come in more colours and all of them are beds; cobblestone is made from stone", async () => {
  const { isBed, bedBlock, BED, BED_COLORS, COBBLESTONE, TYPES } =
    await import("../src/world.js");
  const { RECIPES } = await import("../src/recipes.js");
  const { SMELT } = await import("../src/smelting.js");
  assert.equal(BED_COLORS.length, 6);
  assert(isBed(BED) && BED_COLORS.every((c) => isBed(bedBlock(c))));
  assert(!isBed(COBBLESTONE) && COBBLESTONE < TYPES);
  for (const c of BED_COLORS)
    assert(
      RECIPES.some((r) => r.out[0] === `bed_${c}`),
      c,
    );
  assert(RECIPES.some((r) => r.out[0] === "cobblestone"));
  assert.equal(SMELT.cobblestone, "stone");
});
