// Funny night monsters: who can appear, where, and how a fight goes.
import { ITEMS } from "./items.js";
import { SIZE, WATER_LEVEL } from "./world.js";
import { DIFFICULTIES } from "./worlds.js";

export const MONSTERS = {
  // Sleepy: a green-pyjama sleepwalker who shuffles towards Biel.
  sleepy: { hp: 4, speed: 0.8, damage: 2, from: "easy", drop: ["stick", 2] },
  // Bouncy jelly: hops along and splits in two the first time it pops.
  jelly: { hp: 4, speed: 1, damage: 2, from: "easy", drop: ["slime", 1] },
  // Bony archer: keeps its distance and shoots suction-cup arrows.
  archer: { hp: 3, speed: 0.9, damage: 2, from: "normal", drop: ["bone", 2] },
  // Woolly spider: climbs walls, only at night.
  spider: {
    hp: 3,
    speed: 1.3,
    damage: 2,
    from: "normal",
    drop: ["wool", 2],
    climbs: true,
  },
  // Puffy: a grey cloud that goes "PUF", pushing Biel and knocking over a few
  // natural blocks (never anything Biel built).
  puff: {
    hp: 3,
    speed: 0.9,
    damage: 3,
    from: "hard",
    drop: ["coal", 2],
    puff: true,
  },
  // Mist ghost: floats through caves and walls.
  ghost: {
    hp: 3,
    speed: 1,
    damage: 2,
    from: "hard",
    drop: ["glowstone", 1],
    flies: true,
    cave: true,
  },
};
const LIGHT_RADIUS = 6;

// Monsters for a difficulty; underground only the cave kinds appear.
export const allowedMonsters = (difficulty, underground = false) =>
  Object.keys(MONSTERS).filter(
    (type) =>
      DIFFICULTIES.indexOf(difficulty) >=
        DIFFICULTIES.indexOf(MONSTERS[type].from) &&
      (!MONSTERS[type].cave || underground),
  );

// Monsters only come out in Adventure, at night (or in caves on Hard), when
// switched on and never on Peaceful.
export function canSpawn({
  mode,
  options,
  night,
  count,
  rules,
  underground = false,
}) {
  return (
    mode === "adventure" &&
    options.monsters &&
    options.difficulty !== "peaceful" &&
    (night || (underground && options.difficulty === "hard")) &&
    count < rules.maxMonsters
  );
}

export const litNear = (lights, x, z, y = null) =>
  lights.some(
    ([lx, ly, lz]) =>
      Math.hypot(lx - x, lz - z) <= LIGHT_RADIUS &&
      (y === null || Math.abs(ly - y) <= LIGHT_RADIUS),
  );

// Looks for a dark, dry spot a little away from Biel. Returns null if none.
export function spawnSpot({ rand, player, lights, surface, tries = 16 }) {
  for (let i = 0; i < tries; i++) {
    const angle = rand() * Math.PI * 2,
      dist = 12 + rand() * 10,
      x = Math.round(player.x + Math.sin(angle) * dist),
      z = Math.round(player.z + Math.cos(angle) * dist);
    if (Math.abs(x) > SIZE - 1 || Math.abs(z) > SIZE - 1) continue;
    const y = surface(x, z);
    if (y < WATER_LEVEL || litNear(lights, x, z, y)) continue;
    return { x, y, z };
  }
  return null;
}

export const weaponDamage = (heldId) => ITEMS[heldId]?.damage ?? 1;

// One hit. Big jellies split into two little ones instead of vanishing.
export function strike(monster, damage) {
  monster.hp -= damage;
  if (monster.hp > 0) return { result: "hit" };
  if (monster.type === "jelly" && !monster.small) return { result: "split" };
  return { result: "poof", drop: MONSTERS[monster.type].drop };
}

// Monsters saved with the world, cleaned up when loading.
export function validateMonsters(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m) =>
        m &&
        Object.hasOwn(MONSTERS, m.type) &&
        [m.x, m.y, m.z, m.hp].every(Number.isFinite) &&
        Math.abs(m.x) <= SIZE &&
        Math.abs(m.z) <= SIZE &&
        m.hp > 0,
    )
    .slice(0, 12)
    .map((m) => ({
      type: m.type,
      x: m.x,
      y: m.y,
      z: m.z,
      hp: Math.min(m.hp, MONSTERS[m.type].hp),
      small: m.type === "jelly" && m.small === true,
    }));
}
