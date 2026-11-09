import test from "node:test";
import assert from "node:assert/strict";
import { TouchInput } from "../src/input/touch-input.js";
test("movement and jump can be held by different fingers", () => {
  const input = new TouchInput();
  input.press(1, "forward");
  input.press(2, "jump");
  assert(input.has("forward"));
  assert(input.has("jump"));
  input.release(2);
  assert(input.has("forward"));
  assert(!input.has("jump"));
});
test("release preserves another finger holding the same control", () => {
  const input = new TouchInput();
  input.press(1, "forward");
  input.press(2, "forward");
  input.release(1);
  assert(input.has("forward"));
  input.clear();
  assert(!input.has("forward"));
});
