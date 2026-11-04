import { expect, it } from 'vitest';
import { describeFace } from './face.ts';

it('identifies all 128 faces by shape, marker and fill without color', () => {
  const names = Array.from({ length: 128 }, (_, id) => describeFace(id).name);
  expect(new Set(names.map((name) => name.slice(name.indexOf(' ') + 1))).size).toBe(128);
  expect(names[0]).toBe('cyan solid circle, marker top');
  expect(names[64]).toBe('cyan outline circle, marker top');
  expect(names[127]).toBe('ice outline chevron, marker top-left');
});
it('places every marker 40 units from center, including square diagonals', () => {
  for (let id = 0; id < 128; id += 1) {
    const face = describeFace(id);
    expect(Math.hypot(face.x - 50, face.y - 50)).toBeCloseTo(40, 10);
  }
  expect(describeFace(9)).toMatchObject({ shape: 'square', x: 50 + 40 / Math.sqrt(2), y: 50 - 40 / Math.sqrt(2) });
});
