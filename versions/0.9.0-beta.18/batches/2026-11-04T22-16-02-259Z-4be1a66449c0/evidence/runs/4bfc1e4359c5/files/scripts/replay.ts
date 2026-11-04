import { readFile } from "node:fs/promises";
import { replayGame } from "../src/game/replay.ts";
import { encodeSnapshot } from "../src/game/snapshot.ts";

const path = process.argv[2];
if (!path || process.argv.length !== 3) {
  process.stderr.write("Usage: npm run --silent replay -- PATH\n");
  process.exitCode = 1;
} else {
  try {
    const replayText = await readFile(path, "utf8");
    const result = replayGame(replayText);
    if (!result) {
      process.stderr.write("Invalid replay file.\n");
      process.exitCode = 1;
    } else {
      process.stdout.write(`${encodeSnapshot(result)}\n`);
    }
  } catch {
    process.stderr.write("Could not read replay file.\n");
    process.exitCode = 1;
  }
}
