// Game controllers (PlayStation, Xbox, MFi): turns a controller's state into
// the same actions the keyboard and the touch buttons use.
export const DEADZONE = 0.22;

// state: { lx, ly, rx, ry, lt, rt, a, b, x, y, lb, rb, start, up, down, left, right }
// Axes go from -1 to 1 (up is negative); triggers from 0 to 1.
export function readPad(state = {}) {
  const v = (n) => (Math.abs(n ?? 0) < DEADZONE ? 0 : n);
  const lx = v(state.lx),
    ly = v(state.ly);
  const held = new Set();
  if (ly < 0) held.add("KeyW");
  if (ly > 0) held.add("KeyS");
  if (lx < 0) held.add("KeyA");
  if (lx > 0) held.add("KeyD");
  if (Math.hypot(lx, ly) > 0.92) held.add("ShiftLeft");
  if (state.a) held.add("Space");
  if ((state.rt ?? 0) > 0.4) held.add("Break");
  if (state.b) held.add("KeyC");
  return {
    held,
    look: [v(state.rx), v(state.ry)],
    // Things that happen once per press.
    place: (state.lt ?? 0) > 0.4,
    attack: !!state.x,
    backpack: !!state.y,
    pause: !!state.start,
    next: !!state.rb,
    previous: !!state.lb,
    menuUp: !!state.up || ly < -0.6,
    menuDown: !!state.down || ly > 0.6,
    confirm: !!state.a,
    back: !!state.b,
  };
}

// Only fires on the frame a button goes down.
export function pressedNow(now, before, name) {
  return !!now[name] && !before?.[name];
}

// The standard Gamepad API layout, used in browsers.
export function fromStandardGamepad(g) {
  if (!g) return null;
  const b = (i) => !!g.buttons[i]?.pressed;
  return {
    lx: g.axes[0],
    ly: g.axes[1],
    rx: g.axes[2],
    ry: g.axes[3],
    a: b(0),
    b: b(1),
    x: b(2),
    y: b(3),
    lb: b(4),
    rb: b(5),
    lt: g.buttons[6]?.value ?? 0,
    rt: g.buttons[7]?.value ?? 0,
    start: b(9),
    up: b(12),
    down: b(13),
    left: b(14),
    right: b(15),
  };
}
