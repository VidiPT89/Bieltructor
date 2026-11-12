// Automatic backups: the last three earlier copies of each world.
import test from "node:test";
import assert from "node:assert/strict";
import {
  createStore,
  newWorld,
  MAX_BACKUPS,
  BACKUP_GAP,
} from "../src/worlds.js";

// A pretend storage with a size limit, like the real one.
function setup(limit = Infinity) {
  const data = new Map();
  const size = () =>
    [...data].reduce((sum, [k, v]) => sum + k.length + v.length, 0);
  const storage = {
    getItem: (k) => data.get(k) ?? null,
    setItem(k, v) {
      const before = data.get(k);
      data.set(k, String(v));
      if (size() > limit) {
        if (before === undefined) data.delete(k);
        else data.set(k, before);
        throw new Error("QuotaExceededError");
      }
    },
    removeItem: (k) => data.delete(k),
  };
  return { data, storage, size, store: createStore(storage) };
}
const HOUR = 60 * 60 * 1000;
// Plays a world for a while: every save keeps a backup when one is due.
function play(store, world, day, now) {
  store.backup(world.id, now);
  store.save({ ...world, day, updatedAt: now });
}

test("saving keeps the earlier copy, at most every half hour, and only three", () => {
  const { store } = setup();
  const world = newWorld({ id: "a", now: 0 });
  assert.equal(store.backup("a", 0), false, "nothing stored yet");
  store.save(world);
  assert.deepEqual(store.backups("a"), []);
  play(store, world, 2, HOUR);
  assert.deepEqual(store.backups("a"), [{ at: HOUR, day: 1 }]);
  // Twenty minutes later it is too soon for another one.
  play(store, world, 3, HOUR + BACKUP_GAP - 1);
  assert.equal(store.backups("a").length, 1);
  for (let i = 2; i <= 5; i++) play(store, world, 2 + i, i * HOUR);
  const list = store.backups("a");
  assert.equal(list.length, MAX_BACKUPS);
  assert.deepEqual(
    list.map((b) => b.at),
    [5 * HOUR, 4 * HOUR, 3 * HOUR],
  );
  assert.deepEqual(
    list.map((b) => b.day),
    [6, 5, 4],
  );
});

test("a world that did not change is not copied again", () => {
  const { store } = setup();
  store.save(newWorld({ id: "a", now: 0 }));
  assert.equal(store.backup("a", HOUR), true);
  assert.equal(store.backup("a", 2 * HOUR), false);
  assert.equal(store.backups("a").length, 1);
});

test("restoring brings the old world back and keeps what was there", () => {
  const { store } = setup();
  const world = newWorld({ id: "a", now: 0 });
  world.edits = [[1, 5, 1, 2]];
  store.save(world);
  play(store, { ...world, edits: [] }, 9, HOUR);
  assert.deepEqual(store.load("a").edits, []);
  const [backup] = store.backups("a");
  const restored = store.restore("a", backup.at, 2 * HOUR);
  assert.deepEqual(restored.edits, [[1, 5, 1, 2]]);
  assert.deepEqual(store.load("a").edits, [[1, 5, 1, 2]]);
  assert.equal(store.load("a").updatedAt, 2 * HOUR);
  assert.equal(store.list()[0].updatedAt, 2 * HOUR);
  // The world from before restoring is now the newest backup: undo.
  const [undo] = store.backups("a");
  assert.equal(undo.day, 9);
  assert.equal(store.restore("a", undo.at, 3 * HOUR).day, 9);
});

test("a missing or damaged backup changes nothing", () => {
  const { store, data } = setup();
  const world = newWorld({ id: "a", now: 0 });
  store.save(world);
  play(store, world, 4, HOUR);
  const [backup] = store.backups("a");
  assert.equal(store.restore("a", 12345, 2 * HOUR), null);
  data.set(`biel-backup-a-${backup.at}`, "{not json");
  assert.equal(store.restore("a", backup.at, 2 * HOUR), null);
  assert.equal(store.load("a").day, 4);
  assert.equal(store.backups("a").length, 1);
  data.set("biel-backups-a", "nonsense");
  assert.deepEqual(store.backups("a"), []);
});

test("deleting a world deletes its backups; other worlds keep theirs", () => {
  const { store, data } = setup();
  for (const id of ["a", "b"]) {
    const world = newWorld({ id, now: 0 });
    store.save(world);
    play(store, world, 2, HOUR);
  }
  store.remove("a");
  assert(![...data.keys()].some((k) => k.includes("-a")));
  assert.equal(store.backups("b").length, 1);
});

test("with storage full the world is still saved, at the cost of old backups", () => {
  const big = (id, fill) => ({
    ...newWorld({ id, now: 0 }),
    signs: { "0,1,0": fill.repeat(30) },
  });
  const one = JSON.stringify(big("a", "x")).length;
  // Room for the world, its index and about two more copies.
  const { store } = setup(one * 3 + 600);
  let world = big("a", "x");
  store.save(world);
  for (let i = 1; i <= 6; i++) {
    world = { ...big("a", String(i)), day: i };
    assert.doesNotThrow(() => play(store, world, i, i * HOUR));
    assert.equal(store.load("a").day, i, "the newest world is what is stored");
  }
  assert(store.backups("a").length >= 1);
  const [newest] = store.backups("a");
  assert.equal(store.restore("a", newest.at, 99 * HOUR).day, newest.day);
  // A second world needs the room more than the first one's backups do.
  const { store: tight } = setup(one * 2 + 600);
  tight.save(big("a", "x"));
  play(tight, big("a", "y"), 2, HOUR);
  assert.equal(tight.backups("a").length, 1);
  assert.doesNotThrow(() => tight.save(big("b", "z")));
  assert(tight.load("b") && tight.load("a"));
  assert.equal(tight.backups("a").length, 0);
});
