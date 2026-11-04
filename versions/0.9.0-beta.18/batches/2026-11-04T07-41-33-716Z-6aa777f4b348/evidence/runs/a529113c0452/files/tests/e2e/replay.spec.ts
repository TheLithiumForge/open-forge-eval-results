import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { decodeSnapshot } from '../../src/game/snapshot.ts';

test('documented replay command has JSON-only success and empty-stdout errors', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'neon pairs replay '));
  const file = join(directory, 'replay.json');
  const run = (path: string) => spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
  try {
    await writeFile(file, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    const valid = run(file);
    expect(valid.status).toBe(0);
    expect(valid.stderr).toBe('');
    const restored = decodeSnapshot(valid.stdout);
    expect(restored?.matched).toEqual([0, 11]);
    expect(restored?.moves).toBe(1);
    expect(restored?.elapsedMs).toBe(800);
    await writeFile(file, '{"version":2}');
    for (const path of [file, join(directory, 'missing.json')]) {
      const invalid = run(path);
      expect(invalid.status).not.toBe(0);
      expect(invalid.stdout).toBe('');
      expect(invalid.stderr.trim().length).toBeGreaterThan(0);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
