// Biel's health, food and air in Adventure. Values count halves:
// 20 health = 10 hearts, 20 food = 10 drumsticks, 10 air = 10 bubbles.
const MAX_HEALTH = 20;
export const MAX_FOOD = 20,
  MAX_AIR = 10;

export const createVitals = (health = MAX_HEALTH, food = MAX_FOOD) => ({
  health,
  food,
  air: MAX_AIR,
  hungerClock: 0,
  regenClock: 0,
  starveClock: 0,
  airClock: 0,
  hurtCooldown: 0,
});

// Falling more than three blocks hurts a little, one half per extra block.
export const fallDamage = (blocks) => Math.max(0, Math.floor(blocks - 3));

// Applies damage scaled by difficulty. Returns the damage actually taken.
export function hurt(v, amount, rules, { ignoreCooldown = false } = {}) {
  if (!rules.damage || amount <= 0 || v.health <= 0) return 0;
  if (v.hurtCooldown > 0 && !ignoreCooldown) return 0;
  const taken = Math.max(1, Math.round(amount * rules.damage));
  v.health = Math.max(0, v.health - taken);
  v.hurtCooldown = 0.8;
  return taken;
}

// A shield in the hotbar stops half of a hit that comes from the front
// (within 60 degrees of where Biel looks). Biel looks along -sin(yaw),
// -cos(yaw). Returns the damage that gets through.
export function shieldDamage(amount, yaw, player, from) {
  const dx = from.x - player.x,
    dz = from.z - player.z,
    d = Math.hypot(dx, dz);
  if (!d) return amount;
  const facing = (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) / d;
  return facing >= 0.5 ? Math.floor(amount / 2) : amount;
}

// Advances the clocks. `exertion` is 0 when calm and up to 1 when running.
export function tick(
  v,
  dt,
  { rules, hunger, exertion = 0, underwater = false },
) {
  let damage = 0;
  v.hurtCooldown = Math.max(0, v.hurtCooldown - dt);
  if (hunger && rules.hungerRate) {
    v.hungerClock += dt * rules.hungerRate * (1 + exertion);
    while (v.hungerClock >= 30) {
      v.hungerClock -= 30;
      v.food = Math.max(0, v.food - 1);
    }
  }
  const fed = !hunger || v.food >= 16;
  if (fed && v.health < MAX_HEALTH && v.health > 0) {
    v.regenClock += dt;
    while (v.regenClock >= rules.regenEvery && v.health < MAX_HEALTH) {
      v.regenClock -= rules.regenEvery;
      v.health++;
      if (hunger && rules.hungerRate) v.food = Math.max(0, v.food - 0.5);
    }
  } else v.regenClock = 0;
  if (hunger && v.food <= 0) {
    v.starveClock += dt;
    while (v.starveClock >= 4) {
      v.starveClock -= 4;
      // On gentle difficulties hunger never takes the last heart.
      if (rules.starvationHurts || v.health > 2) damage += hurtNow(v, 1);
    }
  } else v.starveClock = 0;
  if (underwater) {
    v.airClock += dt;
    while (v.airClock >= 1.5) {
      v.airClock -= 1.5;
      if (v.air > 0) v.air = Math.max(0, Math.ceil(v.air) - 1);
      else if (rules.damage) damage += hurtNow(v, 2);
    }
  } else {
    v.airClock = 0;
    v.air = Math.min(MAX_AIR, v.air + dt * 5);
  }
  return damage;
}
function hurtNow(v, amount) {
  const before = v.health;
  v.health = Math.max(0, v.health - amount);
  return before - v.health;
}

// Eating only works when Biel is hungry. Returns true when he ate.
export function eat(v, value) {
  if (v.food >= MAX_FOOD) return false;
  v.food = Math.min(MAX_FOOD, v.food + value);
  return true;
}
