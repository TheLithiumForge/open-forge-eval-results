import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { EvidenceFolder } from "./catalogue.ts";
import { validateRepository } from "./validate.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fixture, FixtureVersion, writeBatch } from "./test-fixtures.ts";
import { readBatch, readRepository, RecordFiles } from "./read.ts";
import { validateReferences } from "./references.ts";
import { stageBatch, verifyArtifacts } from "./stage.ts";
import { manifestHash } from "./digests.ts";

test("schema validation and references accept a complete batch and reject a broken run", async () => {
  const root = await mkdtemp(join(tmpdir(), "results-records-"));
  try {
    const data = fixture();
    await writeBatch(root, data);
    validateReferences(await readBatch(root));
    assert.throws(() => validateReferences({ ...data, runs: [] }));
    await writeFile(join(root, RecordFiles.runs), JSON.stringify({ ...data.runs[0], schemaVersion: 1 }) + "\n");
    await assert.rejects(readBatch(root));
    assert.throws(() => validateReferences({ ...data, artifacts: [{ schemaVersion: 2, runId: "unknown", assessmentId: null, path: "evidence.txt", bytes: 0, sha256: "" }] }));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("staging verifies artifact bytes, copies them beside the records, refuses changes and replaces a restaged batch", async () => {
  const root = await mkdtemp(join(tmpdir(), "results-stage-"));
  try {
    const source = join(root, "exported");
    const destination = join(root, "repository");
    const evidence = join(root, "evidence");
    const data = fixture();
    const run = data.runs[0];
    if (run === undefined) throw new Error("Missing fixture attempt.");
    const bytes = Buffer.from("authored evidence");
    const artifact = { schemaVersion: 2, runId: run.id, assessmentId: null, path: "evidence.txt", bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") } as const;
    const batch = { ...data, runs: [{ ...run, artifactHash: manifestHash([artifact]) }], artifacts: [artifact] };
    await writeBatch(source, batch);
    await mkdir(join(evidence, "runs", run.id), { recursive: true });
    await writeFile(join(evidence, "runs", run.id, artifact.path), bytes);
    await assert.rejects(verifyArtifacts(batch));
    await assert.rejects(verifyArtifacts({ ...batch, runs: [{ ...run, artifactHash: "invalid" }] }, evidence));
    const staged = await stageBatch(source, evidence, destination);
    assert.equal(staged, join(destination, "versions", FixtureVersion, "batches", data.experiment.id));
    assert.equal((await readRepository(destination)).length, 1);
    assert.deepEqual(await readFile(join(staged, EvidenceFolder, "runs", run.id, artifact.path)), bytes);
    assert.equal(await validateRepository(destination), 1);
    assert.equal(await stageBatch(source, evidence, destination), staged);
    assert.equal((await readRepository(destination)).length, 1);
    await writeFile(join(staged, EvidenceFolder, "runs", run.id, artifact.path), "changed evidence");
    await assert.rejects(validateRepository(destination));
    await writeFile(join(evidence, "runs", run.id, artifact.path), "changed evidence");
    await assert.rejects(verifyArtifacts(batch, evidence));
    await assert.rejects(stageBatch(source, evidence, destination));
  } finally { await rm(root, { recursive: true, force: true }); }
});
