import { describe, expect, it } from 'vitest';
import { describeFace, FACE_COLORS, FACE_FILLS, FACE_MARKERS, FACE_SHAPES } from './face.ts';

describe('face identities', () => {
  it('derives all 128 unique shape, marker, and fill identities', () => {
    const faces = Array.from({ length: 128 }, (_unused, id) => describeFace(id));
    expect(new Set(faces.map((face) => face.shape + '-' + face.marker + '-' + face.fill)).size).toBe(128);
    expect(faces[0]?.name).toBe('cyan solid circle, marker top');
    expect(faces[64]?.name).toBe('cyan outline circle, marker top');
  });

  it('keeps palette color tied to marker and dimensions to ordered identity lists', () => {
    for (let id = 0; id < 128; id += 1) {
      const face = describeFace(id);
      const shapeIndex = id % 8;
      const markerIndex = Math.floor(id / 8) % 8;
      expect(face.shape).toBe(FACE_SHAPES[shapeIndex]);
      expect(face.marker).toBe(FACE_MARKERS[markerIndex]);
      expect(face.fill).toBe(FACE_FILLS[Math.floor(id / 64)]);
      expect(face.color).toBe(FACE_COLORS[markerIndex]);
      expect(Math.hypot(face.markerX - 50, face.markerY - 50)).toBeCloseTo(40, 2);
    }
  });

  it('rejects identities outside the generated range', () => {
    expect(() => describeFace(-1)).toThrow(RangeError);
    expect(() => describeFace(128)).toThrow(RangeError);
  });
});
