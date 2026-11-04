import { describe, expect, it } from 'vitest';
import { faceIdentity, MARKERS, SHAPES } from './faceIdentity.ts';

describe('face identities (V10–V13)', () => {
  it('has 128 distinct identities and accessible names without relying on color', () => {
    const faces = Array.from({ length: 128 }, (_, id) => faceIdentity(id));
    expect(new Set(faces.map(face => `${face.fill}/${face.shape}/${face.marker}`)).size).toBe(128);
    expect(new Set(faces.map(face => face.name)).size).toBe(128);
    expect(faces[0]?.name).toBe('cyan solid circle, marker top');
    expect(faces[64]?.name).toBe('cyan outline circle, marker top');
    expect(faces[127]?.name).toBe('ice outline chevron, marker top-left');
  });
  it('places each marker 40 units from center including normalized diagonals', () => {
    MARKERS.forEach((marker, index) => {
      const face = faceIdentity(index * 8);
      expect(face.marker).toBe(marker);
      expect(Math.hypot(face.markerX - 50, face.markerY - 50)).toBeCloseTo(40, 12);
      expect(face.markerX).toBeGreaterThanOrEqual(10);
      expect(face.markerY).toBeGreaterThanOrEqual(10);
      expect(face.markerX).toBeLessThanOrEqual(90);
      expect(face.markerY).toBeLessThanOrEqual(90);
    });
  });
  it('keeps the specified shape order for each marker and both fills', () => {
    for (let group = 0; group < 16; group++) {
      expect(SHAPES.map((_, index) => faceIdentity(group * 8 + index).shape)).toEqual(SHAPES);
    }
  });
});
