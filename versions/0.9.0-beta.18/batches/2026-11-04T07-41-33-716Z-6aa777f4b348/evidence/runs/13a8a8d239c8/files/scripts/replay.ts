import { readFileSync } from 'node:fs';
import { encodeSnapshot } from '../src/game/snapshot.ts';
import { replayGame } from '../src/game/replay.ts';

const path = process.argv[2];
if (path === undefined) {
  process.stderr.write('Invalid replay.\n');
  process.exitCode = 1;
} else {
  try {
    const text = readFileSync(path, 'utf8');
    const state = replayGame(text);
    if (state === null) throw new Error('Invalid replay.');
    process.stdout.write(`${encodeSnapshot(state)}\n`);
  } catch {
    process.stderr.write('Invalid replay.\n');
    process.exitCode = 1;
  }
}
