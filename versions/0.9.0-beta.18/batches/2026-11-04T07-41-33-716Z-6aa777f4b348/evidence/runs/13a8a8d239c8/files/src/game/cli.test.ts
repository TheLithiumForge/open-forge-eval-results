import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';

describe('replay command', () => {
  it('prints only a final snapshot for valid input and reports invalid input on stderr', () => {
    const directory = mkdtempSync(join(tmpdir(), 'neon-pairs-'));
    const path = join(directory, 'replay.json');
    try {
      writeFileSync(path, '{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}');
      const valid = spawnSync(process.execPath, ['scripts/replay.ts', path], { encoding: 'utf8' });
      const finalState = decodeSnapshot(valid.stdout.trim());
      expect(valid.status).toBe(0);
      expect(finalState?.matched).toEqual([0, 11]);
      expect(valid.stdout.trim().startsWith('{')).toBe(true);

      writeFileSync(path, '{bad json');
      const invalid = spawnSync(process.execPath, ['scripts/replay.ts', path], { encoding: 'utf8' });
      expect(invalid.status).not.toBe(0);
      expect(invalid.stdout).toBe('');
      expect(invalid.stderr).toContain('Invalid replay.');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects a missing file path', () => {
    const result = spawnSync(process.execPath, ['scripts/replay.ts'], { encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Invalid replay.');
  });
});
