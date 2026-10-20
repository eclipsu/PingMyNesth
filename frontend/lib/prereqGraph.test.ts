// Run with: node --test lib/prereqGraph.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { PrereqGraph, compareCodes, type PrereqCourse } from "./prereqGraph.ts";

const c = (code: string, prereqs: string[][] = []): PrereqCourse => {
  const [subject, catalog_nbr] = code.split(" ");
  return { subject, catalog_nbr, title: code, prereqs };
};

// a small calculus/physics chain with an OR group and a shared prerequisite
const g = new PrereqGraph([
  c("MAT 101"),
  c("MAT 103"),
  c("MAT 167", [["MAT 101", "MAT 103"]]),
  c("MAT 168", [["MAT 167"]]),
  c("MAT 169", [["MAT 168"]]),
  c("PHY 201", [["MAT 167"]]),
  c("PHY 202", [["PHY 201"], ["MAT 168"]]),
]);

test("layout puts foundations left and every arrow rightward", () => {
  const { columns, edges, cycles } = g.layout("PHY 202");
  assert.deepEqual(columns, [["MAT 101", "MAT 103"], ["MAT 167"], ["MAT 168", "PHY 201"], ["PHY 202"]]);
  const col = (code: string) => columns.findIndex((col) => col.includes(code));
  for (const e of edges) assert.ok(col(e.from) < col(e.to), `${e.from} -> ${e.to}`);
  assert.equal(cycles.length, 0);
});

test("longest path wins: a prereq needed at two depths sits at the deeper one", () => {
  // MAT 167 is needed by PHY 201 (depth 2) and via MAT 168 (depth 2); MAT 101 at depth 3
  const { columns } = g.layout("PHY 202");
  assert.equal(columns.length, 4);
  assert.ok(!columns.flat().some((id) => id.startsWith("~")), "no long edges in this graph");
});

test("OR-group edges are marked as alternatives", () => {
  const { edges } = g.layout("MAT 167");
  assert.deepEqual(
    edges.map((e) => [e.from, e.alternative]),
    [["MAT 101", true], ["MAT 103", true]],
  );
});

test("edges that skip columns get one waypoint per skipped column", () => {
  const skip = new PrereqGraph([
    c("MAT 101"),
    c("MAT 167", [["MAT 101"]]),
    c("MAT 168", [["MAT 167"]]),
    c("MAT 280", [["MAT 168"], ["MAT 101"]]), // MAT 101 is 3 columns left of MAT 280
  ]);
  const { columns, routes } = skip.layout("MAT 280");
  assert.deepEqual(routes.get("MAT 101>MAT 280"), ["~MAT 101>MAT 280#1", "~MAT 101>MAT 280#2"]);
  assert.ok(columns[1].includes("~MAT 101>MAT 280#1") && columns[2].includes("~MAT 101>MAT 280#2"));
  assert.deepEqual(routes.get("MAT 168>MAT 280"), []);
});

test("plan picks one alternative and layers into the fewest semesters", () => {
  assert.deepEqual(g.plan("PHY 202"), [["MAT 101"], ["MAT 167"], ["MAT 168", "PHY 201"], ["PHY 202"]]);
});

test("plan prefers a known alternative over one we have no data for", () => {
  const withUnknown = new PrereqGraph([c("MAT 101"), c("MAT 103", [["MAT 101"]]), c("MAT 167", [["MAT 103", "MAT 128"]])]);
  // MAT 128 isn't in the catalog: cheaper on paper, but we can't vouch for it
  assert.deepEqual(withUnknown.plan("MAT 167"), [["MAT 101"], ["MAT 103"], ["MAT 167"]]);
});

test("unlocks: direct dependents and the full BFS closure", () => {
  assert.deepEqual(g.unlocks("MAT 167"), ["MAT 168", "PHY 201"]);
  assert.deepEqual(g.unlocksAll("MAT 167"), ["MAT 168", "MAT 169", "PHY 201", "PHY 202"]);
});

test("cycles in bad data are detected and never loop", () => {
  const bad = new PrereqGraph([c("A 100", [["A 200"]]), c("A 200", [["A 300"]]), c("A 300", [["A 100"]])]);
  const { cycles, columns } = bad.layout("A 100");
  assert.equal(cycles.length, 1);
  assert.equal(columns.flat().length, 3);
  assert.ok(bad.plan("A 100").flat().includes("A 100"));
});

test("unknown prerequisites still appear, marked unknown", () => {
  const partial = new PrereqGraph([c("CSC 306", [["CSC 102"]])]);
  const { nodes } = partial.layout("CSC 306");
  assert.equal(nodes.get("CSC 102")?.known, false);
});

test("compareCodes orders numerically, then by suffix", () => {
  assert.deepEqual(["MAT 167L", "PHY 101", "MAT 99", "MAT 167"].sort(compareCodes), ["MAT 99", "MAT 167", "MAT 167L", "PHY 101"]);
});
