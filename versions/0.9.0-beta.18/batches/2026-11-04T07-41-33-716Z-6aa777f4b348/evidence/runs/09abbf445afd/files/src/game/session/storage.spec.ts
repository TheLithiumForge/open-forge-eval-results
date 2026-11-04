import { describe, expect, it } from 'vitest';
import { parsePreferences } from './storage.ts';

describe('saved preferences', () => {
  it('uses the default size and no scores for missing or malformed values', () => {
    expect(parsePreferences(null)).toEqual({ size: 4, bestScores: {} });
    expect(parsePreferences('{')).toEqual({ size: 4, bestScores: {} });
    expect(parsePreferences(JSON.stringify(['4', 20]))).toEqual({ size: 4, bestScores: {} });
  });

  it('keeps only supported sizes and bounded whole-number best scores', () => {
    expect(parsePreferences(JSON.stringify({
      size: 8,
      bestScores: { 4: 0, 8: 999999, 6: 3.2, 10: -1, 12: 1000000, 5: 1, 14: '4' },
    }))).toEqual({ size: 8, bestScores: { 4: 0, 8: 999999 } });
    expect(parsePreferences(JSON.stringify({ size: '8', bestScores: { 4: 5 } }))).toEqual({ size: 4, bestScores: { 4: 5 } });
  });
});
