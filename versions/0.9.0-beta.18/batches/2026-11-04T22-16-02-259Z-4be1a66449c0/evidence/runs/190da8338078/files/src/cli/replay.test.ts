import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

let directory = '';
afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }); directory = ''; });

describe('replay command', () => {
  it('prints only the final snapshot for valid input', async () => {
    directory = await mkdtemp(join(tmpdir(), 'neon-pairs-'));
    const file = join(directory, 'replay.json');
    await writeFile(file, '{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}');
    const result = spawnSync(process.execPath, ['src/cli/replay.ts', file], { cwd: process.cwd(), encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800 });
  });

  it('keeps invalid input off stdout and exits nonzero', async () => {
    directory = await mkdtemp(join(tmpdir(), 'neon-pairs-'));
    const file = join(directory, 'invalid.json');
    await writeFile(file, '{broken');
    const result = spawnSync(process.execPath, ['src/cli/replay.ts', file], { cwd: process.cwd(), encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Invalid replay.');
  });
});
