// Random numbers that can be repeated: the same seed always gives the same
// rolls. Game rules use this; Math.random() is only for sparkles and sounds.

// Turns a number or a text into a 32-bit seed.
export function seedFrom(value) {
  if (Number.isFinite(value)) return value >>> 0;
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.codePointAt(0), 16777619);
  return h >>> 0;
}

// Returns a function that gives numbers from 0 (included) to 1 (not included).
export function createRandom(seed) {
  let s = seedFrom(seed);
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // A whole number from 0 to n - 1.
  next.int = (n) => Math.floor(next() * n);
  // An independent generator for one job, so rolls for the weather do not
  // shift the rolls for the monsters.
  next.fork = (label) => createRandom(`${s}:${label}`);
  return next;
}
