import { join, resolve } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import { existsSync } from "node:fs";
import type { Analysis, Artifact, Assessment, Batch, Experiment, Run, Setup } from "./records.types.ts";
import { plainBytes, folders } from "./files.ts";
import { fileURLToPath } from "node:url";
import { SchemaKinds } from "./schema-values.ts";

export const RepositoryRoot = resolve(process.cwd());
import { RecordFiles, AssessmentKinds, AnalysisFile } from "./catalogue.ts";
export { RecordFiles, AssessmentKinds, AnalysisFile } from "./catalogue.ts";
async function schemaValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const schemaRoot = fileURLToPath(new URL("../schemas/v2/", import.meta.url));
  for (const name of ["common", ...SchemaKinds]) ajv.addSchema(JSON.parse((await plainBytes(schemaRoot, `${name}.json`)).toString()));
  return ajv;
}
let engine: Promise<Ajv2020> | undefined;
async function validator<T>(kind: string): Promise<ValidateFunction<T>> {
  const ajv = await (engine ??= schemaValidator());
  const check = ajv.getSchema<T>(`${kind}.json`);
  if (check === undefined) throw new Error(`Missing ${kind} schema.`);
  return check;
}

function validated<T>(value: unknown, check: ValidateFunction<T>, name: string): T {
  if (!check(value)) throw new Error(`${name}: ${JSON.stringify(check.errors)}`);
  return value;
}
async function lines<T>(root: string, name: string, check: ValidateFunction<T>): Promise<T[]> {
  const input = (await plainBytes(root, name)).toString("utf8");
  return input.split("\n").filter((line) => line.trim() !== "").map((line, index) => validated(JSON.parse(line), check, `${name}:${index + 1}`));
}
export async function readBatch(root: string): Promise<Batch> {
  const validators = { experiment: await validator<Experiment>("experiment"), setup: await validator<Setup>("setup"), run: await validator<Run>("run"), assessment: await validator<Assessment>("assessment"), artifact: await validator<Artifact>("artifact"), analysis: await validator<Analysis>("analysis") };
  const experiment = validated(JSON.parse((await plainBytes(root, RecordFiles.experiment)).toString()), validators.experiment, RecordFiles.experiment);
  const artifacts: unknown = JSON.parse((await plainBytes(root, RecordFiles.artifacts)).toString());
  if (!Array.isArray(artifacts)) throw new Error("artifacts.json must be an array.");
  return { experiment, setups: await lines(root, RecordFiles.setups, validators.setup), runs: await lines(root, RecordFiles.runs, validators.run),
    assessments: (await Promise.all(AssessmentKinds.map(async (kind) => {
      const records = await lines(root, `assessments/${kind}.jsonl`, validators.assessment);
      if (records.some((record) => record.kind !== kind)) throw new Error("Assessment kind differs from its file.");
      return records;
    }))).flat(),
    artifacts: artifacts.map((artifact) => validated(artifact, validators.artifact, RecordFiles.artifacts)),
    analyses: existsSync(join(root, AnalysisFile)) ? await lines(root, AnalysisFile, validators.analysis) : [] };
}

export async function readRepository(root = RepositoryRoot): Promise<Batch[]> {
  const versions = join(root, "versions");
  const result: Batch[] = [];
  for (const version of await folders(versions)) for (const id of await folders(join(versions, version, "batches"))) {
    const batch = await readBatch(join(versions, version, "batches", id));
    if (batch.experiment.id !== id || batch.experiment.cliVersion !== version) throw new Error("The record disagrees with its version or batch folder.");
    result.push(batch);
  }
  return result;
}
