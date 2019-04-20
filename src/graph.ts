
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
