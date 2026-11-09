import test from "node:test";
import assert from "node:assert/strict";
import { stepKind, VOICES } from "../src/sounds.js";
import { ANIMALS } from "../src/creatures.js";
import { PLANKS, WATER, STONE_BRICK } from "../src/world.js";

test("steps sound different on grass, stone, wood, sand and water", () => {
  assert.equal(stepKind(0), "soft");
  assert.equal(stepKind(2), "hard");
  assert.equal(stepKind(STONE_BRICK), "hard");
  assert.equal(stepKind(PLANKS), "wood");
  assert.equal(stepKind(3), "sand");
  assert.equal(stepKind(WATER), "water");
  assert.equal(stepKind(undefined), null, "no sound in the air");
});

test("every animal has a voice", () => {
  for (const type of Object.keys(ANIMALS)) assert(VOICES[type]?.length, type);
});
