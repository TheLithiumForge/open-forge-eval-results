import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { test } from "node:test";
import { fixture, FixtureVersion, writeBatch } from "./test-fixtures.ts";
import { writeIndex } from "./index.ts";
import { validateRepository } from "./validate.ts";
test("catalogue validates empty and filled repositories and rejects stale metadata", async () => {
  await mkdir(resolve(".staging"), { recursive: true });
  const root = await mkdtemp(join(resolve(".staging"), "index-"));
  try {
    await mkdir(join(root, "versions"));
    await writeIndex(root);
    assert.equal(await validateRepository(root), 0);
    const batch = fixture();
    await writeBatch(join(root, "versions", FixtureVersion, "batches", batch.experiment.id), batch);
    await assert.rejects(validateRepository(root), /index.json differs/);
    await writeIndex(root);
    assert.equal(await validateRepository(root), 1);
    const index: unknown = JSON.parse(await readFile(join(root, "index.json"), "utf8"));
    assert.ok(typeof index === "object" && index !== null);
    await writeFile(join(root, "index.json"), JSON.stringify({ schemaVersion: 1, batches: [{ path: "../escape" }] }));
    await assert.rejects(validateRepository(root), /Invalid results data/);
  }
  finally {
    await rm(root, { recursive: true, force: true });
  }
});
