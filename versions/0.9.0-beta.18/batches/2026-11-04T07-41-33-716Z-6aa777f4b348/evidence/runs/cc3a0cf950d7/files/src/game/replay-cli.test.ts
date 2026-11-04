import { expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

it('prints only a snapshot for valid files and uses stderr with nonzero exit for invalid files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'neon-replay-'));
  try {
    const path = join(directory, 'replay.json');
    writeFileSync(path, JSON.stringify({ version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    const valid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
    expect(valid.status).toBe(0);
    expect(valid.stderr).toBe('');
    const result: unknown = JSON.parse(valid.stdout);
    expect(result).toMatchObject({ version: 1, matched: [0, 11], moves: 1, elapsedMs: 800 });
    writeFileSync(path, '{}');
    const invalid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
    expect(invalid.status).not.toBe(0);
    expect(invalid.stdout).toBe('');
    expect(invalid.stderr).toContain('Invalid replay.');
    const missing = spawnSync('npm', ['run', '--silent', 'replay', '--', join(directory, 'missing')], { encoding: 'utf8' });
    expect(missing.status).not.toBe(0); expect(missing.stdout).toBe('');
  } finally { rmSync(directory, { recursive: true, force: true }); }
}, 20000);
