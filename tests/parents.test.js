import test from "node:test";
import assert from "node:assert/strict";
import {
  gateQuestion,
  normalizeParents,
  allowedDifficulties,
  clampDifficulty,
  reminderDue,
} from "../src/parents.js";
import { seeded } from "../src/creatures.js";

test("the parents' question is a sum written in words", () => {
  const q = gateQuestion(seeded(3), "pt");
  assert(typeof q.a === "string" && typeof q.b === "string");
  assert(q.answer >= 6 && q.answer <= 18);
  assert.match(gateQuestion(seeded(3), "en").a, /^[a-z]+$/);
});

test("parents can cap the difficulty and get a break reminder", () => {
  assert.deepEqual(allowedDifficulties("easy"), ["peaceful", "easy"]);
  assert.equal(clampDifficulty("hard", "easy"), "easy");
  assert.equal(clampDifficulty("peaceful", "easy"), "peaceful");
  assert(!reminderDue(5000, 0));
  assert(!reminderDue(29 * 60, 30));
  assert(reminderDue(30 * 60, 30));
  assert.deepEqual(
    normalizeParents({ reminder: 7, maxDifficulty: "x", noMonsters: "yes" }),
    {
      reminder: 0,
      maxDifficulty: "hard",
      noMonsters: false,
    },
  );
});

test("null parental settings recover defaults without preventing startup", () => {
  assert.deepEqual(normalizeParents(null), normalizeParents());
});
