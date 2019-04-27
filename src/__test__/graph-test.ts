import { expect } from 'chai';
import { Edge } from '../edge';
import * as u from '../util';

const vertices = {
  p: { p: { x: 0, y: 0 }, edges: [] },
  q: { p: { x: 3, y: 4 }, edges: [] }
};
const edge = new Edge(vertices, { a: 'p', b: 'q', m: { x: 1, y: 1 } });

describe('edge.getVelocity', () => {
  it('should give sensible answers for a synthetic edge', () => {
    // actual control point is located at (0.5, 0)
    expect(edge.getVelocity('a')).deep.equal(u.vnorm({ x: 0.5, y: 0 }));
    expect(edge.getVelocity('b')).deep.equal(u.vnorm({ x: -2.5, y: -4 }));
  });
});
