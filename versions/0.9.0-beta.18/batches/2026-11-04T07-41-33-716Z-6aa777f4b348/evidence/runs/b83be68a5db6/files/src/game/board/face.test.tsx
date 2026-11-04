import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Face } from './Face.tsx';
import { faceParts } from './face.ts';
import { focusDestination } from './navigation.ts';

it('defines all 128 unique non-color identities and normalized marker positions', () => {
  const names = new Set<string>();
  for (let id = 0; id < 128; id++) {
    const face = faceParts(id);
    names.add(face.name);
    expect(Math.hypot(face.markerX - 50, face.markerY - 50)).toBeCloseTo(40, 10);
    expect(renderToStaticMarkup(<Face id={id} />)).toContain('viewBox="0 0 100 100"');
  }
  expect(names.size).toBe(128);
  expect(faceParts(0).name).toBe('cyan solid circle, marker top');
  expect(faceParts(64).name).toBe('cyan outline circle, marker top');
  expect(faceParts(73).markerX).toBeCloseTo(78.284271, 5);
});

it('stops at every board edge and moves within rows and columns', () => {
  expect(focusDestination(0, 4, 'ArrowLeft')).toBe(0);
  expect(focusDestination(0, 4, 'ArrowUp')).toBe(0);
  expect(focusDestination(3, 4, 'ArrowRight')).toBe(3);
  expect(focusDestination(15, 4, 'ArrowDown')).toBe(15);
  expect(focusDestination(5, 4, 'ArrowLeft')).toBe(4);
  expect(focusDestination(5, 4, 'ArrowRight')).toBe(6);
  expect(focusDestination(5, 4, 'ArrowUp')).toBe(1);
  expect(focusDestination(5, 4, 'ArrowDown')).toBe(9);
});
