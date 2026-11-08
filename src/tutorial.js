// The optional guided tutorial: one small step at a time.
export const TUTORIAL = [
  { id: "move", event: "walk", goal: 4 },
  { id: "look", event: "look", goal: 1.5 },
  { id: "break", event: "break" },
  { id: "place", event: "place" },
  { id: "backpack", event: "open:inventory" },
  { id: "bench", event: "craft:bench" },
  { id: "torch", event: "craft:torch" },
  { id: "shelter", event: "place", goal: 12 },
  { id: "sleep", event: "sleep" },
];

// state: { step, amount } or null when finished or skipped.
export function advance(state, event, amount = 1) {
  if (!state) return { state, finished: false, moved: false };
  const step = TUTORIAL[state.step];
  if (!step || step.event !== event)
    return { state, finished: false, moved: false };
  const amountNow = state.amount + amount;
  if (amountNow < (step.goal ?? 1))
    return {
      state: { ...state, amount: amountNow },
      finished: false,
      moved: false,
    };
  const next = state.step + 1;
  if (next >= TUTORIAL.length)
    return { state: null, finished: true, moved: true };
  return { state: { step: next, amount: 0 }, finished: false, moved: true };
}
