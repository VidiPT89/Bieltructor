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
