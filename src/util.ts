import { Point } from './types';

export function sqr(x: number) {
  return x * x;
}

export function vm(a: Point, f: (a: number) => number): Point {
  return { x: f(a.x), y: f(a.y) };
}

export function vm2(a: Point, b: Point, f: (a: number, b: number) => number): Point {
  return { x: f(a.x, b.x), y: f(a.y, b.y) };
}

export function vm3(a: Point, b: Point, c: Point, f: (a: number, b: number, c: number) => number): Point {
  return { x: f(a.x, b.x, c.x), y: f(a.y, b.y, c.y) };
}

export function vmn(ps: Point[], f: (ns: number[]) => number): Point {
  return { x: f(ps.map(p => p.x)), y: f(ps.map(p => p.y)) };
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

export function vavg(a: Point, b: Point): Point {
  return vdiv(vplus(a, b), 2);
}

export function vint(a: Point): Point {
  return { x: Math.floor(a.x), y: Math.floor(a.y) };
}

export function vrot90(a: Point): Point {
  return { x: a.y, y: -a.x };
}

export function angle(p: Point) {
  return Math.atan2(p.x, p.y);
}
