import { readFileSync } from 'node:fs';
import { replayGame, encodeSnapshot } from '../src/game/formats.ts';
try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Provide one replay path.');
  const game = replayGame(readFileSync(path, 'utf8'));
  if (!game) throw new Error('Invalid replay.');
  console.log(encodeSnapshot(game));
} catch (error) { console.error(error instanceof Error ? error.message : 'Invalid replay.'); process.exitCode = 1; }
