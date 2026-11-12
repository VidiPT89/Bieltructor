// Every block of the game, one entry each. The place in this list is the
// number written in saved worlds, so entries are only ever added at the end
// and never moved or removed (tests/blocks.test.js checks the numbers).
//
//   id        text name, used by the rest of the game
//   color     base colour: the map, the inventory square and the plain texture
//   light     light it gives, 1 to 15
//   passable  Biel and the animals walk through it
//   clear     light passes through it
//   boxes     its shape when it is not a whole cube: [width, height, depth, x, y, z]
//   cross     drawn as two crossed panels of this height (plants)
//
// Special drawings (textures) are in main.js, by the same text name.
export const BLOCKS = [
  { id: "grass", color: 0x789b45 },
  { id: "dirt", color: 0x95704c },
  { id: "stone", color: 0x8e9797 },
  { id: "sand", color: 0xe9cf8b },
  { id: "wood", color: 0x93633c },
  { id: "leaves", color: 0x447951 },
  { id: "brick", color: 0xbb6346 },
  { id: "amber", color: 0xefad36, light: 15 },
  { id: "glass", color: 0xbfe6ec, clear: true },
  { id: "door", color: 0x8a5a33 },
  {
    id: "door_open",
    color: 0x8a5a33,
    passable: true,
    clear: true,
    boxes: [[0.14, 1, 1, -0.43, 0, 0]],
  },
  { id: "planks", color: 0xc08a55 },
  { id: "bench", color: 0xa0703f },
  {
    id: "torch",
    color: 0xf2b544,
    light: 14,
    passable: true,
    clear: true,
    boxes: [[0.16, 0.66, 0.16, 0, -0.17, 0]],
  },
  {
    id: "bed",
    color: 0xc8473c,
    clear: true,
    boxes: [[1, 0.56, 1, 0, -0.22, 0]],
  },
  { id: "coal_ore", color: 0x5b5f60 },
  { id: "wool", color: 0xf1ede4 },
  { id: "farmland", color: 0x6b4a2e },
  { id: "wheat_0", color: 0x7cbf4e, passable: true, clear: true, cross: 0.3 },
  { id: "wheat_1", color: 0x8bc34a, passable: true, clear: true, cross: 0.5 },
  { id: "wheat_2", color: 0xa8c94a, passable: true, clear: true, cross: 0.7 },
  { id: "wheat_3", color: 0xe0b54a, passable: true, clear: true, cross: 0.9 },
  { id: "carrot_0", color: 0x6fbf5a, passable: true, clear: true, cross: 0.3 },
  { id: "carrot_1", color: 0x76c25a, passable: true, clear: true, cross: 0.5 },
  { id: "carrot_2", color: 0x7fc45a, passable: true, clear: true, cross: 0.7 },
  { id: "carrot_3", color: 0xee8a2b, passable: true, clear: true, cross: 0.9 },
  { id: "potato_0", color: 0x6aa84f, passable: true, clear: true, cross: 0.3 },
  { id: "potato_1", color: 0x72ad52, passable: true, clear: true, cross: 0.5 },
  { id: "potato_2", color: 0x7db257, passable: true, clear: true, cross: 0.7 },
  { id: "potato_3", color: 0xb48a4c, passable: true, clear: true, cross: 0.9 },
  { id: "snow", color: 0xf4f8fb },
  { id: "ice", color: 0xa9d8ee, clear: true },
  { id: "cactus", color: 0x4f9a46 },
  { id: "iron_ore", color: 0x9a8b80 },
  { id: "gold_ore", color: 0xd8b84a },
  { id: "crystal_ore", color: 0x5fb8e8 },
  { id: "glowstone", color: 0xffd36b, light: 15 },
  { id: "flower", color: 0xe85d8a, passable: true, clear: true, cross: 0.7 },
  {
    id: "tall_grass",
    color: 0x6fae4e,
    passable: true,
    clear: true,
    cross: 0.7,
  },
  { id: "mushroom", color: 0xc8473c, passable: true, clear: true, cross: 0.7 },
  { id: "chest", color: 0x9a6a3c },
  { id: "furnace", color: 0x6b6f70, light: 12 },
  { id: "stone_brick", color: 0x8a9090 },
  {
    id: "ladder",
    color: 0x9a6a3c,
    passable: true,
    clear: true,
    boxes: [
      [0.08, 1, 0.08, -0.35, 0, 0],
      [0.08, 1, 0.08, 0.35, 0, 0],
      [0.7, 0.06, 0.06, 0, -0.3, 0],
      [0.7, 0.06, 0.06, 0, 0, 0],
      [0.7, 0.06, 0.06, 0, 0.3, 0],
    ],
  },
  {
    id: "fence",
    color: 0x8a5a33,
    clear: true,
    boxes: [
      [0.24, 1, 0.24, 0, 0, 0],
      [1, 0.12, 0.1, 0, 0.18, 0],
      [1, 0.12, 0.1, 0, -0.18, 0],
      [0.1, 0.12, 1, 0, 0.18, 0],
      [0.1, 0.12, 1, 0, -0.18, 0],
    ],
  },
  {
    id: "gate",
    color: 0x8a5a33,
    clear: true,
    boxes: [
      [0.12, 0.9, 0.12, -0.45, -0.05, 0],
      [0.12, 0.9, 0.12, 0.45, -0.05, 0],
      [0.8, 0.1, 0.08, 0, 0.22, 0],
      [0.8, 0.1, 0.08, 0, -0.18, 0],
      [0.1, 0.5, 0.08, 0, 0.02, 0],
    ],
  },
  {
    id: "gate_open",
    color: 0x8a5a33,
    passable: true,
    clear: true,
    boxes: [
      [0.12, 0.9, 0.12, -0.45, -0.05, 0],
      [0.12, 0.9, 0.12, 0.45, -0.05, 0],
      [0.08, 0.1, 0.8, -0.4, 0.22, 0.4],
      [0.08, 0.1, 0.8, -0.4, -0.18, 0.4],
    ],
  },
  {
    id: "trapdoor",
    color: 0x9a6a3c,
    clear: true,
    boxes: [[1, 0.16, 1, 0, -0.42, 0]],
  },
  {
    id: "trapdoor_open",
    color: 0x9a6a3c,
    passable: true,
    clear: true,
    boxes: [[1, 1, 0.16, 0, 0, -0.42]],
  },
  {
    id: "sign",
    color: 0xc08a55,
    passable: true,
    clear: true,
    boxes: [
      [0.1, 0.6, 0.1, 0, -0.2, 0],
      [0.8, 0.45, 0.08, 0, 0.18, 0],
    ],
  },
  {
    id: "pot",
    color: 0xb5603c,
    passable: true,
    clear: true,
    boxes: [
      [0.4, 0.35, 0.4, 0, -0.32, 0],
      [0.06, 0.3, 0.06, 0, -0.02, 0],
      [0.22, 0.16, 0.22, 0, 0.18, 0],
    ],
  },
  { id: "wool_red", color: 0xc8473c },
  { id: "wool_orange", color: 0xe98d2b },
  { id: "wool_yellow", color: 0xf2c94c },
  { id: "wool_green", color: 0x5f9f4a },
  { id: "wool_blue", color: 0x3f6fc8 },
  { id: "wool_purple", color: 0x8a4fb5 },
  { id: "wool_black", color: 0x2b2b30 },
  {
    id: "water",
    color: 0x3f9fb4,
    passable: true,
    clear: true,
    boxes: [[1, 0.9, 1, 0, -0.05, 0]],
  },
  {
    id: "water_flow_3",
    color: 0x3f9fb4,
    passable: true,
    clear: true,
    boxes: [[1, 0.7, 1, 0, -0.15, 0]],
  },
  {
    id: "water_flow_2",
    color: 0x3f9fb4,
    passable: true,
    clear: true,
    boxes: [[1, 0.5, 1, 0, -0.25, 0]],
  },
  {
    id: "water_flow_1",
    color: 0x3f9fb4,
    passable: true,
    clear: true,
    boxes: [[1, 0.3, 1, 0, -0.35, 0]],
  },
  { id: "copper_ore", color: 0xb87350 },
  { id: "copper_block", color: 0xd8834f },
  { id: "bee_nest", color: 0xe0b54a },
  {
    id: "lava",
    color: 0xf06a1f,
    light: 15,
    passable: true,
    boxes: [[1, 0.9, 1, 0, -0.05, 0]],
  },
  {
    id: "lava_flow",
    color: 0xf06a1f,
    light: 13,
    passable: true,
    clear: true,
    boxes: [[1, 0.45, 1, 0, -0.275, 0]],
  },
  {
    id: "campfire",
    color: 0x9a6a3c,
    light: 15,
    clear: true,
    boxes: [[0.8, 0.4, 0.8, 0, -0.3, 0]],
  },
  {
    id: "campfire_out",
    color: 0x5b4a3c,
    clear: true,
    boxes: [[0.8, 0.3, 0.8, 0, -0.35, 0]],
  },
  { id: "red_sand", color: 0xc9663a },
  { id: "iron_block", color: 0xd9dcdc },
  { id: "gold_block", color: 0xf2c94c },
  {
    id: "lantern",
    color: 0x3b3f40,
    light: 15,
    passable: true,
    clear: true,
    boxes: [[0.4, 0.5, 0.4, 0, -0.25, 0]],
  },
  {
    id: "blue_flower",
    color: 0x5f8fe8,
    passable: true,
    clear: true,
    cross: 0.7,
  },
  {
    id: "white_flower",
    color: 0xf4f1ea,
    passable: true,
    clear: true,
    cross: 0.7,
  },
  {
    id: "yellow_flower",
    color: 0xf2c94c,
    passable: true,
    clear: true,
    cross: 0.7,
  },
  {
    id: "bed_orange",
    color: 0xe98d2b,
    clear: true,
    boxes: [[1, 0.56, 1, 0, -0.22, 0]],
  },
  {
    id: "bed_yellow",
    color: 0xf2c94c,
    clear: true,
    boxes: [[1, 0.56, 1, 0, -0.22, 0]],
  },
  {
    id: "bed_green",
    color: 0x5f9f4a,
    clear: true,
    boxes: [[1, 0.56, 1, 0, -0.22, 0]],
  },
  {
    id: "bed_blue",
    color: 0x3f6fc8,
    clear: true,
    boxes: [[1, 0.56, 1, 0, -0.22, 0]],
  },
  {
    id: "bed_purple",
    color: 0x8a4fb5,
    clear: true,
    boxes: [[1, 0.56, 1, 0, -0.22, 0]],
  },
  {
    id: "bed_black",
    color: 0x2b2b30,
    clear: true,
    boxes: [[1, 0.56, 1, 0, -0.22, 0]],
  },
  { id: "cobblestone", color: 0x7f8787 },
];

const numbers = new Map(BLOCKS.map((block, number) => [block.id, number]));
// The saved number of a block, from its text name.
export function blockNumber(id) {
  const number = numbers.get(id);
  if (number === undefined) throw new Error(`unknown block "${id}"`);
  return number;
}
// The entry of a saved number (undefined for air or an unknown number).
export const blockOf = (number) => BLOCKS[number];
// The text name of a saved number.
export const blockId = (number) => BLOCKS[number]?.id;
