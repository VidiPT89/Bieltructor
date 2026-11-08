import test from "node:test";
import assert from "node:assert/strict";
import { TouchInput } from "../src/touch-input.js";
test("movement and jump can be held by different fingers", () => {
  const input = new TouchInput();
  input.press(1, "KeyW");
  input.press(2, "Space");
  assert(input.has("KeyW"));
  assert(input.has("Space"));
  input.release(2);
  assert(input.has("KeyW"));
  assert(!input.has("Space"));
});
test("release preserves another finger holding the same control", () => {
  const input = new TouchInput();
  input.press(1, "KeyW");
  input.press(2, "KeyW");
  input.release(1);
  assert(input.has("KeyW"));
  input.clear();
  assert(!input.has("KeyW"));
});
