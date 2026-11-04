import { existsSync } from "node:fs";
import { copyFile, lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { waitingRuns, type PendingRun } from "./pending.ts";

/**
 * Merges grades from CI artifacts into published batches. Each grading job checks one run and uploads only what a
 * check can add: the checks file, artifacts.json and the checks' evidence. The jobs built agent-written code, so
 * nothing in an artifact is trusted. Only the runs the plan job expected are read, and each artifact is compared with
 * the batch already published here: the checks file only grows with checks of that artifact's own waiting run, new
 * evidence belongs to those checks and is listed in artifacts.json, and any other file refuses the artifact. The merge
 * only appends, so published records and evidence stay byte for byte. The repository's validator checks every record
 * before anything is pushed.
 */
export const GradedArtifactPrefix = "graded-";
const BatchFolder = /^versions\/[A-Za-z0-9][A-Za-z0-9_.-]*\/batches\/([A-Za-z0-9][A-Za-z0-9_.-]*)$/;
// Grading only ever writes checks, so every other assessment file stays as published.
const ChecksFile = "assessments/checks.jsonl";
const ChecksKind = "checks";
const RecordId = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const AssessmentEvidence = /^evidence\/assessments\/([A-Za-z0-9][A-Za-z0-9_.-]*)\//;
const ArtifactsFile = "artifacts.json";

/** The artifact a grading job uploads for one run of one batch. */
export function gradedArtifact(item: Pick<PendingRun, "batch" | "run">): string {
  return `${GradedArtifactPrefix}${item.batch}-${item.run}`;
}

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

type Entry = { readonly [key: string]: unknown };
const parsed = (text: string): Entry[] => text.split("\n").filter((line) => line.trim() !== "").map((line) => {
  const value: unknown = JSON.parse(line);
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("A graded record line isn't an object.");
  return value as Entry;
});

/** What one run's graded artifact adds to its published batch. */
interface Grades { readonly lines: string; readonly ids: readonly string[]; readonly evidence: readonly string[]; readonly artifacts: readonly Entry[] }

/** Checks one run's artifact against the published batch and returns what it adds, refusing anything else. */
async function runGrades(source: string, target: string, batch: string, run: string): Promise<Grades> {
  const graded = await plainFiles(source);
  const read = async (folder: string, file: string) => readFile(join(folder, ...file.split("/")));
  const runs = new Set(parsed((await read(target, "runs.jsonl")).toString("utf8")).map((entry) => entry["id"]));
  if (!(await waitingRuns(target)).has(run) || !runs.has(run)) throw new Error(`Run ${run} isn't waiting in ${batch}.`);
  const known = new Map<unknown, unknown>(), added: string[] = [];
  let lines = "";
  if (graded.includes(ChecksFile)) {
    const after = await read(source, ChecksFile), before = existsSync(join(target, ...ChecksFile.split("/"))) ? await read(target, ChecksFile) : Buffer.alloc(0);
    if (!after.subarray(0, before.length).equals(before)) throw new Error(`${ChecksFile} may only grow.`);
    for (const entry of parsed(before.toString("utf8"))) known.set(entry["id"], entry["runId"]);
    lines = after.subarray(before.length).toString("utf8");
    for (const entry of parsed(lines)) {
      const id = entry["id"], replaces = entry["replacesAssessmentId"];
      const fresh = typeof id === "string" && RecordId.test(id) && !known.has(id) && !added.includes(id);
      // A recheck replaces nothing or an earlier check of the same run.
      const chain = replaces === null || replaces === undefined || (known.has(replaces) && known.get(replaces) === run);
      if (!fresh || entry["kind"] !== ChecksKind || entry["experimentId"] !== batch || entry["runId"] !== run || !chain) {
        throw new Error(`${ChecksFile} adds a record that isn't a new check of run ${run} in ${batch}.`);
      }
      added.push(id as string);
    }
  }
  let artifacts: Entry[] = [];
  const evidence: string[] = [];
  for (const file of graded.filter((path) => path !== ChecksFile)) {
    if (file === ArtifactsFile) {
      const earlier = new Set((JSON.parse((await read(target, file)).toString("utf8")) as unknown[]).map((item) => JSON.stringify(item)));
      const later = JSON.parse((await read(source, file)).toString("utf8")) as Entry[];
      const kept = new Set(later.map((item) => JSON.stringify(item)));
      artifacts = later.filter((item) => !earlier.has(JSON.stringify(item)));
      if ([...earlier].some((item) => !kept.has(item)) || artifacts.some((item) => typeof item["assessmentId"] !== "string" || !added.includes(item["assessmentId"]))) {
        throw new Error(`${ArtifactsFile} may only add entries of new checks.`);
      }
      continue;
    }
    const owner = AssessmentEvidence.exec(file)?.[1];
    if (owner === undefined || !added.includes(owner)) throw new Error(`A graded batch may not add ${file}.`);
    evidence.push(file);
  }
  // New evidence must be what the new artifact entries name, so nothing rides along unlisted.
  const listed = new Set(artifacts.map((item) => `${String(item["assessmentId"])}/${String(item["path"])}`));
  for (const file of evidence) if (!listed.has(file.replace(/^evidence\/assessments\//, ""))) throw new Error(`${file} isn't listed in ${ArtifactsFile}.`);
  return { lines, ids: added, evidence, artifacts };
}

/**
 * Adds every expected run's grades to its published batch and returns the runs graded, as batch/run. A job that
 * failed leaves no artifact, so its run is skipped and stays waiting.
 */
export async function copyGraded(staging: string, root: string, expected: readonly Pick<PendingRun, "batch" | "folder" | "run">[]): Promise<string[]> {
  const batches = new Map<string, Pick<PendingRun, "batch" | "folder" | "run">[]>();
  for (const item of expected) {
    if (BatchFolder.exec(item.folder)?.[1] !== item.batch || !RecordId.test(item.run)) throw new Error(`Unexpected batch folder or run: ${item.folder} ${item.run}.`);
    batches.set(item.folder, [...batches.get(item.folder) ?? [], item]);
  }
  const copied: string[] = [];
  for (const [folder, items] of batches) {
    const target = join(root, ...folder.split("/"));
    const graded: { readonly source: string; readonly item: Pick<PendingRun, "batch" | "run">; readonly grades: Grades }[] = [];
    for (const item of items) {
      const source = join(staging, gradedArtifact(item));
      if (!existsSync(source)) continue;
      if (!existsSync(target)) throw new Error(`${folder} isn't published here, so it can't take grades.`);
      graded.push({ source, item, grades: await runGrades(source, target, item.batch, item.run) });
    }
    if (graded.length === 0) continue;
    const ids = graded.flatMap((entry) => entry.grades.ids);
    if (new Set(ids).size !== ids.length) throw new Error(`Two graded runs of ${folder} add the same check.`);
    // Every artifact started from the same published batch, so their additions merge onto it in turn.
    const checks = join(target, ...ChecksFile.split("/"));
    const before = existsSync(checks) ? await readFile(checks, "utf8") : "";
    await mkdir(join(target, "assessments"), { recursive: true });
    await writeFile(checks, before + graded.map((entry) => entry.grades.lines).join(""));
    const artifacts = join(target, ArtifactsFile);
    const listed = JSON.parse(await readFile(artifacts, "utf8")) as Entry[];
    await writeFile(artifacts, `${JSON.stringify([...listed, ...graded.flatMap((entry) => entry.grades.artifacts)], null, 2)}\n`);
    for (const { source, grades } of graded) {
      for (const file of grades.evidence) {
        await mkdir(join(target, ...file.split("/").slice(0, -1)), { recursive: true });
        await copyFile(join(source, ...file.split("/")), join(target, ...file.split("/")));
      }
    }
    copied.push(...graded.map((entry) => `${entry.item.batch}/${entry.item.run}`));
  }
  return copied;
}

if (import.meta.main) {
  const [staging] = process.argv.slice(2);
  // GRADED is the plan job's matrix, computed from this repository before any agent code ran.
  const expected: unknown = JSON.parse(process.env["GRADED"] ?? "[]");
  if (staging === undefined || !Array.isArray(expected)) throw new Error("Name the artifact folder and set GRADED to the plan job's matrix.");
  const copied = await copyGraded(staging, process.cwd(), expected as PendingRun[]);
  process.stdout.write(`Copied grades for ${copied.length} run${copied.length === 1 ? "" : "s"}.\n`);
}
