import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';

it('prints only a final snapshot on success, and only stderr on failure', () => {
  const directory = mkdtempSync(join(tmpdir(), 'neon-replay-'));
  const path = join(directory, 'replay.json');
  try {
    writeFileSync(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    const valid = spawnSync(process.execPath, ['scripts/replay.ts', path], { encoding: 'utf8' });
    expect(valid.status).toBe(0);
    expect(valid.stderr).toBe('');
    expect(decodeSnapshot(valid.stdout)?.moves).toBe(1);
    writeFileSync(path, '{}');
    const invalid = spawnSync(process.execPath, ['scripts/replay.ts', path], { encoding: 'utf8' });
    expect(invalid.status).not.toBe(0);
    expect(invalid.stdout).toBe('');
    expect(invalid.stderr).toContain('Invalid replay.');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
