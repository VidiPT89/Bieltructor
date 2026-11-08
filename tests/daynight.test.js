import test from "node:test";
import assert from "node:assert/strict";
import { sky, NOON } from "../src/daynight.js";
import { bar } from "../src/music.js";

test("noon is bright, midnight is dark and sunset glows", () => {
  assert.equal(sky(NOON).daylight, 1);
  assert.equal(sky(0.75).daylight, 0);
  assert(sky(0.75).night && !sky(NOON).night);
  assert(sky(0.5).dusk > 0.5);
  assert.equal(sky(1.25).daylight, sky(NOON).daylight);
});

test("music bars are repeatable, in tune and quieter at night", () => {
  assert.deepEqual(bar(3, false), bar(3, false));
  let day = 0,
    night = 0;
  for (let i = 0; i < 64; i++) {
    day += bar(i, false).notes.length;
    night += bar(i, true).notes.length;
    for (const n of bar(i, false).notes)
      assert([0, 2, 4, 7, 9].includes(((n.semitone % 12) + 12) % 12));
  }
  assert(night < day);
});
