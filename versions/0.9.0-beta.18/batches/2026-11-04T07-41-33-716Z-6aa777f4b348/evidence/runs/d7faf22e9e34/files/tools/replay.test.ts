import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';

const directory = mkdtempSync(join(tmpdir(), 'neon-pairs-replay-'));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

function run(args: readonly string[]) {
  return spawnSync('npm', ['run', '--silent', 'replay', '--', ...args],
    { cwd: process.cwd(), encoding: 'utf8' });
}

describe('documented replay command', () => {
  it('prints only the final snapshot JSON and exits zero for valid input', () => {
    const path = join(directory, 'valid.json');
    writeFileSync(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    const result = run([path]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual({ version: 1, boardCode: 'np1-4-1',
      matched: [0, 11], selection: { kind: 'closed' }, moves: 1, elapsedMs: 800, started: true });
  });

  it('prints nothing to stdout and reports invalid input on stderr', () => {
    const path = join(directory, 'invalid.json');
    writeFileSync(path, '{"version":2}');
    const result = run([path]);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Invalid replay.');
  });

  it('handles unreadable paths and invalid arguments without stdout', () => {
    for (const args of [[], [join(directory, 'missing.json')], ['one', 'two']]) {
      const result = run(args);
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe('');
      expect(result.stderr.length).toBeGreaterThan(0);
    }
  });
});
