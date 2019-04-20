export function sqr(x: number) {
  return x * x;
}

export function vlen(p: Point) {
  return Math.sqrt(sqr(p.x) + sqr(p.y));
}

export function vnorm(p: Point) {
  return vdiv(p, vlen(p));
}

export function vsub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vplus(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vdiv(b: Point, s: number): Point {
  return { x: b.x / s, y: b.y / s };
}

export function vscale(b: Point, s: number): Point {
  return { x: b.x * s, y: b.y * s };
}
