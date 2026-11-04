import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';

it('CLI prints only the final snapshot on success and only stderr on failures', () => {
  const directory = mkdtempSync(join(tmpdir(), 'neon-pairs-'));
  const path = join(directory, 'replay.json');
  try {
    writeFileSync(path, '{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}');
    const valid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
    expect(valid.status).toBe(0);
    expect(valid.stderr).toBe('');
    const state = decodeSnapshot(valid.stdout);
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.elapsedMs).toBe(800);
    for (const content of ['{', readFileSync(path, 'utf8').replace('"version":1', '"version":2'),
      ' '.repeat(1048577), new Uint8Array([0xff, 0xfe])]) {
      writeFileSync(path, content);
      const invalid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
      expect(invalid.status).not.toBe(0);
      expect(invalid.stdout).toBe('');
      expect(invalid.stderr.length).toBeGreaterThan(0);
    }
    const missing = spawnSync('node', ['scripts/replay.ts', join(directory, 'missing')], { encoding: 'utf8' });
    expect(missing.status).not.toBe(0);
    expect(missing.stdout).toBe('');
  } finally { rmSync(directory, { recursive: true, force: true }); }
}, 15000);
