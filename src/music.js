// Gentle background music, generated live with Web Audio (no audio files).
let context;
export const audioContext = () => (context ??= new AudioContext());

// C major pentatonic; one chord per bar: C, Am, F, G.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const CHORDS = [
  [0, 4, 7],
  [-3, 0, 4],
  [-7, -3, 0],
  [-5, -1, 2],
];
const hash = (n) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

// Notes for one bar of eight steps. Night bars are sparser and an octave lower.
export function bar(index, night) {
  const chord = CHORDS[index % CHORDS.length];
  const notes = [];
  for (let step = 0; step < 8; step++) {
    const r = hash(index * 8 + step + (night ? 999 : 0));
    if (r < (night ? 0.62 : 0.4)) continue;
    const degree = Math.floor(hash(index * 31 + step) * SCALE.length);
    notes.push({ step, semitone: SCALE[degree] + (night ? -12 : 0) });
  }
  return { chord: chord.map((s) => s - 12), notes };
}

const frequency = (semitone) => 261.63 * 2 ** (semitone / 12);

export class Music {
  enabled = false;
  volume = 0.8;
  night = false;
  // In caves the music slows down, rings with a longer echo and plays its
  // notes a fifth higher: mysterious, never scary.
  cave = false;
  #timer;
  #feedback;
  #barIndex = 0;
  #nextBar = 0;
  #out;

  start() {
    const ctx = audioContext();
    ctx.resume();
    if (!this.#out) {
      this.#out = ctx.createGain();
      const delay = ctx.createDelay(),
        feedback = ctx.createGain();
      delay.delayTime.value = 0.38;
      feedback.gain.value = 0.28;
      this.#feedback = feedback;
      this.#out.connect(ctx.destination);
      this.#out.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(ctx.destination);
    }
    this.#out.gain.setTargetAtTime(0.06 * this.volume, ctx.currentTime, 0.8);
    if (this.#timer) return;
    this.enabled = true;
    this.#nextBar = ctx.currentTime + 0.2;
    this.#timer = setInterval(() => this.#schedule(), 200);
  }

  setVolume(v) {
    this.volume = v;
    if (this.#out && this.enabled)
      this.#out.gain.setTargetAtTime(0.06 * v, audioContext().currentTime, 0.2);
  }

  stop() {
    this.enabled = false;
    clearInterval(this.#timer);
    this.#timer = undefined;
    if (this.#out)
      this.#out.gain.setTargetAtTime(0, audioContext().currentTime, 0.3);
  }

  #schedule() {
    const ctx = audioContext();
    this.#feedback?.gain.setTargetAtTime(
      this.cave ? 0.45 : 0.28,
      ctx.currentTime,
      1,
    );
    while (this.#nextBar < ctx.currentTime + 1) {
      const beat = this.cave ? 0.75 : this.night ? 0.62 : 0.42,
        shift = this.cave ? 7 : 0,
        { chord, notes } = bar(this.#barIndex++, this.night || this.cave);
      for (const s of chord)
        this.#tone(s, this.#nextBar, beat * 8, 0.18, "sine");
      for (const n of notes)
        this.#tone(
          n.semitone + shift,
          this.#nextBar + n.step * beat,
          beat * 1.6,
          0.5,
          "triangle",
        );
      this.#nextBar += beat * 8;
    }
  }

  #tone(semitone, at, length, volume, type) {
    const ctx = audioContext(),
      osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency(semitone);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain);
    gain.connect(this.#out);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }
}

// Silence everything while the app is in the background, without creating audio early.
export function pauseAudio(paused) {
  if (!context) return;
  if (paused) context.suspend();
  else context.resume();
}
