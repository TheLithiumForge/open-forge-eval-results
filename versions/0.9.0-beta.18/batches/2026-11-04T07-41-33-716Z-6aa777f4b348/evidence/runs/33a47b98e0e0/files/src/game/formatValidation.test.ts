import { describe, expect, it } from 'vitest';
import { isJsonWithinBytes } from './formatValidation.ts';
import { REPLAY_BYTE_LIMIT } from './replay.ts';
import { SNAPSHOT_BYTE_LIMIT } from './snapshot.ts';

describe('JSON format byte limits', () => {
  it('counts UTF-8 bytes instead of JavaScript characters at both format limits', () => {
    for (const limit of [SNAPSHOT_BYTE_LIMIT, REPLAY_BYTE_LIMIT]) {
      const exact = `${'a'.repeat(limit - 2)}é`;
      expect(exact).toHaveLength(limit - 1);
      expect(new TextEncoder().encode(exact)).toHaveLength(limit);
      expect(isJsonWithinBytes(exact, limit)).toBe(true);
      expect(isJsonWithinBytes(`${exact}x`, limit)).toBe(false);
    }
  });
});
