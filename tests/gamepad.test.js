import test from "node:test";
import assert from "node:assert/strict";
import { readPad, pressedNow, fromStandardGamepad } from "../src/gamepad.js";

test("the left stick walks and runs, with a small dead zone", () => {
  assert.deepEqual([...readPad({ lx: 0.1, ly: -0.1 }).held], []);
  assert.deepEqual([...readPad({ ly: -0.6 }).held], ["KeyW"]);
  assert.deepEqual([...readPad({ lx: -0.99, ly: 0 }).held].sort(), [
    "KeyA",
    "ShiftLeft",
  ]);
});

test("buttons map to the same actions as keys and touch", () => {
  const p = readPad({
    a: true,
    rt: 0.9,
    b: true,
    lt: 1,
    x: true,
    y: true,
    start: true,
    rb: true,
    rx: 0.5,
  });
  assert(p.held.has("Space") && p.held.has("Break") && p.held.has("KeyC"));
  assert(p.place && p.attack && p.backpack && p.pause && p.next);
  assert.deepEqual(p.look, [0.5, 0]);
});

test("one press fires once, and browser gamepads are understood", () => {
  assert(pressedNow({ attack: true }, { attack: false }, "attack"));
  assert(!pressedNow({ attack: true }, { attack: true }, "attack"));
  const g = {
    axes: [0, -1, 0.3, 0],
    buttons: Array.from({ length: 16 }, (_, i) => ({
      pressed: i === 0,
      value: i === 7 ? 1 : 0,
    })),
  };
  const s = fromStandardGamepad(g);
  assert(s.a && s.rt === 1 && s.ly === -1);
  assert(readPad(s).held.has("KeyW"));
});
