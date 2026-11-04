import { readFile } from "node:fs/promises";
import { encodeSnapshot } from "../src/game/snapshot.ts";
import { replayGame } from "../src/game/replay.ts";

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) {
    process.stderr.write("Usage: npm run --silent replay -- PATH\n");
    process.exitCode = 1;
    return;
  }
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    process.stderr.write("Could not read replay file.\n");
    process.exitCode = 1;
    return;
  }
  const game = replayGame(text);
  if (!game) {
    process.stderr.write("Invalid replay.\n");
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${encodeSnapshot(game)}\n`);
}

await main();
