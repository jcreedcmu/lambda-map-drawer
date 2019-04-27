import * as canvas from 'canvas';
import { expect } from 'chai';
import { decode } from 'fast-png';
import * as fs from 'fs';
import 'mocha';
import * as path from 'path';
import { findConjoined } from '../conjoined';
import { coalesceGraph, findGraph, findLambdaGraph, findRootedGraph } from '../graph';
import { stringifyLam } from '../stringifyLam';

function getImageDataOfFile(filename: string): ImageData {
  const buf = decode(fs.readFileSync(path.join(__dirname, filename)));
  const imd = canvas.createImageData(buf.width, buf.height);
  if (buf.channels < 3) {
    throw new Error("I'm not sure how do deal with fewer than 3 channels");
  }
  for (let x = 0; x < buf.width; x++) {
    for (let y = 0; y < buf.height; y++) {
      imd.data[4 * (buf.width * y + x)] = buf.data[buf.channels * (buf.width * y + x)];
      imd.data[4 * (buf.width * y + x) + 1] = buf.data[buf.channels * (buf.width * y + x) + 1];
      imd.data[4 * (buf.width * y + x) + 2] = buf.data[buf.channels * (buf.width * y + x) + 2];
    }
  }
  return imd;
}

function getLam(imgName: string) {
  return stringifyLam(
    findLambdaGraph(
      findRootedGraph(
        coalesceGraph(
          findGraph(
            findConjoined(
              getImageDataOfFile(
                path.join('../../public/img', imgName)
              )
            )
          )
        )
      )
    ).exp, '/');
}

const imgTests =
  [{
    imgName: 'tutte.png',
    term: '/abcdefghi.a (/jk.b (/lm.(/no.c (/p.d (/q.e (/r.n (o (p (q r))))))) (/st.f (/u.g (/v.h (/w.s (t (u (v w))))))) (/x.i (j (k l (m x))))))'
  },
  {
    imgName: 'cube.png',
    term: '/abcd.a (/e.b (c (d e)))'
  },
  {
    imgName: 'tetrahedron.png',
    term: '/abc.a (b c)'
  },
  {
    imgName: 'prism.png',
    term: '/abc.a (/d.b (c d))',
  },
  {
    imgName: 'example1.png',
    term: '/abcdefghij.a (/k.b (/l.c (d (e (f (g h (i j (k l))))))))',
  },
  {
    imgName: 'example2.png',
    term: '/abcdefg.(/hij.a (b (h i j))) c d (e f g)',
  },
  {
    imgName: 'example3.png',
    term: '/abcdef.a (/g.b (c (/h.d h) (e f g)))',
  },
  {
    imgName: 'dodecahedron.png',
    term: '/abcde.a (/fg.b (/h.c (/i.d (/j.e (f (/k.g (h (i (j k)))))))))',
  },
  {
    imgName: 'degree2.png',
    term: '/ab.a b',
  },
  {
    imgName: 'twoDegree2.png',
    term: '/ab.a b',
  }];

describe('lambda graph computation', () => {

  imgTests.forEach(({ imgName, term }) => {
    it('should work on ' + imgName, () => {
      expect(getLam(imgName)).equal(term);
    });
  });

});
