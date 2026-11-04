import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('the documented replay command prints only the final version-one snapshot', () => {
  const result = spawnSync('npm', [
    'run', '--silent', 'replay', '--', 'tests/fixtures/example.replay.json',
  ], { cwd: process.cwd(), encoding: 'utf8' });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  const output: unknown = JSON.parse(result.stdout);
  expect(output).toMatchObject({
    version: 1,
    boardCode: 'np1-4-1',
    matched: [0, 11],
    selection: { kind: 'closed' },
    moves: 1,
    elapsedMs: 800,
    started: true,
  });
});

test('invalid replay JSON leaves stdout empty and explains the error on stderr', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'neon-pairs-replay-'));
  const replay = join(directory, 'invalid.json');
  await writeFile(replay, JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [], endMs: 0, extra: true }));
  try {
    const result = spawnSync('npm', [
      'run', '--silent', 'replay', '--', replay,
    ], { cwd: process.cwd(), encoding: 'utf8' });
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr.trim()).toBeTruthy();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
