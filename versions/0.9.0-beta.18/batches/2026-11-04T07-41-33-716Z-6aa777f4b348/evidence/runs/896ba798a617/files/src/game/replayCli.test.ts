import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { decodeSnapshot } from './snapshot.ts';

const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true }); });
function input(text: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'neon-pairs-replay-'));
  directories.push(directory);
  const path = join(directory, 'replay.json');
  writeFileSync(path, text);
  return path;
}
function command(path?: string) {
  return spawnSync(process.execPath, ['scripts/replay.ts', ...(path ? [path] : [])], { encoding: 'utf8' });
}

describe('replay CLI', () => {
  it('prints only a valid final snapshot to stdout and exits zero', () => {
    const result = command(input(JSON.stringify({ version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 })));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(decodeSnapshot(result.stdout)?.matched).toEqual([0, 11]);
  });
  it('reports invalid files, missing paths and missing files only on stderr', () => {
    for (const path of [input('{'), '/definitely-missing-neon-pairs-replay', undefined]) {
      const result = command(path);
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe('');
      expect(result.stderr.length).toBeGreaterThan(0);
    }
  });
});
