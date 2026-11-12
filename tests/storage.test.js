// Worlds in the big store (IndexedDB), with the small one as a second copy.
import test from "node:test";
import assert from "node:assert/strict";
import { openStorage, reconcile } from "../src/storage.js";
import { createStore, newWorld } from "../src/worlds.js";

function smallStore(limit = Infinity, start = {}) {
  const data = new Map(Object.entries(start));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem(k, v) {
      if (String(v).length > limit) throw new Error("QuotaExceededError");
      data.set(k, String(v));
    },
    removeItem: (k) => data.delete(k),
    keys: () => [...data.keys()],
  };
}
// A pretend IndexedDB that answers a little later, like the real one.
function bigStore(start = {}) {
  const data = new Map(Object.entries(start));
  const soon = (work) =>
    new Promise((done, fail) =>
      setTimeout(() => {
        try {
          done(work());
        } catch (error) {
          fail(error);
        }
      }),
    );
  return {
    data,
    broken: false,
    readAll: () => soon(() => new Map(data)),
    put(k, v) {
      return soon(() => {
        if (this.broken) throw new Error("disk");
        data.set(k, v);
      });
    },
    remove: (k) => soon(() => void data.delete(k)),
  };
}
const world = (id, updatedAt, extra = {}) =>
  JSON.stringify({ ...newWorld({ id, now: 0 }), updatedAt, ...extra });

test("the first time, every world, picture and backup is copied and nothing is deleted", async () => {
  const local = smallStore(Infinity, {
    "biel-worlds": "[]",
    "biel-world-a": world("a", 5),
    "biel-thumb-a": "data:image/jpeg;base64,xx",
    "biel-backups-a": "[]",
    "biel-backup-a-3": world("a", 3),
    "biel-current": "a",
    "biel-stickers": "{}",
    "biel-settings": "{}",
    "something-else": "1",
  });
  const before = new Map(local.data),
    big = bigStore();
  const storage = await openStorage({ backend: big, local });
  assert.equal(storage.kind, "indexeddb");
  assert.equal(storage.getItem("biel-world-a"), world("a", 5));
  assert.equal(storage.getItem("biel-settings"), null);
  await storage.flush();
  assert.deepEqual([...big.data.keys()].sort(), [
    "biel-backup-a-3",
    "biel-backups-a",
    "biel-current",
    "biel-stickers",
    "biel-storage-version",
    "biel-thumb-a",
    "biel-world-a",
    "biel-worlds",
  ]);
  assert.deepEqual(local.data, before);
});

test("worlds are read at once and reach both stores; big ones only the big store", async () => {
  const local = smallStore(600),
    big = bigStore();
  const storage = await openStorage({ backend: big, local });
  const store = createStore(storage);
  store.save(newWorld({ id: "a", now: 1 }));
  assert.equal(store.load("a").id, "a");
  assert(local.data.has("biel-world-a"));
  // The world grows past what the small store takes.
  const grown = { ...store.load("a"), signs: { "0,1,0": "x".repeat(30) } };
  for (let i = 1; i < 40; i++) grown.signs[`${i},1,0`] = "y".repeat(30);
  grown.updatedAt = 2;
  store.save(grown);
  assert.equal(Object.keys(store.load("a").signs).length, 40);
  assert(!local.data.has("biel-world-a"), "no stale copy is left behind");
  await storage.flush();
  assert.equal(big.data.get("biel-world-a"), storage.getItem("biel-world-a"));
  // Opened again, the big world is there.
  const again = createStore(await openStorage({ backend: big, local }));
  assert.equal(Object.keys(again.load("a").signs).length, 40);
  assert.equal(again.list().length, 1);
});

test("a save the big store never got is taken from the small one", async () => {
  const big = bigStore({
    "biel-storage-version": "1",
    "biel-world-a": world("a", 5, { day: 2 }),
    "biel-world-b": world("b", 9, { day: 7 }),
    "biel-worlds": JSON.stringify([{ id: "a", updatedAt: 5 }]),
    "biel-current": "b",
  });
  const local = smallStore(Infinity, {
    "biel-world-a": world("a", 8, { day: 3 }),
    "biel-world-b": world("b", 4, { day: 1 }),
    "biel-worlds": JSON.stringify([{ id: "a", updatedAt: 8 }]),
    "biel-current": "a",
  });
  const storage = await openStorage({ backend: big, local });
  assert.equal(JSON.parse(storage.getItem("biel-world-a")).day, 3);
  assert.equal(JSON.parse(storage.getItem("biel-world-b")).day, 7);
  assert.equal(storage.getItem("biel-current"), "a");
  await storage.flush();
  assert.equal(JSON.parse(big.data.get("biel-world-a")).day, 3);
});

test("a world deleted from the game does not come back from the old copy", async () => {
  const local = smallStore(),
    big = bigStore();
  let storage = await openStorage({ backend: big, local });
  let store = createStore(storage);
  store.save(newWorld({ id: "a", now: 1 }));
  store.save(newWorld({ id: "b", now: 2 }));
  store.remove("a");
  await storage.flush();
  storage = await openStorage({ backend: big, local });
  store = createStore(storage);
  assert.deepEqual(
    store.list().map((w) => w.id),
    ["b"],
  );
  assert.equal(store.load("a"), null);
  assert(!local.data.has("biel-world-a") && !big.data.has("biel-world-a"));
});

test("pictures and backups stay out of the small store once the big one is in use", async () => {
  const local = smallStore(),
    big = bigStore();
  const storage = await openStorage({ backend: big, local });
  storage.setItem("biel-thumb-a", "data:image/jpeg;base64,xx");
  storage.setItem("biel-backup-a-1", "{}");
  storage.setItem("biel-backups-a", "[]");
  assert.deepEqual([...local.data.keys()], ["biel-backups-a"]);
  assert.equal(storage.getItem("biel-thumb-a"), "data:image/jpeg;base64,xx");
});

test("without a big store, or with a broken one, the game keeps the small store", async () => {
  const local = smallStore();
  for (const backend of [
    null,
    { readAll: () => Promise.reject(new Error("blocked")) },
  ]) {
    const storage = await openStorage({ backend, local });
    assert.equal(storage.kind, "local");
    storage.setItem("biel-current", "a");
    assert.equal(local.getItem("biel-current"), "a");
    await storage.flush();
  }
  // A big store that stops writing: said once, and the small copy holds.
  const big = bigStore();
  let said = 0;
  const storage = await openStorage({
    backend: big,
    local,
    onError: () => said++,
  });
  await storage.flush();
  big.broken = true;
  storage.setItem("biel-world-a", world("a", 3));
  storage.setItem("biel-world-a", world("a", 4));
  await storage.flush();
  assert.equal(said, 1);
  assert.equal(local.getItem("biel-world-a"), world("a", 4));
  assert.equal(storage.getItem("biel-world-a"), world("a", 4));
});

test("reconcile tells which keys it took", () => {
  const map = new Map([["biel-storage-version", "1"]]);
  const local = smallStore(Infinity, { "biel-world-a": world("a", 1) });
  assert.deepEqual(reconcile(map, local), ["biel-world-a"]);
  assert.deepEqual(reconcile(map, local), []);
});
