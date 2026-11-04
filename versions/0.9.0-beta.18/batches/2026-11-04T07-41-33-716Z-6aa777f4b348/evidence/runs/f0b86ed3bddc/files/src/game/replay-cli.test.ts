import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';

const run = promisify(execFile);
it('documented CLI prints only the final snapshot and rejects files with empty stdout', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'neon-pairs-'));
  const path = join(directory, 'replay.json');
  try {
    await writeFile(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    const valid = await run('npm', ['run', '--silent', 'replay', '--', path]);
    expect(valid.stderr).toBe('');
    expect(decodeSnapshot(valid.stdout)).toMatchObject({ moves: 1, matched: [0, 11], elapsedMs: 800 });
    await writeFile(path, '{"version":2}');
    let failed = false;
    try { await run('npm', ['run', '--silent', 'replay', '--', path]); }
    catch (error) {
      failed = true;
      expect(error).toMatchObject({ code: 1, stdout: '', stderr: 'Invalid replay.\n' });
    }
    expect(failed).toBe(true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
