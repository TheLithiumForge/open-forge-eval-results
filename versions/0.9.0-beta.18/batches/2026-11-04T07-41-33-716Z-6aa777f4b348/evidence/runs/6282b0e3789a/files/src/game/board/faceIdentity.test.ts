import { describe, expect, it } from 'vitest';
import { faceIdentity } from './faceIdentity.ts';

describe('face identity', () => {
  it('uses the specified names and ordered encodings', () => {
    expect(faceIdentity(0).name).toBe('cyan solid circle, marker top');
    expect(faceIdentity(64).name).toBe('cyan outline circle, marker top');
    expect(faceIdentity(9).name).toBe('magenta solid square, marker top-right');
    expect(faceIdentity(127).name).toBe('ice outline chevron, marker top-left');
    expect(new Set(Array.from({ length: 128 }, (_, id) => faceIdentity(id).name)).size).toBe(128);
  });

  it('normalizes all marker positions to a distance of 40', () => {
    for (let id = 0; id < 128; id += 1) {
      const face = faceIdentity(id);
      expect(Math.hypot(face.markerX - 50, face.markerY - 50)).toBeCloseTo(40, 10);
    }
    expect(faceIdentity(9).markerX).toBeCloseTo(78.2842712475);
    expect(faceIdentity(9).markerY).toBeCloseTo(21.7157287525);
  });
});
