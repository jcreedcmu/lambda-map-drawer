import { expect } from 'chai';
import 'mocha';
import { edgeVelocity } from '../graph';
import * as u from '../util';

const vertices = {
  p: { p: { x: 0, y: 0 }, edges: [] },
  q: { p: { x: 3, y: 4 }, edges: [] }
};
const edge = { a: 'p', b: 'q', m: { x: 1, y: 1 } };

describe('edgeVelocity', () => {
  it('should give sensible answers for a synthetic edge', () => {
    // actual control point is located at (0.5, 0)
    expect(edgeVelocity(vertices, edge, 'a')).deep.equal(u.vnorm({ x: 0.5, y: 0 }));
    expect(edgeVelocity(vertices, edge, 'b')).deep.equal(u.vnorm({ x: -2.5, y: -4 }));
  });
});
