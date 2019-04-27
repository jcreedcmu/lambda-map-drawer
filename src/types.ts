import * as u from './util';

const SMOL_OFFSET = 12;

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

interface ContextLike {
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  moveTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
}

type Arrowhead = { p: Point, angle: number };
export type RootSpec = { p: Point, es: EdgeSpec };

export class Edge {
  a: string; // vertex id
  b: string;
  private m: Point; // center of gravity of edge

  constructor(a: string, b: string, m: Point) {
    this.a = a;
    this.b = b;
    this.m = m;
  }

  draw(vs: Dict<Vertex>, d: ContextLike): void {
    const va = vs[this.a].p;
    const vb = vs[this.b].p;

    d.moveTo(va.x, va.y);
    d.quadraticCurveTo(
      2 * this.m.x - (va.x + vb.x) / 2,
      2 * this.m.y - (va.y + vb.y) / 2,
      vb.x, vb.y);
  }

  getRootChoices(vertices: Dict<Vertex>, i: string): RootSpec[] {
    const va = vertices[this.a].p;
    const vb = vertices[this.b].p;
    const off = u.vrot90(u.vscale(u.vnorm(u.vsub(va, vb)), SMOL_OFFSET));
    return [
      { p: u.vplus(this.m, off), es: { i, which: 'a' } },
      { p: u.vsub(this.m, off), es: { i, which: 'b' } }
    ];
  }

  getBreakPoint(): Point {
    return this.m;
  }

  // returns a tangent vector from an edge's endpoint to the interior of the edge
  // bear in mind that e.m is the 'midpoint' of the edge, and the quadratic
  // control point is actually
  // 2 * m - (a + b) / 2,
  getVelocity(vertices: Dict<Vertex>, side: 'a' | 'b'): Point {
    const c = u.vmn(
      [this.m, vertices[this.a].p, vertices[this.b].p],
      ([m, a, b]) => 2 * m - (a + b) / 2
    );
    return u.vnorm(u.vsub(c, vertices[this[side]].p));
  }

  getArrowHeads(vertices: Dict<Vertex>, tgt: 'a' | 'b'): Arrowhead[] {
    const mang = (tgt == 'a' ? 0.5 : 1.5) * Math.PI -
      u.angle(u.vsub(vertices[this.a].p, vertices[this.b].p));
    return [{ p: this.m, angle: mang }];
  }
}


type EdgeSegment = string;

export type MultiEdge = {
  a: string,  // vertex id
  b: string,
  segs: EdgeSegment[],
}

export type EdgeSpec = {
  i: string
  which: 'a' | 'b'
};

export type Vertex = {
  p: Point,
  // edges incident to this vertex, sorted clockwise
  edges: EdgeSpec[],
}

export type GraphData<E> = {
  vertices: Dict<Vertex>,
  edges: Dict<E>,
  nextEdge: number,
}

export type RootData = {
  root: string,
  otherRoots: RootSpec[],
  rootDir: Point, // unit vector in the direction the root output should point
  brokenEdge: EdgeSpec, // edge of the original graph that was broken
}

export type RootedGraphData<E> = GraphData<E> & { rootData: RootData }

export type NodeType = 'app' | 'lam';
export type LambdaVertex = Vertex & { t: NodeType };
export type LambdaEdge<E> = { e: E, tgt: 'a' | 'b' };

export type Exp =
  | { t: 'var' }
  | { t: 'lam', b: Exp }
  | { t: 'app', f: Exp, arg: Exp };

export type ExpS =
  | { t: 'var' }
  | { t: 'lam', b: ExpS }
  | {
    t: 'app',
    f: ExpS,
    arg: ExpS,
    split: number // how many variables go to the f side
  };

export type LambdaGraphData<E> = {
  vertices: Dict<LambdaVertex>,
  edges: Dict<LambdaEdge<E>>,
  rootData: RootData,
  exp: Exp,
}



export const phonyValue = 0;
