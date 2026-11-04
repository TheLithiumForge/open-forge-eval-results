# Open Forge Eval Results
Open Forge Eval Results is a public data store that keeps versioned evaluation records, schemas and evidence manifests.

For example, you can find a Neon Pairs batch in `index.json`, then read its attempts and grading records without listing folders. The [Evals pages](https://thelithiumforge.github.io/open-forge/docs/evals) in Open Forge's main documentation site show the data. These are screening results. Every Open Forge CLI stays beta. Nothing is a claim yet.

## Requirements

Use Node `24.19.0` or later and npm.

## Install

Run `npm ci --cache .npm-cache` to install the locked dependencies. Then run `npm run validate` to check the records, their references and the generated catalogue. An empty `versions/` is valid.

## Stage results

From the Open Forge repository root, run `npm run evals -- results add <batch>`. It exports a finished batch, stages it here and validates this repository. To stage an exported batch by hand, run `npm run stage -- <exported-batch-folder> --artifacts <plain-evidence-folder>`.

The evidence folder holds original files at `runs/<run>/<path>` and assessment files at `assessments/<assessment>/<path>`. These paths come from `artifacts.json`. Staging checks every byte size and SHA-256, then writes the records and a copy of the evidence to `versions/<cli-version>/batches/<batch>/`. Staging a batch again replaces it, because saved runs can rebuild this repository. Staging regenerates `index.json` after importing a batch.

Evidence is committed here: agent code without installed packages, the built game, screenshots, the conversation and the tool's event log.

## Grade in CI

A plan can leave its checks for later, so a batch can be published with runs that wait for them. From the Open Forge repository, `npm run evals -- results grade` starts the Grade published runs workflow with the graders of Open Forge's current commit, which must be pushed. The workflow finds the waiting batches with `npm run pending` and gives each one a job that imports the batch, runs `check --missing` and publishes it again. A last job copies only the grades the plan expected, validates this repository and pushes the grades to `main`, with no pull request.

| Setting | Kind | Use |
| --- | --- | --- |
| `GRADE_RUNNERS` | Variable | A JSON list of runs-on values that take the batches in turn, such as `["ubuntu-24.04", ["self-hosted", "Windows"], ["self-hosted", "macOS"]]`. Self-hosted runners need Docker with Linux containers. |
| `OPEN_FORGE_REPOSITORY` | Variable | The repository whose graders run, `TheLithiumForge/open-forge` by default |

The publish job asks for `contents: write` itself, so the default token permission stays read only. If `main` is protected, let GitHub Actions push to it. AI judges never run in these jobs, since they build agent-written code and a sign-in would share a host with it. Judge on your own machine with `judge <batch> --missing`, then publish the batch again. Turn GitHub Pages off in the repository settings: the results show on the main Open Forge site, and an earlier Pages deployment from this repository stays online until Pages is off.

## Records

The five record schemas and their shared definitions live in `schemas/v2/`. Run `npm run schemas` to regenerate them from `scripts/schema-source.ts` and `scripts/schema-definitions.ts`. Public records accept the exporter's omission of the private `telemetry.sessionId` field. Other fields follow the v2 history records.

The validator checks schema shapes, identities, references, replacements, pick hashes and the size and hash of every evidence file. Missing values stay `null`. Recheck and rejudge assessments stay in append order.

## Catalogue

Run `npm run index` after adding records by hand. It generates the root `index.json` from validated batches. `npm run validate` rejects a stale catalogue. `schemas/index.json` defines its shape.

Each batch entry gives its ID, layer, CLI version, creation time, implementer models, judge models, grading versions and record folder. A missing layer is `null`. Paths are relative to this repository. Within each batch folder, read these files:

- `experiment.json` - Registered inputs and versions.
- `setups.jsonl` - Generated setup records.
- `runs.jsonl` - Attempts and usage.
- `assessments/checks.jsonl` - Check assessments.
- `assessments/judge.jsonl` - Judge assessments.
- `assessments/pick.jsonl` - Blind and revealed picks.
- `artifacts.json` - Evidence paths, sizes and hashes.
- `evidence/` - The evidence files at the paths `artifacts.json` lists.

## Read results

The main site reads the pinned submodule at build time. Its Fetch latest results button resolves the public repository's current commit, then reads `index.json` and every record through raw GitHub URLs pinned to that commit. It validates schemas and references before replacing the displayed data. It treats record text as plain data and shows the data commit and fetch time.

The main site keeps correctness, rules, usage, wishes and preferences apart. Different grading versions get separate comparisons. Missing versions or reported models keep a batch apart from comparisons across batches. Local isolation is labelled "Not for scoring". The [Results page](https://thelithiumforge.github.io/open-forge/docs/evals/results) explains the Wilson and bootstrap intervals. The [History page](https://thelithiumforge.github.io/open-forge/docs/evals/history) shows CLI and reference trends.

## Checks

Run `npm run typecheck` and `npm test` to check the staging and validation tools. Pull requests and pushes to `main` validate, typecheck and test. This repository holds data only. It has no site build or Pages deployment.
