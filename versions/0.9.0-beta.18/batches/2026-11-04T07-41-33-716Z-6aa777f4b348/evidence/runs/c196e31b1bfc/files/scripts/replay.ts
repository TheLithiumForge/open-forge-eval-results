import { readFileSync } from "node:fs";
import { encodeSnapshot } from "../src/game/snapshot.ts";
import { replayGame } from "../src/game/replay.ts";

const path = process.argv[2];
try {
  if (path === undefined) throw new Error("missing path");
  const game = replayGame(readFileSync(path, "utf8"));
  if (game === null) throw new Error("invalid replay");
  process.stdout.write(`${encodeSnapshot(game)}\n`);
} catch {
  process.stderr.write("Invalid replay.\n");
  process.exitCode = 1;
}
