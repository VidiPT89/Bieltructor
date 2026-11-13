// What animals and monsters share: taking a step over the ground and
// falling onto it. Each keeps its own rules about where it may go.
//
// entity: anything with x, y, z. surfaceY(x, z, fromY): the height of the
// ground under a point, looking down from fromY.

// One step in the direction `yaw`. `allowed(x, z, ground)` says whether the
// entity may stand there. Returns whether it moved.
export function step(entity, yaw, speed, dt, surfaceY, allowed) {
  const x = entity.x + Math.sin(yaw) * speed * dt,
    z = entity.z + Math.cos(yaw) * speed * dt;
  if (!allowed(x, z, surfaceY(x, z, entity.y))) return false;
  entity.x = x;
  entity.z = z;
  return true;
}

// Stands on the ground: up a step at once, down at 6 blocks a second.
export function settle(entity, dt, surfaceY) {
  const ground = surfaceY(entity.x, entity.z, entity.y);
  entity.y = ground > entity.y ? ground : Math.max(ground, entity.y - 6 * dt);
}
