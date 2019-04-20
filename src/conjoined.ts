const white: Color = { r: 255, g: 255, b: 255 };
const red: Color = { r: 255, g: 0, b: 0 };
const blue: Color = { r: 0, g: 0, b: 255 };

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

function markTypeOfColor(c: Color): MarkType {
  if (colorEq(c, red)) return 'node';
  if (colorEq(c, blue)) return 'edge';
  return 'unknown';
}

export function findConjoined(id: ImageData): ConjoinedData {
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

  const adjacent: Dict<Dict<boolean>> = {};
  function makeAdj(x: number, y: number) {
    if (x == y) return;
    if (!adjacent[x]) adjacent[x] = {};
    adjacent[x][y] = true;
    if (!adjacent[y]) adjacent[y] = {};
    adjacent[y][x] = true;
  }
  for (let x = 0; x < array.w - 1; x++) {
    for (let y = 0; y < array.h - 1; y++) {
      const here = valueGet(array, x, y);
      if (here) {
        if (!adjacent[here]) adjacent[here] = {};
        const there1 = valueGet(array, x + 1, y);
        if (there1) makeAdj(here, there1);
        const there2 = valueGet(array, x, y + 1);
        if (there2) makeAdj(here, there2);
      }
    }
  }

  return { array, marks, avg, adjacent, numMarks: counter - 1 };
}
