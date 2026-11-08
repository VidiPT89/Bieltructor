// The little farm: tilled soil, watering and crops that grow over time.
import { cropBlock, cropInfo } from "./world.js";

// Seconds for one growing stage, on average, with and without water.
export const STAGE_SECONDS = { watered: 60, dry: 150 };

// Water is any column within four blocks whose top is under the water line.
export function isWatered(topAt, x, z) {
  for (let dx = -4; dx <= 4; dx++)
    for (let dz = -4; dz <= 4; dz++)
      if (topAt(x + dx, z + dz) <= 1) return true;
  return false;
}

// One growing tick of `dt` seconds. Returns the crop block a crop becomes,
// or the same type if it did not grow this time.
export function growCrop(type, dt, wet, roll) {
  const info = cropInfo(type);
  if (!info || info.stage >= 3) return type;
  const chance = dt / (wet ? STAGE_SECONDS.watered : STAGE_SECONDS.dry);
  return roll < chance ? cropBlock(info.crop, info.stage + 1) : type;
}
