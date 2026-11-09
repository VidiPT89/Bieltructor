import test from "node:test";
import assert from "node:assert/strict";
import { createCloud } from "../src/persistence.js";
import { createStore, newWorld } from "../src/worlds.js";

function setup() {
  const data = new Map();
  const storage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  };
  const store = createStore(storage);
  store.save(newWorld({ id: "a", now: 5 }));
  const state = {
    busy: false,
    enabled: true,
    failed: 0,
    resolved: 0,
    uploads: 0,
    ok: true,
    listing: [],
  };
  const hooks = {
    enabled: () => state.enabled,
    busy: () => state.busy,
    currentId: () => null,
    lang: () => "en",
    onMissing: () => state.failed++,
    onSynced() {},
    onResolved: () => state.resolved++,
    load() {},
  };
  let cloud;
  const bridge = {
    postMessage({ req, action }) {
      let value = null;
      if (action === "status") value = { available: true };
      if (action === "list") value = state.listing;
      if (action === "save") {
        state.uploads++;
        value = { ok: state.ok };
      }
      queueMicrotask(() => cloud.reply(req, value));
    },
  };
  cloud = createCloud({ bridge, storage, store, hooks });
  return { cloud, store, storage, state, bridge };
}

test("corrupt or incomplete remote worlds never cause blind uploads", async () => {
  for (const listing of [
    null,
    ["broken JSON"],
    [JSON.stringify({ version: 99, id: "a" })],
    [JSON.stringify(newWorld({ id: "../unsafe" }))],
  ]) {
    const { cloud, state } = setup();
    state.listing = listing;
    await cloud.sync();
    assert.equal(state.uploads, 0);
    assert.equal(cloud.status, "missing");
  }
});

test("null sync metadata is recoverable and native replies clear timers", async () => {
  const { cloud, storage, state } = setup();
  storage.setItem("biel-synced", "null");
  await cloud.sync();
  assert.equal(state.uploads, 1);
  assert.deepEqual(JSON.parse(storage.getItem("biel-synced")), { a: 5 });
});

test("failed conflict resolution stays available for retry", async () => {
  const { cloud, state, storage } = setup();
  state.listing = [JSON.stringify(newWorld({ id: "a", now: 9 }))];
  await cloud.sync();
  assert.equal(cloud.conflicts.length, 1);
  state.ok = false;
  await cloud.resolve(true);
  assert.equal(cloud.conflicts.length, 1);
  assert.equal(state.resolved, 0);
  assert.equal(storage.getItem("biel-synced"), null);
  state.ok = true;
  await cloud.resolve(true);
  assert.equal(cloud.conflicts.length, 0);
  assert.equal(state.resolved, 1);
  await cloud.resolve(true); // A second click on the old button is harmless.
});

test("playing or disabling cloud prevents conflict resolution", async () => {
  const { cloud, state } = setup();
  state.listing = [JSON.stringify(newWorld({ id: "a", now: 9 }))];
  await cloud.sync();
  state.busy = true;
  await cloud.resolve(true);
  state.busy = false;
  state.enabled = false;
  await cloud.resolve(true);
  assert.equal(state.uploads, 0);
  assert.equal(cloud.conflicts.length, 1);
});

test("failed uploads and unavailable native bridges are not reported as success", async () => {
  const { cloud, state, bridge } = setup();
  state.ok = false;
  await cloud.sync();
  assert.equal(cloud.status, "missing");
  bridge.postMessage = () => {
    throw new Error("unavailable");
  };
  assert.equal(await cloud.call("status"), null);
});

// Two devices sharing one pretend iCloud folder. `save` only writes when the
// file is still the version the device listed, like CloudBridge.swift.
function device(folder, id) {
  const data = new Map();
  const storage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
  const store = createStore(storage);
  const removed = [];
  let cloud;
  const bridge = {
    postMessage({ req, action, worldId, json, expected }) {
      let value = null;
      if (action === "status") value = { available: true };
      if (action === "list") value = [...folder.values()];
      if (action === "save") {
        const current = folder.has(worldId)
          ? JSON.parse(folder.get(worldId)).updatedAt
          : null;
        if (expected !== undefined && current !== expected)
          value = { ok: false, changed: true };
        else {
          folder.set(worldId, json);
          value = { ok: true };
        }
      }
      queueMicrotask(() => cloud.reply(req, value));
    },
  };
  cloud = createCloud({
    bridge,
    storage,
    store,
    hooks: {
      enabled: () => true,
      busy: () => false,
      currentId: () => null,
      lang: () => "en",
      onMissing() {},
      onSynced() {},
      onResolved() {},
      load() {},
      removed: (worldId) => removed.push(worldId),
    },
  });
  return { cloud, store, storage, removed, id };
}

test("a world deleted on one device is deleted on the other, not sent back", async () => {
  const folder = new Map();
  const mac = device(folder, "mac"),
    ipad = device(folder, "ipad");
  mac.store.save(newWorld({ id: "w", now: 5 }));
  await mac.cloud.sync();
  await ipad.cloud.sync();
  assert(ipad.store.load("w"), "the iPad got the world");
  ipad.store.remove("w");
  await ipad.cloud.forget("w");
  assert.equal(JSON.parse(folder.get("w")).deleted, true, "a marker in iCloud");
  await mac.cloud.sync();
  assert.equal(mac.store.load("w"), null, "the Mac deleted it too");
  assert.deepEqual(mac.removed, ["w"]);
  await ipad.cloud.sync();
  assert.equal(ipad.store.load("w"), null, "it never comes back");
  assert.equal(ipad.storage.getItem("biel-deleted"), "{}");
});

test("a deletion that could not reach iCloud is finished on a later sync", async () => {
  const folder = new Map();
  const mac = device(folder, "mac");
  mac.store.save(newWorld({ id: "w", now: 5 }));
  await mac.cloud.sync();
  mac.store.remove("w");
  // Offline: remember the deletion only.
  mac.storage.setItem("biel-deleted", JSON.stringify({ w: true }));
  await mac.cloud.sync();
  assert.equal(JSON.parse(folder.get("w")).deleted, true);
  assert.equal(mac.store.load("w"), null);
});

test("a save never overwrites a file another device changed after listing", async () => {
  const folder = new Map();
  const mac = device(folder, "mac");
  mac.store.save(newWorld({ id: "w", now: 5 }));
  await mac.cloud.sync();
  const changed = mac.store.load("w");
  changed.updatedAt = 9;
  mac.store.save(changed);
  // The iPad writes in between: the Mac's write must be refused.
  const realList = [...folder.values()];
  folder.set("w", JSON.stringify({ ...newWorld({ id: "w", now: 7 }) }));
  const res = await mac.cloud.call("save", {
    worldId: "w",
    json: JSON.stringify(changed),
    expected: JSON.parse(realList[0]).updatedAt,
  });
  assert.deepEqual(res, { ok: false, changed: true });
  assert.equal(
    JSON.parse(folder.get("w")).updatedAt,
    7,
    "the iPad's version stays",
  );
});
