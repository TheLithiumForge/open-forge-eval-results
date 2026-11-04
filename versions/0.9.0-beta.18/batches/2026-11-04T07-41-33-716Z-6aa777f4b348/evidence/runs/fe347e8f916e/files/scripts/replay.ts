import { readFileSync } from 'node:fs';
import { replayGame, REPLAY_LIMIT } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Usage: npm run --silent replay -- PATH');
  const bytes = readFileSync(path);
  if (bytes.length > REPLAY_LIMIT) throw new Error('Invalid replay.');
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const state = replayGame(text);
  if (!state) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(state)}\n`);
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unable to read replay.'}\n`);
  process.exitCode = 1;
}
