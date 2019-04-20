import * as u from './util';

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
    v.edges.sort((a, b) => {
      const am = edges[a.i].m;
      const bm = edges[b.i].m;
      return Math.atan2(am.x - v.p.x, am.y - v.p.y)
        - Math.atan2(bm.x - v.p.x, bm.y - v.p.y);
    })
  }
  return { vertices, edges };
}

function opposite(x: 'a' | 'b'): ('a' | 'b') {
  return x == 'a' ? 'b' : 'a';
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
  const which1 = esBrk.which;
  const which2 = opposite(which1);
  const idBrk = esBrk.i;
  const eBrk = g.edges[esBrk.i];
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

  const newEdge = { a: '', b: '', m: u.vavg(m, v1.p) };
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
  return { edges, vertices, root: id3 };
}

// gives the vertex id on the *other* side of es
function across(g: GraphData, es: EdgeSpec): string {
  return g.edges[es.i][opposite(es.which)];
}

export function findLambdaGraph(g: RootedGraphData): LambdaGraphData {
  function awayFromMe(edge: EdgeSpec) {
    console.log('awayFromMe', edge);
    edges[edge.i] = { ...g.edges[edge.i], tgt: opposite(edge.which) };
  }
  function towardMe(edge: EdgeSpec) {
    console.log('towardMe', edge);
    edges[edge.i] = { ...g.edges[edge.i], tgt: edge.which };
  }

  function process(vid: string, incoming: EdgeSpec) {
    console.log('process', vid);
    if (limit-- <= 0) return;
    if (vertices[vid] != undefined)
      return; // already visited this vertex
    const vedges = g.vertices[vid].edges;
    // find incoming edge
    const iix = vedges.findIndex(es => es.i == incoming.i);

    // now we know the other two edges
    const leftEdge = vedges[(iix + 1) % 3];
    const rightEdge = vedges[(iix + 2) % 3];

    // XXX choose whether to lam or app based on connectivity
    processAsLam(vid, leftEdge, rightEdge);
  }

  function processAsLam(vid: string, leftEdge: EdgeSpec, rightEdge: EdgeSpec) {
    console.log('processAsLam', vid, leftEdge, rightEdge);
    console.log('across right', across(g, rightEdge));
    const vert = g.vertices[vid];
    vertices[vid] = { ...vert, t: 'lam' };
    awayFromMe(leftEdge);
    towardMe(rightEdge);
    process(across(g, rightEdge), rightEdge);
  }

  function processAsApp(vid: string, leftEdge: EdgeSpec, rightEdge: EdgeSpec) {
    const vert = g.vertices[vid];
    vertices[vid] = { ...vert, t: 'app' };
    towardMe(leftEdge);
    towardMe(rightEdge);
    process(across(g, leftEdge), leftEdge);
    process(across(g, rightEdge), rightEdge);
  }


  let limit = 100;
  const vertices: Dict<LambdaVertex> = {};
  const edges: LambdaEdge[] = [];
  let vid = g.root;
  let vert = g.vertices[vid];
  processAsLam(vid, vert.edges[0], vert.edges[1]);



  const rv = { vertices, edges, root: g.root };
  //  console.log(JSON.stringify(rv, null, 2));
  return rv;
}
