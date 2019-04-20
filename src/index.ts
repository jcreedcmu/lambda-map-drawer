import { findConjoined } from './conjoined';


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
    console.log(conj.adjacent);
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
