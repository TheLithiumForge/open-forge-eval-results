import { expect, it } from 'vitest';
import { describeFace } from './faces.ts';

it('has 128 identities distinguished by shape, marker and fill', () => {
  const faces = Array.from({ length: 128 }, (_, id) => describeFace(id));
  expect(new Set(faces.map(face => `${face.shape}/${face.marker}/${face.fill}`)).size).toBe(128);
  expect(faces[0]?.name).toBe('cyan solid circle, marker top');
  expect(faces[64]?.name).toBe('cyan outline circle, marker top');
  expect(faces[127]?.name).toBe('ice outline chevron, marker top-left');
});
