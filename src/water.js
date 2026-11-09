// Flowing water. A source (level 4) feeds the cells around it: water falls
// down first, and on solid ground it spreads sideways, one level less per
// step. Water with nothing feeding it dries up a level at a time.
import { waterLevel, flowBlock, WATER } from "./world.js";

const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const k = (x, y, z) => `${x},${y},${z}`;

// `dirty`: keys ("x,y,z") of cells that may need to change.
// `typeAt(x, y, z)`: block type or undefined for air.
// `inside(x, y, z)`: whether water may go there.
// Returns the changes ([x, y, z, type or null]) and the cells to look at next.
export function flowWater(dirty, typeAt, inside, limit = 64) {
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
    let level = waterLevel(type);
    if (!level) continue;
    // Flowing water needs water above it or a fuller neighbour beside it.
    if (type !== WATER) {
      let want = waterLevel(get(x, y + 1, z)) ? 3 : 0;
      for (const [dx, dz] of SIDES)
        want = Math.max(want, waterLevel(get(x + dx, y, z + dz)) - 1);
      want = Math.min(3, want);
      if (want !== level) {
        set(x, y, z, want > 0 ? flowBlock(want) : null);
        level = want;
      }
      if (!level) continue;
    }
    // Falling comes first; on solid ground water spreads sideways.
    const below = get(x, y - 1, z);
    if (below === undefined && inside(x, y - 1, z)) {
      set(x, y - 1, z, flowBlock(3));
      continue;
    }
    if (waterLevel(below) || level <= 1) continue;
    for (const [dx, dz] of SIDES) {
      const nx = x + dx,
        nz = z + dz,
        side = get(nx, y, nz);
      if (!inside(nx, y, nz)) continue;
      if (
        side === undefined ||
        (waterLevel(side) && side !== WATER && waterLevel(side) < level - 1)
      )
        set(nx, y, nz, flowBlock(level - 1));
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

// The cells around a changed block, for waking up the water near it.
export function around([x, y, z]) {
  return [
    k(x, y, z),
    k(x, y + 1, z),
    k(x, y - 1, z),
    ...SIDES.map(([dx, dz]) => k(x + dx, y, z + dz)),
  ];
}
