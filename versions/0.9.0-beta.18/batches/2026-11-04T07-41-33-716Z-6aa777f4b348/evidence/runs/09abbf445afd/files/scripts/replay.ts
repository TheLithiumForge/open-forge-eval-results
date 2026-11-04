import { readFile } from 'node:fs/promises';
import { encodeSnapshot } from '../src/game/snapshot.ts';
import { replayGame } from '../src/game/replay.ts';

const path = process.argv[2];
if (path === undefined || process.argv.length !== 3) {
  process.stderr.write('Usage: npm run --silent replay -- PATH\n');
  process.exitCode = 1;
} else {
  try {
    const text = await readFile(path, 'utf8');
    const state = replayGame(text);
    if (state === null) throw new Error('Invalid replay.');
    process.stdout.write(`${encodeSnapshot(state)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to read replay.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
