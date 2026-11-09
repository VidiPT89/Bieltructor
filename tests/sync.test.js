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
