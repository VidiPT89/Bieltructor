// The furnace: what it cooks or melts, what burns, and how long it takes.
export const SMELT = {
  iron_ore: "iron_ingot",
  gold_ore: "gold_ingot",
  copper_ore: "copper_ingot",
  sand: "glass",
  red_sand: "glass",
  potato: "baked_potato",
  fish: "cooked_fish",
};
// Seconds of fire for each fuel.
export const FUEL = { coal: 40, wood: 15, planks: 10, stick: 4 };
export const SMELT_SECONDS = 5;

export const emptyFurnace = () => ({
  input: null,
  fuel: null,
  output: null,
  burn: 0,
  progress: 0,
});

export function validateFurnace(raw) {
  const slot = (s) =>
    Array.isArray(s) &&
    typeof s[0] === "string" &&
    Number.isInteger(s[1]) &&
    s[1] > 0
      ? [s[0], Math.min(s[1], 64)]
      : null;
  if (!raw || typeof raw !== "object") return emptyFurnace();
  return {
    input: slot(raw.input),
    fuel: slot(raw.fuel),
    output: slot(raw.output),
    burn: Number.isFinite(raw.burn) ? Math.max(0, raw.burn) : 0,
    progress: Number.isFinite(raw.progress)
      ? Math.min(1, Math.max(0, raw.progress))
      : 0,
  };
}

// Advances a furnace by dt seconds. Returns true while it is cooking.
export function tickFurnace(f, dt) {
  const result = f.input && SMELT[f.input[0]];
  const room =
    result && (!f.output || (f.output[0] === result && f.output[1] < 64));
  if (!result || !room) {
    f.progress = 0;
    f.burn = Math.max(0, f.burn - dt);
    return false;
  }
  if (f.burn <= 0) {
    if (!f.fuel || !FUEL[f.fuel[0]]) return false;
    f.burn += FUEL[f.fuel[0]];
    f.fuel = f.fuel[1] > 1 ? [f.fuel[0], f.fuel[1] - 1] : null;
  }
  f.burn -= dt;
  f.progress += dt / SMELT_SECONDS;
  if (f.progress >= 1 - 1e-9) {
    f.progress = 0;
    f.output = f.output ? [result, f.output[1] + 1] : [result, 1];
    f.input = f.input[1] > 1 ? [f.input[0], f.input[1] - 1] : null;
  }
  return true;
}

// Treasure in the chests of ruins and cabins, the same for a given place.
const LOOT = [
  ["coal", 2, 5, 1],
  ["torch", 2, 6, 0.8],
  ["iron_ore", 1, 3, 0.7],
  ["copper_ore", 1, 4, 0.5],
  ["bread", 1, 2, 0.6],
  ["apple", 2, 4, 0.6],
  ["wheat_seeds", 2, 4, 0.5],
  ["gold_ore", 1, 2, 0.25],
  ["wooden_pickaxe", 1, 1, 0.15],
  ["crystal", 1, 1, 0.12],
];
export function chestLoot(seed, x, y, z) {
  let s = (seed ^ (x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0 || 1;
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const items = [];
  for (const [id, min, max, chance] of LOOT)
    if (rand() < chance)
      items.push([id, min + Math.floor(rand() * (max - min + 1))]);
  return items;
}
