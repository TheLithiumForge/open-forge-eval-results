import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execPath } from 'node:process';
import { describe, expect, it } from 'vitest';

describe('replay CLI', () => {
  it('prints only the final snapshot for valid input and rejects invalid input', () => {
    const directory = mkdtempSync(join(tmpdir(), 'neon-pairs-replay-'));
    try {
      const valid = join(directory, 'valid.json');
      const invalid = join(directory, 'invalid.json');
      writeFileSync(valid, JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
      writeFileSync(invalid, '{');
      const script = resolve('scripts/replay.ts');
      const accepted = spawnSync(execPath, [script, valid], { encoding: 'utf8' });
      expect(accepted.status).toBe(0);
      expect(accepted.stderr).toBe('');
      expect(JSON.parse(accepted.stdout)).toEqual({
        version: 1, boardCode: 'np1-4-1', matched: [0, 11], selection: { kind: 'closed' },
        moves: 1, elapsedMs: 800, started: true,
      });
      const rejected = spawnSync(execPath, [script, invalid], { encoding: 'utf8' });
      expect(rejected.status).not.toBe(0);
      expect(rejected.stdout).toBe('');
      expect(rejected.stderr).not.toBe('');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('returns no stdout and a failing status when the file cannot be read', () => {
    const missing = resolve('this-replay-file-does-not-exist.json');
    const result = spawnSync(execPath, [resolve('scripts/replay.ts'), missing], { encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).not.toBe('');
  });
});
