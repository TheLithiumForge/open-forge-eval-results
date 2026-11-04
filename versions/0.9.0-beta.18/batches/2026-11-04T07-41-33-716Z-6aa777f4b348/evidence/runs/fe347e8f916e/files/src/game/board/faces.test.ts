import { expect, it } from 'vitest';
import { faceParts } from './faces.ts';

it('gives every face a unique shape, marker and fill identity and accessible name', () => {
  const faces = Array.from({ length: 128 }, (_, id) => faceParts(id));
  expect(new Set(faces.map((face) => `${face.shape}/${face.marker}/${face.fill}`)).size).toBe(128);
  expect(new Set(faces.map((face) => face.name)).size).toBe(128);
  expect(faces[0]?.name).toBe('cyan solid circle, marker top');
  expect(faces[64]?.name).toBe('cyan outline circle, marker top');
  for (const face of faces) expect(Math.hypot(face.x - 50, face.y - 50)).toBeCloseTo(40, 10);
  expect(faces[9]?.name).toBe('magenta solid square, marker top-right');
  expect(faces[73]?.name).toBe('magenta outline square, marker top-right');
});
