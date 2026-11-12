// One mesh for the plain blocks of a chunk: only the faces that can be seen
// are drawn, and every block takes its drawing from one shared picture
// (the atlas), so a chunk is a single draw instead of one per kind of block.
import { BoxGeometry } from "three";

// The six faces of a cube exactly as Three.js draws a box, so textures keep
// the way up they had when every block was its own cube.
const box = new BoxGeometry(1, 1, 1);
export const FACES = Array.from({ length: 6 }, (_, face) => {
  const read = (name, size, i) =>
    Array.from(box.attributes[name].array.slice(i * size, i * size + size));
  const first = face * 4;
  return {
    normal: read("normal", 3, first).map(Math.round),
    corners: [0, 1, 2, 3].map((i) => ({
      at: read("position", 3, first + i),
      uv: read("uv", 2, first + i),
    })),
    // Two triangles, as corner numbers 0 to 3.
    triangles: Array.from(box.index.array.slice(face * 6, face * 6 + 6)).map(
      (i) => i - first,
    ),
  };
});

// The atlas is a grid of squares, 16 a row. Each holds one 16 × 16 pixel
// drawing with its edges stretched 8 pixels outwards all round. When a face
// is drawn small and far away, the screen may ask for a point just outside
// the drawing; the stretched edge answers with the block's own colour
// instead of its neighbour's, so no lines show between blocks.
export const TILE = 16,
  GUTTER = 8,
  CELL = TILE + GUTTER * 2,
  ATLAS_COLUMNS = 16;
export const atlasRows = (tiles) =>
  Math.max(1, Math.ceil(tiles / ATLAS_COLUMNS));
// Where the top left pixel of tile `n` is in the atlas picture.
export const tilePixel = (n) => [
  (n % ATLAS_COLUMNS) * CELL + GUTTER,
  Math.floor(n / ATLAS_COLUMNS) * CELL + GUTTER,
];
// Where a corner (u, v) of tile `n` is in the atlas. Row 0 is at the top of
// the picture, where v is 1.
export function tileUV(n, rows, u, v) {
  const [x, y] = tilePixel(n);
  return [
    (x + u * TILE) / (ATLAS_COLUMNS * CELL),
    1 - (y + (1 - v) * TILE) / (rows * CELL),
  ];
}

// cells: [x, y, z, type] of the plain blocks of one chunk.
// hides(x, y, z): whether the block there covers a face next to it.
// tileOf(type): the tile of a block in the atlas.
// Returns flat arrays ready for a BufferGeometry, the blocks that have at
// least one face showing, which block each face belongs to (for aiming) and
// where the corners of each block start (for painting its light).
export function buildChunkGeometry(cells, hides, tileOf, rows) {
  const positions = [],
    normals = [],
    uvs = [],
    indices = [],
    shown = [],
    faceCell = [],
    cellVertex = [0];
  for (const [x, y, z, type] of cells) {
    const tile = tileOf(type);
    let any = false;
    for (const face of FACES) {
      const [nx, ny, nz] = face.normal;
      if (hides(x + nx, y + ny, z + nz)) continue;
      any = true;
      const start = positions.length / 3;
      for (const corner of face.corners) {
        positions.push(x + corner.at[0], y + corner.at[1], z + corner.at[2]);
        normals.push(nx, ny, nz);
        uvs.push(...tileUV(tile, rows, corner.uv[0], corner.uv[1]));
      }
      for (const i of face.triangles) indices.push(start + i);
      faceCell.push(shown.length);
    }
    if (!any) continue;
    shown.push([x, y, z]);
    cellVertex.push(positions.length / 3);
  }
  const corners = positions.length / 3;
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices:
      corners > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
    cells: shown,
    faceCell: new Uint32Array(faceCell),
    cellVertex: new Uint32Array(cellVertex),
  };
}
