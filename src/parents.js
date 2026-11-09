// The grown-ups' corner: a simple question keeps it for parents.
import { DIFFICULTIES } from "./worlds.js";

const defaultParents = () => ({
  reminder: 0,
  maxDifficulty: "hard",
  noMonsters: false,
});
export const REMINDERS = [0, 30, 45, 60];

export function normalizeParents(raw = {}) {
  if (!raw || typeof raw !== "object") raw = {};
  const d = defaultParents();
  return {
    reminder: REMINDERS.includes(raw.reminder) ? raw.reminder : d.reminder,
    maxDifficulty: DIFFICULTIES.includes(raw.maxDifficulty)
      ? raw.maxDifficulty
      : d.maxDifficulty,
    noMonsters: raw.noMonsters === true,
  };
}

const WORDS = {
  pt: [
    "zero",
    "um",
    "dois",
    "três",
    "quatro",
    "cinco",
    "seis",
    "sete",
    "oito",
    "nove",
  ],
  en: [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
  ],
};
// A sum written in words, easy for an adult and slow for a little one.
export function gateQuestion(rand, lang) {
  const a = 3 + Math.floor(rand() * 7),
    b = 3 + Math.floor(rand() * 7);
  return { a: WORDS[lang][a], b: WORDS[lang][b], answer: a + b };
}

// Difficulties a world may use under the parents' limit.
export const allowedDifficulties = (max) =>
  DIFFICULTIES.slice(0, DIFFICULTIES.indexOf(max) + 1);
export const clampDifficulty = (d, max) =>
  DIFFICULTIES.indexOf(d) > DIFFICULTIES.indexOf(max) ? max : d;

// True when it is time for a break (minutes played since the last one).
export const reminderDue = (secondsPlayed, reminder) =>
  reminder > 0 && secondsPlayed >= reminder * 60;
