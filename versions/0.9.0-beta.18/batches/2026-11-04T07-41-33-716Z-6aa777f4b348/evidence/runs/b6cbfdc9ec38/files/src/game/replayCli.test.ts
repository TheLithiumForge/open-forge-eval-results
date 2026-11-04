import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = join(root, 'scripts/replay.ts');
const example = JSON.stringify({
  version: 1, boardCode: 'np1-4-1',
  actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800,
});

describe('replay command', () => {
  it('prints only a final snapshot for valid input and no stdout for invalid input', () => {
    const directory = mkdtempSync(join(tmpdir(), 'neon-pairs-cli-'));
    const path = join(directory, 'replay.json');
    try {
      writeFileSync(path, example);
      const result: unknown = JSON.parse(execFileSync('npm', ['run', '--silent', 'replay', '--', path], {
        cwd: root, encoding: 'utf8',
      }));
      expect(result).toEqual({
        version: 1, boardCode: 'np1-4-1', matched: [0, 11], selection: { kind: 'closed' },
        moves: 1, elapsedMs: 800, started: true,
      });
      for (const invalid of ['{', example.replace('"version":1', '"version":2')]) {
        writeFileSync(path, invalid);
        const failure = spawnSync(process.execPath, [cli, path], { cwd: root, encoding: 'utf8' });
        expect(failure.status).not.toBe(0);
        expect(failure.stdout).toBe('');
        expect(failure.stderr).not.toBe('');
      }
      const missing = spawnSync(process.execPath, [cli, join(directory, 'missing.json')], {
        cwd: root, encoding: 'utf8',
      });
      expect(missing.status).not.toBe(0);
      expect(missing.stdout).toBe('');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

});
