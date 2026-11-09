// Biel's backpack: 9 hotbar slots followed by 27 backpack slots.
import { isItem, maxStack, toolUses } from "./items.js";

export const SLOTS = 36;

export class Inventory {
  constructor(size = SLOTS) {
    this.size = size;
    this.slots = Array(size).fill(null);
  }

  // Adds items, filling existing stacks first. Returns how many did not fit.
  add(id, count = 1) {
    for (const pass of ["stack", "empty"])
      for (let i = 0; i < this.size && count > 0; i++) {
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
    for (let i = this.size - 1; i >= 0 && count > 0; i--) {
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

  // Wears the tool in a slot by one use. Returns "tired" once, when it is
  // nearly worn out, "broke" when it is gone, otherwise null.
  wearOut(index) {
    const slot = this.slots[index],
      uses = toolUses(slot?.id);
    if (!uses) return null;
    slot.wear = (slot.wear ?? 0) + 1;
    if (slot.wear >= uses) {
      this.slots[index] = null;
      return "broke";
    }
    return slot.wear === Math.ceil(uses * 0.9) ? "tired" : null;
  }

  swap(a, b) {
    [this.slots[a], this.slots[b]] = [this.slots[b], this.slots[a]];
  }

  toJSON() {
    return this.slots.map((s) =>
      s ? (s.wear ? [s.id, s.count, s.wear] : [s.id, s.count]) : null,
    );
  }

  static from(raw, size = SLOTS) {
    const inv = new Inventory(size);
    if (!Array.isArray(raw)) return inv;
    raw.slice(0, size).forEach((s, i) => {
      if (
        Array.isArray(s) &&
        isItem(s[0]) &&
        Number.isInteger(s[1]) &&
        s[1] > 0
      ) {
        inv.slots[i] = { id: s[0], count: Math.min(s[1], maxStack(s[0])) };
        if (Number.isInteger(s[2]) && s[2] > 0 && s[2] < toolUses(s[0]))
          inv.slots[i].wear = s[2];
      }
    });
    return inv;
  }
}
