import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const directory = mkdtempSync(join(tmpdir(), 'neon-pairs-replay-'));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe('documented replay command (C14)', () => {
  it('prints only the final snapshot JSON on stdout', () => {
    const path = join(directory, 'valid.json');
    writeFileSync(path, JSON.stringify({
      version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800,
    }));
    const output = execFileSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
    expect(JSON.parse(output)).toEqual({
      version: 1, boardCode: 'np1-4-1', matched: [0, 11], selection: { kind: 'closed' },
      moves: 1, elapsedMs: 800, started: true,
    });
  });
  it.each(['invalid.json', 'missing.json'])('rejects %s with only stderr and nonzero exit', name => {
    const path = join(directory, name);
    if (name === 'invalid.json') writeFileSync(path, '{}');
    const result = spawnSync('npm', ['run', '--silent', 'replay', '--', path], { encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
  });
});
