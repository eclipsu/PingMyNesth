import { test } from "node:test";
import assert from "node:assert/strict";
import { UndoStack } from "./undo.ts";

test("pops states newest first", () => {
  const s = new UndoStack<number>();
  s.push(1);
  s.push(2);
  assert.equal(s.pop(), 2);
  assert.equal(s.pop(), 1);
  assert.equal(s.pop(), undefined);
});

test("drops the oldest past the limit", () => {
  const s = new UndoStack<number>(2);
  s.push(1);
  s.push(2);
  s.push(3);
  assert.equal(s.size, 2);
  assert.equal(s.pop(), 3);
  assert.equal(s.pop(), 2);
});

test("quick pushes in one group are one step", () => {
  const s = new UndoStack<string>(100, 1000);
  s.push("", "label", 0);
  s.push("W", "label", 300);
  s.push("Wo", "label", 600);
  assert.equal(s.size, 1);
  assert.equal(s.pop(), "");

  // a pause, another group, or an ungrouped push starts a new step
  s.push("a", "label", 0);
  s.push("b", "label", 5000);
  s.push("c", "other", 5100);
  s.push("d", undefined, 5200);
  s.push("e", "other", 5300);
  assert.equal(s.size, 5);
});
