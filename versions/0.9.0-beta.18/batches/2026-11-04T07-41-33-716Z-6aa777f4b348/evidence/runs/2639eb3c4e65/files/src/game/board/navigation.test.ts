import { expect, it } from 'vitest';
import { moveFocus } from './navigation.ts';
import { faceDescription } from './face.ts';

it('stops at row and column edges', () => {
  expect(moveFocus(0, 4, 'ArrowLeft')).toBe(0);
  expect(moveFocus(0, 4, 'ArrowUp')).toBe(0);
  expect(moveFocus(3, 4, 'ArrowRight')).toBe(3);
  expect(moveFocus(15, 4, 'ArrowDown')).toBe(15);
  expect(moveFocus(3, 4, 'ArrowDown')).toBe(7);
  expect(moveFocus(7, 4, 'ArrowLeft')).toBe(6);
  expect(moveFocus(7, 4, 'Home')).toBe(7);
});

it('makes 128 distinct named identities with normalized, separated markers', () => {
  const faces = Array.from({ length: 128 }, (_, id) => faceDescription(id));
  expect(new Set(faces.map(face => face.name)).size).toBe(128);
  expect(faces[0]?.name).toBe('cyan solid circle, marker top');
  expect(faces[64]?.name).toBe('cyan outline circle, marker top');
  for (const face of faces) expect(Math.hypot(face.markerX - 50, face.markerY - 50)).toBeCloseTo(40);
  expect(faces[8]?.markerX).toBeCloseTo(78.284271);
});
