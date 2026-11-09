// Footsteps, animal and monster voices and a few house sounds (doors,
// chests, the furnace), made live with Web Audio (no audio files).
import {
  PLANKS,
  BENCH,
  DOOR,
  DOOR_OPEN,
  STONE_BRICK,
  COPPER_BLOCK,
  LADDER,
  isWater,
} from "./world.js";

// What a step sounds like on each kind of ground: sand, hard (stone and
// bricks), wood, water, or soft for everything else (grass, dirt, wool...).
export function stepKind(type) {
  if (type === undefined) return null;
  if (isWater(type)) return "water";
  if (type === 3) return "sand";
  if ([2, 6, 7, STONE_BRICK, COPPER_BLOCK].includes(type)) return "hard";
  if ([4, PLANKS, BENCH, DOOR, DOOR_OPEN, LADDER].includes(type)) return "wood";
  return "soft";
}
// Noise filtered to a band: [centre frequency, how long, how loud].
const STEPS = {
  soft: [380, 0.07, 0.5],
  sand: [2200, 0.09, 0.35],
  hard: [1400, 0.05, 0.55],
  wood: [700, 0.06, 0.6],
  water: [900, 0.14, 0.5],
};

// Each voice is a few notes: [wave, from Hz, to Hz, seconds, start delay].
export const VOICES = {
  cow: [["sawtooth", 150, 105, 0.7, 0]],
  sheep: [["sawtooth", 330, 300, 0.5, 0]],
  chicken: [
    ["square", 900, 1200, 0.06, 0],
    ["square", 900, 1300, 0.06, 0.1],
    ["square", 1000, 700, 0.1, 0.2],
  ],
  pig: [
    ["square", 240, 160, 0.16, 0],
    ["square", 220, 150, 0.14, 0.2],
  ],
  rabbit: [["sine", 1500, 1800, 0.05, 0]],
  dog: [
    ["square", 420, 220, 0.11, 0],
    ["square", 420, 220, 0.11, 0.2],
  ],
  cat: [
    ["triangle", 520, 760, 0.18, 0],
    ["triangle", 760, 420, 0.25, 0.18],
  ],
  horse: [["sawtooth", 700, 420, 0.6, 0]],
  // Monsters sound silly, not scary.
  sleepy: [["sine", 300, 180, 0.6, 0]],
  jelly: [
    ["sine", 220, 520, 0.12, 0],
    ["sine", 260, 600, 0.12, 0.14],
  ],
  archer: [
    ["square", 1200, 1100, 0.03, 0],
    ["square", 1000, 900, 0.03, 0.06],
    ["square", 1300, 1200, 0.03, 0.12],
  ],
  spider: [
    ["triangle", 1400, 1900, 0.08, 0],
    ["triangle", 1600, 2100, 0.08, 0.1],
  ],
  puff: [["sawtooth", 160, 80, 0.4, 0]],
  ghost: [
    ["sine", 500, 700, 0.5, 0],
    ["sine", 700, 450, 0.6, 0.45],
  ],
  // Things around the house.
  door: [
    ["triangle", 180, 140, 0.18, 0],
    ["triangle", 150, 110, 0.12, 0.16],
  ],
  chest: [
    ["square", 140, 90, 0.08, 0],
    ["triangle", 520, 780, 0.12, 0.1],
  ],
  furnace: [["sawtooth", 90, 70, 0.35, 0]],
};
// Voices that wobble a little (sheep bleat, horse neigh, a ghost's "ooo").
const WOBBLE = { sheep: 22, horse: 30, ghost: 18, sleepy: 6 };

export function playStep(audio, kind, volume) {
  const step = STEPS[kind];
  if (!step || volume <= 0) return;
  const [freq, length, loud] = step,
    at = audio.currentTime,
    rate = audio.sampleRate,
    buffer = audio.createBuffer(1, Math.ceil(rate * length), rate),
    data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = audio.createBufferSource(),
    filter = audio.createBiquadFilter(),
    gain = audio.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = freq * (0.9 + Math.random() * 0.2);
  filter.Q.value = 1.2;
  gain.gain.value = 0.05 * loud * volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);
  source.start(at);
}

export function playVoice(audio, type, volume, pitch = 1) {
  const notes = VOICES[type];
  if (!notes || volume <= 0) return;
  for (const [wave, from, to, length, delay] of notes) {
    const at = audio.currentTime + delay,
      osc = audio.createOscillator(),
      filter = audio.createBiquadFilter(),
      gain = audio.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from * pitch, at);
    osc.frequency.exponentialRampToValueAtTime(to * pitch, at + length);
    if (WOBBLE[type]) {
      const lfo = audio.createOscillator(),
        depth = audio.createGain();
      lfo.frequency.value = 9;
      depth.gain.value = WOBBLE[type];
      lfo.connect(depth);
      depth.connect(osc.frequency);
      lfo.start(at);
      lfo.stop(at + length);
    }
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.05 * volume + 0.0001, at + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    osc.start(at);
    osc.stop(at + length + 0.02);
  }
}
