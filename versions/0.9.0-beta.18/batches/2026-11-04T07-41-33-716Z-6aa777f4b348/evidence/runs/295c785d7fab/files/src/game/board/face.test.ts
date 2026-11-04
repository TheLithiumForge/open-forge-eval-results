import { describe, expect, it } from 'vitest';
import { faceIdentity } from './face.ts';

describe('face identities', () => {
  it('has 128 distinct shape, marker and fill names with exact public examples', () => {
    const faces = Array.from({ length: 128 }, (_, index) => faceIdentity(index));
    expect(new Set(faces.map(face => face.name)).size).toBe(128);
    expect(faces[0]?.name).toBe('cyan solid circle, marker top');
    expect(faces[64]?.name).toBe('cyan outline circle, marker top');
    expect(faces[127]?.name).toBe('ice outline chevron, marker top-left');
    for (const face of faces) expect(Math.hypot(face.markerX - 50, face.markerY - 50)).toBeCloseTo(40);
    const diagonal = faceIdentity(8);
    expect(diagonal.markerX).toBeCloseTo(78.284271);
    expect(diagonal.markerY).toBeCloseTo(21.715729);
  });
  it('rejects out of range identities', () => {
    for (const id of [-1, 128, NaN, 0.5]) expect(() => faceIdentity(id)).toThrow();
  });
});
