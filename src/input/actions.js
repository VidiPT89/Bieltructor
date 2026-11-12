// One list of what Biel can do, whatever the input: keyboard, touch buttons
// or a game controller. Every input names these actions, never raw keys.

// The keyboard keys for each action.
export const KEYBOARD = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  run: ["ShiftLeft", "ShiftRight"],
  jump: ["Space"],
  down: ["KeyC"],
  attack: ["KeyF"],
  backpack: ["KeyE"],
  view: ["KeyV"],
};

// The actions a key starts (a key can do more than one thing).
export const actionsForKey = (code) =>
  Object.keys(KEYBOARD).filter((name) => KEYBOARD[name].includes(code));

// Whether an action is held on any input. `keys` holds keyboard codes,
// `touch` has a has(action) method, `pad` is a set of actions.
export function isHeld(name, { keys, touch, pad }) {
  return (
    (KEYBOARD[name] ?? []).some((code) => keys.has(code)) ||
    touch.has(name) ||
    pad.has(name)
  );
}
