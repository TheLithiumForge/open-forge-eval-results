import { readFile } from 'node:fs/promises';
import { replayGame } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

try {
  const [path, ...extra] = process.argv.slice(2);
  if (path === undefined || extra.length !== 0) throw new Error('Expected one replay file path.');
  const state = replayGame(await readFile(path, 'utf8'));
  if (state === null) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(state)}\n`);
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unable to read replay.'}\n`);
  process.exitCode = 1;
}
