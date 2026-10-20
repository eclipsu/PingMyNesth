// Run with: node --test lib/courseIndex.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CourseIndex, ProfessorIndex, tokenize, type Catalog } from "./courseIndex.ts";

const catalog: Catalog = JSON.parse(
  readFileSync(new URL("../../internal/catalog/catalog.json", import.meta.url), "utf8"),
);
const index = new CourseIndex(catalog);
const top = (q: string, n = 1) => index.search(q, n).map((s) => s.query);

test("tokenize splits codes and punctuation", () => {
  assert.deepEqual(tokenize("MAT167"), ["mat", "167"]);
  assert.deepEqual(tokenize("Calculus I, with Analytic"), ["calculus", "i", "with", "analytic"]);
});

test('"Calculus I" ranks MAT 167 first, ahead of II/III', () => {
  assert.deepEqual(top("Calculus I"), ["MAT 167"]);
  assert.deepEqual(top("calculus ii"), ["MAT 168"]);
});

test('"calc" finds the calculus sequence by prefix', () => {
  const qs = top("calc", 8);
  for (const code of ["MAT 167", "MAT 168", "MAT 169"]) assert.ok(qs.includes(code), code);
});

test('"calc 1" maps the digit to roman numeral I', () => {
  assert.deepEqual(top("calc 1"), ["MAT 167"]);
});

test("course codes work spaced, glued, and partial", () => {
  assert.deepEqual(top("MAT 167"), ["MAT 167"]);
  assert.deepEqual(top("mat167"), ["MAT 167"]);
  assert.ok(top("csc 10", 5).includes("CSC 101"));
});

test("a subject code or name suggests the whole subject first", () => {
  assert.deepEqual(top("mat"), ["MAT"]);
  assert.deepEqual(top("accounting"), ["ACC"]);
});

test("all query words must match", () => {
  assert.deepEqual(index.search("calculus zzz"), []);
  assert.deepEqual(index.search(""), []);
});

test("searches are fast", () => {
  const start = performance.now();
  for (let i = 0; i < 1000; i++) index.search("calc");
  const perQueryMs = (performance.now() - start) / 1000;
  assert.ok(perQueryMs < 1, `${perQueryMs.toFixed(3)}ms per query`);
});

const profs = new ProfessorIndex(catalog.instructors ?? []);
const topProf = (q: string, n = 1) => profs.search(q, n).map((p) => p.name);

test("professors match by last name, first name, and partials", () => {
  assert.ok(profs.size > 50, `only ${profs.size} instructors`);
  assert.deepEqual(topProf("chen"), ["Ching-Shyang Chen"]);
  assert.deepEqual(topProf("ching"), ["Ching-Shyang Chen"]);
  assert.deepEqual(topProf("zhifu x"), ["Zhifu Xie"]);
  assert.ok(topProf("wri", 8).includes("Sarah Wright"));
});

test("placeholder instructors are not in the catalog", () => {
  assert.ok((catalog.instructors ?? []).every((p) => /[a-z]/i.test(p.last)));
});
