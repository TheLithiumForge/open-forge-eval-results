import { describe, expect, it } from 'vitest';
import { describeFace, faceName } from './faces.ts';

describe('face identities', () => {
  it.each([
    [0, 'cyan solid circle, marker top'],
    [7, 'cyan solid chevron, marker top'],
    [8, 'magenta solid circle, marker top-right'],
    [63, 'ice solid chevron, marker top-left'],
    [64, 'cyan outline circle, marker top'],
    [127, 'ice outline chevron, marker top-left'],
  ])('names face %i according to the documented order', (id, name) => {
    expect(faceName(Number(id))).toBe(name);
  });

  it('gives all 128 faces a distinct shape, marker and fill identity', () => {
    const names = Array.from({ length: 128 }, (_, id) => faceName(id));
    expect(new Set(names).size).toBe(128);
    for (let id = 0; id < 128; id += 1) {
      const face = describeFace(id);
      expect(Math.hypot(face.markerX - 50, face.markerY - 50)).toBeCloseTo(40, 10);
    }
  });

  it('normalizes diagonal markers and preserves the specified color order', () => {
    expect(describeFace(9)).toMatchObject({ color: '#FF71D6', shape: 'square', fill: 'solid' });
    expect(describeFace(9).markerX).toBeCloseTo(78.2842712475, 8);
    expect(describeFace(9).markerY).toBeCloseTo(21.7157287525, 8);
    expect(describeFace(73)).toMatchObject({ color: '#FF71D6', shape: 'square', fill: 'outline' });
    expect([0, 8, 16, 24, 32, 40, 48, 56].map((id) => describeFace(id).color))
      .toEqual(['#63E7FF', '#FF71D6', '#8BEA7D', '#FFE082', '#FFB064', '#B49AFF', '#FF8296', '#D9F3FF']);
  });

  it.each([-1, 128, 0.5, NaN, Infinity])('rejects an invalid face identity %s', (id) => {
    expect(() => describeFace(id)).toThrow(RangeError);
  });
});
