import { findConjoined } from './conjoined';
import { findGraph, findRootedGraph, findLambdaGraph, breakGraphAtEdge, opposite } from './graph';
import { Loader } from './loader';
import * as u from './util';
import SvgCanvas = require('canvas2svg');

const WIDTH = 16;
const EDGE_RAD = 7;
const NODE_RAD = 9;
const SMOL_SIZE = 4;
const HIT_EXTRA = 5;

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
      id.data[ix2 + 3] = sa.data[ix1] ? 128 : 0;
    }
  }
  return id;
}

function renderDebug(conj: ConjoinedData, c2: Canvas) {
  c2.d.putImageData(renderConjoined(conj.array), 0, 0);
  Object.keys(conj.avg).forEach(i => {
    const p = conj.avg[i];
    c2.d.fillStyle = "white";
    c2.d.fillRect(Math.floor(p.x) - 3, Math.floor(p.y) - 3, 6, 6);
  });
}



function renderCyclicOrdering(g: GraphData, c: Canvas) {
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
        d.lineWidth = 3;
        d.lineCap = 'round';
        d.stroke();
      });
    }
  }
}

function renderGraph(g: RootedGraphData, c: Canvas) {
  const { d } = c

  g.edges.forEach(({ a, b, m }, i) => {
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

    if (enabled('renderDebugId')) {
      d.beginPath();
      d.fillStyle = 'white';
      d.arc(m.x, m.y, EDGE_RAD, 0, Math.PI * 2);
      d.fill();
      d.textAlign = 'center';
      d.textBaseline = 'middle'
      d.font = 'bold 10px arial';
      d.fillStyle = '#404';
      d.fillText(i + '', m.x, m.y);
    }
  });
  for (let [k, { p }] of Object.entries(g.vertices)) {
    d.fillStyle = "#fed";

    if (g.vertices[k].edges.length != 3) {
      d.fillStyle = "red";
    }
    if (k == g.rootData.root) {
      d.fillStyle = "white";
    }
    d.strokeStyle = "black";
    d.lineWidth = 1;
    d.beginPath();
    d.arc(p.x, p.y, NODE_RAD, 0, 2 * Math.PI);
    d.fill();
    d.stroke();

    if (enabled('renderDebugId')) {
      d.textAlign = 'center';
      d.textBaseline = 'middle'
      d.font = 'bold 9px arial';
      d.fillStyle = '#000';
      d.fillText(k, p.x, p.y);
    }
  }
  if (enabled('renderLambda')) {
    d.save();
    d.fillStyle = "white";
    d.globalAlpha = 0.2;
    d.fillRect(0, 0, 500, 500);
    d.restore();
  }
}

function _drawArrowHead(d: CanvasRenderingContext2D, p: Point, angle: number) {
  d.strokeStyle = "black";
  d.lineWidth = 1;
  d.stroke();
  d.save();
  d.translate(p.x, p.y);
  d.rotate(angle);
  d.beginPath();
  d.moveTo(0, -3);
  d.lineTo(2, 0);
  d.lineTo(0, 3);
  d.lineTo(8, 0);
  d.fillStyle = "black";
  d.fill();
  d.restore();
}

function drawArrowHead(d: CanvasRenderingContext2D, m: Point, va: Point, vb: Point) {
  _drawArrowHead(d, m, Math.atan2(vb.y - va.y, vb.x - va.x));
}

type From = 'lam' | 'appl' | 'appr' | 'top';
type StringifyRes = { s: string, counter: number };

function findSplit(e: Exp): { e: ExpS, size: number } {
  switch (e.t) {
    case 'lam': {
      const { e: e0, size: size0 } = findSplit(e.b);
      return { e: { t: 'lam', b: e0 }, size: size0 - 1 };
    }
    case 'app': {
      const { e: ef, size: sizef } = findSplit(e.f);
      const { e: ea, size: sizea } = findSplit(e.arg);
      return { e: { t: 'app', f: ef, arg: ea, split: sizef }, size: sizef + sizea };
    }
    case 'var': return { e, size: 1 };
  }
}

function stringifyLam(counter: number, G: string[], e: ExpS, frm: From): StringifyRes {
  switch (e.t) {
    case 'lam': {
      const v = String.fromCharCode(counter + 97);
      const bind = frm == 'lam' ? '' : '\u03bb';
      const res = stringifyLam(counter + 1, G.concat([v]), e.b, 'lam');
      const rv = bind + v + res.s;
      return {
        s: (frm == 'lam' || frm == 'top') ? rv : '(' + rv + ')',
        counter: res.counter,
      };
    }
    case 'app': {
      const pref = frm == 'lam' ? '.' : '';
      const res1 = stringifyLam(counter, G.slice(0, e.split), e.f, 'appl');
      const res2 = stringifyLam(res1.counter, G.slice(e.split), e.arg, 'appr');
      const rv = (pref + res1.s + ' ' + res2.s);
      return {
        s: frm == 'appr' ? '(' + rv + ')' : rv,
        counter: res2.counter
      };
    }
    case 'var': return { s: G[0], counter };
  }
}

function circlePath(p: Point, rad: number): Path2D {
  const pp = new Path2D();
  pp.arc(p.x, p.y, rad, 0, Math.PI * 2);
  return pp;
}

function drawSmolClickable(d: CanvasRenderingContext2D, p: Point) {
  const pp = circlePath(p, SMOL_SIZE);
  d.fillStyle = "white";
  d.strokeStyle = "gray";
  d.lineWidth = 1;
  d.fill(pp);
  d.stroke(pp);
}

function renderLambdaGraph(g: LambdaGraphData, c: Canvas) {
  const { d } = c
  g.edges.forEach((e) => {
    if (e == undefined) return;
    const { a, b, m, tgt } = e;
    if (g.vertices[a] == undefined) return;
    if (g.vertices[b] == undefined) return;
    const va = g.vertices[a].p;
    const vb = g.vertices[b].p;
    d.beginPath();
    d.moveTo(va.x, va.y);
    d.quadraticCurveTo(
      2 * m.x - (va.x + vb.x) / 2,
      2 * m.y - (va.y + vb.y) / 2,
      vb.x, vb.y);
    if (tgt == 'b')
      drawArrowHead(d, m, va, vb);
    else
      drawArrowHead(d, m, vb, va);
  });

  // Draw root edge
  const vr = g.vertices[g.rootData.root].p;
  const ROOT_LEN = 20;
  const vs = u.vplus(vr, u.vscale(g.rootData.rootDir, ROOT_LEN));
  d.beginPath();
  d.moveTo(vr.x, vr.y);
  d.lineTo(vs.x, vs.y);
  d.strokeStyle = "black";
  d.lineWidth = 1;
  d.stroke();
  _drawArrowHead(d, vs, Math.atan2(g.rootData.rootDir.y, g.rootData.rootDir.x));

  for (let [k, v] of Object.entries(g.vertices)) {
    if (v == undefined) return;
    const { p, t } = v;
    d.fillStyle = k == g.rootData.root ? "#aaf" : (t == 'app' ? 'white' : 'black');
    d.strokeStyle = "black";
    d.lineWidth = 1;
    d.beginPath();
    d.arc(p.x, p.y, NODE_RAD, 0, 2 * Math.PI);
    d.fill();
    d.stroke();
  }

  if (enabled('renderRootChoices')) {
    for (const e of g.rootData.otherRoots) {
      drawSmolClickable(d, e.p);
    }
  }

  document.getElementById('lambda')!.innerText = stringifyLam(0, [], findSplit(g.exp).e, 'top').s;
}

function enabled(id: string): boolean {
  return (document.getElementById(id) as HTMLFormElement).checked;
}

function snapToColors(c: Canvas) {
  const dat = c.d.getImageData(0, 0, c.c.width, c.c.height);
  for (let x = 0; x < c.c.width; x++) {
    for (let y = 0; y < c.c.height; y++) {
      const ix = 4 * (c.c.width * y + x);
      const [r, g, b] = [dat.data[ix], dat.data[ix + 1], dat.data[ix + 2]];
      let ro = 255, go = 255, bo = 255;
      if (r > g || b > g) {
        if (r > b) {
          go = 0;
          bo = 0;
        }
        else {
          ro = 0;
          go = 0;
        }
      }
      dat.data[ix] = ro;
      dat.data[ix + 1] = go;
      dat.data[ix + 2] = bo;
      dat.data[ix + 3] = 255;
    }
  }
  c.d.putImageData(dat, 0, 0);
}

function causeDownload(content: string, mimeType: string) {
  // It would be nice if we had navigator.clipboard.write, but
  // chrome hasn't implemented that yet.

  const blob = new Blob([content], { type: mimeType });
  const fileLink = document.createElement('a');
  fileLink.href = window.URL.createObjectURL(blob);
  fileLink.download = "lambda-map.svg";
  if (document.createEvent) {
    // This branch seems required in firefox. Empirically, calling
    // .click() fires .onclick handler, but doesn't cause download
    // if we just have an href set.
    const event = document.createEvent("MouseEvents");
    event.initMouseEvent("click", true, true, window,
      0, 0, 0, 0, 0,
      false, false, false, false,
      0, null);
    fileLink.dispatchEvent(event);
  }
  else {
    fileLink.click();
  }
}
class App {
  c1: Canvas;
  c2: Canvas;
  conj?: ConjoinedData;
  graph?: GraphData;
  rootedGraph?: RootedGraphData;
  lambdaGraph?: LambdaGraphData;
  forceRoot: EdgeSpec | undefined;

  compute() {
    this._compute(this.c1, this.c2);
  }

  // analyzes image data in c1 and puts the result in c2
  _compute(c1: Canvas, c2: Canvas) {
    this.conj = undefined;
    this.graph = undefined;
    this.rootedGraph = undefined;
    this.lambdaGraph = undefined;

    document.getElementById('lambda')!.innerText = '';
    c2.d.clearRect(0, 0, c2.c.width, c2.c.height);
    const dat = c1.d.getImageData(0, 0, c1.c.width, c1.c.height);
    const conj = this.conj = findConjoined(dat);
    if (enabled('renderDebug')) renderDebug(conj, c2);
    const g = this.graph = findGraph(conj);
    const rg = this.rootedGraph = this.forceRoot ? breakGraphAtEdge(g, this.forceRoot) : findRootedGraph(g);
    if (enabled('renderCyclic')) renderCyclicOrdering(rg, c2);
    if (enabled('renderGraph')) renderGraph(rg, c2);

    if (enabled('renderLambda')) {
      try {
        const lg = this.lambdaGraph = findLambdaGraph(rg);
        const exp = renderLambdaGraph(lg, c2);
      }
      catch (e) {
        document.getElementById('lambda')!.innerHTML = '<font color="red">All nodes must have exactly three edges to compute lambda graph.</font>';
        renderGraph(rg, c2);
      }
    }
  }

  constructor() {
    this.c1 = getCanvas('c1');
    this.c2 = getCanvas('c2');
  }

  getExamples(): HTMLSelectElement {
    return document.getElementById('examples')! as HTMLSelectElement
  }

  invalidateSelectBox() {
    this.getExamples().selectedIndex = -1; // drawing invalidates example selection
  }

  paint(p: Point) {
    const { c1 } = this;
    const examples = this.getExamples();
    this.invalidateSelectBox();
    this.forceRoot = undefined;

    p = u.vint(p);
    const t = currentTool();
    const size = sizeOfTool(t)
    c1.d.fillStyle = colorOfTool(t);
    c1.d.fillRect(p.x - size / 2, p.y - size / 2, size, size);
  }

  paintLine(p: Point, q: Point) {
    if (Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) < WIDTH / 2) {
      this.paint(q);
    }
    else {
      const avg = {
        x: Math.floor((p.x + q.x) / 2),
        y: Math.floor((p.y + q.y) / 2)
      };
      this.paintLine(p, avg);
      this.paintLine(avg, q);
    }
  }

  go() {
    const { c1, c2 } = this;
    c1.d.drawImage(l.data.img['example1'], 0, 0);

    [
      'renderDebug',
      'renderDebugId',
      'renderCyclic',
      'renderGraph',
      'renderLambda',
      'renderRootChoices',
    ].forEach(id => {
      document.getElementById(id)!.addEventListener('change', () => this.compute());
    });

    let prev: Point | undefined = undefined;

    const onMove = (e: MouseEvent) => {
      const p = relpos(e, c1.c);
      if (prev != undefined)
        this.paintLine(prev, p);
      else
        this.paint(p);
      prev = p;
    }

    const onMouseup = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onMove);
      this.compute();
    }

    function clearCanvas() {
      c1.d.fillStyle = "white";
      c1.d.fillRect(0, 0, c1.c.width, c1.c.height);
    }

    document.getElementById('clear')!.addEventListener('click', () => {
      clearCanvas();
      this.invalidateSelectBox();
      this.compute();
    });

    document.getElementById('exportSvg')!.addEventListener('click', () => {
      const svgCanvas = new SvgCanvas(c2.c.width, c2.c.height);
      this._compute(this.c1, { c: c2.c, d: svgCanvas });
      causeDownload(svgCanvas.getSerializedSvg(), "image/svg");
    });

    const examples = document.getElementById('examples')! as HTMLSelectElement;
    examples.addEventListener('change', () => {
      this.forceRoot = undefined;
      c1.d.drawImage(l.data.img[examples.value], 0, 0);
      this.compute();
    });

    c1.c.addEventListener('mousedown', (e) => {
      if (e.buttons != 1) return;
      const p = relpos(e, c1.c);
      prev = p;
      this.paint(p);
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onMouseup);
      e.stopPropagation();
      e.preventDefault();
    });

    c2.c.addEventListener('mousedown', (e) => {
      if (this.lambdaGraph != undefined && enabled('renderRootChoices')) {
        const p = relpos(e, c2.c);
        const vr = this.lambdaGraph.vertices[this.lambdaGraph.rootData.root].p;
        if (c2.d.isPointInPath(circlePath(vr, NODE_RAD + HIT_EXTRA), p.x, p.y)) {
          const brokenEdge = this.lambdaGraph.rootData.brokenEdge;
          this.forceRoot = { i: brokenEdge.i, which: opposite(brokenEdge.which) };
          this.compute();
        }
        else {
          this.lambdaGraph.rootData.otherRoots.forEach(root => {
            if (c2.d.isPointInPath(circlePath(root.p, SMOL_SIZE + HIT_EXTRA), p.x, p.y)) {
              this.forceRoot = root.es;
              this.compute();
            }
          });
        }
      }
      e.stopPropagation();
      e.preventDefault();
    });

    document.addEventListener('paste', (event) => {
      const items = Array.from(event.clipboardData!.items);

      items.forEach(item => {
        if (item.kind === 'file') {
          const blob = item.getAsFile()!;
          const reader = new FileReader();
          reader.onload = (event) => {
            const im = new Image();
            if (typeof (reader.result) == 'string') {
              im.src = reader.result;
              im.addEventListener('load', () => {
                clearCanvas();
                c1.d.drawImage(im, Math.floor((c1.c.width - im.width) / 2), Math.floor((c1.c.height - im.height) / 2));

                snapToColors(c1);
                this.invalidateSelectBox();
                this.compute();
              });
            }
          }; // data url!
          reader.readAsDataURL(blob);
        }
      });
    });
    this.compute();
  }
}

const app = new App();
(window as any)['app'] = app;
const l = new Loader();
l.image('./img/example1.png', 'example1');
l.image('./img/example2.png', 'example2');
l.image('./img/example3.png', 'example3');
l.image('./img/cube.png', 'cube');
l.image('./img/dodecahedron.png', 'dodecahedron');
l.image('./img/prism.png', 'prism');
l.image('./img/tetrahedron.png', 'tetrahedron');
l.image('./img/tutte.png', 'tutte');
l.done(() => app.go());
