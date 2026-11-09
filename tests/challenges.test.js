import test from "node:test";
import assert from "node:assert/strict";
import {
  CHALLENGES,
  createProgress,
  record,
  nextChallenge,
  progressOf,
  goalOf,
} from "../src/challenges.js";
import { advance, TUTORIAL } from "../src/tutorial.js";

test("there are twelve stickers and they unlock from what Biel does", () => {
  assert.equal(CHALLENGES.length, 12);
  const p = createProgress();
  for (let i = 0; i < 11; i++) assert.deepEqual(record(p, "place", 1, 5), []);
  assert.deepEqual(record(p, "place", 1, 5), ["shelter"]);
  assert.equal(nextChallenge(p).id, "bench");
  assert.deepEqual(record(p, "tame:dog"), [], "a dog needs a name too");
  assert.deepEqual(record(p, "name:dog"), ["dog"], "out of order still counts");
  assert.equal(nextChallenge(p).id, "bench");
});

test("challenges that need two things or different places", () => {
  const p = createProgress();
  assert.deepEqual(record(p, "got:coal"), []);
  assert.equal(
    progressOf(
      p,
      CHALLENGES.find((c) => c.id === "coalIron"),
    ),
    1,
  );
  assert.deepEqual(record(p, "got:iron"), ["coalIron"]);
  record(p, "biome:forest");
  record(p, "biome:forest");
  record(p, "biome:desert");
  const biomes = CHALLENGES.find((c) => c.id === "biomes");
  assert.equal(progressOf(p, biomes), 2);
  assert.deepEqual(record(p, "biome:snow"), ["biomes"]);
  assert.equal(goalOf(biomes), 3);
});

test("saved progress is cleaned up", () => {
  const p = createProgress({
    done: { shelter: 3, nonsense: 1, dog: "x" },
    counters: { place: 4, bad: "y" },
  });
  assert.deepEqual(p.done, { shelter: 3 });
  assert.deepEqual(p.counters, { place: 4 });
});

test("the tutorial goes step by step and only listens to the current step", () => {
  let s = { step: 0, amount: 0 };
  ({ state: s } = advance(s, "break"));
  assert.equal(s.step, 0);
  ({ state: s } = advance(s, "walk", 3));
  assert.equal(s.step, 0);
  let r = advance(s, "walk", 2);
  assert(r.moved);
  s = r.state;
  assert.equal(TUTORIAL[s.step].id, "look");
  s = { step: TUTORIAL.length - 1, amount: 0 };
  r = advance(s, "sleep");
  assert(r.finished && r.state === null);
  assert.equal(advance(null, "walk").state, null);
});

test("the 'first time' notes are remembered, and junk is dropped", () => {
  const p = createProgress({ firsts: { "place:torch": 1, odd: "x" } });
  assert.deepEqual(p.firsts, { "place:torch": 1 });
  assert.deepEqual(createProgress().firsts, {});
});
