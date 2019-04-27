import { Arrowhead, ContextLike, Dict, EdgeSegment, Point, RootSpec, Vertex } from './types';
import * as u from './util';

const SMOL_OFFSET = 12;
const TENSION1 = 1;
const TENSION2 = 0.5;

type Cubic = { A: Point, B: Point, C: Point, D: Point };

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
  reverse(): Edge;
}

function reverseSegment(seg: EdgeSegment): EdgeSegment {
  return { va: seg.vb, vb: seg.va, m: seg.m };
}

class OneEdgeRaw implements Edge {
  a: string; // vertex id
  b: string;
  va: Point; // actual location of vertex
  vb: Point;
  protected m: Point; // center of gravity of edge

  constructor(a: string, b: string, va: Point, vb: Point, m: Point) {
    this.a = a;
    this.b = b;
    this.va = va;
    this.vb = vb;
    this.m = m;
  }

  reverse(): OneEdgeRaw {
    const { a, b, va, vb, m } = this;
    return new OneEdgeRaw(b, a, vb, va, m);
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

class MultiEdgeRaw implements Edge {
  a: string;
  b: string;
  segs: EdgeSegment[];

  constructor(opt: { a: string, b: string, segs: EdgeSegment[] }) {
    this.a = opt.a;
    this.b = opt.b;
    this.segs = opt.segs;
  }

  reverse(): Edge {
    return new MultiEdgeRaw({
      a: this.b,
      b: this.a,
      segs: this.segs.map(reverseSegment).reverse()
    });
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
      // this is actually *minus* the velocity at the midpoint of the cubic bezier,
      // that helps get the right theta more easily:
      const v = u.vmn([A, B, C, D], ([A, B, C, D]) => (3 * A + 3 * B - 3 * C - 3 * D) / 4);
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

    const cubic: (seg: EdgeSegment, i: number) => Cubic = (seg, i) => {
      const A = seg.va;
      const D = seg.vb;
      if (this.segs.length > 1) {
        if (i == 0) {
          // If we're at the start of a multiedge, we want a cubic bezier that
          // goes through seg.m, and has a chosen velocity at D = seg.vb. That
          // velocity is TENSION * (Dnext - A).
          const C = u.vmn([D, A, this.segs[i + 1].vb], ([D, A, Dnext]) => D - TENSION1 * (Dnext - A) / 3);
          const B = u.vmn([seg.m, D, A, C], ([M, D, A, C]) => (8 * M - D - A - 3 * C) / 3);
          return { A, B, C, D };
        }
        if (i == this.segs.length - 1) {
          // If we're at the end of a multiedge, we want a cubic bezier that
          // goes through seg.m, and has a chosen velocity at A = seg.va. That
          // velocity is TENSION * (D - Aprev).
          const B = u.vmn([D, A, this.segs[i - 1].va], ([D, A, Aprev]) => A + TENSION1 * (D - Aprev) / 3);
          const C = u.vmn([seg.m, D, A, B], ([M, D, A, B]) => (8 * M - D - A - 3 * B) / 3);
          return { A, B, C, D };
        }
        else {
          // If we're in the middle of a multiedge, we want a cubic
          // bezier that has velocity TENSION * (Dnext - A) at D, and
          // velocity TENSION * (D - Aprev) at A.
          const C = u.vmn([D, A, this.segs[i + 1].vb], ([D, A, Dnext]) => D - TENSION2 * (Dnext - A) / 3);
          const B = u.vmn([D, A, this.segs[i - 1].va], ([D, A, Aprev]) => A + TENSION2 * (D - Aprev) / 3);
          return { A, B, C, D };
        }
      }
      else {
        // This case shouldn't really happen but I'm leaving it in anyway for now...
        const B = seg.m;
        const C = seg.m;
        return { A, B, C, D };
      }
    }

    this.segs.forEach((seg, i) => rv.push(cubic(seg, i)));
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
      return u.vnorm(u.vm2(cubs[0].A, cubs[0].B, (A, B) => 3 * (B - A)));
    }
    else {
      return u.vnorm(u.vm2(cubs[cubs.length - 1].C, cubs[cubs.length - 1].D,
        (C, D) => 3 * (C - D)));
    }
  }

}

// Expose only these constructors

export class OneEdge extends OneEdgeRaw implements Edge {
  constructor(vertices: Dict<Vertex>, pe: PreEdge) {
    super(pe.a, pe.b, vertices[pe.a].p, vertices[pe.b].p, pe.m);
  }
}

export class MultiEdge extends MultiEdgeRaw implements Edge {
  constructor(e1: Edge, e2: Edge) {
    super({ a: e1.a, b: e2.b, segs: e1.getSegments().concat(e2.getSegments()) });
  }
}
