import { Arrowhead, ContextLike, Dict, Point, RootSpec, Vertex } from './types';
import * as u from './util';

const SMOL_OFFSET = 12;

export type PreEdge = {
  a: string, // vertex id
  b: string,
  m: Point, // center of gravity of edge
}

export class Edge {
  a: string; // vertex id
  b: string;
  va: Point; // actual location of vertex
  vb: Point;
  private m: Point; // center of gravity of edge

  constructor(vertices: Dict<Vertex>, pe: PreEdge) {
    this.a = pe.a;
    this.b = pe.b;
    this.m = pe.m;

    this.va = vertices[pe.a].p;
    this.vb = vertices[pe.b].p;
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
