type Canvas = { c: HTMLCanvasElement, d: CanvasRenderingContext2D };
type Point = { x: number, y: number };
type Dict<T> = { [id: string]: T };

const WIDTH = 16;

type Tool = 'node' | 'edge' | 'erase';
type SizedArray = { w: number, h: number, data: Uint16Array };

type Color = { r: number, g: number, b: number };
type MarkType = 'node' | 'edge' | 'unknown';

const white: Color = { r: 255, g: 255, b: 255 };
const red: Color = { r: 255, g: 0, b: 0 };
const blue: Color = { r: 0, g: 0, b: 255 };

type ConjoinedData = {
  array: SizedArray,
  marks: Dict<MarkType>,
  avg: Dict<Point>,
}

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
    case 'node': return 16;
    case 'edge': return 8;
    case 'erase': return 32;
  }
}

function colorOfTool(t: Tool): string {
  switch (t) {
    case 'node': return 'red';
    case 'edge': return 'blue';
    case 'erase': return 'white';
  }
}

function markTypeOfColor(c: Color): MarkType {
  if (colorEq(c, red)) return 'node';
  if (colorEq(c, blue)) return 'edge';
  return 'unknown';
}

function colorGet(id: ImageData, x: number, y: number): Color {
  const ix = 4 * (y * id.width + x);
  return { r: id.data[ix], g: id.data[ix + 1], b: id.data[ix + 2] };
}

function valueGet(sa: SizedArray, x: number, y: number): number {
  const ix = (y * sa.w + x);
  return sa.data[ix];
}

function valuePut(sa: SizedArray, x: number, y: number, v: number) {
  const ix = (y * sa.w + x);
  sa.data[ix] = v;
}

function colorEq(c: Color, d: Color): boolean {
  return c.r == d.r && c.g == d.g && c.b == d.b;
}


function findConjoined(id: ImageData): ConjoinedData {
  let counter = 1;
  const marks: Dict<MarkType> = {};
  const avg: Dict<Point> = {};
  const total: Dict<number> = {};

  function accumulateAvg(p: Point, mark: number) {
    if (!avg[mark]) {
      avg[mark] = { x: 0, y: 0 };
      total[mark] = 0;
    }
    avg[mark].x += p.x;
    avg[mark].y += p.y;
    total[mark]++;
  }

  function startFill(x: number, y: number, color: Color) {
    const mark = counter++;
    marks[mark] = markTypeOfColor(color);
    const stack: Point[] = [{ x, y }];
    let p: Point | undefined;
    let iter = 0;
    while (p = stack.pop()) {
      const { x, y } = p;
      if (valueGet(array, x, y)) continue;
      if (!colorEq(color, colorGet(id, x, y))) continue;
      valuePut(array, x, y, mark);
      accumulateAvg({ x, y }, mark);
      stack.push({ x: x + 1, y });
      stack.push({ x: x - 1, y });
      stack.push({ x, y: y + 1 });
      stack.push({ x, y: y - 1 });
    }

  }

  const data = new Uint16Array(id.width * id.height);
  const array = { w: id.width, h: id.height, data };
  for (let x = 0; x < array.w; x++) {
    for (let y = 0; y < array.h; y++) {
      const ix1 = (y * array.w + x);
      const color = colorGet(id, x, y);
      if (!colorEq(color, white) && !valueGet(array, x, y)) {
        startFill(x, y, color);
      }
    }
  }

  for (let i = 1; i < counter; i++) {
    avg[i].x /= total[i];
    avg[i].y /= total[i];
  }
  return { array, marks, avg };
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
      id.data[ix2 + 3] = 255;
    }
  }
  return id;
}

function go() {
  const c1 = getCanvas('c1');
  const c2 = getCanvas('c2');

  document.getElementById('compute')!.addEventListener('click', () => {
    const dat = c1.d.getImageData(0, 0, c1.c.width, c1.c.height);
    const conj = findConjoined(dat);
    c2.d.putImageData(renderConjoined(conj.array), 0, 0);
    Object.keys(conj.avg).forEach(i => {
      const p = conj.avg[i];
      c2.d.fillStyle = "yellow";
      c2.d.fillRect(p.x - 1, p.y - 1, 2, 2);
    });
    console.log(conj.marks);
  });

  function paint(p: Point) {
    const t = currentTool();
    const size = sizeOfTool(t)
    c1.d.fillStyle = colorOfTool(t);
    c1.d.fillRect(p.x - size / 2, p.y - size / 2, size, size);
  }

  function onMove(e: MouseEvent) {
    const p = relpos(e, c1.c);
    paint(p);
  }

  c1.c.addEventListener('mousedown', (e) => {
    paint(relpos(e, c1.c));
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', (e) => {
      document.removeEventListener('mousemove', onMove);
    });
  });

}
go();
