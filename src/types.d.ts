type Canvas = { c: HTMLCanvasElement, d: CanvasRenderingContext2D };
type Point = { x: number, y: number };
type Dict<T> = { [id: string]: T };
type Tool = 'node' | 'edge' | 'erase';
type SizedArray = { w: number, h: number, data: Uint16Array };

type Color = { r: number, g: number, b: number };
type MarkType = 'node' | 'edge' | 'unknown';
