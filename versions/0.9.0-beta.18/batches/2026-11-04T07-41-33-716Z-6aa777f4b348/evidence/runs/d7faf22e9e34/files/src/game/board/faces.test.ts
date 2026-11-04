import { describe, expect, it } from 'vitest';
import { faceIdentity } from './faces.ts';

describe('face identities', () => {
  it('names all 128 shape, marker and fill combinations uniquely', () => {
    const faces = Array.from({ length: 128 }, (_, id) => faceIdentity(id));
    expect(new Set(faces.map((face) => face.name)).size).toBe(128);
    expect(new Set(faces.map((face) => `${face.shape}/${face.marker.name}/${face.fill}`)).size).toBe(128);
    expect(faces.filter((face) => face.fill === 'solid')).toHaveLength(64);
    expect(faces.filter((face) => face.fill === 'outline')).toHaveLength(64);
  });
  it('uses the documented ordered face names and palette', () => {
    expect(faceIdentity(0).name).toBe('cyan solid circle, marker top');
    expect(faceIdentity(9).name).toBe('magenta solid square, marker top-right');
    expect(faceIdentity(64).name).toBe('cyan outline circle, marker top');
    expect(faceIdentity(127).name).toBe('ice outline chevron, marker top-left');
    expect(faceIdentity(16).color.value).toBe('#8BEA7D');
  });
  it('puts cardinal and diagonal markers exactly 40 units from center', () => {
    for (let id = 0; id < 64; id += 8) {
      const { marker } = faceIdentity(id);
      expect(Math.hypot(marker.x - 50, marker.y - 50)).toBeCloseTo(40, 10);
    }
    expect(faceIdentity(8).marker.x).toBeCloseTo(78.2842712475, 8);
    expect(faceIdentity(8).marker.y).toBeCloseTo(21.7157287525, 8);
  });
  it.each([-1, 128, 1.5, NaN, Infinity])('rejects invalid identity %s', (id) => {
    expect(() => faceIdentity(id)).toThrow(RangeError);
  });
});
