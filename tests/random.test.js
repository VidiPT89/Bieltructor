import test from "node:test";
import assert from "node:assert/strict";
import { createRandom, seedFrom } from "../src/random.js";

test("the same seed always gives the same rolls", () => {
  const a = createRandom(1234),
    b = createRandom(1234);
  const first = Array.from({ length: 50 }, a);
  assert.deepEqual(first, Array.from({ length: 50 }, b));
  assert.notDeepEqual(first, Array.from({ length: 50 }, createRandom(1235)));
  // The first numbers never change, so worlds stay the same between versions.
  assert.deepEqual(
    Array.from({ length: 3 }, createRandom(1)).map((n) => n.toFixed(6)),
    ["0.627074", "0.002736", "0.527447"],
  );
});

test("rolls stay between 0 and 1 and spread evenly", () => {
  const roll = createRandom("biel"),
    buckets = Array(10).fill(0);
  for (let i = 0; i < 10000; i++) {
    const n = roll();
    assert(n >= 0 && n < 1);
    buckets[Math.floor(n * 10)]++;
  }
  for (const count of buckets) assert(count > 850 && count < 1150, count);
  const whole = createRandom(7);
  for (let i = 0; i < 200; i++) assert(whole.int(6) < 6);
});

test("a seed can be a number or a text, and jobs get their own rolls", () => {
  assert.equal(seedFrom(42), 42);
  assert.equal(seedFrom("ilha"), seedFrom("ilha"));
  assert.notEqual(seedFrom("ilha"), seedFrom("ilhb"));
  const weather = createRandom(5).fork("weather"),
    monsters = createRandom(5).fork("monsters");
  assert.notEqual(weather(), monsters());
  assert.equal(
    createRandom(5).fork("weather")(),
    createRandom(5).fork("weather")(),
  );
});
