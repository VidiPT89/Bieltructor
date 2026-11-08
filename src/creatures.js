// Friendly animals: where they start, what they give and how they behave.
import { height, SIZE } from "./world.js";

export const ANIMALS = {
  chicken: { speed: 1.1, product: "egg", count: 1, cooldown: 90 },
  cow: { speed: 0.9, product: "milk", count: 1, cooldown: 120 },
  sheep: { speed: 0.9, product: "wool", count: 2, cooldown: 120 },
  dog: { speed: 1.4 },
};
const START = { chicken: 4, cow: 3, sheep: 3, dog: 1 };

// A small repeatable random generator, so every new world starts the same.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Animals start on grassy land, away from the beach and the spawn point.
export function initialAnimals(seed = 7) {
  const rand = seeded(seed),
    list = [];
  for (const [type, n] of Object.entries(START))
    for (let i = 0; i < n; i++) {
      let x, z;
      do {
        x = Math.round((rand() * 2 - 1) * (SIZE - 4));
        z = Math.round((rand() * 2 - 1) * (SIZE - 4));
      } while (height(x, z) <= 2 || Math.hypot(x, z) < 6);
      list.push({
        type,
        x,
        y: height(x, z) + 0.51,
        z,
        yaw: rand() * Math.PI * 2,
        readyAt: 0,
        tamed: false,
        sitting: false,
        name: "",
      });
    }
  return list;
}

// Keeps only animals that make sense, for saved and imported worlds.
export function validateAnimals(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (a) =>
        a &&
        Object.hasOwn(ANIMALS, a.type) &&
        [a.x, a.y, a.z].every(Number.isFinite) &&
        Math.abs(a.x) <= SIZE &&
        Math.abs(a.z) <= SIZE,
    )
    .slice(0, 40)
    .map((a) => ({
      type: a.type,
      x: a.x,
      y: a.y,
      z: a.z,
      yaw: Number.isFinite(a.yaw) ? a.yaw : 0,
      readyAt: Number.isFinite(a.readyAt) ? a.readyAt : 0,
      tamed: a.type === "dog" && a.tamed === true,
      sitting: a.sitting === true,
      name: typeof a.name === "string" ? a.name.slice(0, 20) : "",
    }));
}

// What happens when Biel uses something on an animal at a given game time.
export function interact(animal, heldId, now) {
  const kind = ANIMALS[animal.type];
  if (animal.type === "dog") {
    if (animal.tamed) {
      animal.sitting = !animal.sitting;
      return { result: animal.sitting ? "sit" : "follow" };
    }
    if (heldId !== "treat") return { result: "wantsTreat" };
    animal.tamed = true;
    animal.sitting = false;
    return { result: "tamed", use: "treat" };
  }
  if (now < animal.readyAt) return { result: "notReady" };
  animal.readyAt = now + kind.cooldown;
  return { result: "gave", give: [kind.product, kind.count] };
}
