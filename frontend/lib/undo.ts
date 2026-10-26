/**
 * Bounded undo stack of earlier states, newest on top. States are expected to
 * be immutable, so a snapshot is just the old reference.
 *
 * Pushes that share a `group` within `mergeMs` of each other collapse into
 * one step (typing a label shouldn't take one undo per keystroke).
 */
export class UndoStack<T> {
  private items: T[] = [];
  private last: { group: string; at: number } | null = null;

  private readonly limit: number;
  private readonly mergeMs: number;

  constructor(limit = 100, mergeMs = 1000) {
    this.limit = limit;
    this.mergeMs = mergeMs;
  }

  push(prev: T, group?: string, now = Date.now()) {
    const merge = group !== undefined && this.last?.group === group && now - this.last.at < this.mergeMs;
    this.last = group === undefined ? null : { group, at: now };
    if (merge) return;
    this.items.push(prev);
    if (this.items.length > this.limit) this.items.shift();
  }

  pop(): T | undefined {
    this.last = null;
    return this.items.pop();
  }

  clear() {
    this.items = [];
    this.last = null;
  }

  get size() {
    return this.items.length;
  }
}
