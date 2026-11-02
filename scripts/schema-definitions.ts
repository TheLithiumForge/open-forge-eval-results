export const text = { type: "string" };
export const list = (items: object) => ({ type: "array", items });
export const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] });
export const ref = (name: string) => ({ $ref: `common.json#/$defs/${name}` });
export const object = (properties: Record<string, unknown>, optional: readonly string[] = []) => ({
  type: "object", properties, required: Object.keys(properties).filter((key) => !optional.includes(key)), additionalProperties: true,
});
const numeric = { type: "number", minimum: 0 };
const count = { type: "integer", minimum: 0 };
const strings = list(text);
const maybeNumber = nullable(numeric);
const maybeText = nullable(text);
const choice = object({ tool: { enum: ["claude", "codex", "mock"] }, model: maybeText, effort: maybeText });
const selection = object({ applicable: strings, working: strings, stated: strings });
const answer = object({ id: text, area: text, question: text, yes: count, no: count, unsure: count, evidence: strings });
const assessment = { id: ref("id"), experimentId: ref("id"), createdAt: maybeText,
  versions: object({ checker: maybeText, rubric: maybeText, judge: maybeText, spec: maybeText, specVersion: nullable(count) }, ["spec", "specVersion"]), replacesAssessmentId: maybeText, error: maybeText };
const definitions = {
  reference: object({ commit: text, contentHash: text, specHash: text, specVersion: count }),
  id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9_.-]*$" }, digest: { type: "string", pattern: "^[a-f0-9]{64}$" }, count, number: numeric,
  relativePath: { type: "string", minLength: 1, pattern: "^(?!/|[A-Za-z]:|.*\\\\|.*(?:^|/)\\.\\.(?:/|$)).+$" }, choice, selection, answer,
  config: object({ layer: { type: "integer", minimum: 1, maximum: 4 }, judges: list(choice), suite: text, runsPerSetup: count, parallelRuns: count, setups: strings, agents: list(choice),
    judge: object({ ...choice.properties, repeats: count }), simulatedUser: choice, isolation: { enum: ["docker", "local"] },
    containers: object({ cpus: numeric, memory: text, processes: count }), limits: object({ runMinutes: numeric, questionRounds: count, checkMinutes: numeric }) }, ["containers", "layer", "judges"]),
  build: object({ passed: { type: "boolean" }, typecheck: nullable({ type: "boolean" }), seconds: numeric, packages: nullable(count), html: maybeText, bytes: nullable(count), log: text }),
  performance: object({ firstRenderMs: maybeNumber, largeBoardTapP95Ms: maybeNumber }),
  telemetry: object({ tokens: nullable(object({ input: numeric, cachedInput: numeric, cacheWrite: numeric, output: numeric, reasoning: numeric })),
    requests: maybeNumber, peakContext: maybeNumber, contextWindow: maybeNumber, compactions: maybeNumber, toolCalls: count, failedToolCalls: count,
    openForgeReads: count, openForgeBytes: maybeNumber, reportedCostUsd: maybeNumber, model: maybeText, sessionId: maybeText }, ["sessionId"]),
  functional: object({ coverage: object({ passed: count, applicable: count, blocked: count, errors: count, share: nullable({ type: "number", minimum: 0, maximum: 1 }) }),
    workingGate: nullable({ type: "boolean" }), statedSuccess: nullable({ type: "boolean" }) }),
  outcome: object({ id: text, area: text, status: { enum: ["pass", "fail", "error", "blocked"] }, evidence: text }),
};
export const commonDefinitions = { definitions, assessment };
