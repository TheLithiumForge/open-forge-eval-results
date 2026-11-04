import { describe, expect, it } from 'vitest';
import { FACE_COLORS, FACE_SHAPES, MARKER_POSITIONS, faceIdentity, faceName } from './faces.ts';

describe('card face identities', () => {
  it('creates all 128 shape, marker and fill combinations', () => {
    const names = Array.from({ length: 128 }, (_, id) => faceName(id));
    expect(new Set(names).size).toBe(128);
    expect(faceName(0)).toBe('cyan solid circle, marker top');
    expect(faceName(64)).toBe('cyan outline circle, marker top');
  });

  it('follows the documented ordered shapes, markers and colors', () => {
    expect(FACE_SHAPES).toEqual(['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron']);
    expect(MARKER_POSITIONS).toEqual(['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left']);
    for (let id = 0; id < 128; id += 1) {
      const face = faceIdentity(id);
      expect(face.shape).toBe(FACE_SHAPES[id % 8]);
      expect(face.marker).toBe(MARKER_POSITIONS[Math.floor(id / 8) % 8]);
      expect(face.color).toBe(FACE_COLORS[Math.floor(id / 8) % 8]?.value);
      expect(face.fill).toBe(id < 64 ? 'solid' : 'outline');
    }
  });
});
