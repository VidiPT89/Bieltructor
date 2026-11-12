// Rules advance at 20 Hz, regardless of render rate. Long stalls have a
// bounded catch-up budget; pausing discards the fractional unfinished tick.
export const TICK_SECONDS = 1 / 20;
const MAX_FRAME_SECONDS = 0.25;

export class FixedStep {
  accumulator = 0;

  reset() {
    this.accumulator = 0;
  }

  advance(seconds, tick) {
    if (!Number.isFinite(seconds) || seconds <= 0)
      return this.accumulator / TICK_SECONDS;
    this.accumulator += Math.min(seconds, MAX_FRAME_SECONDS);
    while (this.accumulator + 1e-10 >= TICK_SECONDS) {
      this.accumulator = Math.max(0, this.accumulator - TICK_SECONDS);
      if (tick(TICK_SECONDS) === false) {
        this.reset();
        break;
      }
    }
    if (this.accumulator < 1e-10) this.accumulator = 0;
    return this.accumulator / TICK_SECONDS;
  }
}

// Interpolation is presentation only. Before each physics tick restore its
// authoritative transform, so projectiles never integrate a displayed pose.
export class EntityInterpolation {
  poses = new WeakMap();

  reset() {
    this.poses = new WeakMap();
  }

  begin(objects) {
    for (const object of objects) {
      const pose = this.poses.get(object);
      if (!pose) continue;
      object.position.copy(pose.position);
      object.quaternion.copy(pose.rotation);
      pose.previousPosition.copy(pose.position);
      pose.previousRotation.copy(pose.rotation);
    }
  }

  end(objects) {
    for (const object of objects) {
      let pose = this.poses.get(object);
      if (!pose) {
        pose = {
          previousPosition: object.position.clone(),
          previousRotation: object.quaternion.clone(),
          position: object.position.clone(),
          rotation: object.quaternion.clone(),
        };
        this.poses.set(object, pose);
      }
      pose.position.copy(object.position);
      pose.rotation.copy(object.quaternion);
      // Pets teleport to catch up. Do not draw a streak across the island.
      if (pose.position.distanceTo(pose.previousPosition) > 8) {
        pose.previousPosition.copy(pose.position);
        pose.previousRotation.copy(pose.rotation);
      }
    }
  }

  draw(objects, alpha) {
    for (const object of objects) {
      const pose = this.poses.get(object);
      if (!pose) continue;
      object.position.lerpVectors(pose.previousPosition, pose.position, alpha);
      object.quaternion.slerpQuaternions(
        pose.previousRotation,
        pose.rotation,
        alpha,
      );
    }
  }
}
