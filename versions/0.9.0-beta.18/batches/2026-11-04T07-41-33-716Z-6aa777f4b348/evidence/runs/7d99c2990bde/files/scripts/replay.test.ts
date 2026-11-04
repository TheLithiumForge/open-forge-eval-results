import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { decodeSnapshot } from '../src/game/snapshot.ts';

const directory = mkdtempSync(join(tmpdir(), 'neon-pairs-replay-'));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe('replay command', () => {
  it('prints only a final valid snapshot for the documented replay', () => {
    const path = join(directory, 'valid.json');
    writeFileSync(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    const result = spawnSync(process.execPath, ['scripts/replay.ts', path], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(decodeSnapshot(result.stdout)?.matched).toEqual([0, 11]);
    expect(decodeSnapshot(result.stdout)?.elapsedMs).toBe(800);
  });

  it('fails invalid and unreadable input without stdout', () => {
    const path = join(directory, 'invalid.json');
    writeFileSync(path, '{}');
    for (const args of [[path], [join(directory, 'missing.json')], []]) {
      const result = spawnSync(process.execPath, ['scripts/replay.ts', ...args], { encoding: 'utf8' });
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe('');
      expect(result.stderr.length).toBeGreaterThan(0);
    }
  });
});
