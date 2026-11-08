import test from "node:test";
import assert from "node:assert/strict";
import {
  nextWeather,
  weatherLength,
  validateWeather,
  approach,
  LOOK,
} from "../src/weather.js";
import { seeded } from "../src/creatures.js";

test("thunderstorms never happen on Peaceful or Easy", () => {
  for (const d of ["peaceful", "easy"]) {
    const rand = seeded(9);
    for (let i = 0; i < 500; i++)
      assert.notEqual(nextWeather(rand, d), "storm");
  }
  const rand = seeded(9);
  const seen = new Set(
    Array.from({ length: 500 }, () => nextWeather(rand, "hard")),
  );
  assert.deepEqual([...seen].sort(), ["clear", "cloudy", "rain", "storm"]);
});

test("weather changes gently and is saved safely", () => {
  const len = weatherLength(() => 0.5);
  assert(len >= 120 && len <= 300);
  assert.deepEqual(validateWeather({ state: "snowball", until: 3 }), {
    state: "clear",
    until: 0,
  });
  assert.deepEqual(validateWeather({ state: "rain", until: 40 }), {
    state: "rain",
    until: 40,
  });
  assert.equal(approach(0, 1, 1), 0.25);
  assert.equal(approach(0.9, 1, 1), 1);
  assert(LOOK.storm.dark > LOOK.rain.dark);
});
