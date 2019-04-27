import { Edge } from './edge';
import {
  ConjoinedData, Dict, EdgeSpec, Exp, GraphData, LambdaEdge,
  LambdaGraphData, LambdaVertex, RootedGraphData, RootSpec, Vertex
} from './types';
import * as u from './util';


export function findGraph(conj: ConjoinedData): GraphData<Edge> {
  const vertices: Dict<Vertex> = {};
  const edgeArr: Edge[] = [];

  for (let i = 1; i < conj.numMarks + 1; i++) {
    if (conj.marks[i] == 'node') {
      vertices[i] = { p: conj.avg[i], edges: [] };
    }
    else if (conj.marks[i] == 'edge') {
      const adj = Object.keys(conj.adjacent[i]);
      if (adj.length == 2) {
        edgeArr.push(new Edge(adj[0], adj[1], conj.avg[i]));
      }
    }
  }

  edgeArr.forEach((e, i) => {
    vertices[e.a].edges.push({ i: i + '', which: 'a' });
    vertices[e.b].edges.push({ i: i + '', which: 'b' });
  });

  const edges: Dict<Edge> = {};
  for (let [i, e] of edgeArr.entries()) {
    edges[i] = e;
  }

  for (let v of Object.values(vertices)) {
    v.edges.sort((es1, es2) => {
      const v1 = edges[es1.i].getVelocity(vertices, es1.which);
      const v2 = edges[es2.i].getVelocity(vertices, es2.which);
      return u.angle(v1) - u.angle(v2);
    })
  }

  return { vertices, edges, nextEdge: edgeArr.length };
}

export function opposite(x: 'a' | 'b'): ('a' | 'b') {
  return x == 'a' ? 'b' : 'a';
}

export function breakGraphAtEdge(g: GraphData<Edge>, esBrk: EdgeSpec): RootedGraphData<Edge> {
  const which1 = esBrk.which;
  const which2 = opposite(which1);
  const idBrk = esBrk.i;
  const eBrk = g.edges[esBrk.i];
  const id1 = eBrk[which1];
  const v1 = g.vertices[id1];
  const m = eBrk.getBreakPoint();
  const id2 = eBrk[which2];
  const v2 = g.vertices[id2];

  const idNew = g.nextEdge + '';
  const id3 = '*';
  // v2 (which2) .... m .... (which1) v1
  //                idBrk
  // ->
  // v2 (which2) .... (which1) v3 (which2) .... (which1) v1
  //            idBrk                      idNew
  if (which2 == 'a') {
    g.edges[idBrk] = new Edge(id2, id3, u.vavg(v2.p, m));
  }
  else {
    g.edges[idBrk] = new Edge(id3, id2, u.vavg(v2.p, m));
  }

  const newEdge: Edge = new Edge('', '', u.vavg(m, v1.p));
  newEdge[which2] = id3;
  newEdge[which1] = id1;
  const edges = Object.assign({}, g.edges);
  edges[idNew] = newEdge;

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
  for (const [i, e] of Object.entries(g.edges)) {
    if (i == esBrk.i)
      continue;
    otherRoots.push.apply(otherRoots, e.getRootChoices(g.vertices, i));
  }

  const rootDir = u.vrot90(u.vnorm(u.vsub(v1.p, v2.p)));
  return {
    edges,
    vertices,
    nextEdge: g.nextEdge + 1,
    rootData: { root: id3, otherRoots, rootDir, brokenEdge: esBrk }
  };
}

export function findRootedGraph(g: GraphData<Edge>): RootedGraphData<Edge> {
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
function across(g: GraphData<Edge>, es: EdgeSpec): string {
  return g.edges[es.i][opposite(es.which)];
}

export function findLambdaGraph(g: RootedGraphData<Edge>): LambdaGraphData<Edge> {

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
    edges[edge.i] = { e: g.edges[edge.i], tgt: opposite(edge.which) };
  }

  function towardMe(edge: EdgeSpec) {
    edges[edge.i] = { e: g.edges[edge.i], tgt: edge.which };
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
  const edges: Dict<LambdaEdge<Edge>> = {};
  let vid = g.rootData.root;
  let vert = g.vertices[vid];
  const leftEdge = vert.edges[0];
  const rightEdge = vert.edges[1];
  towardMe(rightEdge);
  const exp = processAsLam(vid, leftEdge, rightEdge);

  return { vertices, edges, rootData: g.rootData, exp };
}
