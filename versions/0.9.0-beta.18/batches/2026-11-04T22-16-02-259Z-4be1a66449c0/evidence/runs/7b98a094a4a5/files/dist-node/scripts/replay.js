import { readFile } from "node:fs/promises";
import { encodeSnapshot } from "../src/game/snapshot.js";
import { replayGame } from "../src/game/replay.js";
const path = process.argv[2];
if (path === undefined)
    fail();
try {
    const input = await readFile(path, "utf8");
    const state = replayGame(input);
    if (state === null)
        fail();
    process.stdout.write(`${encodeSnapshot(state)}\n`);
}
catch {
    fail();
}
function fail() {
    process.stderr.write("Invalid replay input.\n");
    process.exit(1);
}
