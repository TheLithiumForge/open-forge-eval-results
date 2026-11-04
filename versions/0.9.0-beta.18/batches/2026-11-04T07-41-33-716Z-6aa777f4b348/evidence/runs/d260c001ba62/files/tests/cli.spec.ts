import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';

const execute = promisify(execFile);

test('documented replay command prints only snapshot JSON and rejects invalid files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'neon-pairs-'));
  try {
    const path = join(directory, 'replay.json');
    await writeFile(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    const result = await execute('npm', ['run', '--silent', 'replay', '--', path]);
    expect(result.stderr).toBe('');
    const value: unknown = JSON.parse(result.stdout);
    expect(value).toEqual({ version: 1, boardCode: 'np1-4-1', matched: [0, 11],
      selection: { kind: 'closed' }, moves: 1, elapsedMs: 800, started: true });
    await writeFile(path, '{"version":2}');
    const invalid = await new Promise<{ code: number | null; stdout: string; stderr: string }>(resolve => {
      execFile('npm', ['run', '--silent', 'replay', '--', path], (error, stdout, stderr) => {
        resolve({ code: error?.code && typeof error.code === 'number' ? error.code : null, stdout, stderr });
      });
    });
    expect(invalid.code).not.toBeNull();
    expect(invalid.stdout).toBe('');
    expect(invalid.stderr).toContain('Invalid replay.');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
