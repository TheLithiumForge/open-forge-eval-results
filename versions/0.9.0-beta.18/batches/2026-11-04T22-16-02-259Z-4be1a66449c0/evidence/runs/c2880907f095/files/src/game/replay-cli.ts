import { readFileSync } from 'node:fs';
import { replayGame } from './replay.ts';
import { encodeSnapshot } from './snapshot.ts';

const path = process.argv[2];
if (!path || process.argv.length !== 3) fail();

try {
  const state = replayGame(readFileSync(path, 'utf8'));
  if (!state) fail();
  process.stdout.write(`${encodeSnapshot(state)}\n`);
} catch {
  fail();
}

function fail(): never {
  process.stderr.write('Invalid replay file.\n');
  process.exit(1);
}
