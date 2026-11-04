import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, expect, it } from 'vitest';

const cli = fileURLToPath(new URL('./replay.ts', import.meta.url));
let directory = '';
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'neon-pairs-replay-')); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

function run(text: string) {
  const path = join(directory, 'replay.json');
  writeFileSync(path, text);
  return spawnSync(process.execPath, [cli, path], { encoding: 'utf8' });
}

it('prints only the documented final snapshot for a valid replay', () => {
  const result = run(JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [
    { atMs: 0, index: 0 }, { atMs: 0, index: 11 },
  ], endMs: 800 }));
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  expect(JSON.parse(result.stdout)).toEqual({
    version: 1, boardCode: 'np1-4-1', matched: [0, 11], selection: { kind: 'closed' },
    moves: 1, elapsedMs: 800, started: true,
  });
});

it.each(['{', '{}', '{"version":2}', 'null'])('rejects invalid input without stdout: %s', (text) => {
  const result = run(text);
  expect(result.status).not.toBe(0);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain('Invalid replay.');
});

it('rejects missing and unreadable paths without stdout', () => {
  for (const args of [[], [join(directory, 'missing.json')]]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
  }
});
