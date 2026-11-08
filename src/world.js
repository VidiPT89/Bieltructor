export const SIZE = 28;
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
export function solid(blocks, x, y, z) {
  return blocks.has(
    key(Math.floor(x + 0.5), Math.floor(y + 0.5), Math.floor(z + 0.5)),
  );
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
      (e[3] === null || (Number.isInteger(e[3]) && e[3] >= 0 && e[3] < 8)),
  );
  return edits;
}
