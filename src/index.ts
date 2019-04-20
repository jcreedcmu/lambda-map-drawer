type Canvas = { c: HTMLCanvasElement, d: CanvasRenderingContext2D };
type Point = { x: number, y: number };

function relpos(e: MouseEvent, n: Element): Point {
  const rect = n.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getCanvas(id: string): Canvas {
  const c = document.getElementById(id) as HTMLCanvasElement;
  const d = c.getContext('2d');
  c.width = 500;
  c.height = 500;
  d.fillStyle = "white";
  d.fillRect(0, 0, 500, 500);
  return { c, d };
}
const WIDTH = 16;

function go() {
  const c1 = getCanvas('c1');

  function paint(p: Point) {
    c1.d.fillStyle = "blue";
    c1.d.fillRect(p.x - WIDTH / 2, p.y - WIDTH / 2, WIDTH, WIDTH);
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

  const c2 = getCanvas('c2');
}
go();
