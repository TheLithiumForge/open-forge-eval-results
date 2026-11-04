import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { expect, it } from 'vitest';
import { Card } from './Card.tsx';
import { Face } from './Face.tsx';
import { faceIdentity } from './face-identity.ts';

it('uses the specified face names at shape, marker, and fill boundaries', () => {
  expect(faceIdentity(0).name).toBe('cyan solid circle, marker top');
  expect(faceIdentity(7).name).toBe('cyan solid chevron, marker top');
  expect(faceIdentity(8).name).toBe('magenta solid circle, marker top-right');
  expect(faceIdentity(64).name).toBe('cyan outline circle, marker top');
  expect(faceIdentity(73).name).toBe('magenta outline square, marker top-right');
  expect(faceIdentity(127).name).toBe('ice outline chevron, marker top-left');
});

it('gives all 128 identities unique noncolor artwork and names', () => {
  const names = new Set<string>();
  const drawings = new Set<string>();
  for (let id = 0; id < 128; id += 1) {
    const face = faceIdentity(id);
    names.add(face.name);
    drawings.add(renderToStaticMarkup(createElement(Face, { id })).replaceAll(face.color, '#FFFFFF'));
    expect(Math.hypot(face.x - 50, face.y - 50)).toBeCloseTo(40, 10);
  }
  expect(names.size).toBe(128);
  expect(drawings.size).toBe(128);
});

it('keeps solid and outline squares distinct with separated diagonal markers', () => {
  for (const id of [9, 25, 41, 57]) {
    const solid = renderToStaticMarkup(createElement(Face, { id }));
    const outline = renderToStaticMarkup(createElement(Face, { id: id + 64 }));
    expect(solid).toContain('<rect x="25" y="25" width="50" height="50"');
    expect(outline).toContain('fill="none"');
    expect(outline).toContain('stroke-width="5"');
    expect(outline).toContain('stroke="#111625" stroke-width="3"');
    expect(faceIdentity(id).x).not.toBe(50);
    expect(faceIdentity(id).y).not.toBe(50);
  }
});

it('renders identical hidden markup for every face without identity data', () => {
  const hidden = (face: number) => renderToStaticMarkup(createElement(Card, {
    index: 0, size: 4, face, revealed: false, matched: false, tabIndex: 0, buttonRef: null,
    onFocus: () => undefined, onKeyDown: () => undefined, onActivate: () => undefined,
  }));
  const first = hidden(0);
  expect(first).toContain('Row 1, column 1, closed');
  expect(first).not.toContain('card-face');
  expect(first).not.toContain('data-');
  for (let id = 0; id < 128; id += 1) expect(hidden(id)).toBe(first);
});
