// Worlds: options, difficulty rules, saving format (v2) and migration from v1.
import { Inventory } from "./inventory.js";
import { MAX_GROUND_BAGS } from "./loot.js";
import { validateSave, validatePlayer, SIZES, MAX_Y } from "./world.js";

const SAVE_VERSION = 2;
export const MAX_WORLDS = 6;
const MODES = ["adventure", "creative"];
export const DIFFICULTIES = ["peaceful", "easy", "normal", "hard"];
const CYCLES = ["normal", "day", "night"];
// Length of a full day in seconds.
export const DAY_LENGTHS = { short: 600, normal: 1200, long: 1800 };

// Everything that changes with difficulty lives here.
export const difficultyRules = {
  peaceful: {
    // Tools wear out only on Normal and Hard.
    toolWear: false,
    // Lava burns only on Normal and Hard; below that it is warm magma.
    lavaHurts: false,
    maxMonsters: 0,
    damage: 0,
    hungerRate: 0,
    regenEvery: 2,
    monsterSpeed: 0,
    starvationHurts: false,
  },
  easy: {
    // Tools wear out only on Normal and Hard.
    toolWear: false,
    lavaHurts: false,
    maxMonsters: 2,
    damage: 0.5,
    hungerRate: 0.5,
    regenEvery: 3,
    monsterSpeed: 1.5,
    starvationHurts: false,
  },
  normal: {
    // Tools wear out only on Normal and Hard.
    toolWear: true,
    lavaHurts: true,
    maxMonsters: 4,
    damage: 1,
    hungerRate: 1,
    regenEvery: 5,
    monsterSpeed: 2,
    starvationHurts: true,
  },
  hard: {
    // Tools wear out only on Normal and Hard.
    toolWear: true,
    lavaHurts: true,
    maxMonsters: 6,
    damage: 1.5,
    hungerRate: 1.5,
    regenEvery: 8,
    monsterSpeed: 2.6,
    starvationHurts: true,
  },
};

const pick = (value, allowed, fallback) =>
  allowed.includes(value) ? value : fallback;

// Defaults that suit a young player: Adventure on Easy, gentle rules.
function defaultOptions(difficulty = "easy") {
  const gentle = difficulty === "peaceful" || difficulty === "easy";
  return {
    difficulty,
    monsters: difficulty !== "peaceful",
    animals: true,
    cycle: "normal",
    dayLength: "normal",
    hunger: !gentle,
    keepInventory: gentle,
    // "Animals only friends": farm animals can never be hurt (Peaceful and
    // Easy start with it on).
    friendsOnly: gentle,
    weather: true,
  };
}

export function normalizeOptions(raw = {}) {
  if (!raw || typeof raw !== "object") raw = {};
  const difficulty = pick(raw.difficulty, DIFFICULTIES, "easy");
  const base = defaultOptions(difficulty);
  const flag = (v, d) => (typeof v === "boolean" ? v : d);
  const options = {
    difficulty,
    monsters: flag(raw.monsters, base.monsters),
    animals: flag(raw.animals, base.animals),
    cycle: pick(raw.cycle, CYCLES, base.cycle),
    dayLength: pick(raw.dayLength, Object.keys(DAY_LENGTHS), base.dayLength),
    hunger: flag(raw.hunger, base.hunger),
    keepInventory: flag(raw.keepInventory, base.keepInventory),
    friendsOnly: flag(raw.friendsOnly, base.friendsOnly),
    weather: flag(raw.weather, base.weather),
  };
  // Peaceful never has monsters, whatever the switch says.
  if (difficulty === "peaceful") options.monsters = false;
  return options;
}

const cleanName = (name, fallback) =>
  typeof name === "string" && name.trim() ? name.trim().slice(0, 32) : fallback;

export function newWorld({
  id,
  name,
  mode,
  options,
  size = null,
  seed = null,
  now = Date.now(),
}) {
  return {
    version: SAVE_VERSION,
    id,
    name: cleanName(name, "Mundo do Biel"),
    mode: pick(mode, MODES, "adventure"),
    options: normalizeOptions(options),
    createdAt: now,
    updatedAt: now,
    // Worlds without a seed use the original valley (all worlds before v3).
    size: Object.hasOwn(SIZES, size) ? size : null,
    seed: Number.isInteger(seed) ? seed : null,
    // Terrain generation: 2 adds copper, lakes, wells and bee nests;
    // 3 adds lava deep in the caves, red sand and more flowers.
    gen: 3,
    edits: [],
    player: null,
    inventory: [],
    time: 0.3,
    day: 1,
    age: 0,
    animalsSpawned: false,
    tutorial: null,
    spawnPoint: null,
    creatures: [],
    monsters: [],
    backpacks: [],
    chests: {},
    furnaces: {},
    signs: {},
  };
}

const finite = (v, d) => (Number.isFinite(v) ? v : d);
const wrap = (t) => t - Math.floor(t);

// Accepts a v1 or v2 world and returns a clean v2 world, or null.
export function validateWorld(raw, { id, now = Date.now(), name } = {}) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.version === 1) {
    const edits = validateSave(raw, SIZES.small);
    if (!edits) return null;
    // Worlds from the first version were creative sandboxes.
    const world = newWorld({
      id,
      name: name ?? "O vale do Biel",
      mode: "creative",
      options: { difficulty: "peaceful", cycle: "normal" },
      now,
    });
    world.edits = edits;
    return world;
  }
  if (raw.version !== SAVE_VERSION) return null;
  const size =
    Object.hasOwn(SIZES, raw.size) && Number.isInteger(raw.seed)
      ? raw.size
      : null;
  const edits = validateSave(
    { version: 1, edits: raw.edits },
    size ? SIZES[size] : SIZES.small,
  );
  if (!edits) return null;
  const world = newWorld({
    id: typeof raw.id === "string" ? raw.id : id,
    name: raw.name,
    mode: raw.mode,
    // Worlds from before the "Animals only friends" switch keep every
    // animal safe, whatever their difficulty.
    options:
      raw.options && typeof raw.options === "object"
        ? { friendsOnly: true, ...raw.options }
        : raw.options,
    size,
    seed: size ? raw.seed : null,
    now,
  });
  // Worlds saved before generation 2 keep their original terrain.
  world.gen = [2, 3].includes(raw.gen) ? raw.gen : 1;
  world.createdAt = finite(raw.createdAt, now);
  world.updatedAt = finite(raw.updatedAt, now);
  world.edits = edits;
  const player = validatePlayer(raw.player);
  if (player)
    world.player = {
      ...player,
      health: Math.max(1, Math.min(20, finite(raw.player.health, 20))),
      food: Math.max(0, Math.min(20, finite(raw.player.food, 20))),
    };
  world.time = wrap(finite(raw.time, 0.3));
  world.day = Math.max(1, Math.floor(finite(raw.day, 1)));
  world.age = Math.max(0, finite(raw.age, 0));
  if (raw.weather && typeof raw.weather === "object")
    world.weather = raw.weather;
  world.animalsSpawned = raw.animalsSpawned === true;
  if (typeof raw.device === "string") world.device = raw.device.slice(0, 20);
  if (Number.isInteger(raw.tutorial?.step) && raw.tutorial.step >= 0)
    world.tutorial = {
      step: raw.tutorial.step,
      amount: finite(raw.tutorial.amount, 0),
    };
  if (
    Array.isArray(raw.spawnPoint) &&
    raw.spawnPoint.length === 3 &&
    raw.spawnPoint.every(Number.isInteger)
  )
    world.spawnPoint = raw.spawnPoint;
  if (Array.isArray(raw.inventory))
    world.inventory = raw.inventory.slice(0, 36);
  if (Array.isArray(raw.creatures))
    world.creatures = raw.creatures.slice(0, 60);
  // Reject an oversized save instead of silently deleting its ground bags.
  if (Array.isArray(raw.backpacks) && raw.backpacks.length > MAX_GROUND_BAGS)
    return null;
  if (Array.isArray(raw.backpacks))
    world.backpacks = raw.backpacks
      .filter(
        (pack) =>
          pack &&
          [pack.x, pack.y, pack.z].every(Number.isFinite) &&
          Math.abs(pack.x) <= (size ? SIZES[size] : SIZES.small) &&
          Math.abs(pack.z) <= (size ? SIZES[size] : SIZES.small) &&
          pack.y >= 0 &&
          pack.y <= MAX_Y + 10 &&
          Array.isArray(pack.items),
      )
      .map(({ x, y, z, items }) => ({
        x,
        y,
        z,
        items: Inventory.from(items, Math.min(items.length, 36)).toJSON(),
      }));
  // Chests and furnaces are stored by block position ("x,y,z").
  const byPlace = (o) =>
    o && typeof o === "object" && !Array.isArray(o)
      ? Object.fromEntries(
          Object.entries(o)
            .filter(([k]) => /^-?\d+,-?\d+,-?\d+$/.test(k))
            .slice(0, 200),
        )
      : {};
  world.chests = byPlace(raw.chests);
  world.furnaces = byPlace(raw.furnaces);
  // Sign texts, by position, up to 30 characters each.
  world.signs = Object.fromEntries(
    Object.entries(byPlace(raw.signs))
      .filter(([, v]) => typeof v === "string")
      .map(([k, v]) => [k, v.slice(0, 30)]),
  );
  if (Array.isArray(raw.monsters)) world.monsters = raw.monsters.slice(0, 12);
  return world;
}

const summary = (world) => ({
  id: world.id,
  name: world.name,
  mode: world.mode,
  difficulty: world.options.difficulty,
  updatedAt: world.updatedAt,
});

// Storage keeps an index of worlds plus one entry per world.
export function createStore(storage) {
  const read = (k) => {
    try {
      return JSON.parse(storage.getItem(k));
    } catch {
      return null;
    }
  };
  const store = {
    list() {
      const index = read("biel-worlds");
      return Array.isArray(index)
        ? index.filter(
            (w) =>
              w &&
              typeof w.id === "string" &&
              typeof w.name === "string" &&
              MODES.includes(w.mode) &&
              DIFFICULTIES.includes(w.difficulty) &&
              Number.isFinite(w.updatedAt),
          )
        : [];
    },
    load(id) {
      return validateWorld(read("biel-world-" + id), { id });
    },
    save(world) {
      storage.setItem("biel-world-" + world.id, JSON.stringify(world));
      const index = store.list().filter((w) => w.id !== world.id);
      index.unshift(summary(world));
      storage.setItem("biel-worlds", JSON.stringify(index));
    },
    // A small picture of each world for the list. It stays on this device.
    thumb(id) {
      const url = storage.getItem("biel-thumb-" + id);
      return typeof url === "string" &&
        url.startsWith("data:image/jpeg;base64,") &&
        url.length < 60000
        ? url
        : null;
    },
    saveThumb(id, url) {
      try {
        storage.setItem("biel-thumb-" + id, url);
      } catch {}
    },
    remove(id) {
      storage.removeItem("biel-world-" + id);
      storage.removeItem("biel-thumb-" + id);
      storage.setItem(
        "biel-worlds",
        JSON.stringify(store.list().filter((w) => w.id !== id)),
      );
    },
    current() {
      return storage.getItem("biel-current");
    },
    setCurrent(id) {
      storage.setItem("biel-current", id);
    },
    // Moves the single world of version 1 into the list of worlds, once.
    migrate(makeId) {
      if (storage.getItem("biel-worlds") !== null) return null;
      const old = read("biel-world");
      const world = old ? validateWorld(old, { id: makeId() }) : null;
      if (world) {
        const player = validatePlayer(read("biel-player"));
        if (player) world.player = { ...player, health: 20, food: 20 };
        const time = read("biel-player")?.time;
        if (Number.isFinite(time)) world.time = wrap(time);
        store.save(world);
        store.setCurrent(world.id);
      } else storage.setItem("biel-worlds", "[]");
      storage.removeItem("biel-world");
      storage.removeItem("biel-player");
      return world;
    },
  };
  return store;
}
