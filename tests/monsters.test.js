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
  assert.deepEqual(allowedMonsters("normal"), [
    "sleepy",
    "jelly",
    "archer",
    "spider",
  ]);
  assert(allowedMonsters("hard").includes("puff"));
  assert(!allowedMonsters("hard").includes("ghost"), "ghosts only in caves");
  assert(allowedMonsters("hard", true).includes("ghost"));
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

test("monsters saved with the world are cleaned up when loading", async () => {
  const { validateMonsters } = await import("../src/monsters.js");
  const out = validateMonsters([
    { type: "sleepy", x: 1, y: 3, z: 1, hp: 99 },
    { type: "dragon", x: 1, y: 3, z: 1, hp: 2 },
    { type: "jelly", x: 1, y: 3, z: 1, hp: 0 },
    { type: "archer", x: 1, y: 3, z: 1, hp: 2, small: true },
  ]);
  assert.deepEqual(out, [
    { type: "sleepy", x: 1, y: 3, z: 1, hp: 4, small: false },
    { type: "archer", x: 1, y: 3, z: 1, hp: 2, small: false },
  ]);
});

test("on Hard, caves have monsters even by day; never on easier levels", () => {
  const day = { mode: "adventure", count: 0, night: false, underground: true };
  assert(
    canSpawn({
      ...day,
      options: normalizeOptions({ difficulty: "hard" }),
      rules: R.hard,
    }),
  );
  assert(
    !canSpawn({
      ...day,
      options: normalizeOptions({ difficulty: "normal" }),
      rules: R.normal,
    }),
  );
  assert(
    !canSpawn({
      ...day,
      underground: false,
      options: normalizeOptions({ difficulty: "hard" }),
      rules: R.hard,
    }),
  );
});

test("monsters only appear where the light level is 7 or less", () => {
  const player = { x: 0, z: 0 };
  const dry = () => 4.51;
  assert.equal(
    spawnSpot({ rand: seeded(2), player, lightAt: () => 8, surface: dry }),
    null,
  );
  assert(
    spawnSpot({ rand: seeded(2), player, lightAt: () => 7, surface: dry }),
  );
});

test("a bow drawn longer shoots faster and harder", async () => {
  const { bowShot } = await import("../src/monsters.js");
  const quick = bowShot(0),
    full = bowShot(1),
    longer = bowShot(5);
  assert(quick.speed < full.speed && quick.damage < full.damage);
  assert.deepEqual(longer, full, "no more than a full draw");
  assert.equal(bowShot().damage, 3, "an unmeasured shot is a medium one");
});

test("woolly spiders only attack at night; their string and Puffy's dust are ingredients", async () => {
  const { attacksNow, MONSTERS } = await import("../src/monsters.js");
  const { RECIPES } = await import("../src/recipes.js");
  assert.equal(attacksNow("spider", false), false);
  assert.equal(attacksNow("spider", true), true);
  assert.equal(attacksNow("sleepy", false), true);
  for (const type of ["spider", "puff"]) {
    const [drop] = MONSTERS[type].drop;
    assert(
      RECIPES.some((r) => Object.hasOwn(r.needs, drop)),
      `${drop} is used in a recipe`,
    );
  }
});
