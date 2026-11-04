import { readFile } from 'node:fs/promises';

const path = process.argv[2];
if (!path) {
  process.stderr.write('Replay file path is required.\n');
  process.exitCode = 1;
} else {
  try {
    const input = await readFile(path, 'utf8');
    const { replayGame } = await import('../src/game/replay.ts');
    const { encodeSnapshot } = await import('../src/game/snapshot.ts');
    const result = replayGame(input);
    if (!result) throw new Error('Invalid replay file.');
    process.stdout.write(`${encodeSnapshot(result)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read replay file.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
