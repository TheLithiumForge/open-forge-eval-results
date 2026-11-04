import { expect, it } from 'vitest';
import { describeFace } from './faces.ts';

it('names all 128 shape/marker/fill identities uniquely', () => {
  const faces = Array.from({ length: 128 }, (_, id) => describeFace(id));
  expect(new Set(faces.map(face => face.name)).size).toBe(128);
  expect(faces[0]?.name).toBe('cyan solid circle, marker top');
  expect(faces[64]?.name).toBe('cyan outline circle, marker top');
  expect(faces[127]?.name).toBe('ice outline chevron, marker top-left');
  for (const face of faces) expect(Math.hypot(face.markerX - 50, face.markerY - 50)).toBeCloseTo(40);
});
