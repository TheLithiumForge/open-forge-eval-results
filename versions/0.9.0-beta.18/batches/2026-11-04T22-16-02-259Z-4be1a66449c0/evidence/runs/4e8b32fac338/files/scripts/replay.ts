import { readFileSync } from 'node:fs';
import { replayGame } from '../src/game/replay';
import { encodeSnapshot } from '../src/game/snapshot';
try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Expected a replay file path');
  const game = replayGame(readFileSync(path, 'utf8'));
  if (!game) throw new Error('Invalid replay');
  process.stdout.write(`${encodeSnapshot(game)}\n`);
} catch (error) { console.error(error instanceof Error ? error.message : 'Invalid replay'); process.exitCode = 1; }
