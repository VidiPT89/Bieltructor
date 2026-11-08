// Biel's backpack: 9 hotbar slots followed by 27 backpack slots.
import { isItem, maxStack } from "./items.js";

export const SLOTS = 36;

export class Inventory {
  slots = Array(SLOTS).fill(null);

  // Adds items, filling existing stacks first. Returns how many did not fit.
  add(id, count = 1) {
    for (const pass of ["stack", "empty"])
      for (let i = 0; i < SLOTS && count > 0; i++) {
        const slot = this.slots[i];
        if (pass === "stack" && slot?.id === id && slot.count < maxStack(id)) {
          const n = Math.min(count, maxStack(id) - slot.count);
          slot.count += n;
          count -= n;
        } else if (pass === "empty" && !slot) {
          const n = Math.min(count, maxStack(id));
          this.slots[i] = { id, count: n };
          count -= n;
        }
      }
    return count;
  }

  count(id) {
    return this.slots.reduce((n, s) => n + (s?.id === id ? s.count : 0), 0);
  }

  // Removes items only if there are enough of them.
  remove(id, count = 1) {
    if (this.count(id) < count) return false;
    for (let i = SLOTS - 1; i >= 0 && count > 0; i--) {
      const slot = this.slots[i];
      if (slot?.id !== id) continue;
      const n = Math.min(count, slot.count);
      slot.count -= n;
      count -= n;
      if (!slot.count) this.slots[i] = null;
    }
    return true;
  }

  // Takes one item from a given slot (placing a block, eating).
  takeFrom(index) {
    const slot = this.slots[index];
    if (!slot) return null;
    slot.count--;
    if (!slot.count) this.slots[index] = null;
    return slot.id;
  }

  swap(a, b) {
    [this.slots[a], this.slots[b]] = [this.slots[b], this.slots[a]];
  }

  toJSON() {
    return this.slots.map((s) => (s ? [s.id, s.count] : null));
  }

  static from(raw) {
    const inv = new Inventory();
    if (!Array.isArray(raw)) return inv;
    raw.slice(0, SLOTS).forEach((s, i) => {
      if (
        Array.isArray(s) &&
        isItem(s[0]) &&
        Number.isInteger(s[1]) &&
        s[1] > 0
      )
        inv.slots[i] = { id: s[0], count: Math.min(s[1], maxStack(s[0])) };
    });
    return inv;
  }
}
