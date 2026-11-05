import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { commonDefinitions, object, ref, nullable, text, list } from "./schema-definitions.ts";
import { SchemaVersion, SchemaKinds, WorkModes } from "./schema-values.ts";

const version = { schemaVersion: { const: SchemaVersion } };
const nullableText = nullable(text);
const strings = list(text);
const choice = ref("choice");
const digest = ref("digest");
const file = object({ path: ref("relativePath"), bytes: ref("count"), sha256: digest });
const schemas = {
  experiment: object({ ...version, reference: ref("reference"), chain: ref("chain"), id: ref("id"), suite: text, fingerprint: text, intentEdited: { type: "boolean" }, config: ref("config"),
    createdAt: text, status: { enum: ["preparing", "running", "paused", "done", "failed"] }, runs: strings, versions: { type: "object", additionalProperties: text }, revealed: { type: "boolean" },
    legacy: { type: "boolean" }, cliVersion: nullableText, candidateLabel: nullableText, capturedAt: nullableText,
    fingerprints: object(Object.fromEntries(["cliPackage", "benchmarkInputs", "setupContent", "checks", "rubric", "harnessSource", "tooling", "requestedModels", "reportedModels", "schema"].map((key) => [key, nullable(digest)]))),
    pinnedTools: { type: "object", additionalProperties: text }, imageDigests: { type: "object", additionalProperties: nullableText }, requestedModels: list(choice), reportedModels: nullable(list(nullableText)) }, ["reference", "chain"]),
  setup: object({ ...version, workMode: { enum: WorkModes }, id: ref("id"), experimentId: ref("id"), label: text, commands: list(strings), contentHash: nullable(digest), files: list(file) }, ["workMode"]),
  run: object({ ...version, implementer: { const: "reference" }, reference: ref("reference"), parentRunId: nullable(ref("id")), id: ref("id"), batchId: ref("id"), setup: text, agent: choice, repeat: { type: "integer", minimum: 1 }, pipelineStatus: { enum: ["pending", "agent", "building", "checking", "judging", "done", "failed", "limited"] },
    functionalResult: nullable(ref("functional")), failureKind: nullable({ enum: ["infrastructure", "attempt", "grading"] }), replacesRunId: nullableText, replacementReason: nullableText, artifactHash: nullable(digest),
    requestedModel: nullableText, reportedModel: nullableText, error: nullableText, startedAt: nullableText, finishedAt: nullableText, agentSeconds: nullable(ref("number")), finalMessage: nullableText,
    questions: list(object({ question: text, answer: text })), telemetry: nullable(ref("telemetry")), build: nullable(ref("build")), performance: nullable(ref("performance")), shots: strings }, ["implementer", "reference", "parentRunId"]),
  assessment: { oneOf: [
    object({ ...version, ...commonDefinitions.assessment, kind: { const: "checks" }, runId: ref("id"), outcomes: list(ref("outcome")), selection: ref("selection"), build: nullable(ref("build")), performance: nullable(ref("performance")), shots: strings }),
    object({ ...version, ...commonDefinitions.assessment, kind: { const: "judge" }, ballots: ref("count"), runId: ref("id"), answers: list(ref("answer")), requestedModel: nullable(choice), reportedModel: nullableText, scores: list(ref("judgeScore")), findings: list(ref("judgeFinding")), summaries: strings, staleDocs: list(ref("judgeStalePage")) }, ["ballots", "scores", "findings", "summaries", "staleDocs"]),
    object({ ...version, ...commonDefinitions.assessment, kind: { const: "pick" }, left: object({ runId: ref("id"), artifactHash: nullable(digest), side: { const: "left" } }),
      right: object({ runId: ref("id"), artifactHash: nullable(digest), side: { const: "right" } }), winner: { enum: ["left", "right", "tie"] }, revealed: nullable({ type: "boolean" }) }),
  ] },
  artifact: object({ ...version, runId: ref("id"), assessmentId: nullableText, path: ref("relativePath"), bytes: ref("count"), sha256: digest }),
  analysis: object({ ...version, kind: { const: "analysis" }, id: ref("id"), experimentId: ref("id"), runId: ref("id"), createdAt: nullableText, version: text,
    replacesAnalysisId: nullableText, error: nullableText, method: ref("analysisMethod"), sources: strings, tokens: nullable(ref("tokenTotals")), totalsAgree: nullable({ type: "boolean" }),
    requests: nullable(ref("count")), peakContext: nullable(ref("count")), compactions: nullable(ref("count")), beforeEdit: nullable(object({ requests: ref("count"), input: ref("count"), fresh: ref("count") })), parts: list(ref("contextPart")), process: nullable(ref("process")),
    turns: list(object({ turn: { type: "integer", minimum: 1 }, tokens: ref("tokenTotals") })), threads: list(ref("thread")) }),
};

export async function writeSchemas(): Promise<void> {
  const folder = fileURLToPath(new URL("../schemas/v2/", import.meta.url));
  await mkdir(folder, { recursive: true });
  const metadata = { $schema: "https://json-schema.org/draft/2020-12/schema" };
  await writeFile(`${folder}/common.json`, JSON.stringify({ ...metadata, $id: "common.json", $defs: commonDefinitions.definitions }, null, 2) + "\n");
  for (const kind of SchemaKinds) await writeFile(`${folder}/${kind}.json`, JSON.stringify({ ...metadata, $id: `${kind}.json`, ...schemas[kind] }, null, 2) + "\n");
}
if (import.meta.main) await writeSchemas();
