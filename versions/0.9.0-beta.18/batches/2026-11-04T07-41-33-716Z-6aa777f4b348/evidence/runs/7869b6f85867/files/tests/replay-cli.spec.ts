import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';

const run = promisify(execFile);
test('documented replay command prints only a snapshot and rejects invalid files', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'neon-replay-'));
  const path = join(folder, 'replay.json');
  try {
    await writeFile(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    const valid = await run('npm', ['run', '--silent', 'replay', '--', path]);
    expect(valid.stderr).toBe('');
    expect(JSON.parse(valid.stdout)).toEqual({ version: 1, boardCode: 'np1-4-1',
      matched: [0, 11], selection: { kind: 'closed' }, moves: 1, elapsedMs: 800, started: true });
    await writeFile(path, '{}');
    await expect(run('npm', ['run', '--silent', 'replay', '--', path]))
      .rejects.toMatchObject({ code: 1, stdout: '', stderr: 'Invalid replay.\n' });
    await expect(run('npm', ['run', '--silent', 'replay', '--', join(folder, 'missing.json')]))
      .rejects.toMatchObject({ code: 1, stdout: '' });
  } finally { await rm(folder, { recursive: true }); }
});
