// Challenges and the sticker book, shared by every world on this device.
export const CHALLENGES = [
  { id: "shelter", sticker: "🏠", event: "place", goal: 12 },
  { id: "bench", sticker: "🔨", event: "craft:bench" },
  { id: "torches", sticker: "🔥", event: "place:torch", goal: 5 },
  { id: "night", sticker: "🌙", event: "night" },
  { id: "sleep", sticker: "🛏️", event: "sleep" },
  { id: "coalIron", sticker: "⛏️", all: ["got:coal", "got:iron"] },
  { id: "ironPickaxe", sticker: "⚒️", event: "craft:iron_pickaxe" },
  { id: "wheat", sticker: "🌾", event: "harvest:wheat" },
  // Tame a dog and give it a name (naming happens right after taming).
  { id: "dog", sticker: "🐶", event: "name:dog" },
  { id: "crystal", sticker: "💎", event: "got:crystal" },
  { id: "house", sticker: "🏡", event: "house" },
  { id: "biomes", sticker: "🧭", distinct: "biome", goal: 3 },
];

export function createProgress(raw) {
  const p = { done: {}, counters: {}, seen: {} };
  if (raw && typeof raw === "object") {
    for (const c of CHALLENGES)
      if (Number.isFinite(raw.done?.[c.id])) p.done[c.id] = raw.done[c.id];
    for (const [k, v] of Object.entries(raw.counters ?? {}))
      if (Number.isFinite(v)) p.counters[k] = v;
    for (const [k, v] of Object.entries(raw.seen ?? {}))
      if (Array.isArray(v))
        p.seen[k] = v.filter((x) => typeof x === "string").slice(0, 20);
  }
  return p;
}

// How far a challenge has got, from 0 to its goal.
export function progressOf(p, c) {
  if (p.done[c.id]) return c.goal ?? 1;
  if (c.all) return c.all.filter((e) => p.counters[e]).length;
  if (c.distinct) return (p.seen[c.distinct] ?? []).length;
  return Math.min(p.counters[c.event] ?? 0, c.goal ?? 1);
}
export const goalOf = (c) => c.goal ?? c.all?.length ?? 1;

// Records something Biel did. "biome:forest" style events also count
// towards "distinct" challenges. Returns the challenges just completed.
export function record(p, event, amount = 1, now = Date.now()) {
  p.counters[event] = (p.counters[event] ?? 0) + amount;
  const [kind, value] = event.split(":");
  if (value !== undefined && CHALLENGES.some((c) => c.distinct === kind)) {
    const seen = (p.seen[kind] ??= []);
    if (!seen.includes(value)) seen.push(value);
  }
  const fresh = [];
  for (const c of CHALLENGES) {
    if (p.done[c.id]) continue;
    if (progressOf(p, c) >= goalOf(c)) {
      p.done[c.id] = now;
      fresh.push(c.id);
    }
  }
  return fresh;
}

// The next sticker to aim for, in book order.
export const nextChallenge = (p) =>
  CHALLENGES.find((c) => !p.done[c.id]) ?? null;
