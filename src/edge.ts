import { Arrowhead, ContextLike, Dict, EdgeSegment, Point, RootSpec, Vertex } from './types';
import * as u from './util';

const SMOL_OFFSET = 12;

export type PreEdge = {
  a: string, // vertex id
  b: string,
  m: Point, // center of gravity of edge
}

export interface Edge {
  a: string;
  b: string;
  draw(d: ContextLike): void;
  getRootChoices(i: string): RootSpec[];
  getBreakPoint(): Point;
  getSegments(): EdgeSegment[];
  getArrowHeads(tgt: 'a' | 'b'): Arrowhead[];
  getVelocity(side: 'a' | 'b'): Point;
}

export class OneEdge implements Edge {
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

  draw(d: ContextLike): void {
    const { va, vb } = this;
    d.moveTo(va.x, va.y);
    d.quadraticCurveTo(
      2 * this.m.x - (va.x + vb.x) / 2,
      2 * this.m.y - (va.y + vb.y) / 2,
      vb.x, vb.y);
  }

  getRootChoices(i: string): RootSpec[] {
    const { va, vb } = this;
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
  getVelocity(side: 'a' | 'b'): Point {
    const { va, vb } = this;
    const vs = this[side == 'a' ? 'va' : 'vb'];
    const c = u.vmn(
      [this.m, va, vb],
      ([m, a, b]) => 2 * m - (a + b) / 2
    );
    return u.vnorm(u.vsub(c, vs));
  }

  getArrowHeads(tgt: 'a' | 'b'): Arrowhead[] {
    const { va, vb } = this;
    const mang = (tgt == 'a' ? 0.5 : 1.5) * Math.PI -
      u.angle(u.vsub(va, vb));
    return [{ p: this.m, theta: mang }];
  }

  getSegments(): EdgeSegment[] {
    return [{ va: this.va, vb: this.vb, m: this.m }];
  }
}

type Cubic = { A: Point, B: Point, C: Point, D: Point };

class MultiEdge implements Edge {
  a: string;
  b: string;
  segs: EdgeSegment[];

  constructor(e1: Edge, e2: Edge) {
    this.a = e1.a;
    this.b = e1.b;
    this.segs = e1.getSegments().concat(e2.getSegments());
  }

  draw(d: ContextLike) {
    const cubs = this.getCubics();

    d.moveTo(cubs[0].A.x, cubs[0].A.y);
    cubs.forEach((cub, i) => {
      d.bezierCurveTo(cub.B.x, cub.B.y, cub.C.x, cub.C.y, cub.D.x, cub.D.y);
    });

  }

  getArrowHeads(tgt: 'a' | 'b'): Arrowhead[] {
    return this.getCubics().map(cub => {
      const { A, B, C, D } = cub;
      const p = u.vmn([A, B, C, D], ([A, B, C, D]) => (A + 3 * B + 3 * C + D) / 8);
      // this is actually *minus* the velocity at the midpoint of the cubic bezier
      const v = u.vmn([A, B, C, D], ([A, B, C, D]) => (3 * A + B - C - 3 * D) / 4);
      const theta = (tgt == 'a' ? 0.5 : 1.5) * Math.PI - u.angle(v);
      return { p, theta };
    });
  }

  getRootChoices(i: string): RootSpec[] {
    const { va, vb, m } = this.segs[0];
    const off = u.vrot90(u.vscale(u.vnorm(u.vsub(va, vb)), SMOL_OFFSET));
    return [
      { p: u.vplus(m, off), es: { i, which: 'a' } },
      { p: u.vsub(m, off), es: { i, which: 'b' } }
    ];
  }

  getCubics(): Cubic[] {
    const rv: Cubic[] = [];
    this.segs.forEach((seg, i) => {
      rv.push({ A: seg.va, B: seg.m, C: seg.m, D: seg.vb });
    });
    return rv;
  }

  getBreakPoint(): Point {
    return this.segs[0].m;
  }

  getSegments(): EdgeSegment[] {
    return this.segs;
  }

  getVelocity(side: 'a' | 'b'): Point {
    const cubs = this.getCubics();
    if (side == 'a') {
      return u.vnorm(u.vm2(cubs[0].A, cubs[0].B, (A, B) => B - 3 * A));
    }
    else {
      return u.vnorm(u.vm2(cubs[0].C, cubs[0].D, (C, D) => C - 3 * D));
    }
  }

}
