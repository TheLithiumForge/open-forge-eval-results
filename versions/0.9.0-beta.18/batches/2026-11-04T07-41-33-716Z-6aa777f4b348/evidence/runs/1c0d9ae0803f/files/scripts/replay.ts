import { readFile } from "node:fs/promises";
import { replayGame } from "../src/game/replay.ts";
import { encodeSnapshot } from "../src/game/snapshot.ts";

const path = process.argv[2];
if (!path) {
  process.stderr.write("Replay file path is required.\n");
  process.exitCode = 1;
} else {
  try {
    const state = replayGame(await readFile(path, "utf8"));
    if (!state) {
      process.stderr.write("Invalid replay file.\n");
      process.exitCode = 1;
    } else {
      process.stdout.write(`${encodeSnapshot(state)}\n`);
    }
  } catch {
    process.stderr.write("Unable to read replay file.\n");
    process.exitCode = 1;
  }
}
