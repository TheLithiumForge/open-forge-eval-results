import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

it('prints only a final snapshot on success and only stderr on invalid input', () => {
  const directory = mkdtempSync(join(tmpdir(), 'neon-replay-'));
  const path = join(directory, 'replay.json');
  try {
    writeFileSync(path, '{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}');
    const valid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
    expect(valid.status).toBe(0);
    expect(valid.stderr).toBe('');
    expect(JSON.parse(valid.stdout)).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800 });
    writeFileSync(path, '{}');
    const invalid = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
    expect(invalid.status).not.toBe(0);
    expect(invalid.stdout).toBe('');
    expect(invalid.stderr).toContain('Invalid replay.');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
