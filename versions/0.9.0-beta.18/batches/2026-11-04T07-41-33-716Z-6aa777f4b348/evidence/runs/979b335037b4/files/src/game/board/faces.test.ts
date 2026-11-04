import { expect, it } from 'vitest';
import { faceParts } from './faces.ts';

it('gives all 128 faces unique names, normalized markers and non-color distinctions', () => {
  const names = new Set<string>();
  for (let id = 0; id < 128; id++) {
    const face = faceParts(id);
    names.add(face.name);
    expect(Math.hypot(face.x - 50, face.y - 50)).toBeCloseTo(40);
  }
  expect(names.size).toBe(128);
  expect(faceParts(0).name).toBe('cyan solid circle, marker top');
  expect(faceParts(64).name).toBe('cyan outline circle, marker top');
  expect(faceParts(73).x).toBeCloseTo(78.284271);
});
