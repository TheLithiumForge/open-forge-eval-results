import { describe, expect, it } from 'vitest';
import { getFaceData } from './faceData.ts';

describe('face identities', () => {
  it('names all 128 shape, marker and fill combinations distinctly', () => {
    const faces = Array.from({ length: 128 }, (_, id) => getFaceData(id));
    expect(new Set(faces.map((face) => face.name)).size).toBe(128);
    expect(faces[0]?.name).toBe('cyan solid circle, marker top');
    expect(faces[64]?.name).toBe('cyan outline circle, marker top');
    expect(new Set(faces.map((face) => face.color)).size).toBe(8);
  });
});
