import { readFileSync } from 'node:fs';
import { encodeSnapshot } from '../src/game/snapshot.ts';
import { replayGame } from '../src/game/replayGame.ts';

const args = process.argv.slice(2);
const path = args[0];
if (args.length !== 1 || path === undefined) {
  process.stderr.write('Invalid replay file.\n');
  process.exitCode = 1;
} else {
  try {
    const content = readFileSync(path, 'utf8');
    const state = replayGame(content);
    if (state === null) {
      process.stderr.write('Invalid replay file.\n');
      process.exitCode = 1;
    } else {
      process.stdout.write(`${encodeSnapshot(state)}\n`);
    }
  } catch {
    process.stderr.write('Invalid replay file.\n');
    process.exitCode = 1;
  }
}
