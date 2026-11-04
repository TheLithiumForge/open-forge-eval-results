import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { decodeSnapshot } from '../src/game/snapshot.ts';

test('replay command prints only a snapshot on success and only stderr on failure', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'neon-replay-'));
  const path = join(directory, 'replay.json');
  try {
    await writeFile(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    const valid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
    expect(valid.status).toBe(0);
    expect(valid.stderr).toBe('');
    expect(decodeSnapshot(valid.stdout)).toMatchObject({ moves: 1, elapsedMs: 800, matched: [0, 11] });
    for (const text of ['{bad', '{"version":2}', ' '.repeat(1048577)]) {
      await writeFile(path, text);
      const invalid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
      expect(invalid.status).not.toBe(0);
      expect(invalid.stdout).toBe('');
      expect(invalid.stderr.length).toBeGreaterThan(0);
    }
    const missing = spawnSync('npm', ['run', '--silent', 'replay', '--', join(directory, 'missing.json')], { encoding: 'utf8' });
    expect(missing.status).not.toBe(0);
    expect(missing.stdout).toBe('');
    expect(missing.stderr.length).toBeGreaterThan(0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
