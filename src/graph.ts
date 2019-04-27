import { PreEdge, Edge, OneEdge, MultiEdge } from './edge';
import {
  ConjoinedData, Dict, EdgeSpec, Exp, GraphData, LambdaEdge,
  LambdaGraphData, LambdaVertex, RootedGraphData, RootSpec, Vertex
} from './types';
import * as u from './util';

export function opposite(x: 'a' | 'b'): ('a' | 'b') {
  return x == 'a' ? 'b' : 'a';
}

// gives the vertex id on the *other* side of es
function across(g: GraphData, es: EdgeSpec): string {
  return g.edges[es.i][opposite(es.which)];
}

export function findGraph(conj: ConjoinedData): GraphData {
  const vertices: Dict<Vertex> = {};
  const preEdges: PreEdge[] = [];

  for (let i = 1; i < conj.numMarks + 1; i++) {
    if (conj.marks[i] == 'node') {
      vertices[i] = { p: conj.avg[i], edges: [] };
    }
    else if (conj.marks[i] == 'edge') {
      const adj = Object.keys(conj.adjacent[i]);
      if (adj.length == 2) {
        preEdges.push({ a: adj[0], b: adj[1], m: conj.avg[i] });
      }
    }
  }

  preEdges.forEach((e, i) => {
    vertices[e.a].edges.push({ i: i + '', which: 'a' });
    vertices[e.b].edges.push({ i: i + '', which: 'b' });
  });

  const edges: Dict<Edge> = {};
  for (let [i, e] of preEdges.entries()) {
    edges[i] = new OneEdge(vertices, e);
  }

  for (let v of Object.values(vertices)) {
    v.edges.sort((es1, es2) => {
      const v1 = edges[es1.i].getVelocity(es1.which);
      const v2 = edges[es2.i].getVelocity(es2.which);
      return u.angle(v1) - u.angle(v2);
    })
  }

  return { vertices, edges, nextEdge: preEdges.length };
}

export function coalesceGraph(g: GraphData): GraphData {
  let nextEdge = g.nextEdge;
  const vertices = u.shallowClone(g.vertices);
  const edges = u.shallowClone(g.edges);

  function mergeEdges(es1: EdgeSpec, es2: EdgeSpec) {
    const e1 = edges[es1.i];
    const e2 = edges[es2.i];
    const v1id = e1[opposite(es1.which)];
    const v2id = e2[opposite(es2.which)];
    const oldv1 = vertices[v1id];
    const oldv2 = vertices[v2id];

    // these two edges are now oriented like
    // v1 [a]--------[b] vm [a]-----------[b] v2
    const ee1 = es1.which == 'b' ? e1 : e1.reverse();
    const ee2 = es2.which == 'a' ? e2 : e2.reverse();

    const idNew = nextEdge++ + '';
    vertices[v1id] = replaceEdge(oldv1, es1.i, idNew, 'a');
    vertices[v2id] = replaceEdge(oldv2, es2.i, idNew, 'b');
    edges[idNew] = new MultiEdge(ee1, ee2);

    delete edges[es1.i];
    delete edges[es2.i];
  }

  for (const vmid of Object.keys(g.vertices)) {
    const vm = vertices[vmid];
    if (vm.edges.length == 2) {
      delete vertices[vmid];
      mergeEdges(vm.edges[0], vm.edges[1]);
    }
    else if (vm.edges.length == 4) {
      delete vertices[vmid];
      mergeEdges(vm.edges[0], vm.edges[2]);
      mergeEdges(vm.edges[1], vm.edges[3]);
    }
  }
  return { vertices, edges, nextEdge };
}

function replaceEdge(v: Vertex, idOld: string, idNew: string, whichNew?: 'a' | 'b'): Vertex {
  return {
    p: v.p,
    edges: v.edges.map(e =>
      (e.i == idOld) ? { i: idNew, which: whichNew == undefined ? e.which : whichNew } : e
    )
  };
}
export function breakGraphAtEdge(g: GraphData, esBrk: EdgeSpec): RootedGraphData {
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

  const vertices = u.shallowClone(g.vertices);
  const edges = u.shallowClone(g.edges);

  ////// General picture of what's going on:

  // v2 (which2) .... m .... (which1) v1
  //                idBrk
  // ->
  // v2 (which2) .... (which1) v3 (which2) .... (which1) v1
  //            idBrk                      idNew

  ////// 1. deal with vertices
  const rootEdges: EdgeSpec[] =
    [{ i: idBrk, which: which1 }, { i: idNew, which: which2 }];
  vertices[id1] = replaceEdge(vertices[id1], idBrk, idNew);
  vertices[id3] = { p: m, edges: rootEdges };


  ////// 2. deal with edges
  if (which2 == 'a') {
    edges[idBrk] = new OneEdge(vertices, { a: id2, b: id3, m: u.vavg(v2.p, m) });
  }
  else {
    edges[idBrk] = new OneEdge(vertices, { a: id3, b: id2, m: u.vavg(v2.p, m) });
  }

  const newEdge: PreEdge = { a: '', b: '', m: u.vavg(m, v1.p) };
  newEdge[which2] = id3;
  newEdge[which1] = id1;

  edges[idNew] = new OneEdge(vertices, newEdge);


  const otherRoots: RootSpec[] = [];
  for (const [i, e] of Object.entries(g.edges)) {
    if (i == esBrk.i)
      continue;
    otherRoots.push.apply(otherRoots, e.getRootChoices(i));
  }

  const rootDir = u.vrot90(u.vnorm(u.vsub(v1.p, v2.p)));
  return {
    edges,
    vertices,
    nextEdge: g.nextEdge + 1,
    rootData: { root: id3, otherRoots, rootDir, brokenEdge: esBrk }
  };
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


export function findLambdaGraph(g: RootedGraphData): LambdaGraphData {
  let variableNameCounter = 0;

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
    if (limit-- <= 0) return { t: 'error' };
    if (vertices[vid] != undefined) {
      const vert = vertices[vid];
      if (vert.t == 'lam')
        return { t: 'var', n: vert.n }; // already visited this vertex
      else
        return { t: 'error' };
    }
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
    const n = variableNameCounter++;
    const vert = g.vertices[vid];
    vertices[vid] = { ...vert, t: 'lam', n };
    awayFromMe(leftEdge);

    return { t: 'lam', b: process(across(g, rightEdge), rightEdge), n };
  }

  function processAsApp(vid: string, leftEdge: EdgeSpec, rightEdge: EdgeSpec): Exp {
    const vert = g.vertices[vid];
    vertices[vid] = { ...vert, t: 'app' };
    towardMe(leftEdge);

    const cr = process(across(g, rightEdge), rightEdge);
    const cl = process(across(g, leftEdge), leftEdge);
    return { t: 'app', f: cr, arg: cl };
  }


  let limit = 100;
  const vertices: Dict<LambdaVertex> = {};
  const edges: Dict<LambdaEdge> = {};
  let vid = g.rootData.root;
  let vert = g.vertices[vid];
  const leftEdge = vert.edges[0];
  const rightEdge = vert.edges[1];
  towardMe(rightEdge);
  const exp = processAsLam(vid, leftEdge, rightEdge);

  return { vertices, edges, rootData: g.rootData, exp };
}
