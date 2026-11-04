import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeSnapshot } from '../src/game/snapshot.ts';

let directory = '';
const root = fileURLToPath(new URL('../', import.meta.url));
beforeAll(() => { directory = mkdtempSync(join(tmpdir(), 'neon-pairs-replay-')); });
afterAll(() => { rmSync(directory, { recursive: true, force: true }); });

function command(arguments_: readonly string[]) {
  return spawnSync('npm', ['run', '--silent', 'replay', '--', ...arguments_], {
    cwd: root, encoding: 'utf8', timeout: 15000,
  });
}

describe('documented replay command', () => {
  it('prints only a final snapshot JSON and exits zero', () => {
    const path = join(directory, 'valid replay.json');
    writeFileSync(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    const result = command([path]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(decodeSnapshot(result.stdout)).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800 });
  });

  it.each(['{', '{"version":2}', 'null'])('rejects invalid content %s with empty stdout', (text) => {
    const path = join(directory, 'invalid.json');
    writeFileSync(path, text);
    const result = command([path]);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Invalid replay.');
  });

  it('rejects unreadable paths and missing or extra arguments', () => {
    for (const arguments_ of [[], [join(directory, 'missing.json')], ['one', 'two']]) {
      const result = command(arguments_);
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe('');
      expect(result.stderr.length).toBeGreaterThan(0);
    }
  });
});
