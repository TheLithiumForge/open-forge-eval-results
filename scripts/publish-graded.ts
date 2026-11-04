import { existsSync } from "node:fs";
import { copyFile, lstat, mkdir, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { waitingRuns, type PendingBatch } from "./pending.ts";

/**
 * Copies grades from CI artifacts into published batches. The grading jobs built agent-written code, so nothing in an
 * artifact is trusted. Only batch folders the plan job expected are read, and each is compared with the batch already
 * published here: records and run evidence stay byte for byte, the checks file only grows with checks of the runs
 * that were waiting, new evidence belongs to those checks and is listed in artifacts.json, and nothing is deleted.
 * The repository's validator then checks every record against its schema before anything is pushed.
 */
export const GradedArtifactPrefix = "graded-";
const BatchFolder = /^versions\/[A-Za-z0-9][A-Za-z0-9_.-]*\/batches\/([A-Za-z0-9][A-Za-z0-9_.-]*)$/;
// Grading only ever writes checks, so every other assessment file stays as published.
const ChecksFile = "assessments/checks.jsonl";
const ChecksKind = "checks";
const RecordId = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const AssessmentEvidence = /^evidence\/assessments\/([A-Za-z0-9][A-Za-z0-9_.-]*)\//;
const ArtifactsFile = "artifacts.json";

/** Every plain file under a folder, as paths relative to it. A link, a special file or a dot-named entry stops the copy. */
async function plainFiles(folder: string, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(join(folder, prefix), { withFileTypes: true })) {
    const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    const stats = await lstat(join(folder, path));
    if (entry.name.startsWith(".") || stats.isSymbolicLink() || !(stats.isFile() || stats.isDirectory())) throw new Error(`A graded artifact holds a link, special file or dot-named entry: ${path}`);
    if (stats.isDirectory()) files.push(...await plainFiles(folder, path));
    else files.push(path);
  }
  return files;
}

type Record = { readonly [key: string]: unknown };
const parsed = (text: string): Record[] => text.split("\n").filter((line) => line.trim() !== "").map((line) => {
  const value: unknown = JSON.parse(line);
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("A graded record line isn't an object.");
  return value as Record;
});

/** The files a graded copy of one published batch may add or change, after checking every rule above. */
async function gradedChanges(source: string, target: string, batch: string): Promise<string[]> {
  const graded = await plainFiles(source), published = await plainFiles(target);
  for (const file of published) if (!graded.includes(file)) throw new Error(`A graded batch may not delete ${file}.`);
  const read = async (folder: string, file: string) => readFile(join(folder, ...file.split("/")));
  const runs = new Set(parsed((await read(target, "runs.jsonl")).toString("utf8")).map((run) => run["id"]));
  const waiting = await waitingRuns(target);
  const known = new Map<unknown, unknown>(), added = new Set<string>();
  const changed: string[] = [];
  if (graded.includes(ChecksFile)) {
    const after = await read(source, ChecksFile), before = published.includes(ChecksFile) ? await read(target, ChecksFile) : Buffer.alloc(0);
    if (!after.subarray(0, before.length).equals(before)) throw new Error(`${ChecksFile} may only grow.`);
    for (const record of parsed(before.toString("utf8"))) known.set(record["id"], record["runId"]);
    for (const record of parsed(after.subarray(before.length).toString("utf8"))) {
      const id = record["id"], runId = record["runId"], replaces = record["replacesAssessmentId"];
      const fresh = typeof id === "string" && RecordId.test(id) && !known.has(id) && !added.has(id);
      // A recheck replaces nothing or an earlier check of the same run.
      const chain = replaces === null || replaces === undefined || (known.has(replaces) && known.get(replaces) === runId);
      if (!fresh || record["kind"] !== ChecksKind || record["experimentId"] !== batch || typeof runId !== "string" || !waiting.has(runId) || !runs.has(runId) || !chain) {
        throw new Error(`${ChecksFile} adds a record that isn't a new check of a waiting run in this batch.`);
      }
      added.add(id as string);
    }
    if (after.length > before.length) changed.push(ChecksFile);
  }
  let listed = new Set<string>();
  for (const file of graded.filter((path) => path !== ChecksFile)) {
    const after = await read(source, file), before = published.includes(file) ? await read(target, file) : null;
    if (file === ArtifactsFile && before !== null) {
      const earlier = new Set((JSON.parse(before.toString("utf8")) as unknown[]).map((item) => JSON.stringify(item)));
      const later = JSON.parse(after.toString("utf8")) as Record[];
      const kept = new Set(later.map((item) => JSON.stringify(item)));
      const additions = later.filter((item) => !earlier.has(JSON.stringify(item)));
      if ([...earlier].some((item) => !kept.has(item)) || additions.some((item) => typeof item["assessmentId"] !== "string" || !added.has(item["assessmentId"]))) throw new Error(`${ArtifactsFile} may only add entries of new checks.`);
      listed = new Set(additions.map((item) => `${String(item["assessmentId"])}/${String(item["path"])}`));
      if (!after.equals(before)) changed.push(file);
      continue;
    }
    if (before !== null) {
      if (!after.equals(before)) throw new Error(`A graded batch may not change ${file}.`);
      continue;
    }
    const owner = AssessmentEvidence.exec(file)?.[1];
    if (owner === undefined || !added.has(owner)) throw new Error(`A graded batch may not add ${file}.`);
    changed.push(file);
  }
  // New evidence must be what the new artifact entries name, so nothing rides along unlisted.
  for (const file of changed.filter((path) => AssessmentEvidence.test(path))) {
    if (!listed.has(file.replace(/^evidence\/assessments\//, ""))) throw new Error(`${file} isn't listed in ${ArtifactsFile}.`);
  }
  return changed;
}

/** Adds each expected batch's grades to its published copy and returns the batches graded. A job that failed leaves no artifact and is skipped. */
export async function copyGraded(staging: string, root: string, expected: readonly Pick<PendingBatch, "batch" | "folder">[]): Promise<string[]> {
  const copied: string[] = [];
  for (const item of expected) {
    if (BatchFolder.exec(item.folder)?.[1] !== item.batch) throw new Error(`Unexpected batch folder ${item.folder}.`);
    const source = join(staging, `${GradedArtifactPrefix}${item.batch}`), target = join(root, ...item.folder.split("/"));
    if (!existsSync(source)) continue;
    if (!existsSync(target)) throw new Error(`${item.folder} isn't published here, so it can't take grades.`);
    for (const file of await gradedChanges(source, target, item.batch)) {
      await mkdir(join(target, ...file.split("/").slice(0, -1)), { recursive: true });
      await copyFile(join(source, ...file.split("/")), join(target, ...file.split("/")));
    }
    copied.push(item.batch);
  }
  return copied;
}

if (import.meta.main) {
  const [staging] = process.argv.slice(2);
  // GRADED is the plan job's matrix, computed from this repository before any agent code ran.
  const expected: unknown = JSON.parse(process.env["GRADED"] ?? "[]");
  if (staging === undefined || !Array.isArray(expected)) throw new Error("Name the artifact folder and set GRADED to the plan job's matrix.");
  const copied = await copyGraded(staging, process.cwd(), expected as PendingBatch[]);
  process.stdout.write(`Copied grades for ${copied.length} batch${copied.length === 1 ? "" : "es"}.\n`);
}
