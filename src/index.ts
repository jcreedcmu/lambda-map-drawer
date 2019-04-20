import { findConjoined } from './conjoined';
import { findGraph, findRootedGraph } from './graph';
import { Loader } from './loader';
import * as u from './util';

const WIDTH = 16;

function relpos(e: MouseEvent, n: Element): Point {
  const rect = n.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getCanvas(id: string): Canvas {
  const c = document.getElementById(id) as HTMLCanvasElement;
  const d = c.getContext('2d')!;
  c.width = 500;
  c.height = 500;
  d.fillStyle = "white";
  d.fillRect(0, 0, 500, 500);
  return { c, d };
}


function currentTool(): Tool {
  return (Array.from(document.getElementsByName('paint')) as HTMLFormElement[])
    .find(x => x.checked)!.value;
}

function sizeOfTool(t: Tool): number {
  switch (t) {
    case 'node': return WIDTH;
    case 'edge': return WIDTH / 2;
    case 'erase': return WIDTH * 2;
  }
}

function colorOfTool(t: Tool): string {
  switch (t) {
    case 'node': return 'red';
    case 'edge': return 'blue';
    case 'erase': return 'white';
  }
}

function renderConjoined(sa: SizedArray): ImageData {
  const id = new ImageData(sa.w, sa.h);
  for (let i = 0; i < sa.w; i++) {
    for (let j = 0; j < sa.h; j++) {
      const ix1 = (j * sa.w + i);
      const ix2 = 4 * (j * sa.w + i);
      id.data[ix2 + 0] = (sa.data[ix1] * 17) & 255;
      id.data[ix2 + 1] = (sa.data[ix1] * 71) & 255;
      id.data[ix2 + 2] = (sa.data[ix1] * 157) & 255;
      id.data[ix2 + 3] = sa.data[ix1] ? 64 : 0;
    }
  }
  return id;
}

function renderDebug(conj: ConjoinedData, c2: Canvas) {
  c2.d.putImageData(renderConjoined(conj.array), 0, 0);
  Object.keys(conj.avg).forEach(i => {
    const p = conj.avg[i];
    c2.d.fillStyle = "black";
    c2.d.fillRect(Math.floor(p.x) - 3, Math.floor(p.y) - 3, 6, 6);
  });
}

const NODE_RAD = 5;

function renderCyclicOrdering(g: GraphData, c: Canvas) {
  console.log(g);
  const { d } = c;
  for (const v of Object.values(g.vertices)) {
    const colors = ["red", "green", "blue"];
    if (v.edges.length <= 3) {
      v.edges.forEach((e, i) => {
        const m = g.edges[e.i].m;
        const vec = u.vplus(u.vscale(u.vnorm(u.vsub(m, v.p)), 15), v.p);
        d.beginPath();
        d.moveTo(v.p.x, v.p.y);
        d.lineTo(vec.x, vec.y);
        d.strokeStyle = colors[i];
        d.lineWidth = 6;
        d.lineCap = 'round';
        d.stroke();
      });
    }
  }
}

function renderGraph(g: RootedGraphData, c: Canvas) {
  const { d } = c
  g.edges.forEach(({ a, b, m }) => {
    const va = g.vertices[a].p;
    const vb = g.vertices[b].p;
    d.beginPath();
    d.moveTo(va.x, va.y);
    d.quadraticCurveTo(
      2 * m.x - (va.x + vb.x) / 2,
      2 * m.y - (va.y + vb.y) / 2,
      vb.x, vb.y);
    d.strokeStyle = "black";
    d.lineWidth = 1;
    d.stroke();
  });
  for (let [k, { p }] of Object.entries(g.vertices)) {
    d.fillStyle = k == g.root ? "yellow" : "white";
    d.strokeStyle = "black";
    d.lineWidth = 1;
    d.beginPath();
    d.arc(p.x, p.y, NODE_RAD, 0, 2 * Math.PI);
    d.fill();
    d.stroke();
  }
}

function go() {
  const c1 = getCanvas('c1');
  c1.d.drawImage(l.data.img['sample'], 0, 0);
  const c2 = getCanvas('c2');

  function compute() {
    const dat = c1.d.getImageData(0, 0, c1.c.width, c1.c.height);
    const conj = findConjoined(dat);
    const g = findRootedGraph(findGraph(conj));
    c2.d.clearRect(0, 0, c2.c.width, c2.c.height);
    //    renderDebug(conj, c2);
    //    renderCyclicOrdering(g, c2);
    renderGraph(g, c2);
    //    console.log(JSON.stringify(g, null, 2));
  }

  document.getElementById('compute')!.addEventListener('click', compute);

  let prev: Point | undefined = undefined;

  function paint(p: Point) {
    const t = currentTool();
    const size = sizeOfTool(t)
    c1.d.fillStyle = colorOfTool(t);
    c1.d.fillRect(p.x - size / 2, p.y - size / 2, size, size);
  }

  function paintLine(p: Point, q: Point) {
    if (Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) < WIDTH / 2) {
      paint(q);
    }
    else {
      const avg = {
        x: Math.floor((p.x + q.x) / 2),
        y: Math.floor((p.y + q.y) / 2)
      };
      paintLine(p, avg);
      paintLine(avg, q);
    }
  }

  function onMove(e: MouseEvent) {
    const p = relpos(e, c1.c);
    if (prev != undefined)
      paintLine(prev, p);
    else
      paint(p);
    prev = p;
  }

  function onMouseup(e: MouseEvent) {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onMove);
    compute();
  }

  c1.c.addEventListener('mousedown', (e) => {
    const p = relpos(e, c1.c);
    prev = p;
    paint(p);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onMouseup);
  });
  compute();

}

const l = new Loader();
l.image('/img/sample.png', 'sample');
l.done(go);
