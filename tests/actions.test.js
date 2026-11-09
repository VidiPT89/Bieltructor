import test from "node:test";
import assert from "node:assert/strict";
import {
  isHeld,
  actionsForKey,
  KEYBOARD,
  HELD,
  TAPS,
} from "../src/input/actions.js";
import { TouchInput } from "../src/input/touch-input.js";
import { readPad } from "../src/input/gamepad.js";

const none = { keys: new Set(), touch: new TouchInput(), pad: new Set() };

test("keyboard, touch and controller all hold the same actions", () => {
  assert(isHeld("forward", { ...none, keys: new Set(["ArrowUp"]) }));
  assert(isHeld("forward", { ...none, keys: new Set(["KeyW"]) }));
  const touch = new TouchInput();
  touch.press(1, "forward");
  assert(isHeld("forward", { ...none, touch }));
  assert(isHeld("forward", { ...none, pad: readPad({ ly: -1 }).held }));
  assert(!isHeld("forward", none));
});

test("every held action from a controller is a known action", () => {
  const pad = readPad({ ly: -1, lx: 1, a: true, b: true, rt: 1 }).held;
  for (const name of pad) assert(HELD.includes(name), name);
});

test("keys start known actions", () => {
  assert.deepEqual(actionsForKey("Space"), ["jump"]);
  assert.deepEqual(actionsForKey("KeyE"), ["backpack"]);
  assert.deepEqual(actionsForKey("KeyQ"), []);
  for (const name of Object.keys(KEYBOARD))
    assert(HELD.includes(name) || TAPS.includes(name), name);
});
