import * as dagre from "@dagrejs/dagre";
import type { GraphData, LayoutResult, NodeSize, Point, PositionedNode, RoutedEdge } from "./types";

/** Lay out every component and route edges in input order, including parallel edges. */
export function layoutGraph(
  data: GraphData,
  sizes: readonly NodeSize[],
  labelSizes: readonly { width: number; height: number }[] = [],
): LayoutResult {
  if (data.nodes.length === 0 && data.edges.length === 0) {
    return { nodes: [], edges: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };
  }

  const graph = new dagre.graphlib.Graph({ directed: true, multigraph: true });
  graph.setGraph({ rankdir: "TB", nodesep: 48, ranksep: 64, edgesep: 24, marginx: 0, marginy: 0 });
  graph.setDefaultEdgeLabel(() => ({}));
  const sizesById = new Map(sizes.map(size => [size.id, size]));
  // Graphlib stores names in plain objects; never pass consumer IDs as keys.
  const namesById = new Map(data.nodes.map((node, index) => [node.id, `node${index}`]));

  for (const node of data.nodes) {
    const size = sizesById.get(node.id);
    if (!size || !Number.isFinite(size.width) || !Number.isFinite(size.height) ||
        size.width <= 0 || size.height <= 0) {
      throw new Error(`Missing or invalid size for node "${node.id}"`);
    }
    graph.setNode(namesById.get(node.id)!, { width: size.width, height: size.height });
  }
  data.edges.forEach((edge, index) => {
    const from = namesById.get(edge.from);
    const to = namesById.get(edge.to);
    if (from === undefined || to === undefined) {
      throw new Error(`Unknown endpoint for edge ${index}`);
    }
    const size = labelSizes[index];
    const width = edge.label ? (size?.width ?? 0) : 0;
    const height = edge.label ? (size?.height ?? 0) : 0;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0) {
      throw new Error(`Invalid label size for edge ${index}`);
    }
    graph.setEdge(from, to, { width, height, labelpos: "c", labeloffset: 0 }, String(index));
  });
  dagre.layout(graph);

  const nodes: PositionedNode[] = data.nodes.map(node => {
    const positioned = graph.node(namesById.get(node.id)!);
    return {
      id: node.id,
      width: positioned.width,
      height: positioned.height,
      x: positioned.x - positioned.width / 2,
      y: positioned.y - positioned.height / 2,
    };
  });
  const edges: RoutedEdge[] = data.edges.map((edge, index) => {
    const routed = graph.edge({
      v: namesById.get(edge.from)!, w: namesById.get(edge.to)!, name: String(index),
    });
    const result: RoutedEdge = { index, points: routed.points.map(point => ({ x: point.x, y: point.y })) };
    if (edge.label && typeof routed.x === "number" && typeof routed.y === "number") {
      result.labelPosition = { x: routed.x, y: routed.y };
    }
    return result;
  });

  // Dagre's graph dimensions do not include every self-loop/label extent.
  // Compute the actual envelope and translate it to a nonnegative origin.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const include = (x: number, y: number): void => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error("Graph layout produced non-finite geometry");
    }
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const node of nodes) {
    include(node.x, node.y);
    include(node.x + node.width, node.y + node.height);
  }
  for (const edge of edges) {
    for (const point of edge.points) include(point.x, point.y);
    if (edge.labelPosition) {
      const size = labelSizes[edge.index];
      const halfWidth = (size?.width ?? 0) / 2;
      const halfHeight = (size?.height ?? 0) / 2;
      include(edge.labelPosition.x - halfWidth, edge.labelPosition.y - halfHeight);
      include(edge.labelPosition.x + halfWidth, edge.labelPosition.y + halfHeight);
    }
  }
  const translate = (point: Point): void => {
    point.x -= minX;
    point.y -= minY;
  };
  for (const node of nodes) translate(node);
  for (const edge of edges) {
    for (const point of edge.points) translate(point);
    if (edge.labelPosition) translate(edge.labelPosition);
  }
  return { nodes, edges, bounds: { x: 0, y: 0, width: maxX - minX, height: maxY - minY } };
}
