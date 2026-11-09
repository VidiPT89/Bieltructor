import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeOptions,
  newWorld,
  validateWorld,
  createStore,
  difficultyRules,
  DIFFICULTIES,
} from "../src/worlds.js";

const memory = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    data,
  };
};

test("peaceful never has monsters and gentle levels keep the inventory", () => {
  assert.equal(
    normalizeOptions({ difficulty: "peaceful", monsters: true }).monsters,
    false,
  );
  assert.equal(normalizeOptions({ difficulty: "easy" }).keepInventory, true);
  assert.equal(normalizeOptions({ difficulty: "hard" }).keepInventory, false);
  assert.equal(normalizeOptions({ difficulty: "nonsense" }).difficulty, "easy");
  for (const d of DIFFICULTIES) assert(difficultyRules[d]);
  assert.equal(difficultyRules.peaceful.maxMonsters, 0);
  assert(difficultyRules.hard.damage > difficultyRules.easy.damage);
});

test("a version 1 world opens as a creative world without losing blocks", () => {
  const v1 = {
    version: 1,
    edits: [
      [1, 3, 1, 6],
      [2, 2, 2, null],
    ],
  };
  const w = validateWorld(v1, { id: "a", now: 5 });
  assert.equal(w.version, 2);
  assert.equal(w.mode, "creative");
  assert.deepEqual(w.edits, v1.edits);
});

test("v2 worlds are validated and cleaned", () => {
  const w = newWorld({
    id: "x",
    name: "  Casa  ",
    mode: "adventure",
    options: { difficulty: "normal" },
    now: 1,
  });
  assert.equal(w.name, "Casa");
  const back = validateWorld(
    JSON.parse(
      JSON.stringify({
        ...w,
        time: 1.25,
        day: -3,
        player: { x: 0, y: 3, z: 0, yaw: 0, pitch: 0, health: 99 },
      }),
    ),
  );
  assert.equal(back.time, 0.25);
  assert.equal(back.day, 1);
  assert.equal(back.player.health, 20);
  assert.equal(validateWorld({ version: 9 }), null);
  assert.equal(validateWorld({ version: 2, edits: "no" }), null);
});

test("the store migrates the old single world once and lists worlds", () => {
  const s = memory();
  s.setItem(
    "biel-world",
    JSON.stringify({ version: 1, edits: [[0, 4, 0, 7]] }),
  );
  s.setItem(
    "biel-player",
    JSON.stringify({ x: 1, y: 5, z: 1, yaw: 0, pitch: 0, time: 0.6 }),
  );
  const store = createStore(s);
  const migrated = store.migrate(() => "m1");
  assert.equal(migrated.id, "m1");
  assert.equal(store.current(), "m1");
  assert.equal(store.list().length, 1);
  assert.equal(store.load("m1").time, 0.6);
  assert.equal(s.getItem("biel-world"), null);
  assert.equal(
    store.migrate(() => "m2"),
    null,
  );
  store.save(newWorld({ id: "n", name: "Novo", options: {} }));
  assert.deepEqual(
    store.list().map((w) => w.id),
    ["n", "m1"],
  );
  store.remove("m1");
  assert.deepEqual(
    store.list().map((w) => w.id),
    ["n"],
  );
});

test("malformed optional fields do not crash imported worlds", () => {
  const w = newWorld({ id: "safe", options: {} });
  const imported = validateWorld({
    ...w,
    options: null,
    backpacks: [
      null,
      {},
      { x: 0, y: 2, z: 0, items: [["apple", 2]] },
      { x: 999, y: 2, z: 0, items: [] },
    ],
  });
  assert.equal(imported.options.difficulty, "easy");
  assert.deepEqual(imported.backpacks, [
    { x: 0, y: 2, z: 0, items: [["apple", 2]] },
  ]);
});

test("invalid world index entries do not prevent saving valid worlds", () => {
  const storage = memory();
  storage.setItem("biel-worlds", JSON.stringify([null, {}, "broken"]));
  const store = createStore(storage);
  assert.deepEqual(store.list(), []);
  store.save(newWorld({ id: "valid", options: {} }));
  assert.equal(store.list()[0].id, "valid");
  assert.equal(store.load("valid").id, "valid");
});

test("'Animals only friends' is on for gentle levels and for older worlds", async () => {
  const { normalizeOptions, validateWorld, newWorld } =
    await import("../src/worlds.js");
  assert.equal(normalizeOptions({ difficulty: "easy" }).friendsOnly, true);
  assert.equal(normalizeOptions({ difficulty: "hard" }).friendsOnly, false);
  const old = JSON.parse(
    JSON.stringify(newWorld({ id: "o", options: { difficulty: "hard" } })),
  );
  delete old.options.friendsOnly;
  assert.equal(validateWorld(old, { id: "o" }).options.friendsOnly, true);
});

test("recovery bags validate their contents and preserve tool wear", () => {
  const world = newWorld({ id: "loot" });
  world.backpacks = [
    {
      x: 0,
      y: 5,
      z: 0,
      items: [
        ["wooden_pickaxe", 1, 12],
        ["unknown", 2],
        ["apple", -1],
        ["dirt", 100],
        { id: "apple" },
      ],
    },
  ];
  const items = validateWorld(world).backpacks[0].items;
  assert.deepEqual(items[0], ["wooden_pickaxe", 1, 12]);
  assert.equal(items[1], null);
  assert.equal(items[2], null);
  assert.deepEqual(items[3], ["dirt", 64]);
  assert.equal(items[4], null);
});
