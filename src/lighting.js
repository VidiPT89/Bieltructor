// Block light: levels from 0 to 15 kept for every cell of the world.
// Sky light comes down from above and spreads into openings; torches,
// lanterns, glowstone and furnaces light up their surroundings. Each step
// away from a light loses one level.

// How much light each kind of block gives (block types from world.js).
const LIGHT_SOURCES = { 13: 14, 7: 15, 36: 15, 41: 12 };
export const MAX_LIGHT = 15;

export class LightMap {
  // size: half width of the world; maxY: highest block; typeAt(x, y, z);
  // opaque(type) tells whether light stops at a block.
  constructor({ size, maxY, typeAt, opaque }) {
    this.size = size;
    this.maxY = maxY;
    this.width = size * 2 + 1;
    this.height = maxY + 1;
    this.typeAt = typeAt;
    this.opaque = opaque;
    this.sky = new Uint8Array(this.width * this.width * this.height);
    this.block = new Uint8Array(this.sky.length);
  }

  inside(x, y, z) {
    return (
      Math.abs(x) <= this.size &&
      Math.abs(z) <= this.size &&
      y >= 0 &&
      y <= this.maxY
    );
  }

  index(x, y, z) {
    return ((x + this.size) * this.width + (z + this.size)) * this.height + y;
  }

  // Light at a cell: torches always count, the sky only as much as the day allows.
  level(x, y, z, daylight = 1) {
    if (!this.inside(x, y, z)) return Math.round(MAX_LIGHT * daylight);
    const i = this.index(x, y, z);
    return Math.max(this.block[i], Math.round(this.sky[i] * daylight));
  }

  blocked(x, y, z) {
    return this.opaque(this.typeAt(x, y, z));
  }

  // Recomputes the light inside a box (inclusive). Cells just outside the
  // box keep their light and shine in, so the box can be small after an edit.
  relight(x0, x1, z0, z1) {
    x0 = Math.max(-this.size, x0);
    z0 = Math.max(-this.size, z0);
    x1 = Math.min(this.size, x1);
    z1 = Math.min(this.size, z1);
    const inBox = (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
    const skyQueue = [],
      blockQueue = [];
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++) {
        let open = true;
        for (let y = this.maxY; y >= 0; y--) {
          const i = this.index(x, y, z),
            type = this.typeAt(x, y, z);
          if (open && this.opaque(type)) open = false;
          this.sky[i] = open ? MAX_LIGHT : 0;
          this.block[i] = 0;
          const source = LIGHT_SOURCES[type];
          if (source) {
            this.block[i] = source;
            blockQueue.push(x, y, z);
          }
        }
      }
    // Light coming in from just outside the box, and sky light at every edge
    // of the open sky (so it can spread sideways into caves and under roofs).
    for (let x = x0 - 1; x <= x1 + 1; x++)
      for (let z = z0 - 1; z <= z1 + 1; z++) {
        const outside = !inBox(x, z);
        if (Math.abs(x) > this.size || Math.abs(z) > this.size) continue;
        for (let y = 0; y <= this.maxY; y++) {
          const i = this.index(x, y, z);
          if (outside) {
            if (this.sky[i] > 1) skyQueue.push(x, y, z);
            if (this.block[i] > 1) blockQueue.push(x, y, z);
          } else if (this.sky[i] === MAX_LIGHT && this.hasDarkerSide(x, y, z))
            skyQueue.push(x, y, z);
        }
      }
    this.spread(this.sky, skyQueue, inBox);
    this.spread(this.block, blockQueue, inBox);
  }

  relightAll() {
    this.relight(-this.size, this.size, -this.size, this.size);
  }

  hasDarkerSide(x, y, z) {
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz;
      if (
        this.inside(nx, y, nz) &&
        this.sky[this.index(nx, y, nz)] < MAX_LIGHT - 1 &&
        !this.blocked(nx, y, nz)
      )
        return true;
    }
    return false;
  }

  // Breadth-first spread: each neighbour that is not solid gets one level less.
  spread(levels, queue, inBox) {
    for (let head = 0; head < queue.length; head += 3) {
      const x = queue[head],
        y = queue[head + 1],
        z = queue[head + 2];
      const next = levels[this.index(x, y, z)] - 1;
      if (next <= 0) continue;
      for (const [dx, dy, dz] of [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          nz = z + dz;
        if (
          !this.inside(nx, ny, nz) ||
          !inBox(nx, nz) ||
          this.blocked(nx, ny, nz)
        )
          continue;
        const i = this.index(nx, ny, nz);
        if (levels[i] >= next) continue;
        levels[i] = next;
        queue.push(nx, ny, nz);
      }
    }
  }
}

// How bright a face looks for a light level: never fully black, for a child.
export const brightness = (level) =>
  0.2 + 0.8 * Math.pow(level / MAX_LIGHT, 1.3);
