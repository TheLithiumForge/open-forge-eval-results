import { readFileSync } from 'node:fs';
import { replayGame, REPLAY_BYTE_LIMIT } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Usage: npm run --silent replay -- PATH');
  const buffer = readFileSync(path);
  if (buffer.byteLength > REPLAY_BYTE_LIMIT) throw new Error('Replay exceeds the byte limit.');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  const result = replayGame(text);
  if (!result) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(result)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unable to read replay.'}\n`);
  process.exitCode = 1;
}
