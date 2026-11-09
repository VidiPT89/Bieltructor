// Everything Biel can carry: blocks, materials, food and tools.
import {
  GLASS,
  DOOR,
  DOOR_OPEN,
  PLANKS,
  BENCH,
  TORCH,
  BED,
  COAL,
  WOOL,
  FARMLAND,
  cropInfo,
  SNOW,
  ICE,
  CACTUS,
  FLOWER,
  TALL_GRASS,
  MUSHROOM,
  isPlant,
  IRON_ORE,
  GOLD_ORE,
  CRYSTAL_ORE,
  GLOWSTONE,
  CHEST,
  FURNACE,
  STONE_BRICK,
  LADDER,
  FENCE,
  GATE,
  GATE_OPEN,
  TRAPDOOR,
  TRAPDOOR_OPEN,
  SIGN,
  POT,
  WOOL_COLORS,
  woolBlock,
  COPPER_ORE,
  COPPER_BLOCK,
  BEE_NEST,
  CAMPFIRE,
  CAMPFIRE_OUT,
  RED_SAND,
  IRON_BLOCK,
  GOLD_BLOCK,
  LANTERN,
  BLUE_FLOWER,
  WHITE_FLOWER,
  YELLOW_FLOWER,
} from "./world.js";

// Block items place the block type given by `block`.
export const ITEMS = {
  grass: { block: 0 },
  dirt: { block: 1 },
  stone: { block: 2 },
  sand: { block: 3 },
  wood: { block: 4 },
  leaves: { block: 5 },
  brick: { block: 6 },
  amber: { block: 7 },
  glass: { block: GLASS },
  door: { block: DOOR },
  planks: { block: PLANKS },
  bench: { block: BENCH },
  torch: { block: TORCH },
  bed: { block: BED },
  coal_ore: { block: COAL },
  wool: { block: WOOL },
  stick: { icon: "🥢" },
  coal: { icon: "⚫️" },
  apple: { icon: "🍎", food: 4 },
  egg: { icon: "🥚", food: 3 },
  milk: { icon: "🥛", food: 3 },
  cake: { icon: "🎂", food: 12 },
  treat: { icon: "🍪" },
  bone: { icon: "🦴" },
  slime: { icon: "🟢", food: 2 },
  wooden_pickaxe: { icon: "⛏️", tool: "pickaxe", tier: 1 },
  stone_pickaxe: { icon: "⛏️", tool: "pickaxe", tier: 2 },
  wooden_sword: { icon: "🗡️", tool: "sword", tier: 1, damage: 2 },
  stone_sword: { icon: "🗡️", tool: "sword", tier: 2, damage: 3 },
  wheat_seeds: { icon: "🌱", plants: "wheat" },
  wheat: { icon: "🌾" },
  carrot: { icon: "🥕", food: 3, plants: "carrot" },
  potato: { icon: "🥔", food: 1, plants: "potato" },
  bread: { icon: "🍞", food: 5 },
  fishing_rod: { icon: "🎣", tool: "rod", tier: 1 },
  fish: { icon: "🐟", food: 2 },
  snow: { block: SNOW },
  ice: { block: ICE },
  cactus: { block: CACTUS },
  flower: { block: FLOWER },
  mushroom: { block: MUSHROOM, food: 1 },
  iron_ore: { block: IRON_ORE },
  gold_ore: { block: GOLD_ORE },
  glowstone: { block: GLOWSTONE },
  chest: { block: CHEST },
  furnace: { block: FURNACE },
  stone_brick: { block: STONE_BRICK },
  crystal: { icon: "💎" },
  iron_ingot: { icon: "🔩" },
  gold_ingot: { icon: "🪙" },
  iron_pickaxe: { icon: "⛏️", tool: "pickaxe", tier: 3 },
  crystal_pickaxe: { icon: "⛏️", tool: "pickaxe", tier: 4 },
  iron_sword: { icon: "🗡️", tool: "sword", tier: 3, damage: 4 },
  crystal_sword: { icon: "🗡️", tool: "sword", tier: 4, damage: 5 },
  baked_potato: { icon: "🥔", food: 6 },
  cooked_fish: { icon: "🍣", food: 5 },
  golden_apple: { icon: "🍏", food: 8, heal: 10 },
  bow: { icon: "🏹", tool: "bow", tier: 1 },
  shield: { icon: "🛡️", tool: "shield", tier: 1, uses: 120 },
  ladder: { block: LADDER },
  fence: { block: FENCE },
  gate: { block: GATE },
  trapdoor: { block: TRAPDOOR },
  sign: { block: SIGN },
  pot: { block: POT },
  arrows: { icon: "🪶" },
  copper_ore: { block: COPPER_ORE },
  copper_block: { block: COPPER_BLOCK },
  copper_ingot: { icon: "🥉" },
  bee_nest: { block: BEE_NEST },
  shears: { icon: "✂️", tool: "shears", tier: 1, uses: 200 },
  bucket: { icon: "🪣", tool: "bucket", tier: 1 },
  water_bucket: { icon: "🌊", tool: "bucket", tier: 1, full: true },
  lava_bucket: { icon: "🌋", tool: "bucket", tier: 1, full: true, lava: true },
  campfire: { block: CAMPFIRE },
  red_sand: { block: RED_SAND },
  iron_block: { block: IRON_BLOCK },
  gold_block: { block: GOLD_BLOCK },
  lantern: { block: LANTERN },
  blue_flower: { block: BLUE_FLOWER },
  white_flower: { block: WHITE_FLOWER },
  yellow_flower: { block: YELLOW_FLOWER },
  bottle: { icon: "🫙" },
  honey: { icon: "🍯", food: 6 },
};
// Axes, shovels and hoes in the same four materials as pickaxes and swords.
export const TOOL_MATERIALS = ["wooden", "stone", "iron", "crystal"];
TOOL_MATERIALS.forEach((material, i) => {
  ITEMS[`${material}_axe`] = {
    icon: "🪓",
    tool: "axe",
    tier: i + 1,
    damage: i + 2,
  };
  ITEMS[`${material}_shovel`] = { icon: "🪏", tool: "shovel", tier: i + 1 };
  ITEMS[`${material}_hoe`] = { icon: "⚒️", tool: "hoe", tier: i + 1 };
});
// How many times a tool can be used before it wears out (Normal and Hard
// only). Buckets never wear out.
const USES = { 1: 60, 2: 130, 3: 250, 4: 800 };
export const toolUses = (id) => {
  const item = ITEMS[id];
  if (!item?.tool || item.tool === "bucket") return 0;
  return (
    item.uses ??
    (item.tool === "bow" ? 150 : item.tool === "rod" ? 60 : USES[item.tier])
  );
};
// Seven dyes and the wool they colour.
const DYE_ICONS = {
  red: "🔴",
  orange: "🟠",
  yellow: "🟡",
  green: "🟩",
  blue: "🔵",
  purple: "🟣",
  black: "⬛",
};
for (const color of WOOL_COLORS) {
  ITEMS[`wool_${color}`] = { block: woolBlock(color) };
  ITEMS[`${color}_dye`] = { icon: DYE_ICONS[color], dye: color };
}
export const isItem = (id) => Object.hasOwn(ITEMS, id);
export const maxStack = (id) => (ITEMS[id]?.tool ? 1 : 64);
// The item that places a given block type (open doors become doors again).
export const itemForBlock = (type) =>
  type === GATE_OPEN
    ? "gate"
    : type === TRAPDOOR_OPEN
      ? "trapdoor"
      : type === DOOR_OPEN
        ? "door"
        : type === CAMPFIRE_OUT
          ? "campfire"
          : Object.keys(ITEMS).find((id) => ITEMS[id].block === type);

// Every block a creative builder can pick.
export const CREATIVE_BLOCKS = [
  ...Object.keys(ITEMS).filter((id) => ITEMS[id].block !== undefined),
  "water_bucket",
  "lava_bucket",
];

// Seconds to break each block by hand; stone-like blocks love a pickaxe.
const HARDNESS = {
  0: 0.6,
  1: 0.5,
  2: 1.8,
  3: 0.5,
  4: 1,
  5: 0.25,
  6: 1.8,
  7: 0.6,
  [GLASS]: 0.4,
  [DOOR]: 0.9,
  [DOOR_OPEN]: 0.9,
  [PLANKS]: 0.9,
  [BENCH]: 1,
  [TORCH]: 0.05,
  [BED]: 0.5,
  [COAL]: 2,
  [WOOL]: 0.4,
  [FARMLAND]: 0.5,
  [SNOW]: 0.3,
  [ICE]: 0.5,
  [CACTUS]: 0.4,
  [IRON_ORE]: 2.4,
  [GOLD_ORE]: 2.6,
  [CRYSTAL_ORE]: 2.8,
  [GLOWSTONE]: 0.6,
  [CHEST]: 0.8,
  [FURNACE]: 2,
  [STONE_BRICK]: 1.8,
};
Object.assign(HARDNESS, {
  [LADDER]: 0.4,
  [FENCE]: 0.8,
  [GATE]: 0.8,
  [GATE_OPEN]: 0.8,
  [TRAPDOOR]: 0.7,
  [TRAPDOOR_OPEN]: 0.7,
  [SIGN]: 0.5,
  [POT]: 0.3,
  [COPPER_ORE]: 2.2,
  [COPPER_BLOCK]: 2,
  [BEE_NEST]: 0.6,
  [CAMPFIRE]: 0.5,
  [CAMPFIRE_OUT]: 0.5,
  [RED_SAND]: 0.5,
  [IRON_BLOCK]: 2.4,
  [GOLD_BLOCK]: 2.4,
  [LANTERN]: 0.4,
});
for (const color of WOOL_COLORS) HARDNESS[woolBlock(color)] = 0.4;
const STONY = new Set([
  2,
  6,
  COAL,
  IRON_ORE,
  GOLD_ORE,
  CRYSTAL_ORE,
  FURNACE,
  STONE_BRICK,
  COPPER_ORE,
  COPPER_BLOCK,
  IRON_BLOCK,
  GOLD_BLOCK,
  LANTERN,
]);
// Each tool is fast on its own kind of block.
const FAVOURS = {
  pickaxe: STONY,
  axe: new Set([
    4,
    PLANKS,
    BENCH,
    DOOR,
    DOOR_OPEN,
    CHEST,
    LADDER,
    FENCE,
    GATE,
    GATE_OPEN,
    TRAPDOOR,
    TRAPDOOR_OPEN,
    SIGN,
    BEE_NEST,
  ]),
  shovel: new Set([0, 1, 3, RED_SAND, SNOW, FARMLAND]),
  shears: new Set([5, WOOL, ...WOOL_COLORS.map((color) => woolBlock(color))]),
};
export function breakTime(type, toolId) {
  const tool = ITEMS[toolId];
  if (cropInfo(type) || isPlant(type)) return 0.05;
  const base = HARDNESS[type] ?? 1;
  if (FAVOURS[tool?.tool]?.has(type)) return base / [1, 3, 5, 8, 12][tool.tier];
  return base;
}

// What breaking a block gives. `roll` is a random number from 0 to 1.
export function drops(type, toolId, roll) {
  // Grass sometimes hides seeds, carrots or potatoes.
  if (type === 0) {
    const extra =
      roll < 0.12
        ? "wheat_seeds"
        : roll < 0.17
          ? "carrot"
          : roll < 0.22
            ? "potato"
            : null;
    return extra
      ? [
          ["dirt", 1],
          [extra, 1],
        ]
      : [["dirt", 1]];
  }
  if (type === FARMLAND) return [["dirt", 1]];
  if (type === TALL_GRASS) return roll < 0.35 ? [["wheat_seeds", 1]] : [];
  // Ores need a pickaxe that is strong enough.
  const tier = ITEMS[toolId]?.tool === "pickaxe" ? ITEMS[toolId].tier : 0;
  if (type === IRON_ORE) return tier >= 2 ? [["iron_ore", 1]] : [];
  if (type === GOLD_ORE) return tier >= 3 ? [["gold_ore", 1]] : [];
  if (type === CRYSTAL_ORE)
    return tier >= 3 ? [["crystal", 1 + (roll < 0.4)]] : [];
  const crop = cropInfo(type);
  if (crop) {
    const seed = crop.crop === "wheat" ? "wheat_seeds" : crop.crop;
    if (crop.stage < 3) return [[seed, 1]];
    if (crop.crop === "wheat")
      return [
        ["wheat", 1 + (roll < 0.5)],
        ["wheat_seeds", 1 + (roll < 0.6)],
      ];
    return [[crop.crop, 2 + (roll < 0.5)]];
  }
  if (type === COAL)
    return ITEMS[toolId]?.tool === "pickaxe" ? [["coal", 1]] : [];
  if (type === COPPER_ORE) return tier >= 1 ? [["copper_ore", 1]] : [];
  if (type === 5) return roll < 0.2 ? [["apple", 1]] : [["leaves", 1]];
  const id = itemForBlock(type);
  return id ? [[id, 1]] : [];
}
