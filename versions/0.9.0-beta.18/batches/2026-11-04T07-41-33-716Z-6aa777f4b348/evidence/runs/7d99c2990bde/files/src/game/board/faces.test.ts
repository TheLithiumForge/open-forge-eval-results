import { describe, expect, it } from 'vitest';
import { describeFace } from './faces.ts';

describe('face identity', () => {
  it('uses the documented names and independent shape/marker/fill distinctions', () => {
    expect(describeFace(0).name).toBe('cyan solid circle, marker top');
    expect(describeFace(64).name).toBe('cyan outline circle, marker top');
    expect(describeFace(9).name).toBe('magenta solid square, marker top-right');
    expect(describeFace(127).name).toBe('ice outline chevron, marker top-left');
    expect(new Set(Array.from({ length: 128 }, (_, id) => describeFace(id).name)).size).toBe(128);
  });
  it('keeps every marker exactly 40 units from center, including diagonals', () => {
    for (let id = 0; id < 128; id++) {
      const face = describeFace(id);
      expect(Math.hypot(face.markerX - 50, face.markerY - 50)).toBeCloseTo(40, 10);
    }
    expect(describeFace(8).markerX).toBeCloseTo(78.284, 3);
    expect(describeFace(8).markerY).toBeCloseTo(21.716, 3);
  });
});
