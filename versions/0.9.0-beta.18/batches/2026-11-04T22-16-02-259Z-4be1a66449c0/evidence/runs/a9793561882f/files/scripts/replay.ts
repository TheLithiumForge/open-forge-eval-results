import { readFileSync } from 'node:fs';
import { replayGame } from '../src/game/replay.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';
try {
  if (process.argv.length !== 3 || !process.argv[2]) throw new Error('Provide a replay file path.');
  const state = replayGame(readFileSync(process.argv[2], 'utf8'));
  if (!state) throw new Error('Invalid replay.');
  process.stdout.write(encodeSnapshot(state) + '\n');
} catch (error: unknown) { console.error(error instanceof Error ? error.message : 'Invalid replay.'); process.exitCode = 1; }
