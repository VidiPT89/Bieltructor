// Half the width of the world and the height of the sea. They change with
// the world that is loaded (see useTerrain), so they are live bindings.
export let SIZE = 28;
export let WATER_LEVEL = 2.2;
export const MAX_Y = 63,
  MAX_SIZE = 64;
export const SIZES = { small: 28, medium: 48, large: 64 };
// Block types: 0-7 natural materials and amber, then the building extras.
export const GLASS = 8,
  DOOR = 9,
  DOOR_OPEN = 10,
  PLANKS = 11,
  BENCH = 12,
  TORCH = 13,
  BED = 14,
  COAL = 15,
  WOOL = 16,
  FARMLAND = 17,
  // Crops: three plants with four growing stages each (18 to 29).
  CROP_BASE = 18,
  SNOW = 30,
  ICE = 31,
  CACTUS = 32,
  IRON_ORE = 33,
  GOLD_ORE = 34,
  CRYSTAL_ORE = 35,
  GLOWSTONE = 36,
  FLOWER = 37,
  TALL_GRASS = 38,
  MUSHROOM = 39,
  CHEST = 40,
  FURNACE = 41,
  STONE_BRICK = 42,
  TYPES = 43;
// Small plants drawn as two crossed panels.
export const isPlant = (type) =>
  type === FLOWER || type === TALL_GRASS || type === MUSHROOM;
export const CROPS = ["wheat", "carrot", "potato"];
export const cropBlock = (crop, stage) =>
  CROP_BASE + CROPS.indexOf(crop) * 4 + stage;
export const cropInfo = (type) =>
  type >= CROP_BASE && type < CROP_BASE + 12
    ? { crop: CROPS[(type - CROP_BASE) >> 2], stage: (type - CROP_BASE) & 3 }
    : null;
// Biel walks through open doors and torches; light passes through the
// blocks that do not fill their whole space.
export const passable = (type) =>
  type === DOOR_OPEN ||
  type === TORCH ||
  cropInfo(type) !== null ||
  isPlant(type);
export const seeThrough = (type) =>
  type === GLASS ||
  type === ICE ||
  isPlant(type) ||
  type === DOOR_OPEN ||
  type === TORCH ||
  type === BED ||
  cropInfo(type) !== null;
export const key = (x, y, z) => `${x},${y},${z}`;
function legacyHeight(x, z) {
  return Math.max(
    1,
    Math.floor(
      3 +
        Math.sin(x * 0.19) * 1.7 +
        Math.cos(z * 0.23) * 1.5 +
        Math.sin((x + z) * 0.31) * 0.7,
    ),
  );
}
function legacyGenerate() {
  const blocks = new Map();
  const put = (x, y, z, t) => blocks.set(key(x, y, z), t);
  for (let x = -SIZE; x <= SIZE; x++)
    for (let z = -SIZE; z <= SIZE; z++) {
      let h = height(x, z);
      for (let y = 0; y <= h; y++)
        put(x, y, z, y === h ? (h <= 2 ? 3 : 0) : y < h - 2 ? 2 : 1);
      // Coal hides in the stone a few blocks down.
      for (let y = 1; y < h - 2; y++)
        if ((((x * 7 + y * 13 + z * 31) % 9) + 9) % 9 === 0) put(x, y, z, COAL);
        // A little iron, and on the very bottom a rare blue crystal.
        else if ((((x * 11 + y * 17 + z * 23) % 13) + 13) % 13 === 0)
          put(x, y, z, IRON_ORE);
        else if (y === 1 && (((x * 5 + z * 29) % 61) + 61) % 61 === 0)
          put(x, y, z, CRYSTAL_ORE);
      if (
        h > 3 &&
        Math.abs(x) > 3 &&
        Math.abs(z) > 3 &&
        (x * 137 + z * 311) % 97 === 0
      ) {
        for (let y = h + 1; y < h + 5; y++) put(x, y, z, 4);
        for (let dx = -2; dx <= 2; dx++)
          for (let dz = -2; dz <= 2; dz++)
            for (let dy = 4; dy <= 6; dy++)
              if (Math.abs(dx) + Math.abs(dz) + (dy === 6 ? 1 : 0) < 4)
                put(x + dx, h + dy, z + dz, 5);
      }
    }
  return blocks;
}
let terrainHeight = legacyHeight,
  terrainGenerate = legacyGenerate,
  terrainBiome = () => "valley";
export const height = (x, z) => terrainHeight(x, z);
export const generate = () => terrainGenerate();
export const biomeAt = (x, z) => terrainBiome(x, z);

// Worlds without a seed keep the original valley, so old worlds never change.
export function useTerrain({ seed = null, size = null } = {}) {
  if (!Number.isInteger(seed)) {
    SIZE = 28;
    WATER_LEVEL = 2.2;
    terrainHeight = legacyHeight;
    terrainGenerate = legacyGenerate;
    terrainBiome = () => "valley";
    return;
  }
  const t = makeTerrain(seed, SIZES[size] ?? SIZES.medium);
  SIZE = t.size;
  WATER_LEVEL = t.water;
  terrainHeight = t.height;
  terrainGenerate = t.generate;
  terrainBiome = t.biome;
}

// Classic gradient noise with a seeded shuffle.
function makeNoise(seed) {
  let s = seed >>> 0 || 1;
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = [...p, ...p];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (h, x, y, z) => {
    const u = (h & 15) < 8 ? x : y,
      v = (h & 15) < 4 ? y : (h & 15) === 12 || (h & 15) === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };
  function noise3(x, y, z) {
    const X = Math.floor(x) & 255,
      Y = Math.floor(y) & 255,
      Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x),
      v = fade(y),
      w = fade(z);
    const A = perm[X] + Y,
      AA = perm[A] + Z,
      AB = perm[A + 1] + Z,
      B = perm[X + 1] + Y,
      BA = perm[B] + Z,
      BB = perm[B + 1] + Z;
    return lerp(
      lerp(
        lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
        lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u),
        v,
      ),
      lerp(
        lerp(
          grad(perm[AA + 1], x, y, z - 1),
          grad(perm[BA + 1], x - 1, y, z - 1),
          u,
        ),
        lerp(
          grad(perm[AB + 1], x, y - 1, z - 1),
          grad(perm[BB + 1], x - 1, y - 1, z - 1),
          u,
        ),
        v,
      ),
      w,
    );
  }
  return { noise3, noise2: (x, z) => noise3(x, 0.5, z) };
}
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// A repeatable number from 0 to 1 for a spot in the world.
const spot = (seed, x, z, salt = 0) => {
  let h =
    (seed ^ (x * 374761393) ^ (z * 668265263) ^ (salt * 1274126177)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// The island for new worlds: biomes, hills, caves and plants.
export function makeTerrain(seed, size) {
  const n = makeNoise(seed),
    SEA = 12;
  const fbm = (x, z) =>
    n.noise2(x, z) * 0.6 +
    n.noise2(x * 2.1, z * 2.1) * 0.3 +
    n.noise2(x * 4.3, z * 4.3) * 0.1;
  function height(x, z) {
    const edge = smoothstep(0.74, 1, Math.max(Math.abs(x), Math.abs(z)) / size);
    const hills = Math.max(0, fbm(x * 0.012 + 40, z * 0.012 + 40));
    const h = 17 + fbm(x * 0.03, z * 0.03) * 5 + hills * hills * 40 - edge * 14;
    return Math.max(3, Math.min(48, Math.floor(h)));
  }
  function biome(x, z) {
    const h = height(x, z);
    if (h <= SEA + 1) return "beach";
    const temp = n.noise2(x * 0.02 + 300, z * 0.02),
      moist = n.noise2(x * 0.02 - 500, z * 0.02 + 200);
    if (h >= 30 || temp < -0.34) return "snow";
    if (temp > 0.2 && moist < 0.05) return "desert";
    if (moist > 0.22 && h < SEA + 5) return "swamp";
    if (moist > -0.02) return "forest";
    return "plains";
  }
  function generate() {
    const blocks = new Map();
    const put = (x, y, z, t) => blocks.set(key(x, y, z), t);
    const tree = (x, h, z, kind) => {
      const tall = 4 + Math.floor(spot(seed, x, z, 7) * 2);
      for (let y = h + 1; y <= h + tall; y++) put(x, y, z, 4);
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++)
          for (let dy = tall - 2; dy <= tall + 1; dy++) {
            const r =
              kind === "spruce"
                ? Math.max(0, 2 - (dy - tall + 2) * 0.7)
                : 2.2 - (dy === tall + 1 ? 1 : 0);
            if (
              Math.abs(dx) + Math.abs(dz) <= r &&
              !(dx === 0 && dz === 0 && dy <= tall)
            )
              if (!blocks.has(key(x + dx, h + dy, z + dz)))
                put(x + dx, h + dy, z + dz, 5);
          }
    };
    for (let x = -size; x <= size; x++)
      for (let z = -size; z <= size; z++) {
        const h = height(x, z),
          b = biome(x, z);
        const sandy = b === "beach" || b === "desert";
        for (let y = 0; y <= h; y++) {
          // Winding tunnels below ground, kept clear of the sea line.
          if (y >= 2 && y <= h - 4 && (y <= SEA - 2 || y >= SEA + 1)) {
            const a = n.noise3(x * 0.06, y * 0.09, z * 0.06),
              c = n.noise3(x * 0.06 + 50, y * 0.09, z * 0.06 + 50);
            if (a * a + c * c < 0.012) continue;
          }
          let t = 2;
          if (y === h) t = sandy ? 3 : b === "snow" ? SNOW : 0;
          else if (y >= h - 3) t = sandy ? 3 : 1;
          else if (y > 0) {
            // Ores: deeper means rarer and shinier.
            const o = spot(seed, x * 31 + y, z, 1);
            if (o < 0.06) t = COAL;
            else if (o < 0.085 && y < 16) t = IRON_ORE;
            else if (o < 0.095 && y < 9) t = GOLD_ORE;
            else if (o < 0.1 && y < 6) t = CRYSTAL_ORE;
            else if (o < 0.104 && y < 11) t = GLOWSTONE;
          }
          put(x, y, z, t);
        }
        // Frozen water in the snow, plants and trees on land.
        if (h < SEA && b === "snow") put(x, SEA, z, ICE);
        if (h <= SEA || !blocks.has(key(x, h, z))) continue;
        const r = spot(seed, x, z, 2);
        const clear = Math.abs(x) < size - 3 && Math.abs(z) < size - 3;
        if (b === "forest" && r < 0.045 && clear) tree(x, h, z, "oak");
        else if (b === "plains" && r < 0.012 && clear) tree(x, h, z, "oak");
        else if (b === "swamp" && r < 0.03 && clear) tree(x, h, z, "oak");
        else if (b === "snow" && r < 0.03 && clear) tree(x, h, z, "spruce");
        else if (b === "desert" && r < 0.02)
          for (let y = h + 1; y <= h + 2 + (r < 0.01); y++)
            put(x, y, z, CACTUS);
        else if ((b === "plains" || b === "forest") && r < 0.12)
          put(x, h + 1, z, r < 0.05 ? FLOWER : TALL_GRASS);
        else if (b === "swamp" && r < 0.12) put(x, h + 1, z, MUSHROOM);
      }
    // Ruins and cabins, each with a treasure chest.
    for (let cx = -size + 6; cx < size - 6; cx += 24)
      for (let cz = -size + 6; cz < size - 6; cz += 24) {
        const x = cx + Math.floor(spot(seed, cx, cz, 5) * 14),
          z = cz + Math.floor(spot(seed, cz, cx, 6) * 14),
          b = biome(x, z),
          h = height(x, z);
        if (h <= SEA + 1 || spot(seed, x, z, 8) > 0.55) continue;
        const cabin = b === "forest" || b === "plains";
        for (let dx = -2; dx <= 2; dx++)
          for (let dz = -2; dz <= 2; dz++) {
            for (let y = h + 1; y <= h + 5; y++)
              blocks.delete(key(x + dx, y, z + dz));
            put(x + dx, h, z + dz, cabin ? PLANKS : STONE_BRICK);
            const wall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
            if (!wall) continue;
            // Ruins have broken walls; cabins have a door and a window.
            const top = cabin
              ? 3
              : 1 + Math.floor(spot(seed, x + dx, z + dz, 9) * 3);
            for (let y = h + 1; y <= h + top; y++)
              put(x + dx, y, z + dz, cabin ? PLANKS : STONE_BRICK);
          }
        if (cabin) {
          for (let dx = -2; dx <= 2; dx++)
            for (let dz = -2; dz <= 2; dz++) put(x + dx, h + 4, z + dz, 4);
          put(x, h + 1, z + 2, DOOR);
          put(x, h + 2, z + 2, DOOR);
          put(x + 2, h + 2, z, GLASS);
          put(x - 1, h + 1, z - 1, BED);
          put(x + 1, h + 1, z - 1, TORCH);
        }
        put(x + (cabin ? 1 : 0), h + 1, z + (cabin ? 1 : 0), CHEST);
      }
    return blocks;
  }
  return { size, water: SEA + 0.2, height, biome, generate };
}

// A dry place to start, as close to the middle of the world as possible.
// `free(x, z)` can reject spots (for example under a tree).
export function findSpawn(free = () => true) {
  for (let r = 0; r <= SIZE; r++)
    for (let x = -r; x <= r; x++)
      for (const z of r ? [-r, r] : [0])
        for (const [cx, cz] of [
          [x, z],
          [z, x],
        ])
          if (height(cx, cz) > WATER_LEVEL && free(cx, cz)) return [cx, cz];
  return [0, 0];
}

// Real water: under the sea line with open sky above (caves stay dry).
export function inWater(blocks, x, y, z) {
  if (y >= WATER_LEVEL) return false;
  const bx = Math.round(x),
    bz = Math.round(z);
  for (let yy = Math.floor(y + 0.5); yy <= Math.floor(WATER_LEVEL); yy++) {
    const t = blocks.get(key(bx, yy, bz));
    if (t !== undefined && !passable(t)) return false;
  }
  return true;
}

function solid(blocks, x, y, z) {
  const type = blocks.get(
    key(Math.floor(x + 0.5), Math.floor(y + 0.5), Math.floor(z + 0.5)),
  );
  return type !== undefined && !passable(type);
}
// Opens or closes the whole vertical door at x,y,z. Returns the keys changed.
export function toggleDoor(blocks, x, y, z) {
  const isDoor = (t) => t === DOOR || t === DOOR_OPEN;
  if (!isDoor(blocks.get(key(x, y, z)))) return [];
  const next = blocks.get(key(x, y, z)) === DOOR ? DOOR_OPEN : DOOR;
  let bottom = y;
  while (isDoor(blocks.get(key(x, bottom - 1, z)))) bottom--;
  const changed = [];
  for (let h = bottom; isDoor(blocks.get(key(x, h, z))); h++) {
    blocks.set(key(x, h, z), next);
    changed.push(key(x, h, z));
  }
  return changed;
}
export function collides(blocks, p) {
  for (const x of [p.x - 0.27, p.x + 0.27])
    for (const z of [p.z - 0.27, p.z + 0.27])
      for (const y of [p.y + 0.05, p.y + 0.85, p.y + 1.65])
        if (solid(blocks, x, y, z)) return true;
  return false;
}
export function validateSave(raw, size = SIZE) {
  if (
    !raw ||
    raw.version !== 1 ||
    !Array.isArray(raw.edits) ||
    raw.edits.length > 50000
  )
    return null;
  const edits = raw.edits.filter(
    (e) =>
      Array.isArray(e) &&
      e.length === 4 &&
      e.slice(0, 3).every(Number.isInteger) &&
      Math.abs(e[0]) <= size &&
      Math.abs(e[2]) <= size &&
      e[1] >= 1 &&
      e[1] <= MAX_Y &&
      (e[3] === null || (Number.isInteger(e[3]) && e[3] >= 0 && e[3] < TYPES)),
  );
  return edits;
}
export function validatePlayer(raw) {
  if (!raw) return null;
  const { x, y, z, yaw, pitch, firstPerson } = raw;
  if (![x, y, z, yaw, pitch].every(Number.isFinite)) return null;
  if (
    Math.abs(x) > MAX_SIZE ||
    Math.abs(z) > MAX_SIZE ||
    y < 0.5 ||
    y > MAX_Y + 10
  )
    return null;
  return {
    x,
    y,
    z,
    yaw,
    pitch: Math.max(-0.25, Math.min(1.15, pitch)),
    firstPerson: firstPerson === true,
  };
}
