// Each finger owns its held control. Releasing one cannot cancel another.
export class TouchInput {
  pointers = new Map();
  press(id, key) {
    this.pointers.set(id, key);
  }
  release(id) {
    this.pointers.delete(id);
  }
  has(key) {
    return [...this.pointers.values()].includes(key);
  }
  clear() {
    this.pointers.clear();
  }
}
