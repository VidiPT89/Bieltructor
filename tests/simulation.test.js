import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  FixedStep,
  EntityInterpolation,
  TICK_SECONDS,
} from "../src/simulation.js";
import { createRandom } from "../src/random.js";
import { tickFurnace, emptyFurnace } from "../src/smelting.js";

function run(rate) {
  const clock = new FixedStep(),
    random = createRandom("ticks");
  const furnace = {
    ...emptyFurnace(),
    input: ["iron_ore", 3],
    fuel: ["coal", 1],
  };
  let ticks = 0,
    age = 0,
    value = 0;
  for (let i = 0; i < rate * 12; i++)
    clock.advance(1 / rate, (dt) => {
      assert.equal(dt, TICK_SECONDS);
      ticks++;
      age += dt;
      value += random();
      tickFurnace(furnace, dt);
    });
  return { ticks, age, value, furnace };
}

test("20, 30, 60 and 144 fps produce identical ticks, seeded rolls and furnace state", () => {
  const expected = run(20);
  assert.equal(expected.ticks, 240);
  assert.deepEqual(expected.furnace.output, ["iron_ingot", 2]);
  for (const fps of [30, 60, 144]) assert.deepEqual(run(fps), expected);
});

test("long stalls catch up at most five ticks and invalid deltas do nothing", () => {
  const clock = new FixedStep();
  let calls = 0;
  clock.advance(60, () => calls++);
  assert.equal(calls, 5);
  for (const dt of [-1, NaN, Infinity, 0]) clock.advance(dt, () => calls++);
  assert.equal(calls, 5);
  assert.equal(clock.accumulator, 0);
});

test("pause resets partial ticks and a stop inside a tick cancels catch-up", () => {
  const clock = new FixedStep();
  let calls = 0;
  clock.advance(0.04, () => calls++);
  clock.reset();
  clock.advance(0.02, () => calls++);
  assert.equal(calls, 0);
  clock.advance(0.2, () => {
    calls++;
    return false;
  });
  assert.equal(calls, 1);
  assert.equal(clock.accumulator, 0);
});

test("interpolation restores authoritative position before the next physics tick", () => {
  const interpolation = new EntityInterpolation();
  const object = new THREE.Object3D();
  interpolation.end([object]);
  interpolation.begin([object]);
  object.position.x = 2;
  object.rotation.y = Math.PI;
  interpolation.end([object]);
  interpolation.draw([object], 0.25);
  assert.equal(object.position.x, 0.5);
  assert(
    Math.abs(object.quaternion.angleTo(new THREE.Quaternion()) - Math.PI / 4) <
      1e-9,
  );
  interpolation.begin([object]);
  assert.equal(object.position.x, 2);
  object.position.x += 2;
  interpolation.end([object]);
  interpolation.draw([object], 0.5);
  assert.equal(object.position.x, 3);
});

test("new and teleported entities appear at their destination without an origin trail", () => {
  const interpolation = new EntityInterpolation();
  const object = new THREE.Object3D();
  object.position.x = 20;
  interpolation.end([object]);
  interpolation.draw([object], 0);
  assert.equal(object.position.x, 20);
  interpolation.begin([object]);
  object.position.x = 40;
  interpolation.end([object]);
  interpolation.draw([object], 0.2);
  assert.equal(object.position.x, 40);
  interpolation.reset();
  object.position.x = 5;
  interpolation.draw([object], 0.2);
  assert.equal(object.position.x, 5);
});
