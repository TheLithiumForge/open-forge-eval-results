import { readFile } from 'node:fs/promises';
import { replayGame } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

const args = process.argv.slice(2);
const path = args[0];
if (args.length !== 1 || path === undefined) {
  process.stderr.write('Usage: npm run --silent replay -- PATH\n');
  process.exitCode = 1;
} else {
  try {
    const text = await readFile(path, 'utf8');
    const state = replayGame(text);
    if (state === null) {
      process.stderr.write('Invalid replay.\n');
      process.exitCode = 1;
    } else {
      process.stdout.write(`${encodeSnapshot(state)}\n`);
    }
  } catch {
    process.stderr.write('Unable to read replay.\n');
    process.exitCode = 1;
  }
}
