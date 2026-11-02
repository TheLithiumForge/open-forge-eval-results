import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readBatch, RepositoryRoot, RecordFiles, AssessmentKinds } from "./read.ts";
import { plainBytes } from "./files.ts";
import { validateReferences } from "./references.ts";
import type { Batch } from "./records.types.ts";
import { writeIndex } from "./index.ts";
import { manifestHash } from "./digests.ts";

export async function verifyArtifacts(batch: Batch, evidenceRoot?: string): Promise<void> {
  if (batch.artifacts.length > 0 && evidenceRoot === undefined) throw new Error("Provide --artifacts with the plain evidence folder.");
  for (const artifact of batch.artifacts) {
    const name = artifact.assessmentId === null ? `runs/${artifact.runId}/${artifact.path}` : `assessments/${artifact.assessmentId}/${artifact.path}`;
    const bytes = await plainBytes(evidenceRoot ?? "", name);
    if (bytes.length !== artifact.bytes || createHash("sha256").update(bytes).digest("hex") !== artifact.sha256) throw new Error("Artifact checksum mismatch.");
  }
  for (const run of batch.runs) {
    if (run.artifactHash !== null && manifestHash(batch.artifacts.filter((artifact) => artifact.runId === run.id && artifact.assessmentId === null)) !== run.artifactHash) throw new Error("Run artifact manifest hash mismatch.");
  }
}
export async function stageBatch(source: string, evidenceRoot?: string, destination = RepositoryRoot): Promise<string> {
  const batch = await readBatch(source);
  validateReferences(batch);
  await verifyArtifacts(batch, evidenceRoot);
  const version = batch.experiment.cliVersion;
  if (version === null || !/^[\w][\w.-]*$/.test(version)) throw new Error("A batch needs a safe CLI version.");
  const target = join(destination, "versions", version, "batches", batch.experiment.id);
  if (existsSync(target)) throw new Error("A staged batch is immutable.");
  const scratch = join(destination, ".staging", randomUUID());
  await mkdir(join(scratch, "assessments"), { recursive: true });
  const jsonl = (records: readonly unknown[]) => records.map((record) => JSON.stringify(record) + "\n").join("");
  try {
    await writeFile(join(scratch, RecordFiles.experiment), JSON.stringify(batch.experiment, null, 2) + "\n");
    await writeFile(join(scratch, RecordFiles.setups), jsonl(batch.setups));
    await writeFile(join(scratch, RecordFiles.runs), jsonl(batch.runs));
    await writeFile(join(scratch, RecordFiles.artifacts), JSON.stringify(batch.artifacts, null, 2) + "\n");
    for (const kind of AssessmentKinds) await writeFile(join(scratch, "assessments", `${kind}.jsonl`), jsonl(batch.assessments.filter((assessment) => assessment.kind === kind)));
    await mkdir(join(destination, "versions", version, "batches"), { recursive: true });
    await rename(scratch, target);
  } finally { await rm(scratch, { recursive: true, force: true }); }
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
