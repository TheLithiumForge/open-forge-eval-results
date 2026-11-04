import { readFile } from 'node:fs/promises';
import { replayGame, MAX_REPLAY_BYTES } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Usage: npm run --silent replay -- PATH');
  const bytes = await readFile(path);
  if (bytes.byteLength > MAX_REPLAY_BYTES) throw new Error('Replay exceeds the UTF-8 byte limit.');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const state = replayGame(text);
  if (!state) throw new Error('Invalid replay.');
  process.stdout.write(`${encodeSnapshot(state)}\n`);
}

try { await main(); } catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unable to read replay.'}\n`);
  process.exitCode = 1;
}
