import {
  Point, Dict, Vertex, ConjoinedData, GraphData, Edge,
  EdgeSpec, RootedGraphData, Exp, LambdaVertex, LambdaEdge, RootSpec, LambdaGraphData
} from './types';

import * as u from './util';

const SMOL_OFFSET = 12;

// returns a tangent vector from an edge's endpoint to the interior of the edge
function edgeVelocity(vertices: Dict<Vertex>, e: Edge, side: 'a' | 'b'): Point {
  return u.vnorm(u.vsub(e.m, vertices[e[side]].p));
}

function angle(p: Point) {
  return Math.atan2(p.x, p.y);
}

export function findGraph(conj: ConjoinedData): GraphData {
  const vertices: Dict<Vertex> = {};
  const edges: { a: string, m: Point, b: string }[] = [];

  for (let i = 1; i < conj.numMarks + 1; i++) {
    if (conj.marks[i] == 'node') {
      vertices[i] = { p: conj.avg[i], edges: [] };
    }
    else if (conj.marks[i] == 'edge') {
      const adj = Object.keys(conj.adjacent[i]);
      if (adj.length == 2) {
        edges.push({ a: adj[0], b: adj[1], m: conj.avg[i] });
      }
    }
  }

  edges.forEach((e, i) => {
    vertices[e.a].edges.push({ i, which: 'a' });
    vertices[e.b].edges.push({ i, which: 'b' });
  });

  for (let v of Object.values(vertices)) {
    v.edges.sort((es1, es2) => {
      const v1 = edgeVelocity(vertices, edges[es1.i], es1.which);
      const v2 = edgeVelocity(vertices, edges[es2.i], es2.which);
      return angle(v1) - angle(v2);
    })
  }
  return { vertices, edges };
}

export function opposite(x: 'a' | 'b'): ('a' | 'b') {
  return x == 'a' ? 'b' : 'a';
}

export function breakGraphAtEdge(g: GraphData, esBrk: EdgeSpec): RootedGraphData {
  const which1 = esBrk.which;
  const which2 = opposite(which1);
  const idBrk = esBrk.i;
  const eBrk = g.edges[esBrk.i];
  const id1 = eBrk[which1];
  const v1 = g.vertices[id1];
  const m = eBrk.m;
  const id2 = eBrk[which2];
  const v2 = g.vertices[id2];

  const idNew = g.edges.length;
  const id3 = '*';
  // v2 (which2) .... m .... (which1) v1
  //                idBrk
  // ->
  // v2 (which2) .... (which1) v3 (which2) .... (which1) v1
  //            idBrk                      idNew
  g.edges[idBrk][which2] = id2;
  g.edges[idBrk][which1] = id3;
  g.edges[idBrk].m = u.vavg(v2.p, m);

  const newEdge: Edge = {
    a: '', b: '', m: u.vavg(m, v1.p)
  };
  newEdge[which2] = id3;
  newEdge[which1] = id1;
  const edges = g.edges.concat([newEdge]);

  const rootEdges: EdgeSpec[] =
    [{ i: idBrk, which: which1 }, { i: idNew, which: which2 }];
  const vertices: Dict<Vertex> = {};
  for (let [k, v] of Object.entries(g.vertices)) {
    vertices[k] = v;
  }
  vertices[id1] = {
    p: vertices[id1].p,
    edges: vertices[id1].edges.map(e =>
      (e.i == idBrk) ? { i: idNew, which: e.which } : e
    )
  };
  vertices[id3] = { p: m, edges: rootEdges };

  const otherRoots: RootSpec[] = [];
  g.edges.forEach((e, i) => {
    if (i == esBrk.i)
      return;
    const va = g.vertices[e.a].p;
    const vb = g.vertices[e.b].p;
    const off = u.vrot90(u.vscale(u.vnorm(u.vsub(va, vb)), SMOL_OFFSET));

    otherRoots.push({ p: u.vplus(e.m, off), es: { i, which: 'a' } });
    otherRoots.push({ p: u.vsub(e.m, off), es: { i, which: 'b' } });
  });

  const rootDir = u.vrot90(u.vnorm(u.vsub(v1.p, v2.p)));
  return { edges, vertices, rootData: { root: id3, otherRoots, rootDir, brokenEdge: esBrk } };
}

export function findRootedGraph(g: GraphData): RootedGraphData {
  const k = Object.keys(g.vertices);
  k.sort((a, b) => g.vertices[a].p.y - g.vertices[b].p.y);

  const id1 = k[0];
  const v1 = g.vertices[id1];
  const esBrk = v1.edges[0]; // relying on the way we're doing atan2
  // to have as a consequence that the first edge in the list is the first
  // one we see counterclockwise from 12 o'clock position. So we
  // break the edge that feels like it's going most leftish from the
  // top-most vertex. Probably visually correct in most non-weird cases.
  return breakGraphAtEdge(g, esBrk);
}

// gives the vertex id on the *other* side of es
function across(g: GraphData, es: EdgeSpec): string {
  return g.edges[es.i][opposite(es.which)];
}

export function findLambdaGraph(g: RootedGraphData): LambdaGraphData {

  function connected(vid1: string, vid2: string): boolean {
    const seen: Dict<boolean> = {};

    const stack: string[] = [vid1];
    let v: string | undefined;
    while (v = stack.pop()) {
      if (v == vid2) return true;
      if (seen[v]) continue;
      seen[v] = true;
      const vedge = g.vertices[v].edges;
      vedge.forEach(es => {
        if (edges[es.i] == undefined)
          stack.push(across(g, es));
      })
    }
    return false;
  }

  function awayFromMe(edge: EdgeSpec) {
    edges[edge.i] = { ...g.edges[edge.i], tgt: opposite(edge.which) };
  }

  function towardMe(edge: EdgeSpec) {
    edges[edge.i] = { ...g.edges[edge.i], tgt: edge.which };
  }

  function process(vid: string, incoming: EdgeSpec): Exp {
    if (limit-- <= 0) return { t: 'var' };
    if (vertices[vid] != undefined)
      return { t: 'var' }; // already visited this vertex
    const vedges = g.vertices[vid].edges;
    // find incoming edge
    const iix = vedges.findIndex(es => es.i == incoming.i);

    // now we know the other two edges
    const leftEdge = vedges[(iix + 1) % 3];
    const rightEdge = vedges[(iix + 2) % 3];

    // This is kind of delicate here. We toss in our right edge, which
    // is always towards us; it's the body of a lambda, or the first
    // arg of an application. But also that means that edge is
    // considered untraversable when we're testing connectivity.
    towardMe(rightEdge);

    // If we can get to the vertex across right edge *anyway*, that
    // means there's a cycle, and we should be a lambda.
    if (connected(vid, across(g, rightEdge)))
      return processAsLam(vid, leftEdge, rightEdge);
    else
      return processAsApp(vid, leftEdge, rightEdge);
  }

  function processAsLam(vid: string, leftEdge: EdgeSpec, rightEdge: EdgeSpec): Exp {
    const vert = g.vertices[vid];
    vertices[vid] = { ...vert, t: 'lam' };
    awayFromMe(leftEdge);

    return { t: 'lam', b: process(across(g, rightEdge), rightEdge) };
  }

  function processAsApp(vid: string, leftEdge: EdgeSpec, rightEdge: EdgeSpec): Exp {
    const vert = g.vertices[vid];
    vertices[vid] = { ...vert, t: 'app' };
    towardMe(leftEdge);

    const cl = process(across(g, leftEdge), leftEdge);
    const cr = process(across(g, rightEdge), rightEdge);
    return { t: 'app', f: cr, arg: cl };
  }


  let limit = 100;
  const vertices: Dict<LambdaVertex> = {};
  const edges: LambdaEdge[] = [];
  let vid = g.rootData.root;
  let vert = g.vertices[vid];
  const leftEdge = vert.edges[0];
  const rightEdge = vert.edges[1];
  towardMe(rightEdge);
  const exp = processAsLam(vid, leftEdge, rightEdge);

  return { vertices, edges, rootData: g.rootData, exp };
}
