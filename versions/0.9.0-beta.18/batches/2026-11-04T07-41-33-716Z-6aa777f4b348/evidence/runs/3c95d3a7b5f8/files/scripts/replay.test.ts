import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';

const directory = mkdtempSync(join(tmpdir(), 'neon-pairs-replay-'));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

function run(text: string) {
  const path = join(directory, 'replay.json');
  writeFileSync(path, text);
  return spawnSync(process.execPath, ['scripts/replay.ts', path], { encoding: 'utf8' });
}

describe('replay CLI contract', () => {
  it('writes only the final version 1 snapshot on valid input', () => {
    const result = run(JSON.stringify({ version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual({ version: 1, boardCode: 'np1-4-1',
      matched: [0, 11], selection: { kind: 'closed' }, moves: 1, elapsedMs: 800, started: true });
  });

  it.each(['not JSON', '{}'])('rejects invalid input without stdout: %s', (text) => {
    const result = run(text);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Invalid replay.');
  });

  it('rejects missing files and missing arguments without stdout', () => {
    for (const arguments_ of [[], [join(directory, 'missing.json')]]) {
      const result = spawnSync(process.execPath, ['scripts/replay.ts', ...arguments_], { encoding: 'utf8' });
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe('');
      expect(result.stderr.length).toBeGreaterThan(0);
    }
  });
});
