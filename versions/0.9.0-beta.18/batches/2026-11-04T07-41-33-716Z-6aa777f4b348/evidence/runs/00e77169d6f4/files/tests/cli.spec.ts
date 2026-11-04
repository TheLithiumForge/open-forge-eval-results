import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodeSnapshot } from '../src/game/snapshot.ts';

test('documented replay command has exact stdout and failure exit behavior', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'neon-replay-'));
  try {
    const path = join(directory, 'replay.json');
    await writeFile(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    const valid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
    expect(valid.status).toBe(0);
    expect(valid.stderr).toBe('');
    const state = decodeSnapshot(valid.stdout);
    expect(state?.moves).toBe(1); expect(state?.elapsedMs).toBe(800); expect(state?.matched).toEqual([0, 11]);
    await writeFile(path, '{bad');
    const invalid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
    expect(invalid.status).not.toBe(0); expect(invalid.stdout).toBe(''); expect(invalid.stderr).toContain('Invalid replay.');
    const missing = spawnSync('npm', ['run', '--silent', 'replay', '--', join(directory, 'missing')], { encoding: 'utf8' });
    expect(missing.status).not.toBe(0); expect(missing.stdout).toBe(''); expect(missing.stderr.length).toBeGreaterThan(0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
