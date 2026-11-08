export const SIZE = 28;
export const WATER_LEVEL = 2.2;
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
  TYPES = 30;
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
  type === DOOR_OPEN || type === TORCH || cropInfo(type) !== null;
export const seeThrough = (type) =>
  type === GLASS ||
  type === DOOR_OPEN ||
  type === TORCH ||
  type === BED ||
  cropInfo(type) !== null;
export const key = (x, y, z) => `${x},${y},${z}`;
export function height(x, z) {
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
export function generate() {
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
export function validateSave(raw) {
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
      Math.abs(e[0]) <= SIZE &&
      Math.abs(e[2]) <= SIZE &&
      e[1] >= 1 &&
      e[1] <= 30 &&
      (e[3] === null || (Number.isInteger(e[3]) && e[3] >= 0 && e[3] < TYPES)),
  );
  return edits;
}
export function validatePlayer(raw) {
  if (!raw) return null;
  const { x, y, z, yaw, pitch, firstPerson } = raw;
  if (![x, y, z, yaw, pitch].every(Number.isFinite)) return null;
  if (Math.abs(x) > SIZE || Math.abs(z) > SIZE || y < 0.5 || y > 40)
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
