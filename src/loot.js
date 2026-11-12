// Overflow rewards use the same persistent ground bags as a lost backpack.
import { Inventory } from "./inventory.js";

export const MAX_GROUND_BAGS = 64;

// Plan on copies first: if the ground is full too, neither destination changes.
// Nearby bags share space; each still has the normal 36-slot save format.
export function collectRewards(inventory, bags, rewards, position) {
  const next = Inventory.from(inventory.toJSON(), inventory.size);
  const overflow = [];
  for (const [id, count, wear] of rewards) {
    const left = next.add(id, count, wear);
    if (left) overflow.push([id, left, wear]);
  }
  if (!overflow.length) {
    inventory.slots = next.slots;
    return { ok: true, dropped: 0 };
  }
  const planned = bags.map((bag) => ({ ...bag, items: [...bag.items] }));
  const nearby = planned.filter(
    (bag) =>
      Math.hypot(bag.x - position.x, bag.y - position.y, bag.z - position.z) <=
      3,
  );
  let dropped = 0;
  for (const [id, count, wear] of overflow) {
    let left = count;
    for (const bag of nearby) {
      const contents = Inventory.from(bag.items);
      left = contents.add(id, left, wear);
      bag.items = contents.toJSON();
      if (!left) break;
    }
    while (left) {
      if (planned.length >= MAX_GROUND_BAGS) return { ok: false, dropped: 0 };
      const contents = new Inventory();
      const remaining = contents.add(id, left, wear);
      // Invalid rewards must not create an endless series of empty bags.
      if (remaining === left) return { ok: false, dropped: 0 };
      left = remaining;
      const bag = {
        x: position.x,
        y: position.y,
        z: position.z,
        items: contents.toJSON(),
      };
      planned.push(bag);
      nearby.push(bag);
    }
    dropped += count;
  }
  inventory.slots = next.slots;
  bags.splice(0, bags.length, ...planned);
  return { ok: true, dropped };
}
