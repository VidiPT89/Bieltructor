// Weather: sunny, cloudy, rain and (on Normal and Hard) thunderstorms.
export const WEATHERS = ["clear", "cloudy", "rain", "storm"];

// How the sky looks for each kind of weather.
export const LOOK = {
  clear: { rain: 0, dark: 0 },
  cloudy: { rain: 0, dark: 0.2 },
  rain: { rain: 1, dark: 0.35 },
  storm: { rain: 1, dark: 0.5 },
};

// Picks the next weather. Thunderstorms only on Normal and Hard.
export function nextWeather(rand, difficulty) {
  const r = rand();
  const stormy = difficulty === "normal" || difficulty === "hard";
  if (r < 0.55) return "clear";
  if (r < 0.75) return "cloudy";
  if (r < 0.93 || !stormy) return "rain";
  return "storm";
}

// Weather lasts two to five minutes of play.
export const weatherLength = (rand) => 120 + rand() * 180;

export function validateWeather(raw) {
  return raw && WEATHERS.includes(raw.state) && Number.isFinite(raw.until)
    ? { state: raw.state, until: raw.until }
    : { state: "clear", until: 0 };
}

// Moves a value smoothly towards a target.
export const approach = (value, target, dt, speed = 0.25) =>
  value +
  Math.sign(target - value) * Math.min(Math.abs(target - value), dt * speed);
