import test from "node:test";
import assert from "node:assert/strict";
import {
  canSpawn,
  allowedMonsters,
  spawnSpot,
  strike,
  weaponDamage,
  litNear,
} from "../src/monsters.js";
import {
  normalizeOptions,
  difficultyRules as R,
  DIFFICULTIES,
} from "../src/worlds.js";
import { seeded } from "../src/creatures.js";

const base = (difficulty, extra = {}) => ({
  mode: "adventure",
  options: normalizeOptions({ difficulty, ...extra }),
  night: true,
  count: 0,
  rules: R[difficulty],
});

test("no monster ever appears on Peaceful or with monsters switched off", () => {
  assert(!canSpawn(base("peaceful")));
  assert(
    !canSpawn({
      ...base("peaceful"),
      options: {
        ...normalizeOptions({ difficulty: "peaceful" }),
        monsters: true,
      },
    }),
  );
  for (const d of DIFFICULTIES)
    assert(!canSpawn(base(d, { monsters: false })), d);
  assert(!canSpawn({ ...base("easy"), mode: "creative" }));
  assert(!canSpawn({ ...base("easy"), night: false }));
  assert(canSpawn(base("easy")));
  assert(!canSpawn({ ...base("easy"), count: R.easy.maxMonsters }));
});

test("the archer only shows up from Normal", () => {
  assert.deepEqual(allowedMonsters("easy"), ["sleepy", "jelly"]);
  assert(allowedMonsters("normal").includes("archer"));
  assert.deepEqual(allowedMonsters("peaceful"), []);
});

test("torches keep monsters away and water is never a spawn spot", () => {
  const player = { x: 0, z: 0 };
  const dry = () => 4.51;
  const spot = spawnSpot({ rand: seeded(1), player, lights: [], surface: dry });
  assert(spot && Math.hypot(spot.x, spot.z) >= 11);
  const everywhereLit = [];
  for (let x = -30; x <= 30; x += 4)
    for (let z = -30; z <= 30; z += 4) everywhereLit.push([x, 5, z]);
  assert.equal(
    spawnSpot({ rand: seeded(1), player, lights: everywhereLit, surface: dry }),
    null,
  );
  assert.equal(
    spawnSpot({ rand: seeded(1), player, lights: [], surface: () => 1.51 }),
    null,
  );
  assert(litNear([[0, 3, 0]], 3, 3, 4));
  assert(!litNear([[0, 3, 0]], 9, 0));
});

test("swords hit harder and jellies split before they pop", () => {
  assert.equal(weaponDamage(null), 1);
  assert.equal(weaponDamage("stone_sword"), 3);
  const jelly = { type: "jelly", hp: 4 };
  assert.equal(strike(jelly, 3).result, "hit");
  assert.equal(strike(jelly, 3).result, "split");
  const small = { type: "jelly", hp: 1, small: true };
  assert.deepEqual(strike(small, 1), { result: "poof", drop: ["slime", 1] });
});
