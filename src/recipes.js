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
    id: "wooden_hoe",
    out: ["wooden_hoe", 1],
    needs: { planks: 2, stick: 2 },
    bench: true,
  },
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
