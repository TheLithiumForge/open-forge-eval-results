import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeSnapshot } from '../game/snapshot.ts';

const validReplay = JSON.stringify({ version: 1, boardCode: 'np1-4-1',
  actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 });

function runReplayCommand(path?: string) {
  const args = ['run', '--silent', 'replay', '--'];
  if (path !== undefined) args.push(path);
  return spawnSync('npm', args, { encoding: 'utf8', timeout: 15_000 });
}

describe('documented replay command', () => {
  it('prints only valid snapshot JSON and reports invalid or missing inputs on stderr', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'neon-pairs-replay-'));
    try {
      const validPath = join(directory, 'valid.json');
      const invalidPath = join(directory, 'invalid.json');
      await writeFile(validPath, validReplay, 'utf8');
      await writeFile(invalidPath, '{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":20}],"endMs":0}', 'utf8');
      const valid = runReplayCommand(validPath);
      expect(valid.status).toBe(0);
      expect(valid.stderr).toBe('');
      expect(valid.stdout.endsWith('\n')).toBe(true);
      const state = decodeSnapshot(valid.stdout.trim());
      expect(state?.matched).toEqual([0, 11]);
      expect(state?.moves).toBe(1);
      expect(state?.elapsedMs).toBe(800);

      for (const result of [runReplayCommand(invalidPath), runReplayCommand(join(directory, 'missing.json')),
        runReplayCommand()]) {
        expect(result.status).not.toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr.length).toBeGreaterThan(0);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
