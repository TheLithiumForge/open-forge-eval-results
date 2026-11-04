import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, test } from '@playwright/test';

test('replay CLI prints only a final snapshot on valid input and rejects malformed input', () => {
  const directory = mkdtempSync(join(tmpdir(), 'neon-pairs-'));
  try {
    const validPath = join(directory, 'match.json');
    writeFileSync(validPath, JSON.stringify({
      version: 1,
      boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }],
      endMs: 800
    }));
    const valid = runReplay(validPath);
    expect(valid.status).toBe(0);
    expect(valid.stderr).toBe('');
    const result: unknown = JSON.parse(valid.stdout);
    expect(result).toMatchObject({
      version: 1,
      boardCode: 'np1-4-1',
      matched: [0, 11],
      selection: { kind: 'closed' },
      moves: 1,
      elapsedMs: 800,
      started: true
    });
    expect(valid.stdout.trimStart()[0]).toBe('{');

    const invalidPath = join(directory, 'invalid.json');
    writeFileSync(invalidPath, '{broken');
    const invalid = runReplay(invalidPath);
    expect(invalid.status).not.toBe(0);
    expect(invalid.stdout).toBe('');
    expect(invalid.stderr.length).toBeGreaterThan(0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function runReplay(path: string) {
  return spawnSync('npm', ['run', '--silent', 'replay', '--', path], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
}
