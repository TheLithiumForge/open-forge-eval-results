import { readFile } from "node:fs/promises";
import { encodeSnapshot } from "../src/game/snapshot.ts";
import { replayGame } from "../src/game/replay.ts";

const path = process.argv[2];
if (!path || process.argv.length !== 3) {
  process.stderr.write("Usage: npm run --silent replay -- PATH\n");
  process.exitCode = 1;
} else {
  try {
    const text = await readFile(path, "utf8");
    const state = replayGame(text);
    if (!state) {
      process.stderr.write("Invalid replay.\n");
      process.exitCode = 1;
    } else {
      process.stdout.write(`${encodeSnapshot(state)}\n`);
    }
  } catch {
    process.stderr.write("Unable to read replay file.\n");
    process.exitCode = 1;
  }
}
