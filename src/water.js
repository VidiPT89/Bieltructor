// Flowing water and lava. A source feeds the cells around it: liquid falls
// down first, and on solid ground it spreads sideways, one level less per
// step. Liquid with nothing feeding it dries up a level at a time. Water
// spreads three blocks; lava, thick and slow, only one.
import {
  waterLevel,
  flowBlock,
  WATER,
  lavaLevel,
  LAVA,
  LAVA_FLOW,
  isWater,
  isLava,
} from "./world.js";

const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const k = (x, y, z) => `${x},${y},${z}`;

const WATER_FLOW = { level: waterLevel, block: flowBlock, source: WATER };
const LAVA_FLOWS = {
  level: lavaLevel,
  block: (n) => (n >= 2 ? LAVA : LAVA_FLOW),
  source: LAVA,
};

// `dirty`: keys ("x,y,z") of cells that may need to change.
// `typeAt(x, y, z)`: block type or undefined for air.
// `inside(x, y, z)`: whether the liquid may go there.
// Returns the changes ([x, y, z, type or null]) and the cells to look at next.
function flow(liquid, dirty, typeAt, inside, limit) {
  const { level: levelOf, block, source } = liquid,
    full = levelOf(source) - 1;
  const changed = new Map(),
    next = new Set();
  const get = (x, y, z) => {
    const id = k(x, y, z);
    return changed.has(id) ? (changed.get(id) ?? undefined) : typeAt(x, y, z);
  };
  const set = (x, y, z, type) => {
    changed.set(k(x, y, z), type);
    next.add(k(x, y, z));
    next.add(k(x, y - 1, z));
    next.add(k(x, y + 1, z));
    for (const [dx, dz] of SIDES) next.add(k(x + dx, y, z + dz));
  };
  let done = 0;
  for (const id of dirty) {
    if (done >= limit) {
      next.add(id);
      continue;
    }
    done++;
    const [x, y, z] = id.split(",").map(Number);
    const type = get(x, y, z);
    let level = levelOf(type);
    if (!level) continue;
    // Flowing liquid needs the same liquid above it or a fuller neighbour.
    if (type !== source) {
      let want = levelOf(get(x, y + 1, z)) ? full : 0;
      for (const [dx, dz] of SIDES)
        want = Math.max(want, levelOf(get(x + dx, y, z + dz)) - 1);
      want = Math.min(full, want);
      if (want !== level) {
        set(x, y, z, want > 0 ? block(want) : null);
        level = want;
      }
      if (!level) continue;
    }
    // Falling comes first; on solid ground the liquid spreads sideways.
    const below = get(x, y - 1, z);
    if (below === undefined && inside(x, y - 1, z)) {
      set(x, y - 1, z, block(full));
      continue;
    }
    if (levelOf(below) || level <= 1) continue;
    for (const [dx, dz] of SIDES) {
      const nx = x + dx,
        nz = z + dz,
        side = get(nx, y, nz);
      if (!inside(nx, y, nz)) continue;
      if (
        side === undefined ||
        (levelOf(side) && side !== source && levelOf(side) < level - 1)
      )
        set(nx, y, nz, block(level - 1));
    }
  }
  return {
    changes: [...changed].map(([id, type]) => [
      ...id.split(",").map(Number),
      type,
    ]),
    dirty: next,
  };
}

export const flowWater = (dirty, typeAt, inside, limit = 64) =>
  flow(WATER_FLOW, dirty, typeAt, inside, limit);
export const flowLava = (dirty, typeAt, inside, limit = 64) =>
  flow(LAVA_FLOWS, dirty, typeAt, inside, limit);

// Lava that touches water (beside or above it) cools into stone.
// Returns the changes ([x, y, z, 2]).
export function quench(keys, typeAt) {
  const out = new Map();
  for (const id of keys) {
    const [x, y, z] = id.split(",").map(Number);
    if (!isLava(typeAt(x, y, z))) continue;
    const wet =
      isWater(typeAt(x, y + 1, z)) ||
      SIDES.some(([dx, dz]) => isWater(typeAt(x + dx, y, z + dz)));
    if (wet) out.set(id, [x, y, z, 2]);
  }
  return [...out.values()];
}

// The cells around a changed block, for waking up the liquid near it.
export function around([x, y, z]) {
  return [
    k(x, y, z),
    k(x, y + 1, z),
    k(x, y - 1, z),
    ...SIDES.map(([dx, dz]) => k(x + dx, y, z + dz)),
  ];
}
