type Canvas = { c: HTMLCanvasElement, d: CanvasRenderingContext2D };
type Point = { x: number, y: number };
type Dict<T> = { [id: string]: T };
type Tool = 'node' | 'edge' | 'erase';
type SizedArray = { w: number, h: number, data: Uint16Array };

type Color = { r: number, g: number, b: number };
type MarkType = 'node' | 'edge' | 'unknown';

type ConjoinedData = {
  array: SizedArray,
  numMarks: number,
  marks: Dict<MarkType>,
  avg: Dict<Point>,
  adjacent: Dict<Dict<boolean>>,
}

type Edge = {
  a: string, // vertex id
  b: string,
  m: Point, // center of gravity of edge
}

type EdgeSpec = {
  i: number,
  which: 'a' | 'b'
};

type Vertex = {
  p: Point,
  // edges incident to this vertex, sorted clockwise
  edges: EdgeSpec[],
}

type GraphData = {
  vertices: Dict<Vertex>,
  edges: Edge[],
}

type RootData = {
  root: string,
  otherRoots: RootSpec[],
}

type RootedGraphData = GraphData & { rootData: RootData }

type NodeType = 'app' | 'lam';
type LambdaVertex = Vertex & { t: NodeType };
type LambdaEdge = Edge & { tgt: 'a' | 'b' };

type Exp =
  | { t: 'var' }
  | { t: 'lam', b: Exp }
  | { t: 'app', f: Exp, arg: Exp };

type ExpS =
  | { t: 'var' }
  | { t: 'lam', b: ExpS }
  | {
    t: 'app',
    f: ExpS,
    arg: ExpS,
    split: number // how many variables go to the f side
  };

type LambdaGraphData = {
  vertices: Dict<LambdaVertex>,
  edges: LambdaEdge[],
  rootData: RootData,
  exp: Exp,
}

type RootSpec = { p: Point, es: EdgeSpec };
