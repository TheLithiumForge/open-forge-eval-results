import { readFileSync } from 'node:fs';
import { replayGame, REPLAY_BYTES } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Usage: npm run --silent replay -- PATH');
  const bytes = readFileSync(path);
  if (bytes.length > REPLAY_BYTES) throw new Error('Replay exceeds the byte limit.');
  const state = replayGame(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!state) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(state)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unable to read replay.'}\n`);
  process.exitCode = 1;
}
