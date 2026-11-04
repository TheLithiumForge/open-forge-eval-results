import { describe, expect, it } from 'vitest';
import { faceIdentity } from './faceIdentity.ts';

describe('face identity', () => {
  it('names the documented first solid and outline faces', () => {
    expect(faceIdentity(0).name).toBe('cyan solid circle, marker top');
    expect(faceIdentity(64).name).toBe('cyan outline circle, marker top');
    expect(faceIdentity(127).name).toBe('ice outline chevron, marker top-left');
    expect(faceIdentity(9).name).toBe('magenta solid square, marker top-right');
  });
  it('gives all128 faces unique non-color identities and normalized markers', () => {
    const faces = Array.from({ length: 128 }, (_, index) => faceIdentity(index));
    expect(new Set(faces.map((face) => face.name.replace(/^\w+ /, ''))).size).toBe(128);
    for (const face of faces) {
      expect(Math.hypot(face.markerX - 50, face.markerY - 50)).toBeCloseTo(40, 10);
    }
    expect(faceIdentity(9).markerX).toBeCloseTo(78.2842712475);
    expect(faceIdentity(9).markerY).toBeCloseTo(21.7157287525);
    expect(faceIdentity(32).markerY).toBe(90);
  });
  it.each([-1, 128, 1.5, NaN])('rejects invalid face %s', (id) => {
    expect(() => faceIdentity(id)).toThrow('Invalid face');
  });
});
