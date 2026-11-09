// Friendly animals: where they start, what they give and how they behave.
import { height, biomeAt, SIZE, WATER_LEVEL, WOOL_COLORS } from "./world.js";

// `food` makes two of them have a baby; `tameWith` makes a friend.
export const ANIMALS = {
  chicken: {
    speed: 1.1,
    product: "egg",
    count: 1,
    cooldown: 90,
    food: "wheat_seeds",
  },
  // The cow gives milk into a bucket held in Biel's hand.
  cow: {
    speed: 0.9,
    product: "milk",
    count: 1,
    cooldown: 120,
    food: "wheat",
    needs: "bucket",
  },
  sheep: {
    speed: 0.9,
    product: "wool",
    count: 2,
    cooldown: 120,
    food: "wheat",
  },
  pig: { speed: 1, food: "carrot" },
  rabbit: { speed: 1.6, food: "carrot", shy: true },
  dog: { speed: 1.4, tameWith: "treat", companion: true },
  cat: { speed: 1.3, tameWith: "fish", companion: true },
  horse: { speed: 1.5, tameWith: "apple", ride: true, tameChance: 0.4 },
};
const START = {
  chicken: 4,
  cow: 3,
  sheep: 3,
  dog: 1,
  pig: 2,
  rabbit: 3,
  cat: 1,
  horse: 2,
};
export const BABY_SECONDS = 300,
  LOVE_SECONDS = 30,
  BREED_REST = 300;

// A small repeatable random generator, so every new world starts the same.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Animals start on grassy land, away from the beach and the spawn point.
// Where each animal likes to live on the islands (the old valley has no
// biomes, so there they live anywhere).
export const HOMES = {
  chicken: ["plains"],
  cow: ["plains"],
  sheep: ["plains", "snow"],
  pig: ["forest"],
  rabbit: ["forest", "snow"],
  dog: ["forest"],
  cat: ["plains", "forest"],
  horse: ["plains"],
};
export function initialAnimals(seed = 7) {
  const rand = seeded(seed),
    list = [];
  for (const [type, n] of Object.entries(START))
    for (let i = 0; i < n; i++) {
      let x,
        z,
        tries = 0;
      // Look for the animal's own biome first; any dry land will do later.
      do {
        x = Math.round((rand() * 2 - 1) * (SIZE - 4));
        z = Math.round((rand() * 2 - 1) * (SIZE - 4));
        tries++;
      } while (
        height(x, z) <= WATER_LEVEL - 0.2 ||
        Math.hypot(x, z) < 6 ||
        (tries < 60 &&
          biomeAt(x, z) !== "valley" &&
          !HOMES[type].includes(biomeAt(x, z)))
      );
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
      tamed: !!ANIMALS[a.type].tameWith && a.tamed === true,
      sitting: a.sitting === true,
      name: typeof a.name === "string" ? a.name.slice(0, 20) : "",
      baby: a.baby === true,
      grownAt: Number.isFinite(a.grownAt) ? a.grownAt : 0,
      love: Number.isFinite(a.love) ? a.love : 0,
      breedAt: Number.isFinite(a.breedAt) ? a.breedAt : 0,
      color: a.type === "sheep" && WOOL_COLORS.includes(a.color) ? a.color : "",
    }));
}

// What happens when Biel uses something on an animal at a given game time.
// `roll` (0 to 1) decides whether a wild horse accepts the apple.
export function interact(animal, heldId, now, roll = 0) {
  const kind = ANIMALS[animal.type];
  if (kind.tameWith && !animal.tamed) {
    if (heldId !== kind.tameWith) return { result: "wants" };
    if (kind.tameChance && roll >= kind.tameChance)
      return { result: "tryAgain", use: heldId };
    animal.tamed = true;
    animal.sitting = false;
    return { result: "tamed", use: heldId };
  }
  if (kind.ride) return { result: "mount" };
  if (kind.companion) {
    animal.sitting = !animal.sitting;
    return { result: animal.sitting ? "sit" : "follow" };
  }
  if (animal.baby) return { result: "baby" };
  // A dye colours a sheep; its wool comes out in that colour.
  const dye = heldId?.endsWith("_dye") ? heldId.slice(0, -4) : null;
  if (animal.type === "sheep" && dye && WOOL_COLORS.includes(dye)) {
    if (animal.color === dye) return { result: "notReady" };
    animal.color = dye;
    return { result: "dyed", use: heldId };
  }
  if (heldId && heldId === kind.food) {
    if (now < animal.breedAt || now < animal.love)
      return { result: "notReady" };
    animal.love = now + LOVE_SECONDS;
    return { result: "love", use: heldId };
  }
  if (!kind.product) return { result: "happy" };
  if (kind.needs && heldId !== kind.needs) return { result: "needBucket" };
  if (now < animal.readyAt) return { result: "notReady" };
  animal.readyAt = now + kind.cooldown;
  const product =
    animal.type === "sheep" && animal.color
      ? `wool_${animal.color}`
      : kind.product;
  // Shears give a sheep's wool more neatly: one more each time.
  if (animal.type === "sheep" && heldId === "shears")
    return { result: "shorn", give: [product, kind.count + 1], wear: true };
  // A chicken sometimes drops a feather with its egg.
  if (animal.type === "chicken" && roll < 0.5)
    return {
      result: "gave",
      give: [product, kind.count],
      extra: ["feather", 1],
    };
  return { result: "gave", give: [product, kind.count] };
}

// Two grown-ups of the same kind, both happy and close, have a baby.
export function findCouples(animals, now) {
  const couples = [],
    taken = new Set();
  for (const a of animals)
    for (const b of animals)
      if (
        a !== b &&
        a.type === b.type &&
        !taken.has(a) &&
        !taken.has(b) &&
        a.love > now &&
        b.love > now &&
        Math.hypot(a.x - b.x, a.z - b.z) < 4
      ) {
        couples.push([a, b]);
        taken.add(a).add(b);
      }
  return couples;
}
export function makeBaby(a, b, now) {
  a.love = b.love = 0;
  a.breedAt = b.breedAt = now + BREED_REST;
  return {
    type: a.type,
    x: (a.x + b.x) / 2,
    y: Math.max(a.y, b.y),
    z: (a.z + b.z) / 2,
    yaw: a.yaw,
    readyAt: 0,
    tamed: false,
    sitting: false,
    name: "",
    baby: true,
    grownAt: now + BABY_SECONDS,
    love: 0,
    breedAt: now + BREED_REST,
  };
}

// With "Animals only friends" switched off, grown-up farm animals that are
// not friends can be caught for food. They need two hits and vanish in
// sparkles. Rabbits only run away; babies and friends are always safe.
export const HUNT = {
  pig: [["pork", 2]],
  cow: [["beef", 2]],
  chicken: [["raw_chicken", 1]],
  sheep: [["wool", 1]],
};
export const huntable = (animal, options) =>
  !options.friendsOnly &&
  !animal.tamed &&
  !animal.baby &&
  Object.hasOwn(HUNT, animal.type);
// One hit. Returns null while the animal is still there, else what it gives.
export function hitAnimal(animal) {
  animal.hits = (animal.hits ?? 0) + 1;
  if (animal.hits < 2) return null;
  const give = HUNT[animal.type].map(([id, n]) => [id, n]);
  if (animal.type === "sheep" && animal.color)
    give[0][0] = `wool_${animal.color}`;
  return give;
}
