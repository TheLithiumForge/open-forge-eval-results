import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

test('documented replay command writes only a final snapshot or a stderr failure', () => {
  const directory = mkdtempSync(join(tmpdir(), 'neon-replay-'));
  const path = join(directory, 'replay.json');
  try {
    writeFileSync(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    const valid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
    expect(valid.status).toBe(0);
    expect(valid.stderr).toBe('');
    const snapshot: unknown = JSON.parse(valid.stdout);
    expect(snapshot).toEqual({ version: 1, boardCode: 'np1-4-1', matched: [0, 11],
      selection: { kind: 'closed' }, moves: 1, elapsedMs: 800, started: true });
    writeFileSync(path, '{"version":2}');
    const invalid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
    expect(invalid.status).not.toBe(0);
    expect(invalid.stdout).toBe('');
    expect(invalid.stderr).toContain('Invalid replay.');
    const missing = spawnSync('npm', ['run', '--silent', 'replay', '--', path + '.missing'], { encoding: 'utf8' });
    expect(missing.status).not.toBe(0);
    expect(missing.stdout).toBe('');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
