import test from "node:test";
import assert from "node:assert/strict";
import { isHeld, actionsForKey } from "../src/input/actions.js";
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

test("keys start known actions", () => {
  assert.deepEqual(actionsForKey("Space"), ["jump"]);
  assert.deepEqual(actionsForKey("KeyE"), ["backpack"]);
  assert.deepEqual(actionsForKey("KeyQ"), []);
});
