import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { readBatch, RepositoryRoot, RecordFiles, AssessmentKinds } from "./read.ts";
import { plainBytes } from "./files.ts";
import { validateReferences } from "./references.ts";
import type { Artifact, Batch } from "./records.types.ts";
import { EvidenceFolder } from "./catalogue.ts";
import { writeIndex } from "./index.ts";
import { manifestHash } from "./digests.ts";

/** Where an artifact lives inside an evidence folder. */
export function evidenceName(artifact: Artifact): string {
  return artifact.assessmentId === null ? `runs/${artifact.runId}/${artifact.path}` : `assessments/${artifact.assessmentId}/${artifact.path}`;
}

/** Checks every artifact's size and hash, and hands each verified file to keep when given. */
export async function verifyArtifacts(batch: Batch, evidenceRoot?: string, keep?: (name: string, bytes: Buffer) => Promise<void>): Promise<void> {
  if (batch.artifacts.length > 0 && evidenceRoot === undefined) throw new Error("Provide --artifacts with the plain evidence folder.");
  for (const artifact of batch.artifacts) {
    const name = evidenceName(artifact);
    const bytes = await plainBytes(evidenceRoot ?? "", name);
    if (bytes.length !== artifact.bytes || createHash("sha256").update(bytes).digest("hex") !== artifact.sha256) throw new Error(`Artifact checksum mismatch: ${name}`);
    await keep?.(name, bytes);
  }
  for (const run of batch.runs) {
    if (run.artifactHash !== null && manifestHash(batch.artifacts.filter((artifact) => artifact.runId === run.id && artifact.assessmentId === null)) !== run.artifactHash) throw new Error("Run artifact manifest hash mismatch.");
  }
}
/** Stages a batch's records and verified evidence. Staging a batch again replaces it, since saved runs can rebuild this repository. */
export async function stageBatch(source: string, evidenceRoot?: string, destination = RepositoryRoot): Promise<string> {
  const batch = await readBatch(source);
  validateReferences(batch);
  const version = batch.experiment.cliVersion;
  if (version === null || !/^[\w][\w.-]*$/.test(version)) throw new Error("A batch needs a safe CLI version.");
  const target = join(destination, "versions", version, "batches", batch.experiment.id);
  const scratch = join(destination, ".staging", randomUUID()), replaced = join(destination, ".staging", randomUUID());
  await mkdir(join(scratch, "assessments"), { recursive: true });
  const jsonl = (records: readonly unknown[]) => records.map((record) => JSON.stringify(record) + "\n").join("");
  try {
    await verifyArtifacts(batch, evidenceRoot, async (name, bytes) => {
      const path = join(scratch, EvidenceFolder, name);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes);
    });
    await writeFile(join(scratch, RecordFiles.experiment), JSON.stringify(batch.experiment, null, 2) + "\n");
    await writeFile(join(scratch, RecordFiles.setups), jsonl(batch.setups));
    await writeFile(join(scratch, RecordFiles.runs), jsonl(batch.runs));
    await writeFile(join(scratch, RecordFiles.artifacts), JSON.stringify(batch.artifacts, null, 2) + "\n");
    for (const kind of AssessmentKinds) await writeFile(join(scratch, "assessments", `${kind}.jsonl`), jsonl(batch.assessments.filter((assessment) => assessment.kind === kind)));
    await mkdir(join(destination, "versions", version, "batches"), { recursive: true });
    if (existsSync(target)) await rename(target, replaced);
    await rename(scratch, target);
  } finally { await Promise.all([scratch, replaced].map((folder) => rm(folder, { recursive: true, force: true }))); }
  await writeIndex(destination);
  return target;
}
if (import.meta.main) {
  const source = process.argv[2];
  if (source === undefined) throw new Error("Name an exported batch folder.");
  const flag = process.argv.indexOf("--artifacts");
  await stageBatch(source, flag < 0 ? undefined : process.argv[flag + 1]);
  console.log("Staged and verified the batch.");
}
