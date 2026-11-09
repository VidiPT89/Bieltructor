import test from "node:test";
import assert from "node:assert/strict";
import {
  createVitals,
  fallDamage,
  hurt,
  tick,
  eat,
  MAX_FOOD,
} from "../src/survival.js";
import { difficultyRules as R } from "../src/worlds.js";

test("damage follows the difficulty and peaceful never hurts", () => {
  const easy = createVitals(),
    hard = createVitals(),
    calm = createVitals();
  assert.equal(hurt(easy, 4, R.easy), 2);
  assert.equal(hurt(hard, 4, R.hard), 6);
  assert.equal(hurt(calm, 4, R.peaceful), 0);
  assert.equal(hurt(easy, 4, R.easy), 0, "a short invulnerability after a hit");
  assert.equal(fallDamage(4), 0, "only above four blocks");
  assert.equal(fallDamage(6), 2);
});

test("hunger drops over time, faster when running, and food heals", () => {
  const v = createVitals();
  tick(v, 60, { rules: R.normal, hunger: true });
  assert.equal(v.food, MAX_FOOD - 2);
  const run = createVitals();
  tick(run, 60, { rules: R.normal, hunger: true, exertion: 1 });
  assert(run.food < v.food);
  const off = createVitals();
  tick(off, 600, { rules: R.normal, hunger: false });
  assert.equal(off.food, MAX_FOOD);
  assert(!eat(off, 4), "not hungry");
  assert(eat(v, 4));
  assert.equal(v.food, MAX_FOOD);
});

test("health comes back when fed, starving never kills on easy", () => {
  const v = createVitals(10);
  tick(v, R.normal.regenEvery + 0.01, { rules: R.normal, hunger: true });
  assert.equal(v.health, 11);
  const starving = createVitals(3, 0);
  for (let i = 0; i < 100; i++)
    tick(starving, 1, { rules: R.easy, hunger: true });
  assert.equal(starving.health, 2);
  const hardStarve = createVitals(3, 0);
  for (let i = 0; i < 100; i++)
    tick(hardStarve, 1, { rules: R.hard, hunger: true });
  assert.equal(hardStarve.health, 0);
});

test("air runs out under water and then hurts, and refills on the surface", () => {
  const v = createVitals();
  for (let i = 0; i < 16; i++)
    tick(v, 1, { rules: R.normal, hunger: false, underwater: true });
  assert.equal(v.air, 0);
  for (let i = 0; i < 6; i++)
    tick(v, 1, { rules: R.normal, hunger: false, underwater: true });
  assert(v.health < 20);
  tick(v, 3, { rules: R.normal, hunger: false });
  assert.equal(v.air, 10);
});

test("a shield stops half of a hit from the front, not from behind", async () => {
  const { shieldDamage } = await import("../src/survival.js");
  const biel = { x: 0, z: 0 };
  // With yaw 0 Biel looks towards -z.
  assert.equal(shieldDamage(4, 0, biel, { x: 0, z: -3 }), 2);
  assert.equal(shieldDamage(1, 0, biel, { x: 0.5, z: -3 }), 0);
  assert.equal(shieldDamage(4, 0, biel, { x: 0, z: 3 }), 4, "from behind");
  assert.equal(shieldDamage(4, 0, biel, { x: 3, z: 0 }), 4, "from the side");
  assert.equal(shieldDamage(4, Math.PI / 2, biel, { x: -3, z: 0 }), 2);
});

test("a shield held up stops the whole hit from the front", async () => {
  const { shieldDamage } = await import("../src/survival.js");
  const biel = { x: 0, z: 0 };
  assert.equal(shieldDamage(4, 0, biel, { x: 0, z: -3 }, true), 0);
  assert.equal(shieldDamage(4, 0, biel, { x: 0, z: 3 }, true), 4, "not behind");
});
