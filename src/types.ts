import { Edge } from './edge';

export type Canvas = { c: HTMLCanvasElement, d: CanvasRenderingContext2D };
export type Point = { x: number, y: number };
export type Dict<T> = { [id: string]: T };
export type Tool = 'node' | 'edge' | 'erase';
export type SizedArray = { w: number, h: number, data: Uint16Array };

export type Color = { r: number, g: number, b: number };
export type MarkType = 'node' | 'edge' | 'unknown';

export type ConjoinedData = {
  array: SizedArray,
  numMarks: number,
  marks: Dict<MarkType>,
  avg: Dict<Point>,
  adjacent: Dict<Dict<boolean>>,
}

export interface ContextLike {
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  moveTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
}

export type Arrowhead = { p: Point, theta: number };
export type RootSpec = { p: Point, es: EdgeSpec };

// Specifying an edge and which side of it we are on, from the point
// of view of a vertex.
export type EdgeSpec = {
  i: string // edge id
  which: 'a' | 'b'
};

export type Vertex = {
  p: Point,
  // edges incident to this vertex, sorted clockwise
  edges: EdgeSpec[],
}

export type GraphData = {
  vertices: Dict<Vertex>,
  edges: Dict<Edge>,
  nextEdge: number,
}

export type RootData = {
  root: string,
  otherRoots: RootSpec[],
  rootDir: Point, // unit vector in the direction the root output should point
  brokenEdge: EdgeSpec, // edge of the original graph that was broken
}

export type RootedGraphData = GraphData & { rootData: RootData }

export type NodeType = { t: 'app' } | { t: 'lam', name: number, varEdge: EdgeSpec };
export type LambdaVertex = Vertex & NodeType;
export type LambdaEdge = { e: Edge, tgt: 'a' | 'b' };

export type Exp =
  | { t: 'var', name: number }
  | { t: 'lam', b: Exp, name: number }
  | { t: 'app', f: Exp, arg: Exp }
  | { t: 'error' };

export type ExpS =
  | { t: 'var' }
  | { t: 'lam', b: ExpS }
  | {
    t: 'app',
    f: ExpS,
    arg: ExpS,
    split: number // how many variables go to the f side
  };

export type LambdaGraphData = {
  vertices: Dict<LambdaVertex>,
  edges: Dict<LambdaEdge>,
  rootData: RootData,
  exp: Exp,
}

// This is purely geometric data about where points are in space, and
// forgets the identity of vertices in the graph. We need to remember
// that elsewhere when dealing with this data.
export type EdgeSegment = { va: Point, vb: Point, m: Point };

export const phonyValue = 0;
