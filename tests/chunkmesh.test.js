// The merged chunk mesh: hidden faces are left out, nothing else changes.
import test from "node:test";
import assert from "node:assert/strict";
import { BoxGeometry } from "three";
import {
  FACES,
  buildChunkGeometry,
  tileUV,
  atlasRows,
  ATLAS_COLUMNS,
  TILE,
  GUTTER,
  CELL,
} from "../src/chunkmesh.js";
import { fillsBlock, GLASS, TORCH, LAVA, WATER, BED } from "../src/world.js";

const world = (cells) => {
  const map = new Map(cells.map(([x, y, z, t]) => [`${x},${y},${z}`, t]));
  return (x, y, z) => fillsBlock(map.get(`${x},${y},${z}`));
};
const build = (cells, all = cells) =>
  buildChunkGeometry(cells, world(all), () => 0, 1);

test("a lone block is drawn exactly like a Three.js box", () => {
  const built = build([[0, 0, 0, 2]]),
    box = new BoxGeometry(1, 1, 1);
  assert.deepEqual([...built.positions], [...box.attributes.position.array]);
  assert.deepEqual([...built.normals], [...box.attributes.normal.array]);
  assert.deepEqual([...built.indices], [...box.index.array]);
  assert.equal(FACES.length, 6);
  // The first tile sits inside the top left square of the atlas, past
  // its stretched edge.
  const width = ATLAS_COLUMNS * CELL;
  built.uvs.forEach((value, i) => {
    const whole = box.attributes.uv.array[i];
    const expected =
      i % 2
        ? 1 - (GUTTER + (1 - whole) * TILE) / CELL
        : (GUTTER + whole * TILE) / width;
    assert(Math.abs(value - expected) < 1e-6);
  });
});

test("faces between two blocks are left out, and buried blocks altogether", () => {
  const pair = build([
    [0, 0, 0, 2],
    [1, 0, 0, 2],
  ]);
  assert.equal(pair.faceCell.length, 10);
  assert.deepEqual([...pair.faceCell], [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
  assert.deepEqual([...pair.cellVertex], [0, 20, 40]);
  const cube = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) cube.push([x, y, z, 2]);
  const solid = build(cube);
  // Only the outside of a 3 × 3 × 3 block shows: 9 faces on each side.
  assert.equal(solid.faceCell.length, 54);
  assert.equal(solid.cells.length, 26);
  assert(!solid.cells.some(([x, y, z]) => x === 0 && y === 0 && z === 0));
  assert.equal(solid.indices.length, 54 * 6);
  assert.equal(Math.max(...solid.indices), solid.positions.length / 3 - 1);
});

test("glass, torches, beds, water and lava never hide the face next to them", () => {
  for (const type of [GLASS, TORCH, BED, WATER, LAVA, undefined]) {
    assert(!fillsBlock(type));
    const built = build(
      [[0, 0, 0, 2]],
      [
        [0, 0, 0, 2],
        [0, 1, 0, type],
      ],
    );
    assert.equal(built.faceCell.length, 6);
  }
  assert(fillsBlock(2) && fillsBlock(0));
});

test("every tile keeps inside its own square of the atlas", () => {
  const tiles = 40,
    rows = atlasRows(tiles);
  assert.equal(rows, 3);
  assert.equal(atlasRows(0), 1);
  for (let n = 0; n < tiles; n++) {
    const column = n % ATLAS_COLUMNS,
      row = Math.floor(n / ATLAS_COLUMNS);
    for (const [u, v] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]) {
      const [U, V] = tileUV(n, rows, u, v);
      // With the stretched edge between it and the next square.
      const edge = GUTTER / CELL - 1e-9;
      assert(
        U >= (column + edge) / ATLAS_COLUMNS &&
          U <= (column + 1 - edge) / ATLAS_COLUMNS,
      );
      assert(V >= 1 - (row + 1 - edge) / rows && V <= 1 - (row + edge) / rows);
    }
  }
  // The top of a tile (v = 1) is its top edge in the picture.
  assert(tileUV(0, rows, 0, 1)[1] > tileUV(0, rows, 0, 0)[1]);
  assert(tileUV(0, rows, 0, 1)[1] > tileUV(ATLAS_COLUMNS, rows, 0, 1)[1]);
});

test("a big chunk uses wide indices", () => {
  const cells = [];
  for (let x = 0; x < 16; x++)
    for (let z = 0; z < 16; z++)
      for (let y = 0; y < 64; y++)
        // A chequered pattern: no block touches another, every face shows.
        if ((x + y + z) % 2 === 0) cells.push([x, y, z, 2]);
  const built = build(cells);
  assert(built.positions.length / 3 > 65535);
  assert(built.indices instanceof Uint32Array);
  assert(build([[0, 0, 0, 2]]).indices instanceof Uint16Array);
});
