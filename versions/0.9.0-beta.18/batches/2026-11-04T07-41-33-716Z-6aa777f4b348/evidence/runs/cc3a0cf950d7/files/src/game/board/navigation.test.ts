import { expect, it } from 'vitest';
import { nextPosition } from './navigation.ts';
import { faceName } from './faces.ts';

it('moves by row and column without wrapping', () => {
  expect(nextPosition(0, 4, 'ArrowLeft')).toBe(0);
  expect(nextPosition(0, 4, 'ArrowUp')).toBe(0);
  expect(nextPosition(3, 4, 'ArrowRight')).toBe(3);
  expect(nextPosition(15, 4, 'ArrowDown')).toBe(15);
  expect(nextPosition(5, 4, 'ArrowUp')).toBe(1);
  expect(nextPosition(5, 4, 'ArrowDown')).toBe(9);
  expect(nextPosition(5, 4, 'ArrowLeft')).toBe(4);
  expect(nextPosition(5, 4, 'ArrowRight')).toBe(6);
});

it('gives every grayscale face a unique shape, fill and marker name', () => {
  const names = Array.from({ length: 128 }, (_, id) => faceName(id));
  expect(new Set(names).size).toBe(128);
  expect(names[0]).toBe('cyan solid circle, marker top');
  expect(names[64]).toBe('cyan outline circle, marker top');
  expect(names[127]).toBe('ice outline chevron, marker top-left');
});
