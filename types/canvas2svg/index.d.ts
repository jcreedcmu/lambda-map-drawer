declare module 'canvas2svg' {
  class SvgCanvas extends CanvasRenderingContext2D {
    constructor(width: number, height: number);
    getSerializedSvg(): string;
  }
  export = SvgCanvas;
}
