// A visual recipe book: no grid to memorise, just what you need.
export const RECIPES = [
  { id: "planks", out: ["planks", 4], needs: { wood: 1 } },
  { id: "stick", out: ["stick", 4], needs: { planks: 2 } },
  { id: "bench", out: ["bench", 1], needs: { planks: 4 } },
  { id: "torch", out: ["torch", 4], needs: { stick: 1, coal: 1 } },
  { id: "treat", out: ["treat", 2], needs: { apple: 1, egg: 1 } },
  {
    id: "wooden_pickaxe",
    out: ["wooden_pickaxe", 1],
    needs: { planks: 3, stick: 2 },
    bench: true,
  },
  {
    id: "wooden_sword",
    out: ["wooden_sword", 1],
    needs: { planks: 2, stick: 1 },
    bench: true,
  },
  {
    id: "stone_pickaxe",
    out: ["stone_pickaxe", 1],
    needs: { stone: 3, stick: 2 },
    bench: true,
  },
  {
    id: "stone_sword",
    out: ["stone_sword", 1],
    needs: { stone: 2, stick: 1 },
    bench: true,
  },
  { id: "door", out: ["door", 1], needs: { planks: 6 }, bench: true },
  { id: "glass", out: ["glass", 2], needs: { sand: 2, coal: 1 }, bench: true },
  { id: "brick", out: ["brick", 2], needs: { dirt: 2, coal: 1 }, bench: true },
  {
    id: "amber",
    out: ["amber", 1],
    needs: { torch: 1, glass: 1 },
    bench: true,
  },
  { id: "bed", out: ["bed", 1], needs: { planks: 3, wool: 3 }, bench: true },
  {
    id: "cake",
    out: ["cake", 1],
    needs: { milk: 1, egg: 1, apple: 1 },
    bench: true,
  },
  { id: "bread", out: ["bread", 1], needs: { wheat: 3 } },
  {
    id: "fishing_rod",
    out: ["fishing_rod", 1],
    needs: { stick: 3, wool: 1 },
    bench: true,
  },
  { id: "chest", out: ["chest", 1], needs: { planks: 8 }, bench: true },
  { id: "furnace", out: ["furnace", 1], needs: { stone: 8 }, bench: true },
  {
    id: "stone_brick",
    out: ["stone_brick", 4],
    needs: { stone: 4 },
    bench: true,
  },
  {
    id: "iron_pickaxe",
    out: ["iron_pickaxe", 1],
    needs: { iron_ingot: 3, stick: 2 },
    bench: true,
  },
  {
    id: "iron_sword",
    out: ["iron_sword", 1],
    needs: { iron_ingot: 2, stick: 1 },
    bench: true,
  },
  {
    id: "crystal_pickaxe",
    out: ["crystal_pickaxe", 1],
    needs: { crystal: 3, stick: 2 },
    bench: true,
  },
  {
    id: "crystal_sword",
    out: ["crystal_sword", 1],
    needs: { crystal: 2, stick: 1 },
    bench: true,
  },
  {
    id: "golden_apple",
    out: ["golden_apple", 1],
    needs: { apple: 1, gold_ingot: 4 },
    bench: true,
  },
  { id: "treat_bone", out: ["treat", 3], needs: { bone: 1 } },
  { id: "bow", out: ["bow", 1], needs: { stick: 3, wool: 2 }, bench: true },
  { id: "arrows", out: ["arrows", 4], needs: { stick: 1, stone: 1 } },
  { id: "ladder", out: ["ladder", 3], needs: { stick: 7 }, bench: true },
  {
    id: "fence",
    out: ["fence", 3],
    needs: { planks: 4, stick: 2 },
    bench: true,
  },
  { id: "gate", out: ["gate", 1], needs: { planks: 2, stick: 4 }, bench: true },
  { id: "trapdoor", out: ["trapdoor", 2], needs: { planks: 6 }, bench: true },
  { id: "sign", out: ["sign", 3], needs: { planks: 6, stick: 1 }, bench: true },
  { id: "pot", out: ["pot", 1], needs: { brick: 3 } },
  // Dyes from things around the island, then mixed colours.
  { id: "red_dye", out: ["red_dye", 2], needs: { flower: 1 } },
  { id: "yellow_dye", out: ["yellow_dye", 2], needs: { wheat: 1 } },
  { id: "green_dye", out: ["green_dye", 2], needs: { cactus: 1 } },
  { id: "blue_dye", out: ["blue_dye", 2], needs: { crystal: 1 } },
  { id: "black_dye", out: ["black_dye", 2], needs: { coal: 1 } },
  {
    id: "orange_dye",
    out: ["orange_dye", 2],
    needs: { red_dye: 1, yellow_dye: 1 },
  },
  {
    id: "purple_dye",
    out: ["purple_dye", 2],
    needs: { red_dye: 1, blue_dye: 1 },
  },
  ...["red", "orange", "yellow", "green", "blue", "purple", "black"].map(
    (color) => ({
      id: `wool_${color}`,
      out: [`wool_${color}`, 1],
      needs: { wool: 1, [`${color}_dye`]: 1 },
    }),
  ),
  // Axes, shovels and hoes: the same material as the pickaxe of each tier.
  ...[
    ["wooden", "planks"],
    ["stone", "stone"],
    ["iron", "iron_ingot"],
    ["crystal", "crystal"],
  ].flatMap(([material, from]) =>
    [
      ["axe", 3],
      ["shovel", 1],
      ["hoe", 2],
    ].map(([tool, n]) => ({
      id: `${material}_${tool}`,
      out: [`${material}_${tool}`, 1],
      needs: { [from]: n, stick: 2 },
      bench: true,
    })),
  ),
  // Copper makes shears, buckets and shiny blocks.
  { id: "shears", out: ["shears", 1], needs: { copper_ingot: 2 }, bench: true },
  { id: "bucket", out: ["bucket", 1], needs: { copper_ingot: 3 }, bench: true },
  {
    id: "copper_block",
    out: ["copper_block", 1],
    needs: { copper_ingot: 4 },
    bench: true,
  },
  { id: "bottle", out: ["bottle", 3], needs: { glass: 2 } },
];

export function canCraft(inventory, recipe, nearBench) {
  if (recipe.bench && !nearBench) return false;
  return Object.entries(recipe.needs).every(
    ([id, n]) => inventory.count(id) >= n,
  );
}

// Crafts once. Gives everything back if the result does not fit.
export function craft(inventory, recipe, nearBench) {
  if (!canCraft(inventory, recipe, nearBench)) return false;
  for (const [id, n] of Object.entries(recipe.needs)) inventory.remove(id, n);
  const left = inventory.add(...recipe.out);
  if (left) {
    inventory.remove(recipe.out[0], recipe.out[1] - left);
    for (const [id, n] of Object.entries(recipe.needs)) inventory.add(id, n);
    return false;
  }
  return true;
}
