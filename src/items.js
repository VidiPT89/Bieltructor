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
  slime: { icon: "🟢" },
  wooden_pickaxe: { icon: "⛏️", tool: "pickaxe", tier: 1 },
  stone_pickaxe: { icon: "⛏️", tool: "pickaxe", tier: 2 },
  wooden_sword: { icon: "🗡️", tool: "sword", tier: 1, damage: 2 },
  stone_sword: { icon: "🗡️", tool: "sword", tier: 2, damage: 3 },
  wooden_hoe: { icon: "🪓", tool: "hoe", tier: 1 },
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
};
export const isItem = (id) => Object.hasOwn(ITEMS, id);
export const maxStack = (id) => (ITEMS[id]?.tool ? 1 : 64);
// The item that places a given block type (open doors become doors again).
export const itemForBlock = (type) =>
  type === DOOR_OPEN
    ? "door"
    : Object.keys(ITEMS).find((id) => ITEMS[id].block === type);

// Every block a creative builder can pick.
export const CREATIVE_BLOCKS = Object.keys(ITEMS).filter(
  (id) => ITEMS[id].block !== undefined,
);

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
const STONY = new Set([
  2,
  6,
  COAL,
  IRON_ORE,
  GOLD_ORE,
  CRYSTAL_ORE,
  FURNACE,
  STONE_BRICK,
]);
export function breakTime(type, toolId) {
  const tool = ITEMS[toolId];
  if (cropInfo(type) || isPlant(type)) return 0.05;
  const base = HARDNESS[type] ?? 1;
  if (STONY.has(type) && tool?.tool === "pickaxe")
    return base / [1, 3, 5, 8, 12][tool.tier];
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
  if (type === 5) return roll < 0.2 ? [["apple", 1]] : [["leaves", 1]];
  const id = itemForBlock(type);
  return id ? [[id, 1]] : [];
}
