// Day and night. The cycle position t runs from 0 to 1:
// 0 sunrise, 0.25 noon, 0.5 sunset, 0.75 midnight.
export const NOON = 0.25;

const smooth = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

export function sky(t) {
  const angle = (((t % 1) + 1) % 1) * Math.PI * 2;
  const elevation = Math.sin(angle);
  // Full light once the sun is a little up; twilight lasts a while around the horizon.
  const daylight = smooth(-0.3, 0.25, elevation);
  // Orange glow strongest when the sun is near the horizon.
  const dusk =
    Math.max(0, 1 - Math.abs(elevation) / 0.35) * smooth(-0.35, 0, elevation);
  return {
    elevation,
    daylight,
    dusk,
    night: daylight < 0.35,
    sun: [Math.cos(angle), elevation, 0.35],
  };
}
