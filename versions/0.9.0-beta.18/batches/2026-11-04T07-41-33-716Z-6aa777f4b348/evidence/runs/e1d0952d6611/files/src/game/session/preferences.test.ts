import { describe, expect, it } from 'vitest';
import { decodeSettings, withBest, type SavedSettings } from './preferences.ts';

describe('saved browser settings', () => {
  it('validates size and finite capped best scores', () => {
    expect(decodeSettings('{"version":1,"size":6,"bests":{"4":12,"6":null}}')).toEqual({ size: 6, bests: { 4: 12 } });
    for (const text of ['{', '{"version":1,"size":5,"bests":{}}',
      '{"version":1,"size":4,"bests":{},"extra":true}',
    ]) expect(decodeSettings(text)).toBeNull();
    expect(decodeSettings('{"version":1,"size":4,"bests":{"4":1000000}}'))
      .toEqual({ size: 4, bests: {} });
  });

  it('keeps equal or worse move records and replaces a better one', () => {
    const saved: SavedSettings = { size: 4, bests: { 4: 5 } };
    expect(withBest(saved, 4, 5)).toBe(saved);
    expect(withBest(saved, 4, 7)).toBe(saved);
    expect(withBest(saved, 4, 3).bests[4]).toBe(3);
  });
});
