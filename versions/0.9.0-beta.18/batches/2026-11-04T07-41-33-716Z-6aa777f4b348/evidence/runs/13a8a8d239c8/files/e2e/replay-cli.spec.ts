import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { isRecord, parseJson } from './helpers.ts';

test('runs the documented replay command with stdout and exit-code behavior', () => {
  const folder = mkdtempSync(join(tmpdir(), 'neon-pairs-cli-'));
  const path = join(folder, 'example.json');
  try {
    writeFileSync(path, '{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}');
    const valid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
    const snapshot = parseJson(valid.stdout.trim());
    expect(valid.status).toBe(0);
    expect(valid.stderr).toBe('');
    expect(isRecord(snapshot) ? snapshot : null).toMatchObject({
      version: 1, boardCode: 'np1-4-1', matched: [0, 11], selection: { kind: 'closed' },
      moves: 1, elapsedMs: 800, started: true,
    });

    writeFileSync(path, '{broken');
    const invalid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
    expect(invalid.status).not.toBe(0);
    expect(invalid.stdout).toBe('');
    expect(invalid.stderr).toContain('Invalid replay.');
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
