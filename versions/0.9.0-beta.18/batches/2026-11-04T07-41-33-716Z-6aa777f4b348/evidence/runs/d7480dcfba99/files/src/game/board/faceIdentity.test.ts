import { expect, it } from 'vitest';
import { faceIdentity } from './faceIdentity.ts';

it('gives all 128 grayscale identities unique shape, marker and fill names', () => {
  const faces = Array.from({ length: 128 }, (_, id) => faceIdentity(id));
  expect(new Set(faces.map(face => face.name)).size).toBe(128);
  expect(faces[0]?.name).toBe('cyan solid circle, marker top');
  expect(faces[64]?.name).toBe('cyan outline circle, marker top');
  expect(faces[73]?.name).toBe('magenta outline square, marker top-right');
  expect(faces[73]?.x).toBeCloseTo(78.284, 3);
  expect(faces[73]?.y).toBeCloseTo(21.716, 3);
});
