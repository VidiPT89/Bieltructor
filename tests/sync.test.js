import test from "node:test";
import assert from "node:assert/strict";
import { decide, plan, deviceKind } from "../src/sync.js";

const w = (updatedAt, device = "Mac") => ({ id: "a", updatedAt, device });

test("new worlds go up or down, unchanged ones stay put", () => {
  assert.equal(decide(w(1), undefined, undefined), "upload");
  assert.equal(decide(undefined, w(1), undefined), "download");
  assert.equal(decide(w(5), w(5), 5), "none");
});

test("only one side changed since the last sync: the newer one wins", () => {
  assert.equal(decide(w(9), w(5), 5), "upload");
  assert.equal(decide(w(5), w(9, "iPad"), 5), "download");
});

test("changed on both devices: ask, never overwrite", () => {
  assert.equal(decide(w(9), w(8, "iPad"), 5), "conflict");
  assert.equal(
    decide(w(9), w(8), undefined),
    "conflict",
    "never synced before",
  );
  const p = plan(
    [w(9), { id: "b", updatedAt: 1 }],
    [w(8, "iPad"), { id: "c", updatedAt: 2 }],
    { a: 5 },
  );
  assert.deepEqual(
    p.map((x) => [x.id, x.action]),
    [
      ["a", "conflict"],
      ["b", "upload"],
      ["c", "download"],
    ],
  );
});

test("devices get a friendly name", () => {
  assert.equal(deviceKind("MacIntel", false, 1440), "Mac");
  assert.equal(deviceKind("iPad", true, 1024), "iPad");
  assert.equal(deviceKind("iPhone", true, 390), "iPhone");
});

test("a world deleted on one device is removed on the others, not sent back", async () => {
  const { decide } = await import("../src/sync.js");
  const gone = { id: "a", deleted: true, updatedAt: 50 };
  assert.equal(decide({ id: "a", updatedAt: 10 }, gone, 10), "removeLocal");
  assert.equal(
    decide({ id: "a", updatedAt: 20 }, gone, 10),
    "upload",
    "played here since the last sync: it stays",
  );
  assert.equal(decide(undefined, gone, 10), "none");
  assert.equal(decide(undefined, gone, 10, true), "forget");
});

test("a deletion that did not reach iCloud is retried, unless the world changed elsewhere", async () => {
  const { decide } = await import("../src/sync.js");
  assert.equal(decide(undefined, { id: "a", updatedAt: 10 }, 10, true), "bury");
  assert.equal(
    decide(undefined, { id: "a", updatedAt: 30 }, 10, true),
    "download",
  );
  assert.equal(decide(undefined, undefined, 10, true), "forget");
});
