export interface GraphNode {
  readonly id: string;
  readonly lines: readonly string[];
}

export interface GraphEdge {
  readonly id?: string;
  readonly from: string;
  readonly to: string;
  readonly color?: string;
  readonly label?: string;
}

export interface GraphData {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}

export interface Theme {
  background: string;
  grid: string;
  nodeBackground: string;
  nodeBorder: string;
  text: string;
  edge: string;
  accent: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  padding: number;
}

export interface GraphOptions {
  readonly theme?: Partial<Theme>;
  readonly interactive?: boolean;
  readonly onNodeSelect?: (id: string) => void;
}

export interface Point { x: number; y: number }
export interface Bounds { x: number; y: number; width: number; height: number }
export interface NodeSize { id: string; width: number; height: number }
export interface PositionedNode extends NodeSize { x: number; y: number }
export interface RoutedEdge {
  index: number;
  points: Point[];
  labelPosition?: Point;
}
export interface LayoutResult {
  nodes: PositionedNode[];
  edges: RoutedEdge[];
  bounds: Bounds;
}
