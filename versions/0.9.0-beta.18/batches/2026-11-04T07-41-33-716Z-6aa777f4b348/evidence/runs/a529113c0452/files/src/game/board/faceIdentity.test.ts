import { describe, expect, it } from 'vitest';
import { faceIdentity } from './faceIdentity.ts';

describe('face identities', () => {
  it('generates 128 distinct shape, fill and marker names', () => {
    const names = Array.from({ length: 128 }, (_, id) => faceIdentity(id).name);
    expect(new Set(names).size).toBe(128);
    expect(names[0]).toBe('cyan solid circle, marker top');
    expect(names[64]).toBe('cyan outline circle, marker top');
    expect(names[127]).toBe('ice outline chevron, marker top-left');
  });

  it('normalizes marker directions to forty units from the center', () => {
    for (let id = 0; id < 128; id += 1) {
      const { marker } = faceIdentity(id);
      expect(Math.hypot(marker.x - 50, marker.y - 50)).toBeCloseTo(40, 12);
    }
    expect(faceIdentity(9).marker.x).toBeCloseTo(78.2842712475);
    expect(faceIdentity(9).marker.y).toBeCloseTo(21.7157287525);
  });

  it('rejects invalid identity inputs', () => {
    for (const id of [-1, 128, 0.5, NaN, Infinity]) expect(() => faceIdentity(id)).toThrow('Invalid face identity.');
  });
});
