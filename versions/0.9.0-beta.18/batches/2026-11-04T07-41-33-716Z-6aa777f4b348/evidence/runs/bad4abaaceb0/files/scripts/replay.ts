import { readFile } from "node:fs/promises";
import { encodeSnapshot } from "../src/game/snapshot.ts";
import { replayGame } from "../src/game/replay.ts";

async function main(): Promise<void> {
  const paths = process.argv.slice(2);
  if (paths.length !== 1) throw new Error("Provide one replay file path.");
  const input = await readFile(paths[0] ?? "", "utf8");
  const state = replayGame(input);
  if (!state) throw new Error("Invalid replay.");
  process.stdout.write(`${encodeSnapshot(state)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unable to read replay.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
