
export function findGraph(conj: ConjoinedData): GraphData {
  const vertices: Dict<Vertex> = {};
  const edges: { a: string, m: Point, b: string }[] = [];

  for (let i = 1; i < conj.numMarks + 1; i++) {
    if (conj.marks[i] == 'node') {
      vertices[i] = { p: conj.avg[i] };
    }
    else if (conj.marks[i] == 'edge') {
      const adj = Object.keys(conj.adjacent[i]);
      if (adj.length == 2) {
        edges.push({ a: adj[0], b: adj[1], m: conj.avg[i] });
      }
    }
  }
  return { vertices, edges };
}
