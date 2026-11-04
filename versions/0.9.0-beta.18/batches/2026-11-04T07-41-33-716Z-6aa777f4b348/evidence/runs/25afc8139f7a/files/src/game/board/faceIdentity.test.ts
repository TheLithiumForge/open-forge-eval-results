import { expect, it } from 'vitest';
import { faceIdentity } from './faceIdentity.ts';

it('names solid and outline faces with exact shape and marker names', () => {
  expect(faceIdentity(0).name).toBe('cyan solid circle, marker top');
  expect(faceIdentity(64).name).toBe('cyan outline circle, marker top');
  expect(faceIdentity(127).name).toBe('ice outline chevron, marker top-left');
});

it('defines 128 identities without relying on color differences', () => {
  const faces = Array.from({ length: 128 }, (_, id) => faceIdentity(id));
  expect(new Set(faces.map(({ shape, marker, fill }) => `${shape}/${marker}/${fill}`)).size).toBe(128);
  for (const { markerX, markerY } of faces) {
    expect(Math.hypot(markerX - 50, markerY - 50)).toBeCloseTo(40, 10);
  }
  expect(faceIdentity(9).markerX).toBeCloseTo(78.2842712475);
  expect(faceIdentity(9).markerY).toBeCloseTo(21.7157287525);
});
