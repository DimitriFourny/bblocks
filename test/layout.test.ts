import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutGraph } from "../src/Layout";
import type { GraphData, LayoutResult, Point, PositionedNode } from "../src/types";

function graph(ids: readonly string[], edges: GraphData["edges"]): GraphData {
  return { nodes: ids.map(id => ({ id, lines: [id] })), edges };
}

function layout(data: GraphData, labelSizes: readonly { width: number; height: number }[] = []): LayoutResult {
  return layoutGraph(data, data.nodes.map((node, index) => ({
    id: node.id, width: 120 + index * 7, height: 60 + index * 3,
  })), labelSizes);
}

function assertNoOverlaps(nodes: readonly PositionedNode[]): void {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x ||
        a.y + a.height <= b.y || b.y + b.height <= a.y,
      `Nodes ${a.id} and ${b.id} must not overlap`);
    }
  }
}

function assertBounds(result: LayoutResult, labelSizes: readonly { width: number; height: number }[] = []): void {
  const bounds = result.bounds;
  for (const value of [bounds.x, bounds.y, bounds.width, bounds.height]) {
    assert.ok(Number.isFinite(value) && value >= 0, "Bounds must be finite and nonnegative");
  }
  const contains = (x: number, y: number): void => {
    assert.ok(Number.isFinite(x) && Number.isFinite(y), "Geometry must be finite");
    assert.ok(x >= 0 && y >= 0, "Geometry must be nonnegative");
    assert.ok(x >= bounds.x - 1e-8 && y >= bounds.y - 1e-8 &&
      x <= bounds.x + bounds.width + 1e-8 && y <= bounds.y + bounds.height + 1e-8,
    `Bounds must contain (${x}, ${y})`);
  };
  for (const node of result.nodes) {
    contains(node.x, node.y);
    contains(node.x + node.width, node.y + node.height);
  }
  for (const edge of result.edges) {
    assert.ok(edge.points.length >= 2, `Edge ${edge.index} must have a routed path`);
    edge.points.forEach(point => contains(point.x, point.y));
    if (edge.labelPosition) {
      const size = labelSizes[edge.index] ?? { width: 0, height: 0 };
      contains(edge.labelPosition.x - size.width / 2, edge.labelPosition.y - size.height / 2);
      contains(edge.labelPosition.x + size.width / 2, edge.labelPosition.y + size.height / 2);
    }
  }
}

// Segment clipping against the rectangle's interior detects crossings, not just
// waypoints inside a node (which misses a straight line passing through it).
function crossesInterior(a: Point, b: Point, node: PositionedNode): boolean {
  const epsilon = 1e-6;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let low = 0;
  let high = 1;
  const constraints = [
    [-dx, a.x - node.x - epsilon],
    [dx, node.x + node.width - epsilon - a.x],
    [-dy, a.y - node.y - epsilon],
    [dy, node.y + node.height - epsilon - a.y],
  ];
  for (const [direction, distance] of constraints) {
    if (direction === 0) {
      if (distance < 0) return false;
    } else if (direction < 0) {
      low = Math.max(low, distance / direction);
    } else {
      high = Math.min(high, distance / direction);
    }
    if (low > high) return false;
  }
  return low <= high;
}

test("an empty graph has empty geometry and zero bounds", () => {
  assert.deepEqual(layout(graph([], [])), {
    nodes: [], edges: [], bounds: { x: 0, y: 0, width: 0, height: 0 },
  });
});

test("isolated nodes and disconnected components are all retained without overlap", () => {
  const data = graph(["entry", "exit", "island", "other", "otherExit", "secondIsland"], [
    { from: "entry", to: "exit" }, { from: "other", to: "otherExit" },
  ]);
  const result = layout(data);
  assert.deepEqual(result.nodes.map(node => node.id), data.nodes.map(node => node.id));
  assert.equal(result.edges.length, data.edges.length);
  assertNoOverlaps(result.nodes);
  assertBounds(result);
});

test("cycles and merging branches terminate with every node and edge intact", () => {
  const data = graph(["entry", "left", "right", "merge", "exit"], [
    { from: "entry", to: "left" }, { from: "entry", to: "right" },
    { from: "left", to: "merge" }, { from: "right", to: "merge" },
    { from: "merge", to: "entry" }, { from: "merge", to: "exit" },
    { from: "exit", to: "left" },
  ]);
  const result = layout(data);
  assert.deepEqual(result.nodes.map(node => node.id), data.nodes.map(node => node.id));
  assert.deepEqual(result.edges.map(edge => edge.index), data.edges.map((_, index) => index));
  assertNoOverlaps(result.nodes);
  assertBounds(result);
  assert.deepEqual(layout(data), result, "Repeated layout of the same graph must be deterministic");
});

test("a long forward edge routes around the intervening node", () => {
  const result = layout(graph(["start", "middle", "end"], [
    { from: "start", to: "middle" }, { from: "middle", to: "end" },
    { from: "start", to: "end" },
  ]));
  const middle = result.nodes.find(node => node.id === "middle")!;
  const points = result.edges[2].points;
  assert.ok(points.length >= 2, "The long edge must be routed");
  for (let index = 1; index < points.length; index++) {
    assert.equal(crossesInterior(points[index - 1], points[index], middle), false,
      "No segment of the long edge may cross the intermediate node");
  }
  assertNoOverlaps(result.nodes);
  assertBounds(result);
});

test("self loops are nondegenerate and parallel edges have distinct paths", () => {
  const data = graph(["source", "target"], [
    { from: "source", to: "source", label: "repeat" },
    { from: "source", to: "target", label: "yes" },
    { from: "source", to: "target", label: "no" },
  ]);
  const labelSizes = [{ width: 180, height: 32 }, { width: 40, height: 24 }, { width: 40, height: 24 }];
  const result = layout(data, labelSizes);
  assert.equal(result.edges.length, 3, "Parallel edges must not replace one another");
  const self = result.edges[0];
  assert.ok(new Set(self.points.map(point => `${point.x},${point.y}`)).size >= 3,
    "A self loop must have at least three distinct routed points");
  const source = result.nodes[0];
  assert.ok(self.points.some(point => point.x < source.x || point.x > source.x + source.width ||
    point.y < source.y || point.y > source.y + source.height), "A self loop must leave its node");
  assert.notDeepEqual(result.edges[1].points, result.edges[2].points,
    "Parallel edges must be individually visible");
  for (const edge of result.edges) assert.ok(edge.labelPosition, "Each measured label must be positioned");
  assertNoOverlaps(result.nodes);
  assertBounds(result, labelSizes);
});

test("large edge labels remain fully inside the exported geometry bounds", () => {
  const data = graph(["a", "b", "c"], [
    { from: "a", to: "b", label: "wide forward label" },
    { from: "b", to: "c" },
    { from: "c", to: "a", label: "wide backward label" },
  ]);
  const labelSizes = [{ width: 500, height: 90 }, { width: 0, height: 0 }, { width: 600, height: 120 }];
  const result = layout(data, labelSizes);
  assert.ok(result.edges[0].labelPosition, "The forward label must be positioned");
  assert.ok(result.edges[2].labelPosition, "The backward label must be positioned");
  assertNoOverlaps(result.nodes);
  assertBounds(result, labelSizes);
});

test("arbitrary nonempty string IDs retain every node and routed edge", () => {
  const ids = ["__proto__", "constructor", "toString", "入口→出口", "block / #1: [x]"];
  const data = graph(ids, [
    { from: ids[0], to: ids[1] },
    { from: ids[1], to: ids[2] },
    { from: ids[2], to: ids[3] },
    { from: ids[3], to: ids[4] },
    { from: ids[4], to: ids[0] },
    { from: ids[0], to: ids[1] },
  ]);
  const result = layout(data);
  assert.deepEqual(result.nodes.map(node => node.id), ids,
    "Special-looking IDs must remain distinct and unchanged");
  assert.deepEqual(result.edges.map(edge => edge.index), data.edges.map((_, index) => index),
    "Every edge between arbitrary IDs must survive layout");
  assertNoOverlaps(result.nodes);
  assertBounds(result);
});
