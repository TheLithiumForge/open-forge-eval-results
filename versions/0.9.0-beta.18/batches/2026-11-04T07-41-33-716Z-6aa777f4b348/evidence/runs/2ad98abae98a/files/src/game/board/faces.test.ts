import { expect, it } from 'vitest';
import { faceParts } from './faces.ts';

it('names every shape, marker and fill as a unique face', () => {
  const faces = Array.from({ length: 128 }, (_, id) => faceParts(id));
  expect(new Set(faces.map(face => face.name)).size).toBe(128);
  expect(faces[0]?.name).toBe('cyan solid circle, marker top');
  expect(faces[64]?.name).toBe('cyan outline circle, marker top');
  expect(faces[127]?.name).toBe('ice outline chevron, marker top-left');
  for (const face of faces) expect(Math.hypot(face.x - 50, face.y - 50)).toBeCloseTo(40);
  expect(faces[8]?.x).toBeCloseTo(78.284271);
  expect(faces[8]?.y).toBeCloseTo(21.715729);
});
